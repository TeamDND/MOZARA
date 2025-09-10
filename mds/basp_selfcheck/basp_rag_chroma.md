# basp_rag_chroma.md

> 목적: **BASP 자가진단 결과**에 **RAG(Retrieval‑Augmented Generation)**를 결합하되,  
> **벡터DB로 Chroma**를 사용하여 **가볍고 자체 호스팅 친화적인** 파이프라인을 구성한다.  
> **⚠️ 약물/시술 직접 권고 금지**. 생활습관·연구 요약 중심의 근거 기반 안내만 제공한다.

---

## 0) 한눈에 보는 흐름

1. **Self‑check**: BASP 간소화 설문 → `computeResult()`로 `baspBasic`, `baspSpecific`, `stageLabel`, `riskScore` 산출  
2. **Query Build**: 결과값 기반 검색 쿼리 템플릿 생성  
3. **Retrieval (Chroma)**: 임베딩(`bge-m3`) + **Chroma**에서 유사 청크 검색(top‑k 후보 24)  
4. **Rerank**: `bge-reranker-v2`로 상위 3~6개 정밀 선별  
5. **Answer (Open‑source LLM)**: 컨텍스트+프롬프트 주입 → 출처 각주 달린 가이드 생성  
6. **Safety**: 약물/시술 권고 제거, 디스클레이머 삽입  
7. **Render**: 결과 카드 + **RAG 패널(가이드 목록 + 출처 토글)**

```mermaid
flowchart LR
  A[KB Raw<br/>(가이드/논문/FAQ)] --> B[정제/청크화(500~1,000자)]
  B --> C[임베딩 생성 (bge-m3)]
  C --> D[Chroma 업서트<br/>DuckDB/SQLite 저장]
  subgraph Online
    Q[Query Builder] --> H[Chroma Similarity Search]
    H --> Rer[Reranker (bge-reranker-v2)]
    Rer --> Ctx[Context Builder<br/>메타/각주 포함]
    Ctx --> LLM[LLM Answerer<br/>(Llama-3.1-70B 등)]
  end
```

---

## 1) 기술 스택

- **임베딩**: `bge-m3` (ko/en 멀티링구얼, 오픈소스)  
- **벡터DB**: **Chroma** (로컬/경량, DuckDB/SQLite 저장)  
- **리랭커**: `bge-reranker-v2` (오픈소스)  
- **LLM (오픈소스 최신)**: `Llama-3.1-70B` 권장 (대안: `Yi-34B`, `Mixtral‑8x7B`)  
  - 런타임: `vLLM`, `llama.cpp`, `Ollama` 중 택1 (자체 호스팅)  
- **프레임워크**: LangChain 또는 LlamaIndex (선호에 맞게)  
- **캐시**: Redis (Key: `baspBasic+baspSpecific+stage+riskBucket`, TTL 24h)

---

## 2) 데이터 정책 / 안전

- **수집 문서**: 학회 가이드라인, 공공기관(WHO/질병청) 자료, 병원 FAQ, 승인된 내부 문서  
- **금지**: 약제명/시술에 대한 **직접적 권고·복용 지침**  
- **허용**: 생활습관/연구 요약, “전문의 상담 필요” 단서  
- **출처 표기**: 각 항목 끝 **[n] 각주**, 토글 시 제목/발행처/연도/스니펫/링크 표시  
- **디스클레이머**: 결과 하단 상시 노출 — “본 도구는 의료 진단이 아닌 참고용…”

---

## 3) 스키마 (개념)

```ts
type KBDocument = {
  id: string; title: string; source: 'guideline'|'journal'|'gov'|'faq'|'internal';
  publisher?: string; year?: number; lang?: 'ko'|'en'|'multi'; url?: string;
  tags?: string[]; createdAt: number; updatedAt: number;
};

type KBChunk = {
  id: string; docId: string; ord: number;
  text: string; // 300~1200자
  meta?: { section?: string; page?: number; };
  createdAt: number;
};
```

Chroma 컬렉션 메타 예시:
```python
collection = chroma_client.create_collection(
    name="hair_kb",
    metadata={"hnsw:space": "cosine"}  # 기본 코사인 유사도
)
```

---

## 4) 인덱싱 파이프라인 (의사코드)

```python
# 1) 텍스트 정제/분할
docs = load_and_split("./kb_raw")  # PDF/HTML/MD → 텍스트 → 청크

# 2) 임베딩
emb = load_embedding_model("bge-m3")
vectors = emb.encode([c.text for c in chunks])

# 3) Chroma 업서트
import chromadb
client = chromadb.Client()
col = client.get_or_create_collection("hair_kb")
col.add(
  ids=[c.id for c in chunks],
  documents=[c.text for c in chunks],
  metadatas=[{"docId": c.docId, "ord": c.ord, "title": doc.title, "publisher": doc.publisher, "year": doc.year, "url": doc.url} for c in chunks],
  embeddings=vectors
)
```

---

## 5) 검색+리랭크 (의사코드)

```python
def hybrid_like_search(query, k=24):
    # Chroma는 기본 유사도 검색이 중심이므로,
    # 간단 BM25는 추가적으로 Whoosh/Elastic/SQLite FTS 연동 가능(선택).
    hits = col.query(query_texts=[query], n_results=k)  # 벡터 유사도
    return hits  # ids, documents, metadatas

def rerank(query, hits, topk=6):
    # bge-reranker로 쿼리-청크 쌍 점수화
    scored = [(h, score(query, h["document"])) for h in hits]
    scored.sort(key=lambda x: x[1], reverse=True)
    return [h for h,_ in scored[:topk]]
```

> **팁**: PoC 단계에서는 **벡터 검색만**으로 시작 → 필요 시 나중에 **BM25(FTS)** 를 덧붙여 하이브리드로 확장.

---

## 6) 프롬프트 (약물 권고 금지)

```text
[시스템]
당신은 근거 기반 한국어 의료 정보 요약자입니다.
약물·시술 사용을 직접 권장하지 마세요.
생활습관, 연구 결과, 일반 관리 정보만 안내하세요.
각 항목 끝에는 [n] 각주를 붙이고, 마지막 줄에 고지문을 추가하세요.

[컨텍스트]
{top_k_chunks_with_metadata}

[사용자 상태]
BASP={baspBasic}+{baspSpecific}, 단계={stageLabel}, risk={riskScore}

[요청]
- 사용자 단계에 맞춘 실행 가능한 가이드 3~5개를 항목으로 작성
- 약물/시술 언급 시 반드시 “전문의 상담 필요” 단서
- 각 항목 끝에 [n] 각주, 마지막 줄에 디스클레이머 추가
```

---

## 7) API

- `POST /api/rag/answer`  
  **Request**
  ```json
  { "baspBasic": "M", "baspSpecific": "V1", "stageLabel": "초기", "riskScore": 4 }
  ```
  **Response**
  ```json
  {
    "answer": [
      "수면 7~8시간과 규칙적 운동은 탈모 진행 위험 완화와 연관된 보고가 있습니다. [1]",
      "만성 스트레스 관리(명상/호흡법)가 모발 건강에 긍정적 영향을 줄 수 있습니다. [2]",
      "균형 잡힌 식단과 단백질 섭취는 일부 연구에서 모발 성장과 연관성이 보고되었습니다. [3]"
    ],
    "citations": [
      { "n": 1, "title": "WHO Lifestyle and Hair", "publisher": "WHO", "year": 2023, "url": "..." },
      { "n": 2, "title": "Stress and Alopecia Study", "publisher": "대한피부과학회", "year": 2022, "url": "..." },
      { "n": 3, "title": "Nutrition and Hair Health", "publisher": "NIH", "year": 2021, "url": "..." }
    ]
  }
  ```

- `POST /api/selfcheck/evaluate` → `{ ok: true }` (미저장 기본)

---

## 8) 프론트 통합 스케치

```ts
const r = computeResult(answers);
const res = await fetch('/api/rag/answer', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(r),
});
const { answer, citations } = await res.json();
<RagPanel items={answer} sources={citations} />;
```

`<RagPanel />` 요구사항  
- 항목 끝의 **[n]** 유지, 클릭/토글 시 **출처 카드** 확장(title/publisher/year/snippet/url)  
- 빈 결과/오류: 폴백 문구 + 기본 가이드 노출  
- 하단 디스클레이머 고정

---

## 9) 운영/확장

- **규모**: 수만~수십만 청크까지는 Chroma로 충분(PoC/초기 운영)  
- **확장 계획**: 트래픽/데이터 증가 시 Weaviate/Qdrant/pgvector로 교체 가능 (검색 인터페이스 추상화 권장)  
- **모니터링**: 응답 지연 p95, “도움 됨” 비율, 출처 클릭률, 캐시 적중률  
- **A/B**: 리랭커 on/off, top‑k, 프롬프트 변화 테스트

---

## 10) LangChain 예시 (간단)

```python
from langchain_community.vectorstores import Chroma
from langchain.embeddings import HuggingFaceEmbeddings
from langchain.prompts import PromptTemplate
from langchain.llms import LlamaCpp  # 또는 vLLM/Ollama wrapper

emb = HuggingFaceEmbeddings(model_name="bge-m3")
vectordb = Chroma(collection_name="hair_kb", embedding_function=emb)

def get_context(query):
  docs = vectordb.similarity_search(query, k=24)
  reranked = bge_rerank(query, docs, topk=6)
  return format_with_citations(reranked)

prompt = PromptTemplate.from_template(open("prompt.txt").read())
llm = LlamaCpp(model_path="Llama-3.1-70B.Q4_K_M.gguf")

def answer(payload):
  query = build_query(payload)
  ctx = get_context(query)
  text = llm.invoke(prompt.format(context=ctx, **payload))
  return postprocess(text)
```

---

## 11) 수락 기준 (AC)

1. 답변에 **약물/시술 직접 권고**가 포함되지 않는다.  
2. 각 항목 끝에 **[n] 각주**가 있으며, 출처 카드가 토글로 노출된다.  
3. 동일 입력(BASP+stage+risk)에 대해 응답이 재현 가능(캐시/결정적 프롬프트)하다.  
4. 응답 지연 p95 ≤ **6초**를 목표로 한다.  
5. PoC 기준 **Chroma만으로 운영 가능**하며, 이후 교체가 쉬운 추상화가 있다.
