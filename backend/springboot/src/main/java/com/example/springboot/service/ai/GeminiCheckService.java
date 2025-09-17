package com.example.springboot.service.ai;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class GeminiCheckService {

    @Value("${ai.python.base-url:http://localhost:8000}")
    private String pythonBaseUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * Gemini 기반 탈모 이미지 분석 (Python /hair_gemini_check 프록시)
     */
    public Map<String, Object> analyzeHairWithGemini(MultipartFile image) throws Exception {
        log.info("Gemini 탈모 분석 요청 - 이미지: {}", image.getOriginalFilename());

        // Python API의 URL을 그대로 사용
        String url = pythonBaseUrl + "/hair_gemini_check";

        // HTTP 헤더를 MULTIPART_FORM_DATA로 설정
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        // MultiValueMap을 사용하여 요청 본문(body)을 구성
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();

        body.add("file", new ByteArrayResource(image.getBytes()) {
            @Override
            public String getFilename() {
                // 원본 파일명을 유지하도록 오버라이드
                return image.getOriginalFilename();
            }
        });

        // 요청 엔티티 생성
        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        try {
            // postForEntity() 메소드로 POST 요청 전송
            ResponseEntity<Map> response = restTemplate.postForEntity(url, requestEntity, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                log.info("Python Gemini 분석 응답 성공");
                return response.getBody();
            } else {
                throw new Exception("Python Gemini 응답 오류: " + response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("Python Gemini 통신 오류: {}", e.getMessage());
            throw new Exception("Gemini 분석 서비스 연결 오류: " + e.getMessage());
        }
    }
}
