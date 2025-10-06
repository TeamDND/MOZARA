package com.example.springboot.service.ai;

import com.example.springboot.data.dao.AnalysisResultDAO;
import com.example.springboot.data.entity.AnalysisResultEntity;
import com.example.springboot.data.entity.UserEntity;
import com.example.springboot.data.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class HairLossDailyService {

    @Value("${python.api.base-url:http://localhost:8000}")
    private String pythonApiBaseUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final AnalysisResultDAO analysisResultDAO;
    private final UserRepository userRepository;

    /**
     * CNN + RAG 기반 머리사진 분석
     */
    public Map<String, Object> analyzeHairImage(MultipartFile image, int topK) {
        return analyzeHairImage(image, topK, true); // 기본값: 전처리 사용 (빛 반사 처리 포함)
    }
    
    /**
     * CNN + RAG 기반 머리사진 분석 (전처리 옵션 포함)
     */
    public Map<String, Object> analyzeHairImage(MultipartFile image, int topK, boolean usePreprocessing) {
        try {
            String url = pythonApiBaseUrl + "/hair-loss-daily/analyze";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", image.getResource());
            body.add("top_k", topK);
            body.add("use_preprocessing", usePreprocessing);
            
            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
            
            ResponseEntity<Map> response = restTemplate.postForEntity(url, requestEntity, Map.class);
            
            if (response.getStatusCode() == HttpStatus.OK) {
                Map<String, Object> result = response.getBody();
                log.info("Python API 응답 결과: {}", result);
                log.info("Python API 응답 키들: {}", result != null ? result.keySet() : "null");
                if (result != null) {
                    for (String key : result.keySet()) {
                        log.info("키 '{}'의 값: {} (타입: {})", key, result.get(key), 
                                result.get(key) != null ? result.get(key).getClass().getSimpleName() : "null");
                    }
                }
                return result;
            } else {
                throw new RuntimeException("Python API 호출 실패: " + response.getStatusCode());
            }
            
        } catch (Exception e) {
            log.error("머리사진 분석 중 오류 발생", e);
            throw new RuntimeException("머리사진 분석 중 오류가 발생했습니다.", e);
        }
    }

    /**
     * 특정 카테고리로 필터링하여 검색
     */
    public Map<String, Object> searchByCategory(MultipartFile image, String category, int topK) {
        try {
            String url = pythonApiBaseUrl + "/hair-loss-daily/search/category";
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);
            
            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("file", image.getResource());
            body.add("category", category);
            body.add("top_k", topK);
            
            HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);
            
            ResponseEntity<Map> response = restTemplate.postForEntity(url, requestEntity, Map.class);
            
            if (response.getStatusCode() == HttpStatus.OK) {
                return response.getBody();
            } else {
                throw new RuntimeException("Python API 호출 실패: " + response.getStatusCode());
            }
            
        } catch (Exception e) {
            log.error("카테고리별 검색 중 오류 발생", e);
            throw new RuntimeException("카테고리별 검색 중 오류가 발생했습니다.", e);
        }
    }

    /**
     * 서비스 상태 확인
     */
    public Map<String, Object> healthCheck() {
        try {
            String url = pythonApiBaseUrl + "/hair-loss-daily/health";
            
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            
            if (response.getStatusCode() == HttpStatus.OK) {
                return response.getBody();
            } else {
                throw new RuntimeException("Python API 호출 실패: " + response.getStatusCode());
            }
            
        } catch (Exception e) {
            log.error("서비스 상태 확인 중 오류 발생", e);
            throw new RuntimeException("서비스 상태 확인 중 오류가 발생했습니다.", e);
        }
    }

    /**
     * 데이터베이스 통계 정보 조회
     */
    public Map<String, Object> getDatabaseStats() {
        try {
            String url = pythonApiBaseUrl + "/hair-loss-daily/stats";
            
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            
            if (response.getStatusCode() == HttpStatus.OK) {
                return response.getBody();
            } else {
                throw new RuntimeException("Python API 호출 실패: " + response.getStatusCode());
            }
            
        } catch (Exception e) {
            log.error("통계 조회 중 오류 발생", e);
            throw new RuntimeException("통계 조회 중 오류가 발생했습니다.", e);
        }
    }

    /**
     * 모델 정보 조회
     */
    public Map<String, Object> getModelInfo() {
        try {
            String url = pythonApiBaseUrl + "/hair-loss-daily/model/info";
            
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);
            
            if (response.getStatusCode() == HttpStatus.OK) {
                return response.getBody();
            } else {
                throw new RuntimeException("Python API 호출 실패: " + response.getStatusCode());
            }
            
        } catch (Exception e) {
            log.error("모델 정보 조회 중 오류 발생", e);
            throw new RuntimeException("모델 정보 조회 중 오류가 발생했습니다.", e);
        }
    }

    /**
     * 분석 결과 저장
     */
    public Map<String, Object> saveAnalysisResult(Map<String, Object> analysisResult) {
        try {
            log.info("Daily 분석 결과 저장 요청: {}", analysisResult);
            
            // user_id 추출
            Integer userId = (Integer) analysisResult.get("user_id");
            if (userId == null || userId <= 0) {
                log.info("로그인하지 않은 사용자 - 저장하지 않음");
                return Map.of(
                    "message", "분석 완료 (저장 안함 - 로그인 필요)",
                    "saved", false
                );
            }

            // 사용자 존재 확인
            UserEntity user = userRepository.findById(userId).orElse(null);
            if (user == null) {
                throw new RuntimeException("사용자를 찾을 수 없습니다: " + userId);
            }

            // Daily RAG 결과를 데이터베이스 형식으로 변환
            String analysisSummary = "";
            String advice = "";
            Integer grade = null;
            String imageUrl = "";

            // grade 추출 (프론트엔드에서 전달)
            if (analysisResult.containsKey("grade")) {
                Object gradeObj = analysisResult.get("grade");
                if (gradeObj instanceof Number) {
                    grade = ((Number) gradeObj).intValue();
                } else if (gradeObj instanceof String) {
                    try {
                        grade = Integer.parseInt((String) gradeObj);
                    } catch (NumberFormatException e) {
                        log.warn("grade 파싱 실패: {}", gradeObj);
                    }
                }
                log.info("추출된 grade: {}", grade);
            }

            // Python API 응답 구조에 맞게 데이터 추출
            // analysis.diagnosis_scores에서 간단한 요약 생성
            if (analysisResult.containsKey("analysis")) {
                Object analysisObj = analysisResult.get("analysis");
                if (analysisObj instanceof Map) {
                    Map<String, Object> analysis = (Map<String, Object>) analysisObj;
                    
                    // diagnosis_scores에서 간단한 요약 생성
                    if (analysis.containsKey("diagnosis_scores")) {
                        Object scoresObj = analysis.get("diagnosis_scores");
                        if (scoresObj instanceof Map) {
                            Map<String, Object> scores = (Map<String, Object>) scoresObj;
                            StringBuilder summary = new StringBuilder();
                            
                            for (Map.Entry<String, Object> entry : scores.entrySet()) {
                                String key = entry.getKey();
                                Object value = entry.getValue();
                                
                                if (value instanceof Number) {
                                    double score = ((Number) value).doubleValue();
                                    String status;
                                    if (score < 0.5) {
                                        status = "양호";
                                    } else if (score < 1.0) {
                                        status = "주의";
                                    } else {
                                        status = "경고";
                                    }
                                    
                                    if (summary.length() > 0) {
                                        summary.append(", ");
                                    }
                                    summary.append(key).append(" ").append(status);
                                }
                            }
                            
                            if (summary.length() > 0) {
                                analysisSummary = summary.toString();
                            } else {
                                analysisSummary = "Daily 분석 완료";
                            }
                        }
                    }
                    
                    // primary_category와 primary_severity로 간단한 요약 생성
                    if (analysisSummary.isEmpty() || analysisSummary.equals("Daily 분석 완료")) {
                        String category = (String) analysis.get("primary_category");
                        String severity = (String) analysis.get("primary_severity");
                        
                        if (category != null && severity != null) {
                            analysisSummary = category + " " + severity;
                        } else {
                            analysisSummary = "Daily 분석 완료";
                        }
                    }
                }
            }
            
            // advice는 간단한 메시지로 설정
            advice = "Daily 분석 완료";
            
            // 기존 키들도 지원 (하위 호환성) - 간단한 메시지로 설정
            if (analysisSummary.isEmpty()) {
                analysisSummary = "Daily 분석 완료";
            }
            if (advice.isEmpty()) {
                advice = "Daily 분석 완료";
            }

            // image_url 추출
            if (analysisResult.containsKey("image_url")) {
                imageUrl = (String) analysisResult.get("image_url");
            }

            // 추출된 데이터 로그 출력
            log.info("추출된 데이터 - analysisSummary 길이: {}, advice 길이: {}, grade: {}, imageUrl: {}", 
                    analysisSummary != null ? analysisSummary.length() : 0, 
                    advice != null ? advice.length() : 0, grade, imageUrl);
            log.info("추출된 데이터 내용 - analysisSummary: {}", analysisSummary);
            log.info("추출된 데이터 내용 - advice: {}", advice);

            // 저장 전 최종 길이 체크 및 자르기 (추가 보안)
            if (analysisSummary != null && analysisSummary.length() > 250) {
                analysisSummary = analysisSummary.substring(0, 250) + "...";
                log.warn("analysisSummary가 250자를 초과하여 자름. 길이: {}", analysisSummary.length());
            }
            if (advice != null && advice.length() > 250) {
                advice = advice.substring(0, 250) + "...";
                log.warn("advice가 250자를 초과하여 자름. 길이: {}", advice.length());
            }

            // AnalysisResultEntity 생성
            AnalysisResultEntity entity = new AnalysisResultEntity();
            entity.setInspectionDate(LocalDate.now());
            entity.setAnalysisSummary(analysisSummary);
            entity.setAdvice(advice);
            entity.setGrade(grade);
            entity.setImageUrl(imageUrl != null ? imageUrl : "");
            entity.setAnalysisType("daily"); // analysis_type을 "daily"로 설정
            entity.setUserEntityIdForeign(user);

            log.info("저장할 엔티티 정보: inspectionDate={}, analysisSummary={}, advice={}, grade={}, imageUrl={}, analysisType={}, userId={}", 
                    entity.getInspectionDate(), entity.getAnalysisSummary(), entity.getAdvice(), 
                    entity.getGrade(), entity.getImageUrl(), entity.getAnalysisType(), 
                    entity.getUserEntityIdForeign() != null ? entity.getUserEntityIdForeign().getId() : "null");

            // DAO를 통해 데이터베이스에 저장
            AnalysisResultEntity savedEntity = analysisResultDAO.save(entity);
            
            return Map.of(
                "success", true,
                "message", "Daily 분석 결과가 성공적으로 저장되었습니다.",
                "saved", true,
                "saved_id", savedEntity != null ? savedEntity.getId() : null,
                "savedAt", System.currentTimeMillis()
            );
            
        } catch (Exception e) {
            log.error("Daily 분석 결과 저장 중 오류 발생", e);
            throw new RuntimeException("Daily 분석 결과 저장 중 오류가 발생했습니다.", e);
        }
    }

    /**
     * 사용자의 daily 분석 결과를 날짜 기준으로 조회
     */
    public Map<String, Object> getDailyAnalysisResults(Integer userId, LocalDate date) {
        try {
            log.info("Daily 분석 결과 조회 요청 - userId: {}, date: {}", userId, date);
            
            if (userId == null || userId <= 0) {
                return Map.of("error", "유효하지 않은 사용자 ID입니다.");
            }

            // 사용자 존재 확인
            UserEntity user = userRepository.findById(userId).orElse(null);
            if (user == null) {
                return Map.of("error", "사용자를 찾을 수 없습니다.");
            }

            // DAO를 통해 특정 날짜의 daily 분석 결과 조회
            List<AnalysisResultEntity> results = analysisResultDAO.findByUserIdAndAnalysisTypeAndDate(
                    userId, "daily", date);

            // DAO를 통해 결과를 Map 형태로 변환
            List<Map<String, Object>> resultList = analysisResultDAO.convertEntityListToMapList(results);

            return Map.of(
                    "success", true,
                    "userId", userId,
                    "date", date.toString(),
                    "analysisType", "daily",
                    "count", results.size(),
                    "results", resultList
            );

        } catch (Exception e) {
            log.error("Daily 분석 결과 조회 중 오류 발생", e);
            return Map.of("error", "Daily 분석 결과 조회 중 오류가 발생했습니다: " + e.getMessage());
        }
    }

    /**
     * 사용자의 daily 분석 결과를 날짜 범위로 조회
     */
    public Map<String, Object> getDailyAnalysisResultsByDateRange(Integer userId, LocalDate startDate, LocalDate endDate) {
        try {
            log.info("Daily 분석 결과 조회 요청 - userId: {}, startDate: {}, endDate: {}", userId, startDate, endDate);
            
            if (userId == null || userId <= 0) {
                return Map.of("error", "유효하지 않은 사용자 ID입니다.");
            }

            if (startDate == null || endDate == null) {
                return Map.of("error", "시작 날짜와 종료 날짜가 필요합니다.");
            }

            if (startDate.isAfter(endDate)) {
                return Map.of("error", "시작 날짜는 종료 날짜보다 이전이어야 합니다.");
            }

            // 사용자 존재 확인
            UserEntity user = userRepository.findById(userId).orElse(null);
            if (user == null) {
                return Map.of("error", "사용자를 찾을 수 없습니다.");
            }

            // DAO를 통해 날짜 범위의 daily 분석 결과 조회
            List<AnalysisResultEntity> results = analysisResultDAO.findByUserIdAndAnalysisTypeAndDateRange(
                    userId, "daily", startDate, endDate);

            // DAO를 통해 결과를 Map 형태로 변환
            List<Map<String, Object>> resultList = analysisResultDAO.convertEntityListToMapList(results);

            return Map.of(
                    "success", true,
                    "userId", userId,
                    "startDate", startDate.toString(),
                    "endDate", endDate.toString(),
                    "analysisType", "daily",
                    "count", results.size(),
                    "results", resultList
            );

        } catch (Exception e) {
            log.error("Daily 분석 결과 조회 중 오류 발생", e);
            return Map.of("error", "Daily 분석 결과 조회 중 오류가 발생했습니다: " + e.getMessage());
        }
    }

    /**
     * 사용자의 최근 daily 분석 결과 조회
     */
    public Map<String, Object> getLatestDailyAnalysisResults(Integer userId, int limit) {
        try {
            log.info("최근 Daily 분석 결과 조회 요청 - userId: {}, limit: {}", userId, limit);
            
            if (userId == null || userId <= 0) {
                return Map.of("error", "유효하지 않은 사용자 ID입니다.");
            }

            if (limit <= 0 || limit > 100) {
                limit = 10; // 기본값 10개, 최대 100개
            }

            // 사용자 존재 확인
            UserEntity user = userRepository.findById(userId).orElse(null);
            if (user == null) {
                return Map.of("error", "사용자를 찾을 수 없습니다.");
            }

            // DAO를 통해 최근 daily 분석 결과 조회
            List<AnalysisResultEntity> results = analysisResultDAO.findByUserIdAndAnalysisTypeOrderByDateDesc(
                    userId, "daily");

            // limit만큼만 반환
            if (results.size() > limit) {
                results = results.subList(0, limit);
            }

            // DAO를 통해 결과를 Map 형태로 변환
            List<Map<String, Object>> resultList = analysisResultDAO.convertEntityListToMapList(results);

            return Map.of(
                    "success", true,
                    "userId", userId,
                    "analysisType", "daily",
                    "limit", limit,
                    "count", results.size(),
                    "results", resultList
            );

        } catch (Exception e) {
            log.error("최근 Daily 분석 결과 조회 중 오류 발생", e);
            return Map.of("error", "최근 Daily 분석 결과 조회 중 오류가 발생했습니다: " + e.getMessage());
        }
    }

}
