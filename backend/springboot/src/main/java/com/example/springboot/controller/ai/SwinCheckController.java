package com.example.springboot.controller.ai;

import com.example.springboot.service.ai.SwinCheckService;
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

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/ai/swin-check")
@CrossOrigin(origins = "*")
public class SwinCheckController {

    private final SwinCheckService swinCheckService;
    private final UsersInfoDAO usersInfoDAO;
    private final UserRepository userRepository;

    /**
     * Swin 기반 탈모 분석 (Top + Side 이미지 동시 분석, Side는 optional)
     */
    @PostMapping("/analyze")
    public ResponseEntity<Map<String, Object>> analyze(
            @RequestParam("top_image") MultipartFile topImage,
            @RequestParam(value = "side_image", required = false) MultipartFile sideImage,
            @RequestParam(value = "user_id", required = false) Integer userId,
            @RequestParam(value = "image_url", required = false) String imageUrl,
            @RequestParam(value = "gender", required = false) String gender,
            @RequestParam(value = "age", required = false) String age,
            @RequestParam(value = "familyHistory", required = false) String familyHistory,
            @RequestParam(value = "recentHairLoss", required = false) String recentHairLoss,
            @RequestParam(value = "stress", required = false) String stress) {

        try {
            System.out.println("=== Swin 분석 요청 ===");
            System.out.println("user_id: " + userId);
            System.out.println("top_image: " + topImage.getOriginalFilename());
            System.out.println("side_image: " + (sideImage != null ? sideImage.getOriginalFilename() : "없음 (여성)"));
            System.out.println("설문 데이터 - 나이: " + age + ", 가족력: " + familyHistory + ", 스트레스: " + stress);

            // 1. 로그인한 사용자면 설문 데이터를 users_info 테이블에 저장
            if (userId != null && userId > 0) {
                saveUserInfo(userId, gender, age, familyHistory, recentHairLoss, stress);
            }

            // 2. Swin으로 분석 수행 (Top + Side 동시, 설문 데이터 포함)
            Map<String, Object> analysisResult = swinCheckService.analyzeHairWithSwin(
                topImage, sideImage, gender, age, familyHistory, recentHairLoss, stress
            );
            System.out.println("분석 결과: " + analysisResult);

            // 3. 로그인한 사용자면 데이터베이스에 저장
            Map<String, Object> saveResult = swinCheckService.saveAnalysisResult(analysisResult, userId, imageUrl);
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
                    .body(Map.of("error", "Swin 분석 중 오류가 발생했습니다: " + e.getMessage()));
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
}