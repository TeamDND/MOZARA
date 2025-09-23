#!/bin/bash

# MOZARA 프로젝트 AWS 배포 스크립트

echo "🚀 MOZARA 프로젝트 AWS 배포 시작..."

# docker 폴더로 이동
cd "$(dirname "$0")"

# 환경 확인
if [ ! -f .env ]; then
    echo "❌ .env 파일이 없습니다. env.docker을 .env로 복사해주세요."
    echo "cp env.docker .env"
    exit 1
fi

# 필수 환경변수 확인 (GitHub Secrets 또는 로컬 .env 파일)
if [ -z "$DOCKERHUB_TOKEN" ] && [ -f .env ]; then
    echo "📁 .env 파일에서 환경변수를 로드합니다..."
    export $(grep -v '^#' .env | xargs)
fi

# DuckDNS 도메인 또는 IP 주소 확인
if [ -z "$LIVE_SERVER_IP" ]; then
    echo "❌ LIVE_SERVER_IP가 설정되지 않았습니다."
    echo "💡 DuckDNS 도메인 (예: your-domain.duckdns.org) 또는 AWS 탄력적 IP를 설정해주세요."
    exit 1
fi

required_vars=("DOCKERHUB_TOKEN" "DOCKERHUB_USERNAME" "EC2_SSH_KEY")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        echo "❌ 필수 환경변수 $var가 설정되지 않았습니다."
        echo "💡 GitHub Secrets 또는 .env 파일에 설정해주세요."
        exit 1
    fi
done

echo "✅ 환경변수 확인 완료"

# SSH 키 파일 생성
echo "🔑 SSH 키 파일 생성..."
echo "$EC2_SSH_KEY" > aws_key.pem
chmod 600 aws_key.pem

# Docker 이미지 빌드 및 푸시
echo "🔨 Docker 이미지 빌드 및 푸시..."

# Docker Hub 로그인
echo "$DOCKERHUB_TOKEN" | docker login --username "$DOCKERHUB_USERNAME" --password-stdin

# 이미지 빌드 및 태깅
docker compose build

# 이미지 푸시 (선택사항 - 로컬에서 빌드한 이미지를 Docker Hub에 푸시하려면)
# docker compose push

echo "📦 Docker 이미지 준비 완료"

# AWS EC2에 배포
echo "☁️ AWS EC2에 배포..."

# EC2 인스턴스에 Docker 관련 파일들 복사
echo "📁 파일을 $LIVE_SERVER_IP에 복사합니다..."
scp -i aws_key.pem -o StrictHostKeyChecking=no \
    docker-compose.yml \
    docker-compose.prod.yml \
    nginx.conf \
    .env \
    ubuntu@$LIVE_SERVER_IP:/home/ubuntu/mozara/

# EC2에서 배포 실행
echo "🚀 $LIVE_SERVER_IP에서 배포를 실행합니다..."
ssh -i aws_key.pem -o StrictHostKeyChecking=no ubuntu@$LIVE_SERVER_IP << 'EOF'
    cd /home/ubuntu/mozara
    
    # Docker 설치 확인 및 설치
    if ! command -v docker &> /dev/null; then
        echo "Docker 설치 중..."
        sudo apt update
        sudo apt install -y docker.io docker-compose
        sudo usermod -aG docker ubuntu
        sudo systemctl start docker
        sudo systemctl enable docker
    fi
    
    # 기존 컨테이너 정리
    sudo docker compose down --volumes --remove-orphans
    
    # 새 컨테이너 시작
    sudo docker compose up -d
    
    # 서비스 상태 확인
    sleep 10
    sudo docker compose ps
    
    echo "✅ AWS 배포 완료!"
    echo "🌐 서비스 URL: http://$LIVE_SERVER_IP"
EOF

# 로컬 SSH 키 파일 정리
rm -f aws_key.pem

echo "✅ AWS 배포 스크립트 완료!"
echo "🌐 서비스 URL: http://$LIVE_SERVER_IP"
echo "📊 서비스 상태 확인: ssh -i your-key.pem ubuntu@$LIVE_SERVER_IP 'cd /home/ubuntu/mozara && sudo docker-compose ps'"
