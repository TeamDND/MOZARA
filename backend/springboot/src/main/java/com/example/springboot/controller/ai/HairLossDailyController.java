package com.example.springboot.controller.ai;

import com.example.springboot.service.ai.HairLossDailyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@Slf4j
@RequestMapping("/api/ai/hair-loss-daily")
@CrossOrigin(origins = "*")
public class HairLossDailyController {
    
    private final HairLossDailyService hairLossDailyService;

    /**
     * Clip + RAG 기반 머리사진 분석 요청
     */
    @PostMapping("/analyze")
    public ResponseEntity<Map<String, Object>> analyzeHairImage(
            @RequestParam("image") MultipartFile image,
            @RequestParam(value = "top_k", defaultValue = "10") int topK,
            @RequestParam(value = "user_id", required = false) Integer userId) {
        
        try {
            // 이미지 파일 유효성 검사
            if (image.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "이미지 파일이 필요합니다."));
            }
            
            if (!image.getContentType().startsWith("image/")) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "이미지 파일만 업로드 가능합니다."));
            }
            
            Map<String, Object> result = hairLossDailyService.analyzeHairImage(image, topK);
            
            // user_id가 있으면 분석 결과를 자동으로 저장
            if (userId != null && userId > 0) {
                try {
                    result.put("user_id", userId);
                    Map<String, Object> saveResult = hairLossDailyService.saveAnalysisResult(result);
                    result.put("save_result", saveResult);
                } catch (Exception e) {
                    log.warn("분석 결과 저장 실패: {}", e.getMessage());
                    result.put("save_error", "분석 결과 저장 중 오류가 발생했습니다: " + e.getMessage());
                }
            }
            
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "머리사진 분석 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }

    /**
     * 특정 카테고리로 필터링하여 검색
     */
    @PostMapping("/search/category")
    public ResponseEntity<Map<String, Object>> searchByCategory(
            @RequestParam("image") MultipartFile image,
            @RequestParam("category") String category,
            @RequestParam(value = "top_k", defaultValue = "5") int topK) {
        
        try {
            // 이미지 파일 유효성 검사
            if (image.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "이미지 파일이 필요합니다."));
            }
            
            if (!image.getContentType().startsWith("image/")) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "이미지 파일만 업로드 가능합니다."));
            }
            
            Map<String, Object> result = hairLossDailyService.searchByCategory(image, category, topK);
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "카테고리별 검색 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }

    /**
     * 서비스 상태 확인
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        try {
            Map<String, Object> result = hairLossDailyService.healthCheck();
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "서비스 상태 확인 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }

    /**
     * 데이터베이스 통계 정보 조회
     */
    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getDatabaseStats() {
        try {
            Map<String, Object> result = hairLossDailyService.getDatabaseStats();
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "통계 조회 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }

    /**
     * 모델 정보 조회
     */
    @GetMapping("/model/info")
    public ResponseEntity<Map<String, Object>> getModelInfo() {
        try {
            Map<String, Object> result = hairLossDailyService.getModelInfo();
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "모델 정보 조회 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }

    /**
     * 분석 결과 저장
     */
    @PostMapping("/save-result")
    public ResponseEntity<Map<String, Object>> saveAnalysisResult(@RequestBody Map<String, Object> analysisResult) {
        try {
            Map<String, Object> result = hairLossDailyService.saveAnalysisResult(analysisResult);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "분석 결과 저장 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }

    /**
     * 특정 날짜의 daily 분석 결과 조회
     */
    @GetMapping("/results/date")
    public ResponseEntity<Map<String, Object>> getDailyAnalysisResultsByDate(
            @RequestParam("user_id") Integer userId,
            @RequestParam("date") String dateString) {
        try {
            LocalDate date = LocalDate.parse(dateString);
            Map<String, Object> result = hairLossDailyService.getDailyAnalysisResults(userId, date);
            
            if (result.containsKey("error")) {
                return ResponseEntity.badRequest().body(result);
            }
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Daily 분석 결과 조회 중 오류 발생", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Daily 분석 결과 조회 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }

    /**
     * 날짜 범위의 daily 분석 결과 조회
     */
    @GetMapping("/results/date-range")
    public ResponseEntity<Map<String, Object>> getDailyAnalysisResultsByDateRange(
            @RequestParam("user_id") Integer userId,
            @RequestParam("start_date") String startDateString,
            @RequestParam("end_date") String endDateString) {
        try {
            LocalDate startDate = LocalDate.parse(startDateString);
            LocalDate endDate = LocalDate.parse(endDateString);
            
            Map<String, Object> result = hairLossDailyService.getDailyAnalysisResultsByDateRange(userId, startDate, endDate);
            
            if (result.containsKey("error")) {
                return ResponseEntity.badRequest().body(result);
            }
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("Daily 분석 결과 조회 중 오류 발생", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Daily 분석 결과 조회 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }

    /**
     * 최근 daily 분석 결과 조회
     */
    @GetMapping("/results/latest")
    public ResponseEntity<Map<String, Object>> getLatestDailyAnalysisResults(
            @RequestParam("user_id") Integer userId,
            @RequestParam(value = "limit", defaultValue = "10") int limit) {
        try {
            Map<String, Object> result = hairLossDailyService.getLatestDailyAnalysisResults(userId, limit);
            
            if (result.containsKey("error")) {
                return ResponseEntity.badRequest().body(result);
            }
            
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("최근 Daily 분석 결과 조회 중 오류 발생", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "최근 Daily 분석 결과 조회 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }
}
