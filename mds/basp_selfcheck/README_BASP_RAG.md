# BASP 탈모 진단 시스템 (RAG 기반)

## 개요
BASP(Basic And Specific classification) 분류를 이용한 탈모 자가진단 기능에 RAG(Retrieval-Augmented Generation)를 결합한 시스템입니다.

## 아키텍처
- **Frontend**: React (TypeScript)
- **Backend**: Spring Boot (Java)
- **AI Service**: Python FastAPI + RAG (Chroma + bge-m3)

## RAG 기능
- **벡터DB**: Chroma (로컬/경량, DuckDB/SQLite 저장)
- **임베딩**: bge-m3 (ko/en 멀티링구얼)
- **리랭커**: bge-reranker-v2-m3 (선택적)
- **답변 생성**: 템플릿 기반 (실제 환경에서는 Llama-3.1-70B 등 LLM 사용)

## 실행 방법

### 1. Python FastAPI 서버 실행
```bash
cd backend/python
pip install -r requirements.txt
python app.py
```
서버가 `http://localhost:8000`에서 실행됩니다.

### 2. Spring Boot 서버 실행
```bash
cd backend/springboot
./gradlew bootRun
```
서버가 `http://localhost:8080`에서 실행됩니다.

### 3. React 프론트엔드 실행
```bash
cd frontend
npm install
npm start
```
서버가 `http://localhost:3000`에서 실행됩니다.

## 기능
1. **BASP 진단**: 헤어라인, 정수리, 밀도, 생활습관 기반 진단
2. **RAG 가이드**: 진단 결과 기반 맞춤형 가이드 제공
3. **출처 표기**: 각 가이드 항목에 출처 정보 및 각주 제공
4. **토글 인터페이스**: 출처 정보 클릭 시 상세 정보 표시

## API 엔드포인트

### Spring Boot
- `POST /api/basp/evaluate`: BASP 진단 요청 (RAG 가이드 포함)
- `GET /api/basp/health`: 서버 상태 확인

### Python FastAPI
- `POST /api/basp/evaluate`: BASP 진단 처리
- `POST /api/rag/answer`: RAG 기반 가이드 생성
- `GET /health`: 서버 상태 확인

## RAG 파이프라인
1. **Query Build**: BASP 결과 기반 검색 쿼리 생성
2. **Retrieval**: Chroma 벡터 유사도 검색 (top-k=24)
3. **Rerank**: bge-reranker-v2로 상위 6개 선별 (선택적)
4. **Answer**: 컨텍스트 기반 가이드 생성
5. **Citations**: 출처 정보 및 각주 생성

## 안전 정책
- **금지**: 약물/시술 직접 권고
- **허용**: 생활습관 개선, 연구 요약, "전문의 상담 필요" 안내
- **출처 표기**: 각 항목 끝 [n] 각주, 토글 시 상세 정보 표시
- **디스클레이머**: 결과 하단 상시 노출

## 주의사항
- 본 도구는 의료 진단이 아닌 참고용입니다.
- 증상이 지속·악화되면 전문의 상담을 권장합니다.
- Python 서버가 실행되지 않으면 Spring Boot에서 로컬 계산으로 폴백됩니다.
- RAG 기능은 Chroma 벡터DB와 임베딩 모델이 필요합니다.

## 확장 계획
- 실제 LLM 통합 (Llama-3.1-70B 등)
- 더 많은 의료 문서 데이터 추가
- 하이브리드 검색 (벡터 + BM25)
- 캐싱 시스템 (Redis) 추가
