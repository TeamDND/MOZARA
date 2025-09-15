package com.example.springboot.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class HairEncyclopediaService {

    @Value("${ai.python.base-url:http://localhost:8000}")
    private String pythonBaseUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    /**
     * Hair Encyclopedia 서비스 상태 조회
     */
    public Map<String, Object> getServiceStatus() throws Exception {
        log.info("Hair Encyclopedia 서비스 상태 조회 요청");

        String url = pythonBaseUrl + "/";
        
        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                log.info("Python 백엔드 상태 조회 성공");
                return response.getBody();
            } else {
                throw new Exception("Python 백엔드 상태 조회 응답 오류: " + response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("Python 백엔드 상태 조회 통신 오류: {}", e.getMessage());
            throw new Exception("Hair Encyclopedia 서비스 연결 오류: " + e.getMessage());
        }
    }

    /**
     * 저장된 논문 수 조회
     */
    public Map<String, Object> getPapersCount() throws Exception {
        log.info("논문 수 조회 요청");

        String url = pythonBaseUrl + "/api/papers/count";
        
        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                log.info("논문 수 조회 성공");
                return response.getBody();
            } else {
                throw new Exception("논문 수 조회 응답 오류: " + response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("논문 수 조회 통신 오류: {}", e.getMessage());
            throw new Exception("논문 수 조회 서비스 연결 오류: " + e.getMessage());
        }
    }

    /**
     * 논문 검색
     */
    public List<Map<String, Object>> searchPapers(Map<String, Object> searchQuery) throws Exception {
        log.info("논문 검색 요청: {}", searchQuery);

        String url = pythonBaseUrl + "/api/paper/search";
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(searchQuery, headers);
        
        try {
            ResponseEntity<List<Map<String, Object>>> response = restTemplate.exchange(
                    url, 
                    HttpMethod.POST, 
                    request, 
                    new ParameterizedTypeReference<List<Map<String, Object>>>() {}
            );
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                log.info("논문 검색 성공: {}건", response.getBody().size());
                return response.getBody();
            } else {
                throw new Exception("논문 검색 응답 오류: " + response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("논문 검색 통신 오류: {}", e.getMessage());
            throw new Exception("논문 검색 서비스 연결 오류: " + e.getMessage());
        }
    }

    /**
     * 특정 논문 상세 정보 조회
     */
    public Map<String, Object> getPaperDetail(String paperId) throws Exception {
        log.info("논문 상세 정보 조회 요청: {}", paperId);

        String url = pythonBaseUrl + "/paper/" + paperId;
        
        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                log.info("논문 상세 정보 조회 성공");
                return response.getBody();
            } else {
                throw new Exception("논문 상세 정보 조회 응답 오류: " + response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("논문 상세 정보 조회 통신 오류: {}", e.getMessage());
            throw new Exception("논문 상세 정보 조회 서비스 연결 오류: " + e.getMessage());
        }
    }

    /**
     * 특정 논문 분석 결과 조회
     */
    public Map<String, Object> getPaperAnalysis(String paperId) throws Exception {
        log.info("논문 분석 결과 조회 요청: {}", paperId);

        String url = pythonBaseUrl + "/api/paper/" + paperId + "/analysis";
        
        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                log.info("논문 분석 결과 조회 성공");
                return response.getBody();
            } else {
                throw new Exception("논문 분석 결과 조회 응답 오류: " + response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("논문 분석 결과 조회 통신 오류: {}", e.getMessage());
            throw new Exception("논문 분석 결과 조회 서비스 연결 오류: " + e.getMessage());
        }
    }

    /**
     * 논문 Q&A 기능
     */
    public Map<String, Object> answerQuestion(Map<String, Object> qnaQuery) throws Exception {
        log.info("논문 Q&A 요청: {}", qnaQuery);

        String url = pythonBaseUrl + "/api/paper/qna";
        
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(qnaQuery, headers);
        
        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, request, Map.class);
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                log.info("논문 Q&A 응답 성공");
                return response.getBody();
            } else {
                throw new Exception("논문 Q&A 응답 오류: " + response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("논문 Q&A 통신 오류: {}", e.getMessage());
            throw new Exception("논문 Q&A 서비스 연결 오류: " + e.getMessage());
        }
    }

    /**
     * 수동 PubMed 논문 수집 트리거
     */
    public Map<String, Object> triggerPubMedCollection() throws Exception {
        log.info("PubMed 논문 수집 트리거 요청");

        String url = pythonBaseUrl + "/api/pubmed/collect";
        
        try {
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                log.info("PubMed 논문 수집 트리거 성공");
                return response.getBody();
            } else {
                throw new Exception("PubMed 논문 수집 트리거 응답 오류: " + response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("PubMed 논문 수집 트리거 통신 오류: {}", e.getMessage());
            throw new Exception("PubMed 논문 수집 트리거 서비스 연결 오류: " + e.getMessage());
        }
    }

    /**
     * Pinecone 인덱스 초기화 (관리자 기능)
     */
    public Map<String, Object> clearPineconeIndex() throws Exception {
        log.info("Pinecone 인덱스 초기화 요청");

        String url = pythonBaseUrl + "/api/admin/clear-index";
        
        try {
            ResponseEntity<Map> response = restTemplate.exchange(url, HttpMethod.DELETE, null, Map.class);
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                log.info("Pinecone 인덱스 초기화 성공");
                return response.getBody();
            } else {
                throw new Exception("Pinecone 인덱스 초기화 응답 오류: " + response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("Pinecone 인덱스 초기화 통신 오류: {}", e.getMessage());
            throw new Exception("Pinecone 인덱스 초기화 서비스 연결 오류: " + e.getMessage());
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