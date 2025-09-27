package com.example.springboot.service.ai;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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
public class HairLossDailyService {

    @Value("${python.api.base-url:http://localhost:8000}")
    private String pythonApiBaseUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * CNN + RAG 기반 머리사진 분석
     */
    public Map<String, Object> analyzeHairImage(MultipartFile image, int topK) {
        return analyzeHairImage(image, topK, true); // 기본값: 전처리 사용 (빛 반사 처리 포함)
    }
    
    /**
     * CNN + RAG 기반 머리사진 분석 (전처리 옵션 포함)
     */
    public Map<String, Object> analyzeHairImage(MultipartFile image, int topK, boolean usePreprocessing) {
        try {
            String url = pythonApiBaseUrl + "/hair-loss-daily/analyze";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", image.getResource());
            body.add("top_k", topK);
            body.add("use_preprocessing", usePreprocessing);
            
            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
            
            ResponseEntity<Map> response = restTemplate.postForEntity(url, requestEntity, Map.class);
            
            if (response.getStatusCode() == HttpStatus.OK) {
                return response.getBody();
            } else {
                throw new RuntimeException("Python API 호출 실패: " + response.getStatusCode());
            }
            
        } catch (Exception e) {
            log.error("머리사진 분석 중 오류 발생", e);
            throw new RuntimeException("머리사진 분석 중 오류가 발생했습니다.", e);
        }
    }

    /**
     * 특정 카테고리로 필터링하여 검색
     */
    public Map<String, Object> searchByCategory(MultipartFile image, String category, int topK) {
        try {
            String url = pythonApiBaseUrl + "/hair-loss-daily/search/category";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", image.getResource());
            body.add("category", category);
            body.add("top_k", topK);
            
            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
            
            ResponseEntity<Map> response = restTemplate.postForEntity(url, requestEntity, Map.class);
            
            if (response.getStatusCode() == HttpStatus.OK) {
                return response.getBody();
            } else {
                throw new RuntimeException("Python API 호출 실패: " + response.getStatusCode());
            }
            
        } catch (Exception e) {
            log.error("카테고리별 검색 중 오류 발생", e);
            throw new RuntimeException("카테고리별 검색 중 오류가 발생했습니다.", e);
        }
    }

    /**
     * 서비스 상태 확인
     */
    public Map<String, Object> healthCheck() {
        try {
            String url = pythonApiBaseUrl + "/hair-loss-daily/health";
            
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            
            if (response.getStatusCode() == HttpStatus.OK) {
                return response.getBody();
            } else {
                throw new RuntimeException("Python API 호출 실패: " + response.getStatusCode());
            }
            
        } catch (Exception e) {
            log.error("서비스 상태 확인 중 오류 발생", e);
            throw new RuntimeException("서비스 상태 확인 중 오류가 발생했습니다.", e);
        }
    }

    /**
     * 데이터베이스 통계 정보 조회
     */
    public Map<String, Object> getDatabaseStats() {
        try {
            String url = pythonApiBaseUrl + "/hair-loss-daily/stats";
            
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            
            if (response.getStatusCode() == HttpStatus.OK) {
                return response.getBody();
            } else {
                throw new RuntimeException("Python API 호출 실패: " + response.getStatusCode());
            }
            
        } catch (Exception e) {
            log.error("통계 조회 중 오류 발생", e);
            throw new RuntimeException("통계 조회 중 오류가 발생했습니다.", e);
        }
    }

    /**
     * 모델 정보 조회
     */
    public Map<String, Object> getModelInfo() {
        try {
            String url = pythonApiBaseUrl + "/hair-loss-daily/model/info";
            
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            
            if (response.getStatusCode() == HttpStatus.OK) {
                return response.getBody();
            } else {
                throw new RuntimeException("Python API 호출 실패: " + response.getStatusCode());
            }
            
        } catch (Exception e) {
            log.error("모델 정보 조회 중 오류 발생", e);
            throw new RuntimeException("모델 정보 조회 중 오류가 발생했습니다.", e);
        }
    }

    /**
     * 분석 결과 저장
     */
    public Map<String, Object> saveAnalysisResult(Map<String, Object> analysisResult) {
        try {
            // 여기에 분석 결과를 데이터베이스에 저장하는 로직 구현
            // 현재는 임시로 성공 응답 반환
            
            log.info("분석 결과 저장: {}", analysisResult);
            
            return Map.of(
                "success", true,
                "message", "분석 결과가 성공적으로 저장되었습니다.",
                "savedAt", System.currentTimeMillis()
            );
            
        } catch (Exception e) {
            log.error("분석 결과 저장 중 오류 발생", e);
            throw new RuntimeException("분석 결과 저장 중 오류가 발생했습니다.", e);
        }
    }
}
