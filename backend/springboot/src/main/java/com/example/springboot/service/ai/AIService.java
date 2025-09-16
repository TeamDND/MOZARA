package com.example.springboot.service.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
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
public class AIService {

    @Value("${ai.python.base-url:http://localhost:8000}")
    private String pythonBaseUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * 모발 손상 분석 요청을 Python 백엔드로 전달
     */
    public Map<String, Object> analyzeHairDamage(MultipartFile image, String textQuery) throws Exception {
        log.info("모발 손상 분석 요청 - 이미지: {}, 텍스트: {}", 
                image != null ? image.getOriginalFilename() : "없음", textQuery);

        String url = pythonBaseUrl + "/api/hair-damage/search/image-and-text";
        
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

        // MultipartFile을 ByteArrayResource로 변환하여 'image'라는 키로 추가
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
    /**
     * RAG 기반 채팅 요청을 Python 백엔드로 전달
     */
    public Map<String, Object> chatWithAI(MultipartFile image, String textQuery) throws Exception {
        log.info("RAG 채팅 요청 - 이미지: {}, 텍스트: {}", 
                image != null ? image.getOriginalFilename() : "없음", textQuery);

        String url = pythonBaseUrl + "/hair-damage/rag/chat";
        
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
                log.info("Python RAG 백엔드 응답 성공");
                return response.getBody();
            } else {
                throw new Exception("Python RAG 백엔드 응답 오류: " + response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("Python RAG 백엔드 통신 오류: {}", e.getMessage());
            throw new Exception("AI 채팅 서비스 연결 오류: " + e.getMessage());
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

    /**
     * YouTube 영상 검색 API 프록시
     */
    public Map<String, Object> searchYouTubeVideos(String query, String order, int maxResults) throws Exception {
        log.info("YouTube 영상 검색 요청 - 쿼리: {}, 정렬: {}, 최대결과: {}", query, order, maxResults);

        String url = pythonBaseUrl + "/api/youtube/search";
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        // URL 파라미터로 전달 (인코딩하지 않음 - FastAPI가 자동 처리)
        String fullUrl = url + "?q=" + query + 
                        "&order=" + order + 
                        "&max_results=" + maxResults;

        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(fullUrl, Map.class);
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                log.info("YouTube API 프록시 응답 성공");
                return response.getBody();
            } else {
                throw new Exception("YouTube API 프록시 응답 오류: " + response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("YouTube API 프록시 통신 오류: {}", e.getMessage());
            throw new Exception("YouTube API 서비스 연결 오류: " + e.getMessage());
        }
    }

    /**
     * Python 백엔드 연결 상태 확인
     */
    public boolean checkPythonBackendHealth() {
        try {
            String url = pythonBaseUrl + "/";
            ResponseEntity<String> response = restTemplate.getForEntity(url, String.class);
            return response.getStatusCode() == HttpStatus.OK;
        } catch (Exception e) {
            log.warn("Python 백엔드 연결 확인 실패: {}", e.getMessage());
            return false;
        }
    }
}
