package com.example.springboot.controller.admin;

import com.example.springboot.data.dto.admin.UserListDTO;
import com.example.springboot.service.admin.AdminService;
import com.example.springboot.service.metrics.UserMetricsService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AdminController {

    private final AdminService adminService;
    private final UserMetricsService userMetricsService;

    /**
     * 전체 유저 목록 조회 (페이징)
     * GET /api/admin/users?page=0&size=20
     */
    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        try {
            Pageable pageable = PageRequest.of(page, size, Sort.by("id").ascending());
            Page<UserListDTO> userPage = adminService.getAllUsers(pageable);

            return ResponseEntity.ok(userPage);
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("{\"error\": \"유저 목록 조회 중 오류가 발생했습니다: " + e.getMessage() + "\"}");
        }
    }

    /**
     * ✨ UserMetrics 통계 조회 (관리자용)
     * GET /api/admin/metrics/popular-searches?days=7
     */
    @GetMapping("/metrics/popular-searches")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getPopularSearches(@RequestParam(defaultValue = "7") int days) {
        try {
            List<String> keywords = userMetricsService.getPopularSearchKeywords(days);
            return ResponseEntity.ok(Map.of("keywords", keywords, "period", days + "일"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "인기 검색어 조회 실패: " + e.getMessage()));
        }
    }

    /**
     * ✨ 전체 사용자 활동 통계 (관리자용)
     * GET /api/admin/metrics/overview
     */
    @GetMapping("/metrics/overview")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getMetricsOverview() {
        try {
            long totalSearches = userMetricsService.getTotalSearchCount();
            long activeUsers = userMetricsService.getActiveUsersCount(7);
            long totalDiagnosis = userMetricsService.getTotalDiagnosisCount();

            return ResponseEntity.ok(Map.of(
                    "totalSearches", totalSearches,
                    "activeUsers", activeUsers,
                    "totalDiagnosis", totalDiagnosis,
                    "period", "최근 7일"
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "통계 조회 실패: " + e.getMessage()));
        }
    }
}
