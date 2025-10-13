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
public class WeatherService {

    @Value("${ai.python.base-url:http://localhost:8000}")
    private String pythonBaseUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * 날씨 정보 조회 (UV, 습도, 대기질 + 두피 케어 추천)
     * Python 경로: /api/weather?lat={lat}&lon={lon}
     */
    public Map<String, Object> getWeatherInfo(Double lat, Double lon) throws Exception {
        String url = UriComponentsBuilder.fromHttpUrl(pythonBaseUrl + "/api/weather")
                .queryParam("lat", lat)
                .queryParam("lon", lon)
                .toUriString();

        log.info("Python API 호출 - 날씨 정보: {}", url);

        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                log.info("날씨 정보 조회 성공");
                return response.getBody();
            } else {
                throw new Exception("Python 날씨 API 응답 오류: " + response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("Python 날씨 API 통신 오류: {}", e.getMessage());
            
            // 기본 응답 반환
            Map<String, Object> fallback = new HashMap<>();
            fallback.put("success", false);
            fallback.put("error", "날씨 서비스 연결 오류");
            fallback.put("message", e.getMessage());
            return fallback;
        }
    }
}

