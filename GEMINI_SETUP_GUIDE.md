# Gemini API 연동 설정 가이드

## 개요
두피 진단 페이지에서 Gemini API를 안전하게 사용할 수 있도록 백엔드에서 API 키를 관리하도록 수정했습니다.

## 변경 사항

### 1. 백엔드 변경사항
- `backend/python/app.py`에 Gemini API 엔드포인트 추가
- `/api/hair-analysis` POST 엔드포인트 생성
- 환경 변수에서 `GOOGLE_API_KEY` 읽기
- `google-generativeai` 라이브러리 사용

### 2. 프론트엔드 변경사항
- `frontend/src/components/HairDiagnosis.tsx` 수정
- 직접 Gemini API 호출 제거
- 백엔드 API 호출로 변경
- API 키 노출 위험 제거

## 설정 방법

### 1. 환경 변수 설정
프로젝트 루트에 `.env` 파일을 생성하고 다음 내용을 추가하세요:

```env
GOOGLE_API_KEY=your_actual_gemini_api_key_here
```

### 2. Gemini API 키 발급
1. [Google AI Studio](https://makersuite.google.com/app/apikey)에 접속
2. Google 계정으로 로그인
3. "Create API Key" 클릭
4. 생성된 API 키를 `.env` 파일에 추가

### 3. 백엔드 실행
```bash
cd backend/python
pip install -r requirements.txt
python app.py
```

### 4. 프론트엔드 실행
```bash
cd frontend
npm install
npm start
```

## API 엔드포인트

### POST /api/hair-analysis
두피 이미지 분석을 위한 엔드포인트

**요청:**
```json
{
  "image_base64": "base64_encoded_image_string"
}
```

**응답:**
```json
{
  "stage": 3,
  "title": "중간 단계 탈모",
  "description": "상세한 분석 결과...",
  "advice": ["가이드 1", "가이드 2"]
}
```

### GET /api/hair-analysis/health
서비스 상태 확인

**응답:**
```json
{
  "status": "healthy",
  "service": "gemini-hair-analysis",
  "timestamp": "2024-01-01T00:00:00"
}
```

## 보안 개선사항

1. **API 키 보호**: Gemini API 키가 프론트엔드에서 제거되어 노출 위험 제거
2. **환경 변수**: `.env` 파일을 통한 안전한 API 키 관리
3. **Git 보호**: `.gitignore`에 `.env` 파일 포함으로 실수로 커밋되는 것 방지

## 문제 해결

### API 키 오류
- `.env` 파일이 프로젝트 루트에 있는지 확인
- `GOOGLE_API_KEY` 값이 올바른지 확인
- 백엔드 서버 재시작

### CORS 오류
- 백엔드에서 CORS 설정이 올바른지 확인
- 프론트엔드와 백엔드 포트가 다른지 확인

### 이미지 업로드 오류
- 이미지 파일 형식이 지원되는지 확인 (JPEG, PNG)
- 이미지 크기가 적절한지 확인

## 테스트 방법

1. 브라우저에서 `http://localhost:3000/hair-diagnosis` 접속
2. 두피 사진 업로드
3. "분석 시작" 버튼 클릭
4. 분석 결과 확인

## 추가 정보

- Gemini API 사용량 제한이 있을 수 있으니 주의
- 프로덕션 환경에서는 HTTPS 사용 권장
- API 키는 정기적으로 로테이션하는 것을 권장
