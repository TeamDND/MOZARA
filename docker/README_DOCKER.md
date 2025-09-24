# MOZARA Docker 배포 가이드

## 📋 개요
MOZARA 프로젝트를 Docker를 사용하여 AWS에서 배포하는 방법을 안내합니다.

## 🗂️ 파일 구조
```
project/
├── docker/                     # Docker 관련 파일들
│   ├── docker-compose.yml      # 개발용 Docker Compose
│   ├── docker-compose.prod.yml # 프로덕션용 Docker Compose
│   ├── env.docker              # 환경변수 예시 파일
│   ├── nginx.conf              # Nginx 설정 (개발용)
│   ├── nginx.prod.conf         # Nginx 설정 (프로덕션용)
│   ├── deploy.sh               # 로컬 배포 스크립트
│   ├── deploy-aws.sh           # AWS 자동 배포 스크립트
│   └── README_DOCKER.md        # 이 파일
├── deploy.sh                   # 루트 배포 스크립트 (docker/deploy.sh 호출)
├── deploy-aws.sh               # 루트 AWS 배포 스크립트 (docker/deploy-aws.sh 호출)
├── frontend/
│   └── Dockerfile              # React 프론트엔드
└── backend/
    ├── python/
    │   └── Dockerfile          # Python FastAPI
    └── springboot/
        └── Dockerfile          # Spring Boot
```

## 🚀 빠른 시작

### 1. 환경 설정
```bash
# docker 폴더로 이동
cd docker

# 환경변수 파일 생성
cp env.docker .env

# .env 파일을 편집하여 실제 API 키 입력
nano .env
```

### 2. 배포 실행
```bash
# 방법 1: 루트에서 실행 (권장)
chmod +x deploy.sh
./deploy.sh

# 방법 2: docker 폴더에서 직접 실행
cd docker
chmod +x deploy.sh
./deploy.sh
```

### 3. 수동 배포 (선택사항)
```bash
# docker 폴더로 이동
cd docker

# 기존 컨테이너 정리
docker-compose down --volumes

# 이미지 빌드 및 실행
docker-compose up --build -d

# 로그 확인
docker-compose logs -f
```

## 🔧 서비스 포트

| 서비스 | 포트 | 설명 |
|--------|------|------|
| Frontend | 3000 | React 앱 |
| Spring Boot | 8080 | 사용자 관리, DB |
| Python FastAPI | 8000 | AI 서비스 |
| MySQL | 3306 | 데이터베이스 |
| Nginx | 80 | 리버스 프록시 |

## 📊 서비스 상태 확인

### 전체 서비스 상태
```bash
cd docker
docker-compose ps
```

### 개별 서비스 로그
```bash
cd docker
docker-compose logs -f springboot
docker-compose logs -f python-api
docker-compose logs -f frontend
docker-compose logs -f mysql
```

### 서비스 재시작
```bash
cd docker
docker-compose restart [서비스명]
```

## 🔑 환경변수 설정

### 필수 API 키
- `GEMINI_API_KEY`: Google Gemini API 키
- `OPENAI_API_KEY`: OpenAI API 키
- `YOUTUBE_API_KEY`: YouTube Data API 키
- `ELEVEN_ST_API_KEY`: 11번가 API 키
- `PINECONE_API_KEY`: Pinecone API 키

### OAuth2 설정
- `GOOGLE_CLIENT_ID`: Google OAuth2 클라이언트 ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth2 클라이언트 시크릿
- `KAKAO_CLIENT_SECRET`: Kakao OAuth2 클라이언트 시크릿
- `NAVER_CLIENT_ID`: Naver OAuth2 클라이언트 ID
- `NAVER_CLIENT_SECRET`: Naver OAuth2 클라이언트 시크릿

### Docker Hub 설정
- `DOCKERHUB_TOKEN`: Docker Hub 액세스 토큰
- `DOCKERHUB_USERNAME`: Docker Hub 사용자명

### AWS 배포 설정
- `LIVE_SERVER_IP`: AWS 탄력적 IP 주소 또는 DuckDNS 도메인 (예: your-domain.duckdns.org)
- `EC2_SSH_KEY`: EC2 PEM 키 파일 내용

## 🔐 GitHub Secrets 설정

GitHub Actions를 사용한 자동 배포를 위해서는 다음 Secrets를 설정해야 합니다:

### Repository Settings → Secrets and variables → Actions에서 설정

#### 필수 API 키
- `GEMINI_API_KEY`
- `OPENAI_API_KEY`
- `YOUTUBE_API_KEY`
- `ELEVEN_ST_API_KEY`
- `PINECONE_API_KEY`
- `PINECONE_ENVIRONMENT`
- `PINECONE_INDEX_NAME`

#### OAuth2 설정
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `KAKAO_CLIENT_SECRET`
- `NAVER_CLIENT_ID`
- `NAVER_CLIENT_SECRET`

#### 데이터베이스 설정
- `JWT_SECRET_KEY` (DB는 기본값 사용: root/1234)

#### Docker Hub 설정
- `DOCKERHUB_TOKEN`
- `DOCKERHUB_USERNAME`

#### AWS 배포 설정
- `LIVE_SERVER_IP` (DuckDNS 도메인 또는 AWS 탄력적 IP)
- `EC2_SSH_KEY`

#### 기타 설정
- `DOMAIN_NAME` (DuckDNS 도메인, 예: your-domain.duckdns.org)

## 🌐 AWS 배포

### DuckDNS 설정 (무료 도메인)
1. **DuckDNS 가입**: https://www.duckdns.org/
2. **도메인 생성**: 원하는 서브도메인 선택 (예: myapp.duckdns.org)
3. **AWS 탄력적 IP 연결**: DuckDNS 도메인을 AWS 탄력적 IP에 연결
4. **자동 업데이트 설정**: EC2 인스턴스에 DuckDNS 업데이트 스크립트 설치 (선택사항)

### EC2 인스턴스 설정
1. **인스턴스 타입**: t3.medium 이상 권장
2. **스토리지**: 최소 20GB
3. **보안 그룹**: HTTP(80), HTTPS(443), SSH(22) 포트 열기
4. **탄력적 IP**: 고정 IP 할당 및 DuckDNS 도메인에 연결

### 배포 방법

#### 방법 1: GitHub Actions 자동 배포 (권장)
1. **GitHub Secrets 설정**: Repository Settings → Secrets and variables → Actions에서 모든 필수 Secrets 설정
2. **코드 푸시**: main 브랜치에 코드를 푸시하면 자동으로 배포됩니다
3. **워크플로우 확인**: GitHub Actions 탭에서 배포 진행상황 확인

#### 방법 2: 로컬 자동 배포
```bash
# 1. 환경변수 설정
cd docker
cp env.docker .env
nano .env  # API 키 및 AWS 정보 입력

# 2. AWS 자동 배포 실행
cd ..
chmod +x deploy-aws.sh
./deploy-aws.sh
```

#### 방법 3: 수동 배포
```bash
# 1. EC2 인스턴스 접속
ssh -i your-key.pem ubuntu@your-ec2-ip

# 2. Docker 설치
sudo apt update
sudo apt install docker.io docker-compose -y
sudo usermod -aG docker ubuntu

# 3. 프로젝트 클론
git clone your-repo-url
cd project

# 4. 환경변수 설정
cd docker
cp env.docker .env
nano .env  # API 키 입력

# 5. 배포 실행
cd ..
chmod +x deploy.sh
./deploy.sh
```

## 🛠️ 문제 해결

### 일반적인 문제들

#### 1. 포트 충돌
```bash
# 포트 사용 중인 프로세스 확인
sudo netstat -tulpn | grep :8080

# 프로세스 종료
sudo kill -9 [PID]
```

#### 2. 메모리 부족
```bash
# 메모리 사용량 확인
docker stats

# 불필요한 이미지/컨테이너 정리
docker system prune -a
```

#### 3. 데이터베이스 연결 오류
```bash
# docker 폴더로 이동
cd docker

# MySQL 컨테이너 로그 확인
docker-compose logs mysql

# 데이터베이스 재시작
docker-compose restart mysql
```

### 로그 레벨 조정
Spring Boot의 경우 `application.properties`에서:
```properties
logging.level.com.example.springboot=DEBUG
logging.level.org.springframework.security=DEBUG
```

## 📈 모니터링

### 리소스 모니터링
```bash
# 실시간 리소스 사용량
docker stats

# 디스크 사용량
docker system df
```

### 헬스 체크
```bash
# 각 서비스 상태 확인
curl http://localhost:8080/actuator/health  # Spring Boot
curl http://localhost:8000/                 # Python FastAPI
curl http://localhost:3000                  # Frontend
```

## 🔄 업데이트 배포

```bash
# 1. 코드 업데이트
git pull origin main

# 2. 재배포
cd docker
docker-compose down
docker-compose up --build -d

# 3. 로그 확인
docker-compose logs -f
```

## 📞 지원

문제가 발생하면 다음을 확인해주세요:
1. `.env` 파일의 API 키가 올바른지
2. Docker 및 Docker Compose가 정상 설치되었는지
3. 포트가 충돌하지 않는지
4. 충분한 메모리와 디스크 공간이 있는지

---

**마지막 업데이트**: 2025년 현재
**Docker 버전**: 20.10+
**Docker Compose 버전**: 1.29+
