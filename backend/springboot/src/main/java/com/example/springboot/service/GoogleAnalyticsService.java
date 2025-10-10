package com.example.springboot.service;

import com.google.analytics.data.v1beta.*;
import com.google.auth.oauth2.GoogleCredentials;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Slf4j
@Service
public class GoogleAnalyticsService {

    @Value("${google.analytics.property-id:507990506}")
    private String propertyId;

    @Value("${google.analytics.credentials-path:classpath:secrets/ga-service-account.json}")
    private String credentialsPath;

    private BetaAnalyticsDataClient analyticsDataClient;

    @PostConstruct
    public void init() {
        log.info("=== GoogleAnalyticsService 초기화 시작 ===");
        log.info("Property ID: {}", propertyId);
        log.info("Credentials Path: {}", credentialsPath);

        if (credentialsPath == null || credentialsPath.isEmpty()) {
            log.warn("Google Analytics 인증 파일 경로가 설정되지 않았습니다. Analytics 기능이 비활성화됩니다.");
            return;
        }

        log.info("=== GoogleAnalyticsService 초기화 완료 ===");
    }

    /**
     * GA Data API 클라이언트 초기화
     */
    private BetaAnalyticsDataClient getAnalyticsDataClient() throws IOException {
        if (analyticsDataClient == null) {
            if (credentialsPath == null || credentialsPath.isEmpty()) {
                throw new IOException("Google Analytics 인증 파일 경로가 설정되지 않았습니다.");
            }

            // classpath: 프리픽스 제거
            String path = credentialsPath.replace("classpath:", "");

            InputStream credentialsStream = getClass().getClassLoader().getResourceAsStream(path);
            if (credentialsStream == null) {
                log.error("GA 인증 파일을 찾을 수 없습니다: {}", path);
                throw new IOException("GA 인증 파일을 찾을 수 없습니다: " + path);
            }

            GoogleCredentials credentials = GoogleCredentials
                    .fromStream(credentialsStream)
                    .createScoped(Arrays.asList("https://www.googleapis.com/auth/analytics.readonly"));

            BetaAnalyticsDataSettings settings = BetaAnalyticsDataSettings.newBuilder()
                    .setCredentialsProvider(() -> credentials)
                    .build();

            analyticsDataClient = BetaAnalyticsDataClient.create(settings);
            log.info("Google Analytics Data API 클라이언트 초기화 완료");
        }
        return analyticsDataClient;
    }

    /**
     * 최근 7일간 페이지뷰 데이터 조회
     */
    public Map<String, Object> getPageViewsLast7Days() {
        try {
            BetaAnalyticsDataClient client = getAnalyticsDataClient();

            // 날짜 설정
            DateRange dateRange = DateRange.newBuilder()
                    .setStartDate("7daysAgo")
                    .setEndDate("today")
                    .build();

            // Metric: 페이지뷰
            Metric metric = Metric.newBuilder()
                    .setName("screenPageViews")
                    .build();

            // Dimension: 날짜
            Dimension dimension = Dimension.newBuilder()
                    .setName("date")
                    .build();

            // Request 생성
            RunReportRequest request = RunReportRequest.newBuilder()
                    .setProperty("properties/" + propertyId)
                    .addDateRanges(dateRange)
                    .addMetrics(metric)
                    .addDimensions(dimension)
                    .build();

            // API 호출
            RunReportResponse response = client.runReport(request);

            // 결과 파싱
            List<Map<String, String>> data = new ArrayList<>();
            for (Row row : response.getRowsList()) {
                Map<String, String> rowData = new HashMap<>();
                rowData.put("date", row.getDimensionValues(0).getValue());
                rowData.put("pageViews", row.getMetricValues(0).getValue());
                data.add(rowData);
            }

            Map<String, Object> result = new HashMap<>();
            result.put("data", data);
            result.put("total", calculateTotal(data, "pageViews"));

            log.info("페이지뷰 데이터 조회 성공: {} 건", data.size());
            return result;

        } catch (IOException e) {
            log.error("Google Analytics API 호출 실패", e);
            return createErrorResponse("Google Analytics 데이터를 가져올 수 없습니다.");
        }
    }

    /**
     * 최근 7일간 사용자 수 조회
     */
    public Map<String, Object> getActiveUsersLast7Days() {
        try {
            BetaAnalyticsDataClient client = getAnalyticsDataClient();

            DateRange dateRange = DateRange.newBuilder()
                    .setStartDate("7daysAgo")
                    .setEndDate("today")
                    .build();

            Metric metric = Metric.newBuilder()
                    .setName("activeUsers")
                    .build();

            Dimension dimension = Dimension.newBuilder()
                    .setName("date")
                    .build();

            RunReportRequest request = RunReportRequest.newBuilder()
                    .setProperty("properties/" + propertyId)
                    .addDateRanges(dateRange)
                    .addMetrics(metric)
                    .addDimensions(dimension)
                    .build();

            RunReportResponse response = client.runReport(request);

            List<Map<String, String>> data = new ArrayList<>();
            for (Row row : response.getRowsList()) {
                Map<String, String> rowData = new HashMap<>();
                rowData.put("date", row.getDimensionValues(0).getValue());
                rowData.put("activeUsers", row.getMetricValues(0).getValue());
                data.add(rowData);
            }

            Map<String, Object> result = new HashMap<>();
            result.put("data", data);
            result.put("total", calculateTotal(data, "activeUsers"));

            log.info("활성 사용자 데이터 조회 성공: {} 건", data.size());
            return result;

        } catch (IOException e) {
            log.error("Google Analytics API 호출 실패", e);
            return createErrorResponse("Google Analytics 데이터를 가져올 수 없습니다.");
        }
    }

    /**
     * 인기 페이지 TOP 10 조회
     */
    public Map<String, Object> getTopPages() {
        try {
            BetaAnalyticsDataClient client = getAnalyticsDataClient();

            DateRange dateRange = DateRange.newBuilder()
                    .setStartDate("7daysAgo")
                    .setEndDate("today")
                    .build();

            Metric metric = Metric.newBuilder()
                    .setName("screenPageViews")
                    .build();

            Dimension dimension = Dimension.newBuilder()
                    .setName("pagePath")
                    .build();

            // 정렬: 페이지뷰 내림차순
            OrderBy orderBy = OrderBy.newBuilder()
                    .setMetric(OrderBy.MetricOrderBy.newBuilder().setMetricName("screenPageViews"))
                    .setDesc(true)
                    .build();

            RunReportRequest request = RunReportRequest.newBuilder()
                    .setProperty("properties/" + propertyId)
                    .addDateRanges(dateRange)
                    .addMetrics(metric)
                    .addDimensions(dimension)
                    .addOrderBys(orderBy)
                    .setLimit(10)
                    .build();

            RunReportResponse response = client.runReport(request);

            List<Map<String, String>> data = new ArrayList<>();
            for (Row row : response.getRowsList()) {
                Map<String, String> rowData = new HashMap<>();
                rowData.put("pagePath", row.getDimensionValues(0).getValue());
                rowData.put("pageViews", row.getMetricValues(0).getValue());
                data.add(rowData);
            }

            Map<String, Object> result = new HashMap<>();
            result.put("data", data);

            log.info("인기 페이지 데이터 조회 성공: {} 건", data.size());
            return result;

        } catch (IOException e) {
            log.error("Google Analytics API 호출 실패", e);
            return createErrorResponse("Google Analytics 데이터를 가져올 수 없습니다.");
        }
    }

    /**
     * 통합 대시보드 데이터 조회
     */
    public Map<String, Object> getDashboardData() {
        Map<String, Object> dashboard = new HashMap<>();
        dashboard.put("pageViews", getPageViewsLast7Days());
        dashboard.put("activeUsers", getActiveUsersLast7Days());
        dashboard.put("topPages", getTopPages());
        return dashboard;
    }

    /**
     * 합계 계산
     */
    private long calculateTotal(List<Map<String, String>> data, String key) {
        return data.stream()
                .mapToLong(row -> Long.parseLong(row.get(key)))
                .sum();
    }

    /**
     * 에러 응답 생성
     */
    private Map<String, Object> createErrorResponse(String message) {
        Map<String, Object> error = new HashMap<>();
        error.put("error", true);
        error.put("message", message);
        return error;
    }
}
