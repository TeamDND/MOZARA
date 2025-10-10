package com.example.springboot.controller.admin;

import com.example.springboot.service.GoogleAnalyticsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/admin/analytics")
@RequiredArgsConstructor
public class AdminAnalyticsController {

    private final GoogleAnalyticsService googleAnalyticsService;

    /**
     * Google Analytics 대시보드 데이터 조회
     * - 최근 7일간 페이지뷰
     * - 최근 7일간 활성 사용자
     * - 인기 페이지 TOP 10
     */
    @GetMapping("/dashboard")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getAnalyticsDashboard() {
        log.info("관리자 Analytics 대시보드 데이터 요청");
        Map<String, Object> data = googleAnalyticsService.getDashboardData();
        return ResponseEntity.ok(data);
    }

    /**
     * 페이지뷰 데이터만 조회
     */
    @GetMapping("/pageviews")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getPageViews() {
        log.info("페이지뷰 데이터 요청");
        Map<String, Object> data = googleAnalyticsService.getPageViewsLast7Days();
        return ResponseEntity.ok(data);
    }

    /**
     * 활성 사용자 데이터만 조회
     */
    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getActiveUsers() {
        log.info("활성 사용자 데이터 요청");
        Map<String, Object> data = googleAnalyticsService.getActiveUsersLast7Days();
        return ResponseEntity.ok(data);
    }

    /**
     * 인기 페이지 데이터만 조회
     */
    @GetMapping("/top-pages")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> getTopPages() {
        log.info("인기 페이지 데이터 요청");
        Map<String, Object> data = googleAnalyticsService.getTopPages();
        return ResponseEntity.ok(data);
    }
}
