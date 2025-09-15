package com.example.springboot.controller.ai;

import com.example.springboot.service.ai.AIService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/ai/hair-damage")
@CrossOrigin(origins = "*")
public class HairDamageController {
    
    private final AIService aiService;

    /**
     * 이미지와 텍스트를 통한 모발 손상 분석 요청
     */
    @PostMapping("/analyze")
    public ResponseEntity<Map<String, Object>> analyzeHairDamage(
            @RequestParam(value = "image", required = false) MultipartFile image,
            @RequestParam(value = "textQuery", required = false) String textQuery) {
        
        try {
            Map<String, Object> result = aiService.analyzeHairDamage(image, textQuery);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "AI 분석 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }

    /**
     * RAG 기반 채팅 요청
     */
    @PostMapping("/chat")
    public ResponseEntity<Map<String, Object>> chatWithAI(
            @RequestParam(value = "image", required = false) MultipartFile image,
            @RequestParam(value = "textQuery", required = false) String textQuery) {
        
        try {
            Map<String, Object> result = aiService.chatWithAI(image, textQuery);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "AI 채팅 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }

    /**
     * 분석 결과 저장
     */
    @PostMapping("/save-result")
    public ResponseEntity<Map<String, Object>> saveAnalysisResult(@RequestBody Map<String, Object> analysisResult) {
        try {
            Map<String, Object> result = aiService.saveAnalysisResult(analysisResult);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "분석 결과 저장 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }
}
