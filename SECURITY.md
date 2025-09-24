# 🔒 보안 가이드

## 환경변수 관리

### ⚠️ **절대 하지 말아야 할 것**
- API 키를 코드 파일에 하드코딩하지 마세요
- `.env` 파일을 Git에 커밋하지 마세요
- API 키를 로그나 콘솔에 출력하지 마세요
- 공개 저장소에 API 키를 노출하지 마세요

### ✅ **올바른 방법**

#### 1. 환경변수 파일 사용
```bash
# .env 파일에 저장
NAVER_CLIENT_ID=your_actual_key_here
KAKAO_REST_API_KEY=your_actual_key_here
```

#### 2. 코드에서 환경변수 사용
```python
# Python
import os
api_key = os.getenv("NAVER_CLIENT_ID")
```

```javascript
// React
const apiKey = process.env.REACT_APP_NAVER_CLIENT_ID;
```

#### 3. .gitignore에 추가
```gitignore
.env
*.env
.env.local
.env.production
```

### 🛡️ **운영환경 보안**

#### 1. 시스템 환경변수 사용
```bash
# Linux/macOS
export NAVER_CLIENT_ID="your_key_here"

# Windows
set NAVER_CLIENT_ID=your_key_here
```

#### 2. Docker Secrets 사용
```yaml
version: '3.8'
services:
  backend:
    environment:
      - NAVER_CLIENT_ID_FILE=/run/secrets/naver_client_id
    secrets:
      - naver_client_id
secrets:
  naver_client_id:
    external: true
```

#### 3. 클라우드 환경
- **AWS**: AWS Secrets Manager, Parameter Store
- **Google Cloud**: Secret Manager
- **Azure**: Key Vault

### 📋 **체크리스트**

- [ ] `.env` 파일이 `.gitignore`에 추가되었는가?
- [ ] 코드에 하드코딩된 API 키가 없는가?
- [ ] `.env.example` 템플릿이 제공되었는가?
- [ ] 프로덕션 환경에서 시스템 환경변수를 사용하는가?
- [ ] API 키가 로그에 출력되지 않는가?

### 🚨 **API 키 유출 시 대처방안**

1. **즉시 API 키 비활성화**
2. **새로운 API 키 발급**
3. **Git 히스토리에서 키 제거** (BFG Repo-Cleaner 사용)
4. **모든 환경의 키 업데이트**

## 추가 보안 조치

### 1. API 키 접근 제한
- IP 주소 화이트리스트 설정
- 리퍼러 제한 설정
- 사용량 모니터링

### 2. HTTPS 사용
- 모든 API 통신에 HTTPS 사용
- SSL/TLS 인증서 정기 갱신

### 3. CORS 정책
- 허용된 도메인만 API 접근 허용
- Preflight 요청 적절히 처리