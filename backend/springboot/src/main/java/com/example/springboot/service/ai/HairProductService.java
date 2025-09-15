package com.example.springboot.service.ai;

import com.example.springboot.data.dto.ai.HairProductResponseDTO;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

@Service
public class HairProductService {

    @Value("${ai.python.base-url}")
    private String pythonBaseUrl;

    private static final Logger log = LoggerFactory.getLogger(HairProductService.class);

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

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

            ResponseEntity<String> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    entity,
                    String.class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String body = response.getBody();
                try {
                    return objectMapper.readValue(body, HairProductResponseDTO.class);
                } catch (Exception parseEx) {
                    log.error("[Products] Python 응답 파싱 실패: {}", parseEx.getMessage(), parseEx);
                    throw new RuntimeException("Python 응답 파싱 실패");
                }
            }
            log.error("[Products] Python 비정상 응답 status={}, body={}", response.getStatusCodeValue(), response.getBody());
            throw new RuntimeException("Python 서버 응답이 유효하지 않습니다.");
        } catch (Exception e) {
            log.error("[Products] Python 연동 예외: {}", e.getMessage(), e);
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


