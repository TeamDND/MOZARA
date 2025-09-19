package com.example.springboot.controller.ai;

import com.example.springboot.service.ai.GeminiCheckService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/ai/gemini-check")
@CrossOrigin(origins = "*")
public class GeminiCheckController {

    private final GeminiCheckService geminiCheckService;

    /**
     * Gemini 기반 탈모 분석 프록시 (Spring → Python)
     */
    @PostMapping("/analyze")
    public ResponseEntity<Map<String, Object>> analyze(
            @RequestParam("image") MultipartFile image,
            @RequestParam(value = "user_id", required = false) Integer userId,
            @RequestParam(value = "image_url", required = false) String imageUrl) {
        
        try {
            System.out.println("=== Gemini 분석 요청 ===");
            System.out.println("user_id: " + userId);
            System.out.println("image_url: " + imageUrl);
            
            // 1. Gemini로 분석 수행
            Map<String, Object> analysisResult = geminiCheckService.analyzeHairWithGemini(image);
            System.out.println("분석 결과: " + analysisResult);
            
            // 2. 로그인한 사용자면 데이터베이스에 저장
            Map<String, Object> saveResult = geminiCheckService.saveAnalysisResult(analysisResult, userId, imageUrl);
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
                    .body(Map.of("error", "Gemini 분석 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }
}


