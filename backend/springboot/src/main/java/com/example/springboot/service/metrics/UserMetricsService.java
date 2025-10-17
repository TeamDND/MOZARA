package com.example.springboot.service.metrics;

import com.example.springboot.data.entity.UserMetricEntity;
import com.example.springboot.data.entity.UserEntity;
import com.example.springboot.data.repository.UserMetricsRepository;
import com.example.springboot.data.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserMetricsService {

    private final UserMetricsRepository userMetricsRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    /**
     * RAG 검색 기록 저장
     */
    @Transactional
    public void logRAGSearch(Integer userId, String query, int resultCount, boolean clicked, String clickedTitle) {
        try {
            Map<String, Object> data = new HashMap<>();
            data.put("query", query);
            data.put("resultCount", resultCount);
            data.put("clicked", clicked);
            data.put("clickedTitle", clickedTitle);
            data.put("timestamp", Instant.now().toString());

            saveMetric(userId, "RAG_SEARCH", objectMapper.writeValueAsString(data));
            log.info("RAG 검색 저장 완료 - User: {}, Query: {}", userId, query);
        } catch (JsonProcessingException e) {
            log.error("RAG 검색 저장 실패", e);
        }
    }

    /**
     * 두피 진단 결과 저장
     */
    @Transactional
    public void logScalpDiagnosis(Integer userId, String scalpType, int scalpScore, String sensitivity) {
        try {
            Map<String, Object> data = new HashMap<>();
            data.put("scalpType", scalpType);
            data.put("scalpScore", scalpScore);
            data.put("sensitivity", sensitivity);
            data.put("timestamp", Instant.now().toString());

            saveMetric(userId, "SCALP_DIAGNOSIS", objectMapper.writeValueAsString(data));
            log.info("두피 진단 저장 완료 - User: {}, Type: {}", userId, scalpType);
        } catch (JsonProcessingException e) {
            log.error("두피 진단 저장 실패", e);
        }
    }

    /**
     * 제품 클릭 기록 저장
     */
    @Transactional
    public void logProductClick(Integer userId, String productCategory, String productName, String recommendedBy) {
        try {
            Map<String, Object> data = new HashMap<>();
            data.put("category", productCategory);
            data.put("productName", productName);
            data.put("recommendedBy", recommendedBy);
            data.put("timestamp", Instant.now().toString());

            saveMetric(userId, "PRODUCT_CLICK", objectMapper.writeValueAsString(data));
            log.info("제품 클릭 저장 완료 - User: {}, Product: {}", userId, productName);
        } catch (JsonProcessingException e) {
            log.error("제품 클릭 저장 실패", e);
        }
    }

    /**
     * 케어 미션 완료 저장
     */
    @Transactional
    public void logCareMissionComplete(Integer userId, String missionType, int streakCount) {
        try {
            Map<String, Object> data = new HashMap<>();
            data.put("missionType", missionType);
            data.put("streakCount", streakCount);
            data.put("completed", true);
            data.put("timestamp", Instant.now().toString());

            saveMetric(userId, "CARE_MISSION", objectMapper.writeValueAsString(data));
            log.info("케어 미션 저장 완료 - User: {}, Mission: {}", userId, missionType);
        } catch (JsonProcessingException e) {
            log.error("케어 미션 저장 실패", e);
        }
    }

    /**
     * 페이지 체류 시간 저장
     */
    @Transactional
    public void logPageDwellTime(Integer userId, String pagePath, long durationSeconds) {
        try {
            Map<String, Object> data = new HashMap<>();
            data.put("page", pagePath);
            data.put("duration", durationSeconds);
            data.put("timestamp", Instant.now().toString());

            saveMetric(userId, "PAGE_DWELL_TIME", objectMapper.writeValueAsString(data));
        } catch (JsonProcessingException e) {
            log.error("페이지 체류 시간 저장 실패", e);
        }
    }

    /**
     * 메트릭 저장 공통 메서드
     */
    private void saveMetric(Integer userId, String type, String value) {
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        UserMetricEntity metric = new UserMetricEntity();
        metric.setUserIdForeign(user);
        metric.setType(type);
        metric.setValue(value);
        metric.setRecordDate(Instant.now());

        userMetricsRepository.save(metric);
    }

    /**
     * 사용자별 메트릭 요약 조회
     */
    public Map<String, Object> getUserMetricsSummary(Integer userId) {
        List<UserMetricEntity> metrics = userMetricsRepository
                .findByUserIdForeign_IdOrderByRecordDateDesc(userId);

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalMetrics", metrics.size());
        summary.put("ragSearchCount", countByType(metrics, "RAG_SEARCH"));
        summary.put("diagnosisCount", countByType(metrics, "SCALP_DIAGNOSIS"));
        summary.put("productClickCount", countByType(metrics, "PRODUCT_CLICK"));
        summary.put("careMissionCount", countByType(metrics, "CARE_MISSION"));

        return summary;
    }

    /**
     * 인기 검색 키워드 조회 (최근 N일)
     */
    public List<String> getPopularSearchKeywords(int days) {
        Instant startDate = Instant.now().minus(days, ChronoUnit.DAYS);
        List<UserMetricEntity> searches = userMetricsRepository
                .findByUserAndType(null, "RAG_SEARCH"); // 모든 사용자

        return searches.stream()
                .map(metric -> extractQueryFromValue(metric.getValue()))
                .filter(Objects::nonNull)
                .collect(Collectors.groupingBy(q -> q, Collectors.counting()))
                .entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(10)
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());
    }

    /**
     * 사용자의 최근 검색 키워드 추출 (AI 추천용)
     */
    public List<String> getUserRecentSearches(Integer userId, int limit) {
        List<UserMetricEntity> searches = userMetricsRepository
                .findByUserAndType(userId, "RAG_SEARCH");

        return searches.stream()
                .limit(limit)
                .map(metric -> extractQueryFromValue(metric.getValue()))
                .filter(Objects::nonNull)
                .collect(Collectors.toList());
    }

    /**
     * 사용자의 관심 제품 카테고리 분석
     */
    public Map<String, Long> getUserProductPreferences(Integer userId) {
        List<UserMetricEntity> clicks = userMetricsRepository
                .findByUserAndType(userId, "PRODUCT_CLICK");

        return clicks.stream()
                .map(metric -> extractCategoryFromValue(metric.getValue()))
                .filter(Objects::nonNull)
                .collect(Collectors.groupingBy(c -> c, Collectors.counting()));
    }

    /**
     * 관리자용: 전체 검색 횟수
     */
    public long getTotalSearchCount() {
        return userMetricsRepository.findByTypeOrderByRecordDateDesc("RAG_SEARCH").size();
    }

    /**
     * 관리자용: 활성 사용자 수 (최근 N일 동안 활동한 사용자)
     */
    public long getActiveUsersCount(int days) {
        Instant startDate = Instant.now().minus(days, ChronoUnit.DAYS);
        return userMetricsRepository.findAll().stream()
                .filter(m -> m.getRecordDate().isAfter(startDate))
                .map(m -> m.getUserIdForeign().getId())
                .distinct()
                .count();
    }

    /**
     * 관리자용: 전체 진단 횟수
     */
    public long getTotalDiagnosisCount() {
        return userMetricsRepository.findByTypeOrderByRecordDateDesc("SCALP_DIAGNOSIS").size();
    }

    // 유틸리티 메서드들
    private long countByType(List<UserMetricEntity> metrics, String type) {
        return metrics.stream().filter(m -> type.equals(m.getType())).count();
    }

    private String extractQueryFromValue(String value) {
        try {
            Map<String, Object> data = objectMapper.readValue(value, Map.class);
            return (String) data.get("query");
        } catch (Exception e) {
            return null;
        }
    }

    private String extractCategoryFromValue(String value) {
        try {
            Map<String, Object> data = objectMapper.readValue(value, Map.class);
            return (String) data.get("category");
        } catch (Exception e) {
            return null;
        }
    }
}
