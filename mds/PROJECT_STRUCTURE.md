# MOZARA 프로젝트 구조

## 📁 전체 구조

```
MOZARA/
├── backend/                          # 백엔드 서버
│   ├── main.py                       # 제품 검색 FastAPI 서버
│   ├── run.py                        # 서버 실행 스크립트
│   ├── requirements.txt              # 제품 검색 서버 의존성
│   ├── README.md                     # 백엔드 설정 가이드
│   ├── docker-compose.yml            # Docker 설정
│   └── python/                       # 기존 AI 서비스들
│       ├── app.py                    # 메인 AI 서버
│       ├── basp.py                   # BASP 서비스
│       ├── requirements.txt          # AI 서비스 의존성
│       ├── Dockerfile                # AI 서비스 Docker
│       ├── pinecone_data/            # Pinecone 데이터
│       ├── services/                 # AI 서비스들
│       │   ├── basp_selfcheck/       # BASP 자가진단
│       │   ├── hair_change/          # 헤어 변경
│       │   └── hair_damage_analysis/ # 헤어 손상 분석
│       └── test_chroma.py            # Chroma 테스트
│   └── springboot/                   # Spring Boot 서버
│       ├── src/main/java/            # Java 소스코드
│       ├── build.gradle              # Gradle 설정
│       └── Dockerfile                # Spring Boot Docker
├── frontend/                         # React 프론트엔드
│   ├── src/
│   │   ├── components/               # React 컴포넌트
│   │   │   ├── ProductSearchPage.tsx # 제품 검색 페이지
│   │   │   ├── HairPT.tsx           # 헤어 PT
│   │   │   └── PlantStageGame.tsx   # 식물 단계 게임
│   │   ├── page/                     # 페이지 컴포넌트
│   │   │   ├── MainLayout.tsx        # 메인 레이아웃
│   │   │   ├── MainContent.tsx       # 메인 콘텐츠
│   │   │   ├── HairCheck.tsx         # 헤어 체크
│   │   │   ├── HairDamageAnalysis.tsx # 헤어 손상 분석
│   │   │   ├── HairChange.tsx        # 헤어 변경
│   │   │   ├── AiToolList.tsx        # AI 도구 목록
│   │   │   ├── YouTubeVideos.tsx     # YouTube 비디오
│   │   │   ├── Header.tsx            # 헤더
│   │   │   ├── Footer.tsx            # 푸터
│   │   │   └── LandingPage.tsx       # 랜딩 페이지
│   │   ├── features/                 # 기능별 컴포넌트
│   │   │   └── selfcheck/            # 자가진단
│   │   │       ├── BaspSelfCheck.tsx # BASP 자가진단
│   │   │       ├── components/       # 자가진단 컴포넌트
│   │   │       ├── logic.ts          # 자가진단 로직
│   │   │       └── types.ts          # 타입 정의
│   │   ├── api/                      # API 클라이언트
│   │   │   ├── apiClient.ts          # 기본 API 클라이언트
│   │   │   ├── baspApi.ts            # BASP API
│   │   │   └── productApi.ts         # 제품 검색 API
│   │   ├── service/                  # 서비스 로직
│   │   │   ├── hairChangeService.tsx # 헤어 변경 서비스
│   │   │   ├── hairDamageService.tsx # 헤어 손상 서비스
│   │   │   └── service.ts            # 공통 서비스
│   │   ├── store/                    # Redux 스토어
│   │   │   ├── store.ts              # 스토어 설정
│   │   │   ├── tokenSlice.ts         # 토큰 슬라이스
│   │   │   └── userSlice.ts          # 사용자 슬라이스
│   │   ├── user/                     # 사용자 관련
│   │   │   ├── Login.tsx             # 로그인
│   │   │   └── SignUp.tsx            # 회원가입
│   │   ├── style/                    # 스타일
│   │   │   └── MainLayout.css        # 메인 레이아웃 스타일
│   │   ├── App.tsx                   # 메인 앱
│   │   ├── App.css                   # 앱 스타일
│   │   ├── index.tsx                 # 진입점
│   │   └── index.css                 # 글로벌 스타일
│   ├── public/                       # 정적 파일
│   ├── package.json                  # npm 의존성
│   ├── tailwind.config.js            # Tailwind 설정
│   ├── tsconfig.json                 # TypeScript 설정
│   └── postcss.config.js             # PostCSS 설정
├── mds/                              # 문서
│   ├── BASP/                         # BASP 관련
│   └── basp_selfcheck/               # BASP 자가진단 문서
├── SETUP_GUIDE.md                    # 설정 가이드
├── PROJECT_STRUCTURE.md              # 프로젝트 구조 (이 파일)
└── ReadMe.md                         # 프로젝트 README
```

## 🚀 서비스별 구조

### 1. 제품 검색 서비스 (새로 추가)
- **백엔드**: `backend/main.py` (FastAPI)
- **프론트엔드**: `frontend/src/components/ProductSearchPage.tsx`
- **API**: `frontend/src/api/productApi.ts`
- **기능**: 11번가 API 연동, 제품 검색, 필터링

### 2. AI 서비스들 (기존)
- **백엔드**: `backend/python/app.py` (FastAPI)
- **기능**: 헤어 분석, BASP 자가진단, 헤어 변경
- **데이터**: Pinecone, ChromaDB 사용

### 3. Spring Boot 서버 (기존)
- **백엔드**: `backend/springboot/` (Java)
- **기능**: 사용자 관리, 인증, 기타 비즈니스 로직

### 4. React 프론트엔드 (기존)
- **프론트엔드**: `frontend/` (React + TypeScript)
- **기능**: 모든 UI 컴포넌트, 라우팅, 상태 관리

## 🔧 개발 환경

### 백엔드 서버들
1. **제품 검색 서버**: `backend/main.py` (포트 8000)
2. **AI 서버**: `backend/python/app.py` (포트 8001)
3. **Spring Boot 서버**: `backend/springboot/` (포트 8080)

### 프론트엔드
- **React 앱**: `frontend/` (포트 3000)

## 📝 주요 변경사항

### 제거된 파일들
- ❌ `backend/err.txt` - 에러 로그 파일
- ❌ `backend/python/package-lock.json` - 잘못된 위치의 npm 파일
- ❌ `frontend/PRODUCT_SEARCH_SETUP.md` - 중복 설정 가이드
- ❌ `frontend/src/components/Component.js` - 사용하지 않는 컴포넌트
- ❌ `frontend/src/App.test.js` - 테스트 파일
- ❌ `frontend/src/setupTests.js` - 테스트 설정
- ❌ `frontend/src/reportWebVitals.ts` - 성능 모니터링
- ❌ `frontend/src/logo.svg` - 사용하지 않는 로고

### 추가된 파일들
- ✅ `backend/main.py` - 제품 검색 FastAPI 서버
- ✅ `backend/run.py` - 서버 실행 스크립트
- ✅ `backend/requirements.txt` - 제품 검색 서버 의존성
- ✅ `backend/README.md` - 백엔드 설정 가이드
- ✅ `frontend/src/api/productApi.ts` - 제품 검색 API 클라이언트
- ✅ `SETUP_GUIDE.md` - 전체 설정 가이드
- ✅ `PROJECT_STRUCTURE.md` - 프로젝트 구조 문서

## 🎯 다음 단계

1. **환경 변수 설정**: `backend/.env` 파일 생성
2. **서버 실행**: 각 서버별로 실행
3. **테스트**: 제품 검색 기능 테스트
4. **배포**: Docker를 통한 배포 준비

---

**📋 이 구조는 확장 가능하고 유지보수가 용이하도록 설계되었습니다.**
