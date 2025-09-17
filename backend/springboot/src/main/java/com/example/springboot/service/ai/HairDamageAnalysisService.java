package com.example.springboot.service.ai;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class HairDamageAnalysisService {

    @Value("${ai.python.base-url:http://localhost:8000}")
    private String pythonBaseUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * 모발 손상 분석 요청을 Python 백엔드로 전달
     */
    public Map<String, Object> analyzeHairDamage(MultipartFile image, String textQuery) throws Exception {
        log.info("모발 손상 분석 요청 - 이미지: {}, 텍스트: {}", 
                image != null ? image.getOriginalFilename() : "없음", textQuery);

        String url = pythonBaseUrl + "/hair-damage/search/image-and-text";
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> requestBody = new HashMap<>();
        
        // 이미지가 있으면 base64로 인코딩
        if (image != null && !image.isEmpty()) {
            String imageBase64 = Base64.getEncoder().encodeToString(image.getBytes());
            requestBody.put("image_base64", imageBase64);
        }
        
        // 텍스트 쿼리가 있으면 추가
        if (textQuery != null && !textQuery.trim().isEmpty()) {
            requestBody.put("text_query", textQuery);
        }

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(requestBody, headers);
        
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                log.info("Python 백엔드 응답 성공");
                return response.getBody();
            } else {
                throw new Exception("Python 백엔드 응답 오류: " + response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("Python 백엔드 통신 오류: {}", e.getMessage());
            throw new Exception("AI 분석 서비스 연결 오류: " + e.getMessage());
        }
    }

    /**
     * 분석 결과를 Python 백엔드에 저장
     */
    public Map<String, Object> saveAnalysisResult(Map<String, Object> analysisResult) throws Exception {
        log.info("분석 결과 저장 요청");

        String url = pythonBaseUrl + "/hair-damage/add-analysis-result";
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(analysisResult, headers);
        
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                log.info("분석 결과 저장 성공");
                return response.getBody();
            } else {
                throw new Exception("분석 결과 저장 응답 오류: " + response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("분석 결과 저장 통신 오류: {}", e.getMessage());
            throw new Exception("분석 결과 저장 서비스 연결 오류: " + e.getMessage());
        }
    }
}
