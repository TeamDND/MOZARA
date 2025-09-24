package com.example.springboot.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class LocationController {

    @Value("${naver.client.id:gS0Y64BI1s4bbTfKFK56}")
    private String naverClientId;

    @Value("${naver.client.secret:uyIy0T4wVR}")
    private String naverClientSecret;

    @Value("${kakao.rest.api.key:d5e520dff4b3c3a59b16632565d803ee}")
    private String kakaoRestApiKey;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * 네이버 로컬 검색 API 프록시
     */
    @GetMapping("/naver/local/search")
    public ResponseEntity<Map<String, Object>> searchNaverLocal(@RequestParam String query) {
        if (naverClientId.isEmpty() || naverClientSecret.isEmpty()) {
            return ResponseEntity.ok(createErrorResponse("네이버 API 키가 설정되지 않았습니다."));
        }

        try {
            String url = "https://openapi.naver.com/v1/search/local.json?query=" + 
                        java.net.URLEncoder.encode(query, "UTF-8") + "&display=20&sort=comment";

            HttpHeaders headers = new HttpHeaders();
            headers.set("X-Naver-Client-Id", naverClientId);
            headers.set("X-Naver-Client-Secret", naverClientSecret);
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.GET, entity, Map.class);

            return ResponseEntity.ok(response.getBody());

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.ok(createErrorResponse("네이버 API 호출 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }

    /**
     * 카카오 로컬 검색 API 프록시
     */
    @GetMapping("/kakao/local/search")
    public ResponseEntity<Map<String, Object>> searchKakaoLocal(
            @RequestParam String query,
            @RequestParam(required = false) Double x,
            @RequestParam(required = false) Double y,
            @RequestParam(required = false, defaultValue = "5000") Integer radius) {

        if (kakaoRestApiKey.isEmpty()) {
            return ResponseEntity.ok(createErrorResponse("카카오 API 키가 설정되지 않았습니다."));
        }

        try {
            StringBuilder url = new StringBuilder("https://dapi.kakao.com/v2/local/search/keyword.json?query=");
            url.append(java.net.URLEncoder.encode(query, "UTF-8"));
            url.append("&size=15");

            if (x != null && y != null) {
                url.append("&x=").append(x);
                url.append("&y=").append(y);
                url.append("&radius=").append(radius);
            }

            HttpHeaders headers = new HttpHeaders();
            headers.set("Authorization", "KakaoAK " + kakaoRestApiKey);
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<String> entity = new HttpEntity<>(headers);
            ResponseEntity<Map> response = restTemplate.exchange(url.toString(), HttpMethod.GET, entity, Map.class);

            return ResponseEntity.ok(response.getBody());

        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.ok(createErrorResponse("카카오 API 호출 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }

    /**
     * 위치 서비스 상태 확인 API
     */
    @GetMapping("/location/status")
    public ResponseEntity<Map<String, Object>> getLocationStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("status", "ok");
        status.put("message", "Location API 서버가 정상적으로 동작 중입니다.");
        status.put("naverApiConfigured", !naverClientId.isEmpty() && !naverClientSecret.isEmpty());
        status.put("kakaoApiConfigured", !kakaoRestApiKey.isEmpty());
        return ResponseEntity.ok(status);
    }

    private Map<String, Object> createErrorResponse(String message) {
        Map<String, Object> errorResponse = new HashMap<>();
        errorResponse.put("error", message);
        errorResponse.put("items", new Object[0]);
        errorResponse.put("documents", new Object[0]);
        return errorResponse;
    }
}
