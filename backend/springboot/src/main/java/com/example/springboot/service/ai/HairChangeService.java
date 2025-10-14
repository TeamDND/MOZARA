package com.example.springboot.service.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.client.RestTemplateBuilder;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;

@Service
public class HairChangeService {

    @Value("${ai.python.base-url:http://localhost:8000}")
    private String pythonBackendUrl;

    private final RestTemplate restTemplate;

    public HairChangeService(RestTemplateBuilder builder) {
        this.restTemplate = builder
                .setConnectTimeout(Duration.ofSeconds(10))
                .setReadTimeout(Duration.ofMinutes(5))
                .build();
    }

    public Map<String, Object> generateHairstyle(MultipartFile image, String hairstyle, String customPrompt) throws IOException {
        String url = pythonBackendUrl + "/generate_hairstyle";
        long startTime = System.currentTimeMillis();
        
        System.out.println("=== Python 백엔드 호출 시작 ===");
        System.out.println("URL: " + url);
        System.out.println("이미지 크기: " + image.getSize() + " bytes");
        System.out.println("헤어스타일: " + hairstyle);
        System.out.println("커스텀 프롬프트: " + customPrompt);
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("image", image.getResource());
        body.add("hairstyle", hairstyle);
        if (customPrompt != null && !customPrompt.trim().isEmpty()) {
            body.add("custom_prompt", customPrompt);
        }

        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        try {
            System.out.println("RestTemplate 요청 전송 중... (타임아웃: 5분)");
            long requestStartTime = System.currentTimeMillis();
            
            ResponseEntity<Map> response = restTemplate.postForEntity(url, requestEntity, Map.class);
            
            long requestEndTime = System.currentTimeMillis();
            long requestDuration = requestEndTime - requestStartTime;
            
            System.out.println("=== Python 백엔드 응답 완료 ===");
            System.out.println("응답 상태: " + response.getStatusCode());
            System.out.println("소요 시간: " + requestDuration + "ms (" + (requestDuration/1000) + "초)");
            System.out.println("응답 본문 크기: " + (response.getBody() != null ? response.getBody().size() : 0));
            
            return response.getBody();
        } catch (org.springframework.web.client.ResourceAccessException e) {
            long failTime = System.currentTimeMillis() - startTime;
            System.err.println("=== Python 연결 실패 ===");
            System.err.println("소요 시간: " + failTime + "ms (" + (failTime/1000) + "초)");
            System.err.println("연결 오류: " + e.getMessage());
            System.err.println("Python URL 확인 필요: " + url);
            e.printStackTrace();
            throw new RuntimeException("Python 백엔드 연결 실패 (타임아웃 또는 연결 불가): " + e.getMessage(), e);
        } catch (Exception e) {
            long failTime = System.currentTimeMillis() - startTime;
            System.err.println("=== Python 호출 실패 ===");
            System.err.println("소요 시간: " + failTime + "ms (" + (failTime/1000) + "초)");
            System.err.println("오류 타입: " + e.getClass().getName());
            System.err.println("오류 메시지: " + e.getMessage());
            e.printStackTrace();
            throw new RuntimeException("Python 백엔드 호출 중 오류 발생: " + e.getMessage(), e);
        }
    }
}
