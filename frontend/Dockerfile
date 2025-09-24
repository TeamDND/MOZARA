FROM node:alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install --silent --legacy-peer-deps

COPY . /app
ENV CI=false
ENV SKIP_PREFLIGHT_CHECK=true
ENV TSC_COMPILE_ON_ERROR=true
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
ENTRYPOINT ["nginx", "-g", "daemon off;"]
