FROM node:alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --silent --legacy-peer-deps

COPY . /app
ENV CI=false
ENV SKIP_PREFLIGHT_CHECK=true
ENV TSC_COMPILE_ON_ERROR=true
RUN echo "=== 빌드 시작 ==="
RUN npm run build
RUN echo "=== 빌드 완료 ==="
RUN ls -la /app/build/
RUN echo "=== index.html 내용 ==="
RUN cat /app/build/index.html | head -10
RUN echo "=== static 폴더 확인 ==="
RUN ls -la /app/build/static/ || echo "static 폴더 없음"

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80 443
ENTRYPOINT ["nginx", "-g", "daemon off;"]