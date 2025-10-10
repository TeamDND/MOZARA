package com.example.springboot.controller.ai;

import com.example.springboot.data.dao.AnalysisResultDAO;
import com.example.springboot.data.entity.AnalysisResultEntity;
import com.example.springboot.service.ai.TimeSeriesService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Time-Series 분석 컨트롤러
 * 독립적으로 실행되며 기존 코드와 분리
 */
@RestController
@RequestMapping("/api/timeseries")
@RequiredArgsConstructor
public class TimeSeriesController {

    private static final Logger log = LoggerFactory.getLogger(TimeSeriesController.class);

    private final AnalysisResultDAO analysisResultDAO;
    private final TimeSeriesService timeSeriesService;

    /**
     * 시계열 분석 실행
     * GET /api/timeseries/analyze/{userId}
     *
     * @param userId 사용자 ID
     * @return 시계열 분석 결과
     */
    @GetMapping("/analyze/{userId}")
    public ResponseEntity<Map<String, Object>> analyzeTimeSeries(@PathVariable Integer userId) {
        log.info("[TimeSeriesController] 시계열 분석 요청 - userId: {}", userId);

        try {
            // 1. DB에서 최근 3개월 분석 결과 조회
            LocalDate endDate = LocalDate.now();
            LocalDate startDate = endDate.minusMonths(3);

            List<AnalysisResultEntity> results = analysisResultDAO.findByUserIdAndAnalysisTypeAndDateRange(
                    userId, "swin_dual_model_llm_enhanced", startDate, endDate);

            log.info("[TimeSeriesController] 조회된 분석 결과 개수: {}", results.size());

            // 2. 최소 2개 이상 필요
            if (results.size() < 2) {
                log.warn("[TimeSeriesController] 비교할 데이터 부족 - userId: {}, 개수: {}", userId, results.size());
                return ResponseEntity.ok(Map.of(
                        "success", false,
                        "message", "비교할 데이터가 부족합니다. 최소 2개 이상의 분석 결과가 필요합니다.",
                        "data_count", results.size()
                ));
            }

            // 3. 이미지 URL 추출 (최신순으로 정렬되어 있다고 가정)
            String currentImageUrl = results.get(0).getImageUrl();
            List<String> pastImageUrls = results.stream()
                    .skip(1)  // 첫 번째는 현재이므로 제외
                    .limit(10)  // 최대 10개만 비교 (성능 고려)
                    .map(AnalysisResultEntity::getImageUrl)
                    .filter(url -> url != null && !url.isEmpty())
                    .collect(Collectors.toList());

            log.info("[TimeSeriesController] 현재 이미지: {}", currentImageUrl);
            log.info("[TimeSeriesController] 과거 이미지 개수: {}", pastImageUrls.size());

            // 4. Service를 통해 Python API 호출
            Map<String, Object> pythonResponse = timeSeriesService.compareTimeSeries(currentImageUrl, pastImageUrls);

            return ResponseEntity.ok(pythonResponse);

        } catch (Exception e) {
            log.error("[TimeSeriesController] 시계열 분석 실패 - userId: {}, error: {}", userId, e.getMessage(), e);

            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", e.getMessage(),
                    "message", "시계열 분석 중 오류가 발생했습니다."
            ));
        }
    }

    /**
     * 시계열 데이터 조회 (Daily 전용)
     * GET /api/timeseries/data/{userId}
     *
     * @param userId 사용자 ID
     * @return Daily 최신 2개 데이터
     */
    @GetMapping("/data/{userId}")
    public ResponseEntity<Map<String, Object>> getTimeSeriesData(@PathVariable Integer userId) {

        log.info("[TimeSeriesController] Daily 데이터 조회 - userId: {}", userId);

        try {
            // analysis_type = 'daily'인 레코드만 조회, 최신순 정렬
            List<AnalysisResultEntity> allResults = analysisResultDAO
                    .findByUserIdAndAnalysisType(userId, "daily")
                    .stream()
                    .sorted((a, b) -> b.getInspectionDate().compareTo(a.getInspectionDate()))
                    .collect(Collectors.toList());

            // 서로 다른 날짜의 최신 2개만 선택
            List<AnalysisResultEntity> results = new ArrayList<>();
            LocalDate lastDate = null;

            for (AnalysisResultEntity entity : allResults) {
                if (lastDate == null || !entity.getInspectionDate().equals(lastDate)) {
                    results.add(entity);
                    lastDate = entity.getInspectionDate();

                    if (results.size() == 2) {
                        break; // 서로 다른 날짜 2개 수집 완료
                    }
                }
            }

            log.info("[TimeSeriesController] 서로 다른 날짜의 Daily 데이터: {}",
                    results.stream()
                            .map(r -> r.getInspectionDate().toString())
                            .collect(Collectors.joining(", ")));

            // DTO 변환
            List<Map<String, Object>> data = results.stream()
                    .map(r -> {
                        Map<String, Object> item = new HashMap<>();
                        item.put("date", r.getInspectionDate().toString());
                        item.put("grade", r.getGrade() != null ? r.getGrade() : 0);
                        item.put("imageUrl", r.getImageUrl() != null ? r.getImageUrl() : "");
                        item.put("analysisType", r.getAnalysisType() != null ? r.getAnalysisType() : "");
                        item.put("id", r.getId());
                        return item;
                    })
                    .collect(Collectors.toList());

            log.info("[TimeSeriesController] Daily 데이터 개수: {}", data.size());

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "data", data
            ));

        } catch (Exception e) {
            log.error("[TimeSeriesController] Daily 데이터 조회 실패 - userId: {}, error: {}", userId, e.getMessage(), e);

            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * 최근 2개 Daily 분석 결과 비교 (DailyCare 전용)
     * GET /api/timeseries/daily-comparison/{userId}?period=latest|3months|6months
     *
     * @param userId 사용자 ID
     * @param period 비교 기간 (latest: 최신 2건, 3months: 3개월, 6months: 6개월)
     * @return 최근 vs 이전 Daily 비교 결과
     */
    @GetMapping("/daily-comparison/{userId}")
    public ResponseEntity<Map<String, Object>> getDailyComparison(
            @PathVariable Integer userId,
            @RequestParam(required = false, defaultValue = "latest") String period) {
        log.info("[TimeSeriesController] Daily 비교 조회 - userId: {}, period: {}", userId, period);

        try {
            // analysis_type = 'daily'인 레코드만 조회, 최신순 정렬
            List<AnalysisResultEntity> allDailyResults = analysisResultDAO
                    .findByUserIdAndAnalysisType(userId, "daily")
                    .stream()
                    .sorted((a, b) -> b.getInspectionDate().compareTo(a.getInspectionDate()))
                    .collect(Collectors.toList());

            if (allDailyResults.isEmpty()) {
                return ResponseEntity.ok(Map.of(
                        "success", false,
                        "message", "Daily 데이터가 없습니다.",
                        "hasComparison", false
                ));
            }

            // 최신 데이터 (중복 날짜 제거)
            AnalysisResultEntity current = allDailyResults.get(0);
            LocalDate currentDate = current.getInspectionDate();

            // period에 따라 비교 대상 찾기
            AnalysisResultEntity previous = null;

            if ("3months".equals(period)) {
                LocalDate threeMonthsAgo = currentDate.minusMonths(3);
                log.info("[TimeSeriesController] 3개월 기준 - currentDate: {}, threeMonthsAgo: {}", currentDate, threeMonthsAgo);

                previous = allDailyResults.stream()
                        .filter(e -> !e.getInspectionDate().equals(currentDate))
                        .filter(e -> !e.getInspectionDate().isBefore(threeMonthsAgo))
                        .reduce((first, second) -> second) // 해당 기간 내 가장 오래된 것
                        .orElse(null);

            } else if ("6months".equals(period)) {
                LocalDate sixMonthsAgo = currentDate.minusMonths(6);
                log.info("[TimeSeriesController] 6개월 기준 - currentDate: {}, sixMonthsAgo: {}", currentDate, sixMonthsAgo);

                previous = allDailyResults.stream()
                        .filter(e -> !e.getInspectionDate().equals(currentDate))
                        .filter(e -> !e.getInspectionDate().isBefore(sixMonthsAgo))
                        .reduce((first, second) -> second) // 해당 기간 내 가장 오래된 것
                        .orElse(null);

            } else { // "latest" - 기존 로직 (최신 2건)
                // 서로 다른 날짜의 바로 다음 데이터 찾기
                previous = allDailyResults.stream()
                        .filter(e -> !e.getInspectionDate().equals(currentDate))
                        .findFirst()
                        .orElse(null);
            }

            if (previous == null) {
                String periodMsg = "latest".equals(period) ? "최신 2건" :
                                  "3months".equals(period) ? "3개월 이내" : "6개월 이내";
                return ResponseEntity.ok(Map.of(
                        "success", false,
                        "message", periodMsg + " 비교할 Daily 데이터가 부족합니다.",
                        "hasComparison", false
                ));
            }

            log.info("[TimeSeriesController] 비교 날짜 - 현재: {}, 이전: {}",
                    current.getInspectionDate(), previous.getInspectionDate());

            // Service를 통해 Python API 호출 - 2개 이미지만 비교
            Map<String, Object> pythonResponse = timeSeriesService.compareTimeSeries(
                    current.getImageUrl(),
                    List.of(previous.getImageUrl())
            );

            // 메타데이터 추가
            Map<String, Object> result = new HashMap<>(pythonResponse);
            result.put("current_date", current.getInspectionDate().toString());
            result.put("previous_date", previous.getInspectionDate().toString());
            result.put("current_image_url", current.getImageUrl());
            result.put("previous_image_url", previous.getImageUrl());
            result.put("current_grade", current.getGrade() != null ? current.getGrade() : 0);
            result.put("previous_grade", previous.getGrade() != null ? previous.getGrade() : 0);

            log.info("[TimeSeriesController] Daily 비교 성공");

            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("[TimeSeriesController] Daily 비교 실패 - userId: {}, error: {}", userId, e.getMessage(), e);

            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", e.getMessage(),
                    "message", "Daily 비교 중 오류가 발생했습니다."
            ));
        }
    }

    /**
     * 최근 2개 분석 결과 비교 (기존 API 유지)
     * GET /api/timeseries/latest-comparison/{userId}
     *
     * @param userId 사용자 ID
     * @return 최근 vs 이전 비교 결과
     */
    @GetMapping("/latest-comparison/{userId}")
    public ResponseEntity<Map<String, Object>> getLatestComparison(@PathVariable Integer userId) {
        log.info("[TimeSeriesController] 최근 비교 조회 - userId: {}", userId);

        try {
            List<AnalysisResultEntity> latestTwo = analysisResultDAO
                    .findByUserIdOrderByDateDesc(userId)
                    .stream()
                    .limit(2)
                    .collect(Collectors.toList());

            if (latestTwo.size() < 2) {
                return ResponseEntity.ok(Map.of(
                        "success", false,
                        "message", "비교할 데이터가 부족합니다."
                ));
            }

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "current", analysisResultDAO.convertEntityToMap(latestTwo.get(0)),
                    "previous", analysisResultDAO.convertEntityToMap(latestTwo.get(1))
            ));

        } catch (Exception e) {
            log.error("[TimeSeriesController] 최근 비교 실패 - userId: {}, error: {}", userId, e.getMessage(), e);

            return ResponseEntity.ok(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    /**
     * Health Check
     * GET /api/timeseries/health
     *
     * @return 상태 정보
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        Map<String, Object> healthStatus = timeSeriesService.healthCheck();
        return ResponseEntity.ok(healthStatus);
    }
}
