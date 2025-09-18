package com.example.springboot.service.ai;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class YouTubeService {

    @Value("${ai.python.base-url:http://localhost:8000}")
    private String pythonBaseUrl;

    private final RestTemplate restTemplate = new RestTemplate();

    /**
     * YouTube 영상 검색 API 프록시
     */
    public Map<String, Object> searchYouTubeVideos(String query, String order, int maxResults) throws Exception {
        log.info("YouTube 영상 검색 요청 - 쿼리: {}, 정렬: {}, 최대결과: {}", query, order, maxResults);

        String url = pythonBaseUrl + "/youtube/search";
        
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
}
