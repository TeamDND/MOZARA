FROM openjdk:17-jdk-slim
WORKDIR /app
COPY . .

RUN chmod +x ./gradlew
RUN ./gradlew bootJar

ENV JAR_PATH=/app/build/libs
RUN mv ${JAR_PATH}/*.jar /app/app.jar
EXPOSE 8080
ENTRYPOINT ["java","-jar","app.jar"]
