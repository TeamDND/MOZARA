#!/bin/bash

# MOZARA 프로젝트 배포 스크립트

echo "🚀 MOZARA 프로젝트 배포 시작..."

# docker 폴더로 이동
cd "$(dirname "$0")"

# 환경 확인
if [ ! -f .env ]; then
    echo "❌ .env 파일이 없습니다. env.docker을 .env로 복사해주세요."
    echo "cp env.docker .env"
    exit 1
fi

# Docker 및 Docker Compose 설치 확인
if ! command -v docker &> /dev/null; then
    echo "❌ Docker가 설치되지 않았습니다."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose가 설치되지 않았습니다."
    exit 1
fi

# 기존 컨테이너 중지 및 제거
echo "🛑 기존 컨테이너 중지 및 제거..."
docker-compose down --volumes --remove-orphans

# 이미지 빌드
echo "🔨 Docker 이미지 빌드..."
docker-compose build --no-cache

# 서비스 시작
echo "▶️ 서비스 시작..."
docker-compose up -d

# 서비스 상태 확인
echo "📊 서비스 상태 확인..."
sleep 10
docker-compose ps

echo "✅ 배포 완료!"
echo "🌐 프론트엔드: http://localhost:3000"
echo "🔧 Spring Boot API: http://localhost:8080"
echo "🤖 Python FastAPI: http://localhost:8000"
echo "📚 API 문서: http://localhost:8000/docs"
echo "🔍 Swagger UI: http://localhost:8080/swagger-ui.html"

echo ""
echo "📝 로그 확인 명령어:"
echo "docker-compose logs -f [서비스명]"
echo "예: docker-compose logs -f springboot"
