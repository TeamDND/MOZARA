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
public class GeminiCheckService {

    @Value("${ai.python.base-url:http://localhost:8000}")
    private String pythonBaseUrl;

    private final RestTemplate restTemplate = new RestTemplate();
    private final AnalysisResultDAO analysisResultDAO;
    private final UserRepository userRepository;

    /**
     * Gemini 기반 탈모 이미지 분석 (Python /hair_gemini_check 프록시)
     */
    public Map<String, Object> analyzeHairWithGemini(MultipartFile image) throws Exception {
        log.info("Gemini 탈모 분석 요청 - 이미지: {}", image.getOriginalFilename());

        // Python API의 URL을 그대로 사용
        String url = pythonBaseUrl + "/hair_gemini_check";

        // HTTP 헤더를 MULTIPART_FORM_DATA로 설정
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        // MultiValueMap을 사용하여 요청 본문(body)을 구성
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();

        body.add("file", new ByteArrayResource(image.getBytes()) {
            @Override
            public String getFilename() {
                // 원본 파일명을 유지하도록 오버라이드
                return image.getOriginalFilename();
            }
        });

        // 요청 엔티티 생성
        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        try {
            // postForEntity() 메소드로 POST 요청 전송
            ResponseEntity<Map> response = restTemplate.postForEntity(url, requestEntity, Map.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                log.info("Python Gemini 분석 응답 성공");
                return response.getBody();
            } else {
                throw new Exception("Python Gemini 응답 오류: " + response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("Python Gemini 통신 오류: {}", e.getMessage());
            throw new Exception("Gemini 분석 서비스 연결 오류: " + e.getMessage());
        }
    }

    /**
     * Gemini 분석 결과를 데이터베이스에 저장
     */
    public Map<String, Object> saveAnalysisResult(Map<String, Object> geminiResult, Integer userId, String imageUrl) throws Exception {
        log.info("Gemini 분석 결과 저장 요청 - 사용자: {}", userId);
        System.out.println("=== 저장 요청 ===");
        System.out.println("userId: " + userId);
        System.out.println("geminiResult: " + geminiResult);

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

            // Gemini 결과를 데이터베이스 형식으로 변환
            String title = (String) geminiResult.get("title");
            String description = (String) geminiResult.get("description");
            String analysisSummary = title + "\n" + description;
            
            // advice 배열을 문자열로 변환
            Object adviceObj = geminiResult.get("advice");
            String advice = "";
            if (adviceObj instanceof java.util.List) {
                java.util.List<?> adviceList = (java.util.List<?>) adviceObj;
                advice = String.join("|", adviceList.stream().map(String::valueOf).toArray(String[]::new));
            }

            // AnalysisResultEntity 생성
            AnalysisResultEntity entity = new AnalysisResultEntity();
            entity.setInspectionDate(LocalDate.now());
            entity.setAnalysisSummary(analysisSummary);
            entity.setAdvice(advice);
            entity.setGrade((Integer) geminiResult.get("stage"));
            entity.setImageUrl(imageUrl != null ? imageUrl : "");
            entity.setAnalysisType("hairloss");
            entity.setUserEntityIdForeign(user);

            // AnalysisResultDAO를 통해 데이터베이스에 저장
            AnalysisResultEntity savedEntity = analysisResultDAO.save(entity);
            
            log.info("Gemini 분석 결과 저장 성공: ID {}", savedEntity.getId());
            
            return Map.of(
                "message", "분석 완료 및 저장 완료",
                "saved", true,
                "saved_id", savedEntity.getId()
            );
            
        } catch (Exception e) {
            log.error("Gemini 분석 결과 저장 오류: {}", e.getMessage());
            throw new Exception("분석 결과 저장 중 오류가 발생했습니다: " + e.getMessage());
        }
    }
}
