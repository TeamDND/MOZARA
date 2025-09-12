# MOZARA 백엔드 서버

11번가 API를 통한 제품 검색 서비스를 제공하는 FastAPI 백엔드 서버입니다.

## 🚀 빠른 시작

### 1. 의존성 설치

```bash
cd backend
pip install -r requirements.txt
```

### 2. 환경 변수 설정

`backend/.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
ELEVEN_ST_API_KEY=your_11st_api_key_here
```

**API 키가 없어도 더미 데이터로 테스트할 수 있습니다.**

### 3. 서버 실행

```bash
# 방법 1: Python 스크립트 사용
python run.py

# 방법 2: uvicorn 직접 사용
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. 서버 확인

- **서버 주소**: http://localhost:8000
- **API 문서**: http://localhost:8000/docs
- **헬스 체크**: http://localhost:8000/health

## 📚 API 엔드포인트

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
- `categoryId` (선택): 카테고리 ID

**예시:**
```
GET /api/products/search?keyword=탈모샴푸&pageNo=1&pageSize=5
```

## 🔧 개발 정보

### 기술 스택
- **FastAPI**: 웹 프레임워크
- **Uvicorn**: ASGI 서버
- **Requests**: HTTP 클라이언트
- **Python-dotenv**: 환경 변수 관리

### 주요 기능
- 11번가 API 통합
- XML 응답 파싱
- 더미 데이터 제공 (API 오류 시)
- CORS 설정
- 에러 핸들링

### 보안
- API 키는 환경 변수로 관리
- 프론트엔드에서 직접 API 키에 접근 불가
- CORS 설정으로 특정 도메인만 허용

## 🐛 문제 해결

### API 키 오류
```
⚠️ 경고: ELEVEN_ST_API_KEY가 설정되지 않았습니다.
```
**해결 방법**: `backend/.env` 파일에 API 키를 설정하세요.

### 포트 충돌
```
ERROR: [Errno 48] Address already in use
```
**해결 방법**: 다른 포트를 사용하거나 기존 프로세스를 종료하세요.

### CORS 오류
프론트엔드에서 API 호출 시 CORS 오류가 발생하면 `main.py`의 CORS 설정을 확인하세요.

## 📝 로그

서버 실행 시 다음과 같은 로그를 확인할 수 있습니다:
- API 키 설정 상태
- 11번가 API 호출 결과
- 더미 데이터 사용 여부
- 에러 메시지

## 🔄 업데이트

코드 변경 시 `--reload` 옵션으로 자동 재시작됩니다.
