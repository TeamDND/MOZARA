package com.example.springboot.service.ai;

import com.example.springboot.data.dao.AnalysisResultDAO;
import com.example.springboot.data.entity.AnalysisResultEntity;
import com.example.springboot.data.entity.UserEntity;
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
public class SwinCheckService {

    @Value("${ai.python.base-url:http://localhost:8000}")
    private String pythonBaseUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final AnalysisResultDAO analysisResultDAO;
    private final UserRepository userRepository;

    /**
     * Swin 기반 탈모 이미지 분석 (Python /hair_swin_check 프록시)
     * Top + Side 이미지 동시 분석 (Side는 optional)
     */
    public Map<String, Object> analyzeHairWithSwin(MultipartFile topImage, MultipartFile sideImage,
                                                   String gender, String age, String familyHistory,
                                                   String recentHairLoss, String stress) throws Exception {
        log.info("Swin 탈모 분석 요청 - Top: {}, Side: {}",
            topImage.getOriginalFilename(),
            sideImage != null ? sideImage.getOriginalFilename() : "없음 (여성)");

        // Python API의 URL을 hair_swin_check로 변경
        String url = pythonBaseUrl + "/hair_swin_check";

        // HTTP 헤더를 MULTIPART_FORM_DATA로 설정
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        // MultiValueMap을 사용하여 요청 본문(body)을 구성
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();

        // Top 이미지 추가
        body.add("top_image", new ByteArrayResource(topImage.getBytes()) {
            @Override
            public String getFilename() {
                return topImage.getOriginalFilename();
            }
        });

        // Side 이미지 추가 (있는 경우만)
        if (sideImage != null && !sideImage.isEmpty()) {
            body.add("side_image", new ByteArrayResource(sideImage.getBytes()) {
                @Override
                public String getFilename() {
                    return sideImage.getOriginalFilename();
                }
            });
        }

        // 설문 데이터 추가
        if (gender != null) body.add("gender", gender);
        if (age != null) body.add("age", age);
        if (familyHistory != null) body.add("familyHistory", familyHistory);
        if (recentHairLoss != null) body.add("recentHairLoss", recentHairLoss);
        if (stress != null) body.add("stress", stress);

        log.info("설문 데이터 - 나이: {}, 가족력: {}, 최근탈모: {}, 스트레스: {}", age, familyHistory, recentHairLoss, stress);

        // 요청 엔티티 생성
        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        try {
            // postForEntity() 메소드로 POST 요청 전송
            ResponseEntity<Map> response = restTemplate.postForEntity(url, requestEntity, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                log.info("Python Swin 분석 응답 성공");
                return response.getBody();
            } else {
                throw new Exception("Python Swin 응답 오류: " + response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("Python Swin 통신 오류: {}", e.getMessage());
            throw new Exception("Swin 분석 서비스 연결 오류: " + e.getMessage());
        }
    }

    /**
     * Swin 분석 결과를 데이터베이스에 저장
     */
    public Map<String, Object> saveAnalysisResult(Map<String, Object> swinResult, Integer userId, String imageUrl) throws Exception {
        log.info("Swin 분석 결과 저장 요청 - 사용자: {}", userId);
        System.out.println("=== 저장 요청 ===");
        System.out.println("userId: " + userId);
        System.out.println("swinResult: " + swinResult);

        try {
            // user_id가 없으면 저장하지 않음
            if (userId == null || userId <= 0) {
                log.info("로그인하지 않은 사용자 - 저장하지 않음");
                System.out.println("로그인하지 않은 사용자 - 저장하지 않음");
                return Map.of(
                    "message", "분석 완료 (저장 안함 - 로그인 필요)",
                    "saved", false
                );
            }

            // 사용자 존재 확인
            UserEntity user = userRepository.findById(userId).orElse(null);
            if (user == null) {
                throw new Exception("사용자를 찾을 수 없습니다: " + userId);
            }

            // Swin 결과를 데이터베이스 형식으로 변환
            String title = (String) swinResult.get("title");
            String description = (String) swinResult.get("description");
            String analysisSummary = title + "\n" + description;

            // advice는 이미 Python에서 문자열로 변환되어 옴
            String advice = (String) swinResult.getOrDefault("advice", "");
            
            // 디버깅: 데이터 길이 확인
            log.info("=== 저장 데이터 길이 확인 ===");
            log.info("analysisSummary 길이: {} 바이트", analysisSummary.getBytes("UTF-8").length);
            log.info("advice 길이: {} 바이트", advice.getBytes("UTF-8").length);
            log.info("analysisSummary 내용: {}", analysisSummary);
            log.info("advice 내용: {}", advice);

            // analysis_type 추출
            String analysisType = (String) swinResult.get("analysis_type");
            if (analysisType == null || analysisType.isEmpty()) {
                analysisType = "swin_analysis";
            }

            // AnalysisResultEntity 생성
            AnalysisResultEntity entity = new AnalysisResultEntity();
            entity.setInspectionDate(LocalDate.now());
            entity.setAnalysisSummary(analysisSummary);
            entity.setAdvice(advice);
            entity.setGrade((Integer) swinResult.get("stage"));
            entity.setImageUrl(imageUrl != null ? imageUrl : "");
            entity.setAnalysisType(analysisType);
            entity.setUserEntityIdForeign(user);

            // AnalysisResultDAO를 통해 데이터베이스에 저장
            AnalysisResultEntity savedEntity = analysisResultDAO.save(entity);

            log.info("Swin 분석 결과 저장 성공: ID {}", savedEntity.getId());

            return Map.of(
                "message", "분석 완료 및 저장 완료",
                "saved", true,
                "saved_id", savedEntity.getId()
            );

        } catch (Exception e) {
            log.error("Swin 분석 결과 저장 오류: {}", e.getMessage());
            throw new Exception("분석 결과 저장 중 오류가 발생했습니다: " + e.getMessage());
        }
    }
}