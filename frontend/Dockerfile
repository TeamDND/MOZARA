# Frontend Dockerfile
FROM node:18-alpine AS build

WORKDIR /app

# package.json과 package-lock.json 복사
COPY package*.json ./

# npm 캐시 정리 및 의존성 설치
RUN npm cache clean --force
RUN npm install --legacy-peer-deps

# 소스 코드 복사
COPY . .

# 프로덕션 빌드
RUN npm run build

# Nginx를 사용한 정적 파일 서빙
FROM nginx:alpine

# 빌드된 파일을 nginx로 복사
COPY --from=build /app/build /usr/share/nginx/html

# nginx 설정 파일 복사 (필요시)
# COPY nginx.conf /etc/nginx/nginx.conf

# 포트 80 노출
EXPOSE 80

# nginx 실행
CMD ["nginx", "-g", "daemon off;"]
