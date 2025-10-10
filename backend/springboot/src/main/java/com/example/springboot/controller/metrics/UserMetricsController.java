package com.example.springboot.controller.metrics;

import com.example.springboot.service.metrics.UserMetricsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/metrics")
@RequiredArgsConstructor
public class UserMetricsController {

    private final UserMetricsService userMetricsService;

    /**
     * RAG 검색 기록 저장
     */
    @PostMapping("/rag-search")
    public ResponseEntity<?> logRAGSearch(
            @RequestBody Map<String, Object> request,
            Authentication authentication
    ) {
        try {
            Long userId = getUserIdFromAuth(authentication);
            String query = (String) request.get("query");
            int resultCount = (Integer) request.getOrDefault("resultCount", 0);
            boolean clicked = (Boolean) request.getOrDefault("clicked", false);
            String clickedTitle = (String) request.getOrDefault("clickedTitle", "");

            userMetricsService.logRAGSearch(userId, query, resultCount, clicked, clickedTitle);

            return ResponseEntity.ok(Map.of("success", true, "message", "검색 기록 저장 완료"));
        } catch (Exception e) {
            log.error("RAG 검색 저장 실패", e);
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * 두피 진단 결과 저장
     */
    @PostMapping("/scalp-diagnosis")
    public ResponseEntity<?> logScalpDiagnosis(
            @RequestBody Map<String, Object> request,
            Authentication authentication
    ) {
        try {
            Long userId = getUserIdFromAuth(authentication);
            String scalpType = (String) request.get("scalpType");
            int scalpScore = (Integer) request.get("scalpScore");
            String sensitivity = (String) request.get("sensitivity");

            userMetricsService.logScalpDiagnosis(userId, scalpType, scalpScore, sensitivity);

            return ResponseEntity.ok(Map.of("success", true, "message", "진단 결과 저장 완료"));
        } catch (Exception e) {
            log.error("진단 결과 저장 실패", e);
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * 제품 클릭 기록 저장
     */
    @PostMapping("/product-click")
    public ResponseEntity<?> logProductClick(
            @RequestBody Map<String, Object> request,
            Authentication authentication
    ) {
        try {
            Long userId = getUserIdFromAuth(authentication);
            String category = (String) request.get("category");
            String productName = (String) request.get("productName");
            String recommendedBy = (String) request.getOrDefault("recommendedBy", "manual");

            userMetricsService.logProductClick(userId, category, productName, recommendedBy);

            return ResponseEntity.ok(Map.of("success", true, "message", "제품 클릭 저장 완료"));
        } catch (Exception e) {
            log.error("제품 클릭 저장 실패", e);
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * 케어 미션 완료 저장
     */
    @PostMapping("/care-mission")
    public ResponseEntity<?> logCareMission(
            @RequestBody Map<String, Object> request,
            Authentication authentication
    ) {
        try {
            Long userId = getUserIdFromAuth(authentication);
            String missionType = (String) request.get("missionType");
            int streakCount = (Integer) request.getOrDefault("streakCount", 1);

            userMetricsService.logCareMissionComplete(userId, missionType, streakCount);

            return ResponseEntity.ok(Map.of("success", true, "message", "케어 미션 저장 완료"));
        } catch (Exception e) {
            log.error("케어 미션 저장 실패", e);
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * 내 메트릭 요약 조회
     */
    @GetMapping("/my-summary")
    public ResponseEntity<?> getMyMetricsSummary(Authentication authentication) {
        try {
            Long userId = getUserIdFromAuth(authentication);
            Map<String, Object> summary = userMetricsService.getUserMetricsSummary(userId);

            return ResponseEntity.ok(summary);
        } catch (Exception e) {
            log.error("메트릭 요약 조회 실패", e);
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    /**
     * 인기 검색 키워드 조회 (공개 API)
     */
    @GetMapping("/popular-searches")
    public ResponseEntity<?> getPopularSearches(@RequestParam(defaultValue = "7") int days) {
        try {
            var keywords = userMetricsService.getPopularSearchKeywords(days);
            return ResponseEntity.ok(Map.of("keywords", keywords));
        } catch (Exception e) {
            log.error("인기 검색어 조회 실패", e);
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", e.getMessage()));
        }
    }

    // 유틸리티 메서드
    private Long getUserIdFromAuth(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            throw new RuntimeException("인증 정보가 없습니다");
        }
        // Authentication에서 userId 추출 (CustomUserDetails 사용 가정)
        return Long.parseLong(authentication.getName());
    }
}
