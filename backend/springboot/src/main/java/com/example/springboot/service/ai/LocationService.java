package com.example.springboot.service.ai;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class LocationService {

    @Value("${ai.python.base-url:http://localhost:8000}")
    private String pythonBaseUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * 네이버 로컬 검색 API (Python 프록시)
     * Python 경로: /api/naver/local/search
     */
    public Map<String, Object> searchWithNaver(String query) throws Exception {
        String url = UriComponentsBuilder.fromHttpUrl(pythonBaseUrl + "/api/naver/local/search")
                .queryParam("query", query)
                .toUriString();

        log.info("Python API 호출 - 네이버 검색: {}", url);

        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                log.info("네이버 검색 성공");
                return response.getBody();
            } else {
                throw new Exception("Python 네이버 검색 API 응답 오류: " + response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("Python 네이버 검색 API 통신 오류: {}", e.getMessage());
            throw new Exception("네이버 검색 서비스 연결 오류: " + e.getMessage());
        }
    }

    /**
     * 카카오 로컬 검색 API (Python 프록시)
     * Python 경로: /api/kakao/local/search
     */
    public Map<String, Object> searchWithKakao(String query, Double x, Double y, Integer radius) throws Exception {
        UriComponentsBuilder builder = UriComponentsBuilder.fromHttpUrl(pythonBaseUrl + "/api/kakao/local/search")
                .queryParam("query", query);
        
        if (x != null && y != null) {
            builder.queryParam("x", x);
            builder.queryParam("y", y);
            builder.queryParam("radius", radius);
        }
        
        String url = builder.toUriString();
        log.info("Python API 호출 - 카카오 검색: {}", url);

        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                log.info("카카오 검색 성공");
                return response.getBody();
            } else {
                throw new Exception("Python 카카오 검색 API 응답 오류: " + response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("Python 카카오 검색 API 통신 오류: {}", e.getMessage());
            throw new Exception("카카오 검색 서비스 연결 오류: " + e.getMessage());
        }
    }

    /**
     * 위치 서비스 상태 확인
     * Python 경로: /api/location/status
     */
    public Map<String, Object> checkLocationServiceStatus() throws Exception {
        String url = pythonBaseUrl + "/api/location/status";
        log.info("Python API 호출 - 위치 서비스 상태: {}", url);

        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                log.info("위치 서비스 상태 확인 성공");
                return response.getBody();
            } else {
                throw new Exception("Python 위치 서비스 상태 API 응답 오류: " + response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("Python 위치 서비스 상태 API 통신 오류: {}", e.getMessage());
            
            // 기본 응답 반환
            Map<String, Object> fallback = new HashMap<>();
            fallback.put("status", "error");
            fallback.put("message", "Python 위치 서비스 연결 오류");
            fallback.put("naverApiConfigured", false);
            fallback.put("kakaoApiConfigured", false);
            return fallback;
        }
    }
}

