package com.example.springboot.controller.ai;

import com.example.springboot.service.ai.RagV2CheckService;
import com.example.springboot.service.ai.RagChatService;
import com.example.springboot.data.dao.UsersInfoDAO;
import com.example.springboot.data.entity.UsersInfoEntity;
import com.example.springboot.data.entity.UserEntity;
import com.example.springboot.data.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/ai/rag-v2-check")
@CrossOrigin(origins = "*")
public class RagV2CheckController {

    private final RagV2CheckService ragV2CheckService;
    private final RagChatService ragChatService;
    private final UsersInfoDAO usersInfoDAO;
    private final UserRepository userRepository;

    /**
     * RAG v2 기반 여성 탈모 분석 (Top 이미지만 사용)
     */
    @PostMapping("/analyze")
    public ResponseEntity<Map<String, Object>> analyze(
            @RequestParam("top_image") MultipartFile topImage,
            @RequestParam(value = "user_id", required = false) Integer userId,
            @RequestParam(value = "image_url", required = false) String imageUrl,
            @RequestParam(value = "gender", required = false) String gender,
            @RequestParam(value = "age", required = false) String age,
            @RequestParam(value = "familyHistory", required = false) String familyHistory,
            @RequestParam(value = "recentHairLoss", required = false) String recentHairLoss,
            @RequestParam(value = "stress", required = false) String stress) {

        try {
            System.out.println("=== RAG v2 분석 요청 ===");
            System.out.println("user_id: " + userId);
            System.out.println("top_image: " + topImage.getOriginalFilename());
            System.out.println("설문 데이터 - 성별: " + gender + ", 나이: " + age + ", 가족력: " + familyHistory + ", 스트레스: " + stress);

            // 1. 로그인한 사용자면 설문 데이터를 users_info 테이블에 저장
            if (userId != null && userId > 0) {
                saveUserInfo(userId, gender, age, familyHistory, recentHairLoss, stress);
            }

            // 2. RAG v2로 분석 수행 (Top 이미지만, 설문 데이터 포함)
            Map<String, Object> analysisResult = ragV2CheckService.analyzeHairWithRagV2(
                topImage, gender, age, familyHistory, recentHairLoss, stress
            );
            System.out.println("분석 결과: " + analysisResult);

            // 3. 로그인한 사용자면 데이터베이스에 저장
            Map<String, Object> saveResult = ragV2CheckService.saveAnalysisResult(analysisResult, userId, imageUrl);
            System.out.println("저장 결과: " + saveResult);

            // 4. 결과 반환
            Map<String, Object> response = Map.of(
                "analysis", analysisResult,
                "save_result", saveResult
            );

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.out.println("오류 발생: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "RAG v2 분석 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }

    /**
     * 설문 데이터를 users_info 테이블에 저장
     */
    private void saveUserInfo(Integer userId, String gender, String age, String familyHistory, String recentHairLoss, String stress) {
        try {
            // 사용자 존재 확인
            UserEntity user = userRepository.findById(userId).orElse(null);
            if (user == null) {
                System.out.println("사용자를 찾을 수 없습니다: " + userId);
                return;
            }

            // 기존 UsersInfo 확인
            UsersInfoEntity existingInfo = usersInfoDAO.findByUserId(userId);

            UsersInfoEntity userInfo;
            if (existingInfo != null) {
                // 기존 데이터 업데이트
                userInfo = existingInfo;
            } else {
                // 새로운 데이터 생성
                userInfo = new UsersInfoEntity();
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
                    System.out.println("나이 파싱 오류: " + age);
                }
            }
            if (familyHistory != null) {
                userInfo.setFamilyHistory("yes".equalsIgnoreCase(familyHistory));
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
                System.out.println("사용자 정보 업데이트 완료: " + userId);
            } else {
                usersInfoDAO.addUserInfo(userInfo);
                System.out.println("사용자 정보 저장 완료: " + userId);
            }
        } catch (Exception e) {
            System.out.println("사용자 정보 저장 오류: " + e.getMessage());
            e.printStackTrace();
        }
    }

    /**
     * AI 응답을 기반으로 연관 질문들을 생성
     */
    @PostMapping("/generate-related-questions")
    public ResponseEntity<List<String>> generateRelatedQuestions(@RequestBody Map<String, String> request) {
        try {
            String responseText = request.get("response");
            
            if (responseText == null || responseText.trim().isEmpty()) {
                return ResponseEntity.badRequest().build();
            }
            
            List<String> questions = ragChatService.generateRelatedQuestions(responseText);
            return ResponseEntity.ok(questions);
            
        } catch (Exception e) {
            System.out.println("연관 질문 생성 오류: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
