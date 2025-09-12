package com.example.springboot.service;

import com.example.springboot.data.dto.HairProductDTO;
import com.example.springboot.data.dto.HairProductResponseDTO;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;

@Service
public class HairProductService {

    @Value("${ai.python.base-url}")
    private String pythonBaseUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * 탈모 단계별 제품 목록 조회
     * @param stage 탈모 단계 (1-6)
     * @return 제품 목록과 단계별 정보
     */
    public HairProductResponseDTO getProductsByStage(int stage) {
        try {
            String url = UriComponentsBuilder
                    .fromHttpUrl(pythonBaseUrl + "/api/products")
                    .queryParam("stage", stage)
                    .toUriString();

            HttpHeaders headers = new HttpHeaders();
            headers.set("Content-Type", "application/json");
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<HairProductResponseDTO> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    entity,
                    HairProductResponseDTO.class
            );

            return response.getBody();
        } catch (Exception e) {
            throw new RuntimeException("Python 서버에서 제품 정보를 가져오는 중 오류가 발생했습니다: " + e.getMessage(), e);
        }
    }

    /**
     * 제품 추천 서비스 헬스체크
     * @return 서비스 상태 정보
     */
    public String healthCheck() {
        try {
            String url = pythonBaseUrl + "/api/products/health";
            
            HttpHeaders headers = new HttpHeaders();
            headers.set("Content-Type", "application/json");
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    entity,
                    String.class
            );

            return response.getBody();
        } catch (Exception e) {
            throw new RuntimeException("Python 서버 헬스체크 중 오류가 발생했습니다: " + e.getMessage(), e);
        }
    }
}
