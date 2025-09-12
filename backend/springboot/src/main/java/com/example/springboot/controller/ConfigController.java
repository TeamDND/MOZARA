package com.example.springboot.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class ConfigController {

    @Value("${youtube.api.key:}")
    private String youtubeApiKey;

    /**
     * 환경변수 설정 조회
     * @return 환경변수 설정 정보
     */
    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> getConfig() {
        Map<String, Object> config = new HashMap<>();
        config.put("apiBaseUrl", "http://localhost:8080/api");
        config.put("youtubeApiKey", youtubeApiKey);
        config.put("hasYouTubeKey", !youtubeApiKey.isEmpty());
        
        return ResponseEntity.ok(config);
    }
}
