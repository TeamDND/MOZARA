# 1단계: Node.js를 사용하여 React 앱 빌드
FROM node:18-alpine AS builder

WORKDIR /app

# package.json과 package-lock.json 복사
COPY package*.json ./

# 의존성 설치
RUN npm ci --only=production

# 소스 코드 복사
COPY . .

# React 앱 빌드
RUN npm run build

# 2단계: Nginx를 사용하여 정적 파일 서빙
FROM nginx:alpine

# Nginx 설정 파일 복사
COPY nginx.conf /etc/nginx/nginx.conf

# 빌드된 React 앱을 Nginx 웹 루트로 복사
COPY --from=builder /app/build /usr/share/nginx/html

# 포트 80 노출
EXPOSE 80

# Nginx 시작
CMD ["nginx", "-g", "daemon off;"]
