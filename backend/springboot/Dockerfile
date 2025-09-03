# 1단계: Gradle을 사용하여 애플리케이션 빌드
FROM gradle:jdk17-focal AS builder
WORKDIR /app
COPY . .
RUN ./gradlew build -x test

# 2단계: 빌드된 jar 파일만 복사하여 최종 이미지 생성
FROM openjdk:17
WORKDIR /app
COPY --from=builder /app/build/libs/springboot-0.0.1-SNAPSHOT.jar app.jar
ENTRYPOINT ["java", "-jar", "app.jar"]