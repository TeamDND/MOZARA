package com.example.springboot.controller;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api")
public class RefreshController {

    /**
     * 토큰 갱신 (더미 구현)
     * @return 갱신된 토큰
     */
    @PostMapping("/refresh")
    public ResponseEntity<Map<String, String>> refreshToken() {
        // 실제 구현에서는 JWT 토큰 갱신 로직이 필요
        // 현재는 더미 응답 반환
        Map<String, String> response = Map.of(
            "message", "Token refresh not implemented",
            "status", "success"
        );
        
        HttpHeaders headers = new HttpHeaders();
        headers.set("authorization", "Bearer dummy-refresh-token");
        
        return ResponseEntity.ok()
                .headers(headers)
                .body(response);
    }
}
