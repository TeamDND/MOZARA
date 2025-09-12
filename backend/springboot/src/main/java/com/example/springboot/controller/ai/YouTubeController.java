package com.example.springboot.controller.ai;

import com.example.springboot.service.AIService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/youtube")
@CrossOrigin(origins = "*")
public class YouTubeController {
    
    private final AIService aiService;

    /**
     * YouTube 영상 검색 API 프록시
     */
    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> searchYouTubeVideos(
            @RequestParam("q") String query,
            @RequestParam(value = "order", defaultValue = "viewCount") String order,
            @RequestParam(value = "max_results", defaultValue = "12") int maxResults) {
        
        try {
            Map<String, Object> result = aiService.searchYouTubeVideos(query, order, maxResults);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "YouTube API 호출 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }
}
