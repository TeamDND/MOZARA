package com.example.springboot.service.ai;

import com.example.springboot.data.dao.AnalysisResultDAO;
import com.example.springboot.data.dao.UsersInfoDAO;
import com.example.springboot.data.entity.AnalysisResultEntity;
import com.example.springboot.data.entity.UserEntity;
import com.example.springboot.data.entity.UsersInfoEntity;
import com.example.springboot.data.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class RagV2CheckService {

    @Value("${ai.python.base-url:http://localhost:8000}")
    private String pythonBaseUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final AnalysisResultDAO analysisResultDAO;
    private final UserRepository userRepository;
    private final UsersInfoDAO usersInfoDAO;

    /**
     * RAG 분석 + DB 저장 통합 메서드
     */
    public Map<String, Object> analyzeAndSave(
            MultipartFile topImage, Integer userId, String imageUrl,
            String gender, String age, String familyHistory,
            String recentHairLoss, String stress
    ) throws Exception {

        log.info("RAG 분석 시작 - userId: {}, file: {}", userId, topImage.getOriginalFilename());

        // 1. 설문 데이터 저장 (로그인 사용자만)
        if (userId != null && userId > 0) {
            saveUserInfo(userId, gender, age, familyHistory, recentHairLoss, stress);
        }

        // 2. Python API 호출하여 분석
        Map<String, Object> analysisResult = callPythonRagAnalysis(
                topImage, gender, age, familyHistory, recentHairLoss, stress
        );

        // 3. 분석 결과 DB 저장 (로그인 사용자만)
        Map<String, Object> saveResult = saveAnalysisResult(analysisResult, userId, imageUrl);

        // 4. 통합 응답 반환
        return Map.of(
                "analysis", analysisResult,
                "save_result", saveResult
        );
    }

    /**
     * Python RAG API 호출
     */
    private Map<String, Object> callPythonRagAnalysis(
            MultipartFile topImage,
            String gender, String age, String familyHistory,
            String recentHairLoss, String stress
    ) throws Exception {

        String url = pythonBaseUrl + "/api/hair-classification-rag/analyze-upload";
        log.info("Python RAG API 호출: {}", url);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();

        // Top 이미지 추가 (router.py의 'file' 파라미터와 매칭)
        body.add("file", new ByteArrayResource(topImage.getBytes()) {
            @Override
            public String getFilename() {
                return topImage.getOriginalFilename();
            }
        });

        // 설문 데이터 추가
        if (gender != null) body.add("gender", gender);
        if (age != null) body.add("age", age);
        if (familyHistory != null) body.add("familyHistory", familyHistory);
        if (recentHairLoss != null) body.add("recentHairLoss", recentHairLoss);
        if (stress != null) body.add("stress", stress);

        log.info("설문 데이터 - 나이: {}, 가족력: {}, 최근탈모: {}, 스트레스: {}", age, familyHistory, recentHairLoss, stress);

        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        try {
            ResponseEntity<Map> response = restTemplate.postForEntity(url, requestEntity, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                log.info("Python RAG 분석 응답 성공");
                return response.getBody();
            } else {
                throw new Exception("Python RAG 응답 오류: " + response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("Python RAG 통신 오류: {}", e.getMessage());
            throw new Exception("RAG 분석 서비스 연결 오류: " + e.getMessage());
        }
    }

    /**
     * 설문 데이터 저장 
     */
    private void saveUserInfo(Integer userId, String gender, String age,
                              String familyHistory, String recentHairLoss, String stress) {
        try {
            UserEntity user = userRepository.findById(userId).orElse(null);
            if (user == null) {
                log.warn("사용자를 찾을 수 없음: {}", userId);
                return;
            }

            UsersInfoEntity existingInfo = usersInfoDAO.findByUserId(userId);
            UsersInfoEntity userInfo = existingInfo != null ? existingInfo : new UsersInfoEntity();

            if (existingInfo == null) {
                userInfo.setUserEntityIdForeign(user);
            }

            // 설문 데이터 설정
            if (gender != null) {
                userInfo.setGender(gender);
            }
            if (age != null) {
                try {
                    userInfo.setAge(Integer.parseInt(age));
                } catch (NumberFormatException e) {
                    log.warn("나이 파싱 오류: {}", age);
                }
            }
            if (familyHistory != null) {
                // familyHistory는 이제 String 타입 ('none', 'father', 'mother', 'both')
                userInfo.setFamilyHistory(familyHistory);
            }
            if (recentHairLoss != null) {
                userInfo.setIsLoss("yes".equalsIgnoreCase(recentHairLoss));
            }
            if (stress != null) {
                userInfo.setStress(stress);
            }

            // 저장 또는 업데이트
            if (existingInfo != null) {
                usersInfoDAO.updateUserInfo(userInfo);
                log.info("사용자 정보 업데이트 완료: {}", userId);
            } else {
                usersInfoDAO.addUserInfo(userInfo);
                log.info("사용자 정보 저장 완료: {}", userId);
            }

        } catch (Exception e) {
            log.error("설문 데이터 저장 오류: {}", e.getMessage(), e);
        }
    }

    /**
     * RAG 분석 결과를 데이터베이스에 저장
     */
    private Map<String, Object> saveAnalysisResult(Map<String, Object> ragV2Result, Integer userId, String imageUrl) throws Exception {
        log.info("RAG 분석 결과 저장 요청 - userId: {}", userId);

        // user_id가 없으면 저장하지 않음
        if (userId == null || userId <= 0) {
            log.info("로그인하지 않은 사용자 - 저장하지 않음");
            return Map.of(
                "message", "분석 완료 (저장 안함 - 로그인 필요)",
                "saved", false
            );
        }

        try {
            // 사용자 존재 확인
            UserEntity user = userRepository.findById(userId)
                    .orElseThrow(() -> new Exception("사용자를 찾을 수 없습니다: " + userId));

            // RAG 결과를 데이터베이스 형식으로 변환
            String title = (String) ragV2Result.get("title");
            String description = (String) ragV2Result.get("description");
            String analysisSummary = title + "\n" + description;
            String advice = (String) ragV2Result.getOrDefault("advice", "");
            Integer gradeValue = (Integer) ragV2Result.get("grade");
            // analysis_type을 "hair_loss_female"로 고정
            String analysisType = "hair_loss_female";

            log.info("저장 데이터 - grade: {}, analysisType: {}", gradeValue, analysisType);

            // AnalysisResultEntity 생성 및 저장
            AnalysisResultEntity entity = new AnalysisResultEntity();
            entity.setInspectionDate(LocalDate.now());
            entity.setAnalysisSummary(analysisSummary);
            entity.setAdvice(advice);
            entity.setGrade(gradeValue);
            entity.setImageUrl(imageUrl != null ? imageUrl : "");
            entity.setAnalysisType(analysisType);
            entity.setUserEntityIdForeign(user);

            AnalysisResultEntity savedEntity = analysisResultDAO.save(entity);
            log.info("RAG 분석 결과 저장 성공: ID {}", savedEntity.getId());

            return Map.of(
                "message", "분석 완료 및 저장 완료",
                "saved", true,
                "saved_id", savedEntity.getId()
            );

        } catch (Exception e) {
            log.error("RAG 분석 결과 저장 오류: {}", e.getMessage(), e);
            throw new Exception("분석 결과 저장 중 오류가 발생했습니다: " + e.getMessage());
        }
    }

    /**
     * RAG V2 서비스 헬스 체크
     */
    public Map<String, Object> healthCheck() {
        try {
            // Python API 연결 확인
            String url = pythonBaseUrl + "/health";
            ResponseEntity<Map> response = restTemplate.getForEntity(url, Map.class);

            boolean pythonHealthy = response.getStatusCode().is2xxSuccessful();

            return Map.of(
                "status", pythonHealthy ? "healthy" : "degraded",
                "service", "rag-v2-check",
                "python_backend", pythonHealthy ? "connected" : "disconnected",
                "python_url", pythonBaseUrl,
                "timestamp", java.time.LocalDateTime.now().toString()
            );

        } catch (Exception e) {
            log.error("Python 백엔드 연결 실패: {}", e.getMessage());
            return Map.of(
                "status", "unhealthy",
                "service", "rag-v2-check",
                "python_backend", "error",
                "python_url", pythonBaseUrl,
                "error", e.getMessage(),
                "timestamp", java.time.LocalDateTime.now().toString()
            );
        }
    }
}
