package com.example.springboot.controller.ai;

import com.example.springboot.service.AIService;
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

    private final AIService aiService;

    /**
     * Gemini 기반 탈모 분석 프록시 (Spring → Python)
     */
    @PostMapping("/analyze")
    public ResponseEntity<Map<String, Object>> analyze(@RequestParam("image") MultipartFile image) {
        try {
            Map<String, Object> result = aiService.analyzeHairWithGemini(image);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Gemini 분석 중 오류: " + e.getMessage()));
        }
    }
}


