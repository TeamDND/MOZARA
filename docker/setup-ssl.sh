#!/bin/bash

# DuckDNS HTTPS SSL 인증서 설정 스크립트

echo "🔒 DuckDNS HTTPS SSL 인증서 설정을 시작합니다..."

# Certbot 설치
echo "📦 Certbot 설치 중..."
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# SSL 인증서 발급
echo "🔐 SSL 인증서 발급 중..."
sudo certbot certonly --standalone \
    --email your-email@example.com \
    --agree-tos \
    --no-eff-email \
    -d mozaracare.duckdns.org

# 인증서 파일 확인
if [ -f "/etc/letsencrypt/live/mozaracare.duckdns.org/fullchain.pem" ]; then
    echo "✅ SSL 인증서 발급 완료!"
    
    # SSL 인증서를 Docker 볼륨으로 복사
    echo "📁 SSL 인증서를 Docker 볼륨으로 복사..."
    sudo mkdir -p /home/ubuntu/ssl
    sudo cp /etc/letsencrypt/live/mozaracare.duckdns.org/fullchain.pem /home/ubuntu/ssl/
    sudo cp /etc/letsencrypt/live/mozaracare.duckdns.org/privkey.pem /home/ubuntu/ssl/
    sudo chown -R ubuntu:ubuntu /home/ubuntu/ssl
    
    echo "✅ SSL 설정 완료!"
    echo "🌐 이제 https://mozaracare.duckdns.org 로 접속 가능합니다!"
    
else
    echo "❌ SSL 인증서 발급 실패!"
    echo "💡 다음을 확인해주세요:"
    echo "   - DuckDNS 도메인이 올바르게 설정되었는지"
    echo "   - 방화벽에서 80, 443 포트가 열려있는지"
    echo "   - 이메일 주소가 올바른지"
fi
