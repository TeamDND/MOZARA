# BASP 탈모 진단 시스템

## 개요
BASP(Basic And Specific classification) 분류를 이용한 탈모 자가진단 기능을 구현한 시스템입니다.

## 아키텍처
- **Frontend**: React (TypeScript)
- **Backend**: Spring Boot (Java)
- **AI Service**: Python FastAPI

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
1. **헤어라인 선택**: A(일자형), M(M자형), C(곡선형), U(U자형)
2. **정수리 상태**: V0(정상) ~ V3(넓은 감소)
3. **전체 밀도**: 0(풍성) ~ 3(심함)
4. **생활습관**: 빠짐 증가, 가족력, 수면시간, 흡연, 음주
5. **결과 제공**: BASP 분류, 진행 정도, 권장사항

## API 엔드포인트

### Spring Boot
- `POST /api/basp/evaluate`: BASP 진단 요청
- `GET /api/basp/health`: 서버 상태 확인

### Python FastAPI
- `POST /api/basp/evaluate`: BASP 진단 처리
- `GET /health`: 서버 상태 확인

## 주의사항
- 본 도구는 의료 진단이 아닌 참고용입니다.
- 증상이 지속·악화되면 전문의 상담을 권장합니다.
- Python 서버가 실행되지 않으면 Spring Boot에서 로컬 계산으로 폴백됩니다.
