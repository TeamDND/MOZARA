# Hair Encyclopedia 백엔드 시스템 분석

## 1. 개요

Hair Encyclopedia 백엔드 시스템은 탈모 및 헤어 케어 관련 학술 논문을 수집, 분석하고 사용자에게 검색, 요약, Q&A 기능을 제공하는 서비스입니다.

본 문서는 시스템의 전체적인 구조, 구성 요소별 역할, 데이터 흐름, 핵심 원리를 기술하여 시스템에 대한 이해를 돕는 것을 목적으로 합니다.

## 2. 전체 시스템 아키텍처

이 시스템은 **Spring Boot (Java)** 기반의 메인 백엔드와 **FastAPI (Python)** 기반의 AI 백엔드가 분리된 **마이크로서비스 아키텍처(MSA)**로 구성되어 있습니다.

![Hair Encyclopedia Architecture](https://user-images.githubusercontent.com/4292215/148209919-b079df1c-8a23-4c28-9e9a-e1e5210c8bac.png)
*(위 이미지는 실제 아키텍처를 표현하기 위한 예시입니다.)*

- **Frontend (Web/App)**: 사용자 인터페이스를 제공합니다.
- **Spring Boot Backend (Java)**: 프론트엔드의 요청을 받는 주 진입점(Entry Point) 역할을 하며, 비즈니스 로직 처리 및 Python AI 백엔드로의 요청을 중계하는 API Gateway/Proxy 역할을 수행합니다.
- **FastAPI Backend (Python)**: 실제 AI 연산 및 외부 AI 서비스(OpenAI, Pinecone)와의 연동을 담당하는 핵심 AI 마이크로서비스입니다.
- **External Services**:
    - **PubMed**: 논문 원본을 수집하는 소스입니다.
    - **OpenAI**: 텍스트 임베딩(벡터 변환) 및 자연어 질의응답(LLM)에 사용됩니다.
    - **Pinecone**: 변환된 논문 벡터를 저장하고, 유사도 검색을 수행하는 벡터 데이터베이스입니다.

---

## 3. 백엔드 흐름 및 구조

### 3.1. 논문 수집 및 벡터화 (주 1회 자동 실행)

논문을 서비스에 저장하고 검색 가능한 형태로 만드는 과정입니다.

1.  **스케줄러 실행 (Python)**
    - `C:\...\hair_papers\pubmed_scheduler_service.py` 내의 스케줄러가 매주 월요일 오전 9시에 `weekly_collection_job` 함수를 트리거합니다.

2.  **논문 수집 (Python)**
    - `pubmed_collector.py`가 PubMed API에 "hair loss", "alopecia" 등의 키워드로 **무료 전문(Open Access) 논문**을 검색합니다.
    - 신규 논문 3개를 다운로드하여 로컬에 저장합니다. (PDF, XML 등)

3.  **논문 처리 및 벡터화 (Python)**
    - `pubmed_pinecone_vectorizer.py` (추정)가 수집된 논문을 처리합니다.
    - 논문 내용을 의미 있는 단위(Chunk)로 분할하고, 각 Chunk의 내용을 **OpenAI의 `text-embedding-3-small` 모델**을 사용하여 1536차원의 벡터로 변환합니다.
    - 논문의 제목, 저자, 초록, 원문 경로 등의 메타데이터와 변환된 벡터를 함께 **Pinecone 벡터 DB**에 저장합니다.

### 3.2. 사용자 논문 검색

사용자가 키워드로 논문을 검색하는 과정입니다.

1.  **요청 (Frontend → Spring Boot)**
    - 사용자가 검색어를 입력하면, 프론트엔드는 Spring Boot의 `HairEncyclopediaController`로 검색 요청을 보냅니다.
    - `POST /api/ai/encyclopedia/search`

2.  **요청 중계 (Spring Boot → Python)**
    - `HairEncyclopediaService`는 받은 요청을 그대로 Python FastAPI 백엔드로 전달합니다.
    - `RestTemplate`을 사용하여 `http://localhost:8000/api/paper/search`를 호출합니다.

3.  **쿼리 벡터화 및 검색 (Python)**
    - FastAPI(`app.py`)는 사용자의 검색어를 **OpenAI 임베딩 모델**을 사용해 벡터로 변환합니다.
    - 이 쿼리 벡터와 가장 유사한 논문 벡터들을 **Pinecone DB**에서 검색(유사도 기반)합니다.

4.  **결과 반환 (Python → Spring Boot → Frontend)**
    - 검색된 논문 목록(ID, 제목, 요약 미리보기 등)을 `PaperCard` 형태로 가공하여 Spring Boot에 반환하고, 최종적으로 프론트엔드에 전달됩니다.

### 3.3. 논문 상세 분석 및 Q&A

사용자가 특정 논문에 대해 상세 정보를 보거나 질문하는 과정입니다.

1.  **요청 (Frontend → Spring Boot)**
    - 사용자가 특정 논문을 클릭하거나 질문을 입력합니다.
    - `GET /api/ai/encyclopedia/paper/{paperId}/analysis` (분석)
    - `POST /api/ai/encyclopedia/qna` (Q&A)

2.  **요청 중계 (Spring Boot → Python)**
    - `HairEncyclopediaService`가 요청을 Python 백엔드로 중계합니다.

3.  **데이터 조회 및 AI 처리 (Python)**
    - **(분석)**: `app.py`는 Pinecone DB에서 해당 논문의 구조화된 분석 데이터(주요 토픽, 결론 등)를 조회하여 반환합니다.
    - **(Q&A)**:
        1.  Pinecone DB에서 질문과 관련된 논문 전체 텍스트(Context)를 조회합니다.
        2.  "이 내용을 바탕으로 질문에 답해줘" 라는 형식의 프롬프트를 구성합니다.
        3.  **OpenAI의 `gpt-3.5-turbo` 모델**에 프롬프트를 전달하여 답변을 생성합니다.

4.  **결과 반환 (Python → Spring Boot → Frontend)**
    - 생성된 답변이나 분석 결과를 프론트엔드로 전달합니다.

---

## 4. 구성 및 원리

### 4.1. Spring Boot (Java)
- **역할**: API Gateway 및 Proxy
- **원리**: 프론트엔드와 직접 통신하며 인증, 로깅 등 공통 비즈니스 로직을 처리합니다. AI 기능이 필요할 때만 내부적으로 Python 서비스를 호출하여 결과를 받아 다시 프론트엔드에 전달합니다. 이를 통해 전체 시스템의 안정성과 확장성을 확보합니다.

### 4.2. FastAPI (Python)
- **역할**: AI/ML 마이크로서비스
- **원리**: 복잡한 AI 연산 및 외부 AI API(OpenAI, Pinecone)와의 통신을 전담합니다. Python의 풍부한 AI 라이브러리 생태계를 활용하여 핵심 기능을 구현합니다. `app.py`가 모든 AI 관련 API 엔드포인트를 정의하고 관리합니다.

### 4.3. Pinecone (Vector DB)
- **역할**: 벡터 검색 엔진
- **원리**: 텍스트를 벡터로 변환하여 저장하고, 특정 벡터와 유사한 벡터를 매우 빠르게 찾아주는 기술입니다. "의미 기반 검색"을 가능하게 하는 핵심 요소로, 단순 키워드 매칭보다 훨씬 정교한 검색 결과를 제공합니다.

### 4.4. OpenAI
- **역할**: 언어 모델 및 임베딩 생성
- **원리**:
    - **`text-embedding-3-small`**: 텍스트(단어, 문장)를 기계가 이해할 수 있는 숫자 배열(벡터)로 변환합니다. 의미가 비슷한 텍스트는 벡터 공간에서 가까운 위치에 존재하게 됩니다.
    - **`gpt-3.5-turbo`**: 대규모 언어 모델(LLM)로, 주어진 컨텍스트(논문 내용)를 이해하고 사용자의 질문에 대한 답변을 자연스러운 문장으로 생성하는 역할을 합니다.

---

## 5. 적용 및 확장성

- **분리된 아키텍처**: Spring Boot와 Python 서비스가 분리되어 있어, 각자 독립적으로 개발, 배포, 확장이 가능합니다. 예를 들어, AI 모델 변경은 Python 서비스에만 영향을 미치며, 전체 시스템의 중단 없이 업데이트할 수 있습니다.
- **관리형 서비스 활용**: Pinecone, OpenAI 같은 외부 관리형 서비스(Managed Service)를 사용함으로써, 인프라 구축 및 관리에 드는 비용과 노력을 줄이고 핵심 비즈니스 로직 개발에 집중할 수 있습니다.
- **확장 방향**: 향후 새로운 AI 기능(e.g., 이미지 기반 분석)이 추가될 경우, FastAPI에 새로운 엔드포인트를 추가하고 Spring Boot에서 이를 호출하는 방식으로 유연하게 시스템을 확장할 수 있습니다.
