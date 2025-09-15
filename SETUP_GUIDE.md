# MOZARA 제품 검색 시스템 설정 가이드

백엔드와 프론트엔드를 분리하여 보안을 강화한 11번가 제품 검색 시스템입니다.

## 🏗️ 아키텍처

```
프론트엔드 (React) ←→ 백엔드 (FastAPI) ←→ 11번가 API
     ↓                    ↓
  사용자 인터페이스    API 키 관리 & 데이터 처리
```

## 🚀 빠른 시작

### 1. 백엔드 설정

#### 1.1 의존성 설치
```bash
cd backend
pip install -r requirements.txt
```

#### 1.2 환경 변수 설정
`backend/.env` 파일을 생성하고 다음 내용을 추가하세요:

<<<<<<< HEAD

=======
>>>>>>> 4db0a47346bf4ca79506b311747d0f93b89ae166

**⚠️ 중요**: API 키가 없어도 더미 데이터로 테스트할 수 있습니다.

#### 1.3 백엔드 서버 실행
```bash
# 방법 1: Python 스크립트 사용 (권장)
python run.py

# 방법 2: uvicorn 직접 사용
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

#### 1.4 백엔드 확인
- **서버 주소**: http://localhost:8000
- **API 문서**: http://localhost:8000/docs
- **헬스 체크**: http://localhost:8000/health

### 2. 프론트엔드 설정

#### 2.1 의존성 설치
```bash
cd frontend
npm install
```

#### 2.2 프론트엔드 실행
```bash
npm start
```

#### 2.3 프론트엔드 확인
- **서버 주소**: http://localhost:3000
- **제품 검색**: http://localhost:3000/product-search

## 📚 주요 기능

### 백엔드 (FastAPI)
- ✅ 11번가 API 통합
- ✅ XML 응답 파싱
- ✅ 더미 데이터 제공 (API 오류 시)
- ✅ CORS 설정
- ✅ 에러 핸들링
- ✅ API 키 보안 관리

### 프론트엔드 (React)
- ✅ 제품 검색 UI
- ✅ 인기 검색어
- ✅ 필터링 (가격, 정렬)
- ✅ 페이지네이션
- ✅ 이미지 로딩/에러 처리
- ✅ 11번가 직접 링크

## 🔧 API 엔드포인트

### 제품 검색
```
GET /api/products/search
```

**파라미터:**
- `keyword` (필수): 검색 키워드
- `pageNo` (선택): 페이지 번호 (기본값: 1)
- `pageSize` (선택): 페이지 크기 (기본값: 5)
- `sortCd` (선택): 정렬 코드 (기본값: sim)
- `minPrice` (선택): 최소 가격
- `maxPrice` (선택): 최대 가격

**예시:**
```
GET /api/products/search?keyword=탈모샴푸&pageNo=1&pageSize=5
```

## 🛡️ 보안 개선사항

### 이전 (프론트엔드 직접 호출)
- ❌ API 키가 프론트엔드에 노출
- ❌ 브라우저에서 직접 외부 API 호출
- ❌ CORS 문제 발생 가능

### 현재 (백엔드 프록시)
- ✅ API 키가 백엔드에서만 관리
- ✅ 프론트엔드에서 백엔드 API만 호출
- ✅ CORS 설정으로 안전한 통신
- ✅ 에러 핸들링 및 로깅

## 🐛 문제 해결

### 백엔드 서버가 시작되지 않음
```bash
# 포트 확인
netstat -ano | findstr :8000

# 다른 포트 사용
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
```

### 프론트엔드에서 API 호출 실패
1. 백엔드 서버가 실행 중인지 확인
2. CORS 설정 확인
3. 네트워크 탭에서 오류 메시지 확인

### API 키 오류
```
⚠️ 경고: ELEVEN_ST_API_KEY가 설정되지 않았습니다.
```
**해결 방법**: `backend/.env` 파일에 API 키를 설정하세요.

## 📝 개발 정보

### 기술 스택
- **백엔드**: FastAPI, Uvicorn, Requests, Python-dotenv
- **프론트엔드**: React, TypeScript, Tailwind CSS
- **API**: 11번가 Open API

### 파일 구조
```
backend/
├── main.py              # FastAPI 서버
├── run.py               # 서버 실행 스크립트
├── requirements.txt     # Python 의존성
├── .env                 # 환경 변수 (생성 필요)
└── README.md           # 백엔드 가이드

frontend/
├── src/
│   ├── components/
│   │   └── ProductSearchPage.tsx  # 제품 검색 페이지
│   └── api/
│       └── productApi.ts          # API 클라이언트
└── package.json
```

## 🔄 업데이트

### 코드 변경 시
- **백엔드**: `--reload` 옵션으로 자동 재시작
- **프론트엔드**: React 개발 서버로 자동 재시작

### 새로운 기능 추가
1. 백엔드에 새로운 엔드포인트 추가
2. 프론트엔드 API 클라이언트 업데이트
3. UI 컴포넌트 수정

## 📞 지원

문제가 발생하면 다음을 확인하세요:
1. 백엔드 서버 상태: http://localhost:8000/health
2. 프론트엔드 콘솔 오류
3. 네트워크 탭의 API 호출 상태

---

**🎉 설정이 완료되었습니다! 이제 안전하고 확장 가능한 제품 검색 시스템을 사용할 수 있습니다.**
