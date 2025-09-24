# Spring Boot Dockerfile
FROM openjdk:17-jdk-slim AS build

WORKDIR /app

# Gradle wrapper와 설정 파일 복사
COPY gradlew .
COPY gradle gradle
COPY build.gradle .
COPY settings.gradle .

# 의존성 다운로드를 위해 빌드 스크립트 실행
RUN chmod +x ./gradlew
RUN ./gradlew build -x test --no-daemon

# 소스 코드 복사
COPY src src

# 애플리케이션 빌드
RUN ./gradlew build -x test --no-daemon

# 런타임 이미지
FROM openjdk:17-jdk-slim

WORKDIR /app

# 빌드된 JAR 파일 복사
COPY --from=build /app/build/libs/*.jar app.jar

# 포트 8080 노출
EXPOSE 8080

# 애플리케이션 실행
ENTRYPOINT ["java", "-jar", "app.jar"]
