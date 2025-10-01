package com.example.springboot.controller.ai;

import com.example.springboot.service.ai.SwinCheckService;
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

            // 1. Swin으로 분석 수행 (Top + Side 동시, 설문 데이터 포함)
            Map<String, Object> analysisResult = swinCheckService.analyzeHairWithSwin(
                topImage, sideImage, gender, age, familyHistory, recentHairLoss, stress
            );
            System.out.println("분석 결과: " + analysisResult);

            // 2. 로그인한 사용자면 데이터베이스에 저장
            Map<String, Object> saveResult = swinCheckService.saveAnalysisResult(analysisResult, userId, imageUrl);
            System.out.println("저장 결과: " + saveResult);

            // 3. 결과 반환
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
}