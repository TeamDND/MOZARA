# basp_rag_updated.md

> 목적: BASP 자가진단 결과에 **RAG(Retrieval‑Augmented Generation)**를 결합하여,  
> **근거 기반 정보 제공**을 목표로 한다.  
> **⚠️ 약물/시술 직접 권고는 절대 포함하지 않으며**, 생활 습관·연구 결과·일반 관리 정보 중심으로 제공한다.  
> (항상 “전문의 상담 권장” 문구를 포함)

---

## 1) 사용자 흐름

1. 사용자가 BASP 자가진단 완료 (`baspBasic`, `baspSpecific`, `stageLabel`, `riskScore` 산출)  
2. 진단 결과를 기반으로 검색 쿼리 생성  
   - 예: `"M형 초기 단계 생활습관 가이드"`, `"정수리 감소 스트레스 관리 연구"`  
3. **하이브리드 검색** (BM25 + VectorSim) → 후보 문서 20~30개  
4. **리랭커**로 상위 5~6개 정밀 선별  
5. **LLM(Open Source)**에 컨텍스트 주입 → 출처 포함 요약 생성  
6. **UI 출력**: BASP 결과 카드 + “근거 기반 가이드 패널”  
   - 생활습관, 심리·영양 관리, 최신 연구 결과 등  
   - 약물/시술 관련 부분은 **“전문의 상담 시 다뤄질 수 있음”** 정도로만 언급  

---

## 2) 아키텍처 구성

- **임베딩 모델**: `bge-m3` (한/영 멀티링구얼, 최신 공개모델)  
- **Vector DB**: `Weaviate` (스케일링, 필터링 편리)  
- **검색 방식**: 하이브리드 (BM25 + 벡터 유사도 가중합)  
- **리랭커**: `bge-reranker-v2` (오픈소스)  
- **LLM(Open Source)**:  
  - `Llama-3.1-70B` (Meta, 2024 공개, 최신 상용수준 오픈모델)  
  - 대안: `Mistral Large(오픈 가중치 제공 변종)`, `Yi-34B`  
- **프레임워크**: LangChain 또는 LlamaIndex (파이프라인 구성/실험 편의)  
- **캐시**: Redis (Key: BASP+Stage+Risk, TTL=24h)

```mermaid
flowchart LR
  A[KB Raw<br/>(가이드/논문/라벨/FAQ)] --> B[정제/청크화]
  B --> C[임베딩 생성]
  C --> D[Vector DB: Weaviate]
  B --> E[BM25 인덱스]
  subgraph Online
    Q[Query Builder] --> H[Hybrid Search<br/>(Vector + BM25)]
    H --> Rer[Reranker]
    Rer --> Ctx[Context Builder]
    Ctx --> LLM[LLM Answerer]
  end
  D --> H
  E --> H
```

---

## 3) 데이터 정책

- **수집 문서**: 학회 가이드라인, 보건의료 공공자료, WHO/질병청 생활습관 연구, 병원 FAQ  
- **금지 영역**: 약제명/시술에 대한 **직접적 권고·복용 지침**  
- **허용 영역**:  
  - “일부 연구에서 보고됨/활용됨” 수준의 **설명** (항상 출처 제공)  
  - “의약품·시술은 반드시 전문의 상담 필요” 단서 문구 **강제**

---

## 4) 프롬프트 템플릿

```text
[시스템]
당신은 근거 기반 한국어 의료 정보 요약자입니다.
약물·시술 사용을 직접 권장하지 마세요.
생활습관, 연구 결과, 일반 관리 정보만 안내하세요.
각 항목 끝에는 [n] 각주, 마지막 줄에 고지문을 추가하세요.

[컨텍스트]
{retrieved_chunks_with_metadata}

[사용자 상태]
BASP={baspBasic}+{baspSpecific}, 단계={stageLabel}, risk={riskScore}

[요청]
- 사용자 단계에 맞는 생활습관·관리 가이드 3~5개 항목 작성
- 약물/시술 언급 시 반드시 “전문의 상담 필요”를 덧붙이기
- 각 항목 끝에 [n] 각주
- 마지막 줄: “⚠️ 본 도구는 의료 진단이 아닌 참고용이며, 증상 지속 시 전문의 상담 권장”
```

---

## 5) API 예시

- `POST /api/rag/answer`

**Request**
```json
{
  "baspBasic": "M",
  "baspSpecific": "V1",
  "stageLabel": "초기",
  "riskScore": 3
}
```

**Response**
```json
{
  "answer": [
    "충분한 수면(7~8시간)은 탈모 진행 위험 완화와 관련 있다는 보고가 있습니다. [1]",
    "스트레스 관리(명상, 규칙적 운동)가 모발 건강에 긍정적 영향을 줄 수 있습니다. [2]",
    "균형 잡힌 식단과 단백질 섭취가 연구에서 모발 성장과 연관성이 나타났습니다. [3]"
  ],
  "citations": [
    { "n": 1, "title": "WHO Lifestyle and Hair", "publisher": "WHO", "year": 2023, "url": "..." },
    { "n": 2, "title": "Stress and Alopecia Study", "publisher": "대한피부과학회", "year": 2022, "url": "..." },
    { "n": 3, "title": "Nutrition and Hair Health", "publisher": "NIH", "year": 2021, "url": "..." }
  ]
}
```

---

## 6) 수락 기준 (AC)

1. 답변에는 **직접적인 약물/시술 권고가 포함되지 않는다.**  
2. 각 항목에는 반드시 [n] 출처 각주가 포함된다.  
3. 하단에 디스클레이머 고지가 항상 노출된다.  
4. 동일 입력에 대해 재현성 있는 응답을 반환한다.  
5. 응답 지연 p95 ≤ 6초.

---

## 7) LangChain/LlamaIndex 활용 예시 (스케치)

```python
# langchain 예시 (의사코드)
retriever = HybridRetriever(
    vector=WeaviateVectorStore(...),
    keyword=BM25Store(...),
    alpha=0.5  # vector/bm25 가중치
)

reranker = BGEReranker(model="bge-reranker-v2")
llm = LlamaCpp(model_path="Llama-3.1-70B.Q4_K_M.gguf")  # 또는 vLLM/llama.cpp/ollama

def rag_answer(payload):
    query = build_query(payload)
    cands = retriever.search(query, top_k=24)
    ranked = reranker.rerank(query, cands, top_k=6)
    ctx = build_context(ranked)  # 메타 포함
    prompt = render_prompt(ctx, payload)
    out = llm.invoke(prompt)
    return postprocess_with_citations(out)
```

---

## 8) 운영/모니터링

- 클릭률(출처 열람), “도움 됨” 비율, 재방문율  
- 검색 품질(recall@k, NDCG), 응답지연 p95  
- A/B: 하이브리드 가중치(0.5↔0.3/0.7), 리랭커 on/off, 프롬프트 변형
