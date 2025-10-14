# Python FastAPI Dockerfile
FROM python:3.11-slim

WORKDIR /app

# 시스템 의존성 설치
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Python 의존성 파일 복사
COPY requirements.txt .

# Python 의존성 설치 (캐시 최적화)
RUN pip install --no-cache-dir -r requirements.txt

# gdown 설치 (모델 파일 다운로드용)
RUN pip install gdown

# 소스 코드 복사 (의존성 설치 후)
COPY . .

# 모델 디렉토리 생성 (모델 파일은 런타임에 다운로드)
RUN mkdir -p /app/services/swin_hair_classification/models/face_parsing/res/cp

# 포트 8000 노출
EXPOSE 8000

# FastAPI 서버 실행
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
