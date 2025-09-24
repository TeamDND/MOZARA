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

# Python 의존성 설치
RUN pip install --no-cache-dir -r requirements.txt

# 소스 코드 복사
COPY . .

# 포트 8000 노출
EXPOSE 8000

# FastAPI 서버 실행
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
