package com.example.springboot;

import io.github.cdimascio.dotenv.Dotenv;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class SpringbootApplication {

    public static void main(String[] args) {
        try {
            // 프로젝트 루트의 .env 파일 로드 (절대 경로 사용)
            String projectRoot = "C:\\Users\\301\\dev\\MOZARA";
            String envPath = projectRoot + "\\.env";
            
            System.out.println("프로젝트 루트: " + projectRoot);
            System.out.println(".env 파일 경로: " + envPath);
            
            // 파일 존재 확인
            java.io.File envFile = new java.io.File(envPath);
            if (envFile.exists()) {
                System.out.println(".env 파일 존재 확인됨");
            } else {
                System.out.println(".env 파일이 존재하지 않습니다: " + envPath);
            }
            
            Dotenv dotenv = Dotenv.configure()
                    .directory(projectRoot) // 절대 경로 사용
                    .filename(".env")
                    .ignoreIfMalformed() // 잘못된 형식의 파일 무시
                    .ignoreIfMissing() // 파일이 없어도 무시
                    .load();
            
            // 환경변수를 시스템 프로퍼티로 설정
            dotenv.entries().forEach(entry -> {
                System.setProperty(entry.getKey(), entry.getValue());
                System.out.println("환경변수 설정: " + entry.getKey() + " = " + 
                    (entry.getKey().contains("SECRET") || entry.getKey().contains("KEY") ? 
                     entry.getValue().substring(0, Math.min(8, entry.getValue().length())) + "..." : 
                     entry.getValue()));
            });
            
            System.out.println("프로젝트 루트 .env 파일에서 환경변수 로드 완료: " + dotenv.entries().size() + "개");
        } catch (Exception e) {
            System.err.println("프로젝트 루트 .env 파일 로드 실패, 기본값 사용: " + e.getMessage());
            e.printStackTrace();
        }
        
        SpringApplication.run(SpringbootApplication.class, args);
    }

}
