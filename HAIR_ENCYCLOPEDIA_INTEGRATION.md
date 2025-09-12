# 탈모 백과 통합 가이드

## 개요
hair-loss-dictionary 프로젝트의 기능을 main_project에 통합하여 **탈모 백과**라는 새로운 AI 도구로 추가했습니다.

## 프로젝트 구조

### 프론트엔드 통합

#### 1. Hair Encyclopedia Feature 모듈
```
main_project/frontend/src/features/hairEncyclopedia/
├── HairEncyclopediaMain.tsx          # 메인 라우터 컴포넌트
└── components/
    ├── HairEncyclopediaHome.tsx       # 홈 페이지 (카테고리 목록)
    ├── CategoryView.tsx               # 카테고리별 문서 목록
    ├── ArticleView.tsx                # 개별 문서 상세 뷰
    └── ThesisSearch.tsx               # 논문 검색 기능
```

#### 2. 컴포넌트 설명

**HairEncyclopediaMain.tsx**
- React Router를 사용한 메인 라우팅 컴포넌트
- `/hair-encyclopedia` 하위의 모든 라우팅 처리

**HairEncyclopediaHome.tsx**
- 탈모 백과 메인 홈페이지
- 카테고리별 분류 (탈모 원인, 치료법, 예방법, 제품 정보, 논문 검색)
- 통계 정보 표시 (문서 수, 논문 수 등)

**CategoryView.tsx**
- 선택된 카테고리의 문서 목록 표시
- Mock 데이터 사용 (실제 구현 시 백엔드 API 연동 필요)

**ArticleView.tsx**
- 개별 문서의 상세 내용 표시
- 마크다운 스타일 콘텐츠 렌더링
- 관련 문서 추천 기능

**ThesisSearch.tsx**
- AI 기반 논문 검색 기능
- OpenAI 임베딩과 Pinecone 벡터 DB 활용
- 실시간 검색 및 논문 분석 결과 표시

#### 3. 라우팅 구조
```
/hair-encyclopedia/                    # 홈페이지
/hair-encyclopedia/category/:id        # 카테고리별 문서 목록
/hair-encyclopedia/article/:id         # 개별 문서 상세
/hair-encyclopedia/thesis-search       # 논문 검색
```

### 백엔드 통합

#### 1. Python 서비스 구조
```
main_project/backend/python_services/hair_encyclopedia_service/
├── main.py                           # FastAPI 메인 서버
├── pubmed_collector.py               # PubMed 논문 수집
├── pubmed_pinecone_vectorizer.py     # 논문 벡터화 처리
├── requirements.txt                  # Python 의존성
└── .env.example                      # 환경 변수 예시
```

#### 2. API 엔드포인트

**기본 정보**
- `GET /` - 서비스 상태 및 논문 수 조회
- `GET /papers/count` - 저장된 논문 수 조회

**논문 검색**
- `POST /search` - 질의 기반 논문 검색
- `GET /paper/{paper_id}/analysis` - 특정 논문 분석 결과 조회

**자동 수집**
- `GET /pubmed/collect` - 수동 논문 수집 트리거

#### 3. 기술 스택
- **FastAPI**: Python 웹 프레임워크
- **Pinecone**: 벡터 데이터베이스
- **OpenAI**: 임베딩 및 텍스트 분석
- **PubMed API**: 논문 메타데이터 수집

## 설치 및 실행 가이드

### 1. 환경 설정

**Python 환경 설정**
```bash
cd main_project/backend/python_services/hair_encyclopedia_service
pip install -r requirements.txt
```

**환경 변수 설정**
```bash
# .env 파일 생성 (.env.example 참고)
OPENAI_API_KEY=your_openai_api_key_here
PINECONE_API_KEY=your_pinecone_api_key_here  
PINECONE_INDEX_NAME=hair-loss-papers
```

### 2. 서비스 실행

**Python 백엔드 서비스 실행**
```bash
cd main_project/backend/python_services/hair_encyclopedia_service
python main.py
```
- 서버 포트: `localhost:8001`

**React 프론트엔드 실행**
```bash
cd main_project/frontend  
npm start
```
- 서버 포트: `localhost:3000`

### 3. 접속 방법
1. `http://localhost:3000/ai-tools` 접속
2. "탈모 백과" 카드 클릭
3. 백과사전 홈페이지에서 원하는 기능 선택

## 주요 기능

### 1. 백과사전 브라우징
- 카테고리별 문서 분류 (탈모 원인, 치료법, 예방법, 제품 정보)
- 각 문서는 전문적인 내용을 쉽게 설명
- 관련 문서 추천 시스템

### 2. AI 논문 검색
- 자연어 질의로 논문 검색
- OpenAI 임베딩을 통한 의미 기반 검색
- 논문 요약 및 핵심 내용 분석
- 섹션별 상세 요약 제공

### 3. 자동 논문 수집
- 주간 단위로 PubMed에서 새 논문 자동 수집
- 중복 제거 및 품질 필터링
- Pinecone 벡터 DB 자동 업데이트

## 확장 가능성

### 1. 데이터 확장
- 더 많은 카테고리 추가 (식단, 운동, 의료진 정보 등)
- 실제 백과사전 데이터베이스 연동
- 사용자 생성 콘텐츠 지원

### 2. 기능 개선
- 북마크 및 즐겨찾기 기능
- 개인화된 추천 시스템
- 논문 번역 및 요약 서비스

### 3. 통합 강화
- main_project의 다른 AI 도구와 연동
- 사용자 데이터 기반 맞춤 정보 제공
- 채팅봇 형태의 질의응답 시스템

## 기술적 특징

### 1. 마이크로서비스 아키텍처
- Python FastAPI 서비스로 분리
- main_project Spring Boot와 독립적 운영
- 각 서비스별 독립적 확장 가능

### 2. AI 기반 검색
- 벡터 임베딩 기반 의미 검색
- 실시간 논문 분석 및 요약
- 다국어 지원 가능한 구조

### 3. 사용자 중심 설계
- 직관적인 네비게이션 구조
- 반응형 웹 디자인
- 접근성 고려한 UI/UX

## 유지보수 및 모니터링

### 1. 로그 관리
- 논문 수집 과정 상세 로깅
- 에러 및 성능 모니터링
- 사용자 행동 분석 (선택적)

### 2. 데이터 관리
- Pinecone 벡터 DB 정기 백업
- 논문 메타데이터 무결성 검사
- 중복 데이터 자동 정리

### 3. 성능 최적화
- 벡터 검색 응답 시간 최적화
- 캐싱 전략 구현
- 로드 밸런싱 (필요시)

---

## 문의 및 지원

프로젝트 관련 문의나 이슈는 다음을 통해 연락 바랍니다:
- 기술 문의: 개발팀
- 콘텐츠 문의: 콘텐츠팀  
- 버그 리포트: GitHub Issues

**마지막 업데이트**: 2024년 1월