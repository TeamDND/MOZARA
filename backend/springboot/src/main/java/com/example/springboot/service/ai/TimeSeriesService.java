package com.example.springboot.service.ai;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class TimeSeriesService {

    private static final Logger log = LoggerFactory.getLogger(TimeSeriesService.class);

    @Value("${ai.python.base-url:http://localhost:8000}")
    private String pythonBaseUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * 시계열 비교 분석 (Python API 호출)
     *
     * @param currentImageUrl 현재 이미지 URL
     * @param pastImageUrls 과거 이미지 URL 리스트
     * @return 시계열 비교 분석 결과
     */
    public Map<String, Object> compareTimeSeries(String currentImageUrl, List<String> pastImageUrls) {
        try {
            String pythonApiUrl = pythonBaseUrl + "/timeseries/compare";
            log.info("[TimeSeriesService] Python API 호출: {}", pythonApiUrl);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("current_image_url", currentImageUrl);
            requestBody.put("past_image_urls", pastImageUrls);

            Map<String, Object> response = restTemplate.postForObject(
                    pythonApiUrl,
                    requestBody,
                    Map.class
            );

            log.info("[TimeSeriesService] Python API 응답 성공");
            return response;

        } catch (Exception e) {
            log.error("[TimeSeriesService] 시계열 분석 실패: {}", e.getMessage(), e);
            throw new RuntimeException("시계열 분석 중 오류가 발생했습니다: " + e.getMessage(), e);
        }
    }

    /**
     * Python API Health Check
     *
     * @return 상태 정보
     */
    public Map<String, Object> healthCheck() {
        try {
            String pythonApiUrl = pythonBaseUrl + "/timeseries";
            Map<String, Object> pythonResponse = restTemplate.getForObject(pythonApiUrl, Map.class);

            return Map.of(
                    "status", "healthy",
                    "python_api", "connected",
                    "python_info", pythonResponse
            );
        } catch (Exception e) {
            return Map.of(
                    "status", "degraded",
                    "python_api", "disconnected",
                    "error", e.getMessage()
            );
        }
    }
}
