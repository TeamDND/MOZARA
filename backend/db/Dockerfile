FROM mysql:8.0

# 초기 데이터베이스 스키마 복사
COPY ./mozara.sql /docker-entrypoint-initdb.d/

# 환경변수 설정
ENV MYSQL_ROOT_PASSWORD=1234
ENV MYSQL_DATABASE=mozara
ENV MYSQL_USER=root
ENV MYSQL_PASSWORD=1234

# 포트 노출
EXPOSE 3306
