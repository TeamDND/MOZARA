package com.example.springboot.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.PropertiesPropertySource;
import org.springframework.stereotype.Component;

import jakarta.annotation.PostConstruct;
import java.io.FileInputStream;
import java.io.IOException;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Properties;

/**
 * 프로젝트 루트의 .env 파일을 읽어서 Spring 환경변수에 추가하는 설정 클래스
 */
@Configuration
public class EnvironmentConfig {

    private final ConfigurableEnvironment environment;

    public EnvironmentConfig(ConfigurableEnvironment environment) {
        this.environment = environment;
    }

    @PostConstruct
    public void loadEnvironmentFile() {
        try {
            // 현재 작업 디렉토리에서 상위 디렉토리(프로젝트 루트)의 .env 파일 경로
            Path currentPath = Paths.get("").toAbsolutePath();

            // backend/springboot에서 실행 중이라면 2단계 위로
            Path envFilePath;
            if (currentPath.toString().contains("backend") && currentPath.toString().contains("springboot")) {
                envFilePath = currentPath.getParent().getParent().resolve(".env");
            } else if (currentPath.toString().contains("backend")) {
                // backend 디렉토리에서 실행 중이라면 1단계 위로
                envFilePath = currentPath.getParent().resolve(".env");
            } else {
                // 루트에서 실행 중이라면 현재 디렉토리
                envFilePath = currentPath.resolve(".env");
            }

            System.out.println("🔍 .env 파일 경로: " + envFilePath.toString());

            if (envFilePath.toFile().exists()) {
                Properties props = new Properties();

                try (FileInputStream fis = new FileInputStream(envFilePath.toFile())) {
                    // .env 파일을 수동으로 파싱 (Properties는 key=value 형식만 지원)
                    String content = new String(fis.readAllBytes());
                    String[] lines = content.split("\\r?\\n");

                    for (String line : lines) {
                        line = line.trim();

                        // 빈 줄이나 주석 무시
                        if (line.isEmpty() || line.startsWith("#")) {
                            continue;
                        }

                        // key=value 형식 파싱
                        int equalIndex = line.indexOf('=');
                        if (equalIndex > 0) {
                            String key = line.substring(0, equalIndex).trim();
                            String value = line.substring(equalIndex + 1).trim();

                            // 인라인 주석 제거 (# 이후 부분)
                            int commentIndex = value.indexOf(" #");
                            if (commentIndex > 0) {
                                value = value.substring(0, commentIndex).trim();
                            }

                            props.setProperty(key, value);
                            System.out.println("✅ 환경변수 로드: " + key + " = " + value);
                        }
                    }
                }

                // Spring Environment에 .env 파일의 프로퍼티 추가
                PropertiesPropertySource propertySource = new PropertiesPropertySource("dotenv", props);
                environment.getPropertySources().addLast(propertySource);

                System.out.println("🎉 .env 파일 로드 완료! 총 " + props.size() + "개 환경변수 추가");

            } else {
                System.out.println("⚠️ .env 파일을 찾을 수 없습니다: " + envFilePath.toString());
                System.out.println("💡 시스템 환경변수를 사용합니다.");
            }

        } catch (IOException e) {
            System.err.println("❌ .env 파일 로드 중 오류 발생: " + e.getMessage());
            e.printStackTrace();
        }
    }
}