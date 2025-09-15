package com.example.springboot.service.ai;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@Service
public class HairChangeService {

    @Value("${ai.python.base-url:http://localhost:8000}")
    private String pythonBackendUrl;

    private final RestTemplate restTemplate;

    public HairChangeService() {
        this.restTemplate = new RestTemplate();
    }

    public Map<String, Object> generateHairstyle(MultipartFile image, String hairstyle, String customPrompt) throws IOException {
        String url = pythonBackendUrl + "/generate_hairstyle";
        
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
            ResponseEntity<Map> response = restTemplate.postForEntity(url, requestEntity, Map.class);
            return response.getBody();
        } catch (Exception e) {
            throw new RuntimeException("Python 백엔드 호출 중 오류 발생: " + e.getMessage(), e);
        }
    }

    public Map<String, String> getHairstyles() {
        String url = pythonBackendUrl + "/hairstyles";
        
        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            return response.getBody();
        } catch (Exception e) {
            throw new RuntimeException("헤어스타일 목록 조회 중 오류 발생: " + e.getMessage(), e);
        }
    }
}
