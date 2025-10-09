package com.example.springboot.controller.ai;

import com.example.springboot.service.ai.RagV2CheckService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/ai/rag-v2-check")
@CrossOrigin(origins = "*")
@Slf4j
public class RagV2CheckController {

    private final RagV2CheckService ragV2CheckService;

    /**
     * RAG 기반 여성 탈모 분석 (Top 이미지만 사용)
     * Python /api/hair-classification-rag/analyze-upload 엔드포인트 호출
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
            log.info("=== RAG 분석 요청 - userId: {}, file: {} ===", userId, topImage.getOriginalFilename());

            // Service에 모든 비즈니스 로직 위임
            Map<String, Object> response = ragV2CheckService.analyzeAndSave(
                topImage, userId, imageUrl, gender, age, familyHistory, recentHairLoss, stress
            );

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("RAG 분석 오류: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "RAG 분석 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }

    /**
     * RAG V2 서비스 헬스 체크
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        try {
            Map<String, Object> health = ragV2CheckService.healthCheck();
            return ResponseEntity.ok(health);
        } catch (Exception e) {
            log.error("헬스 체크 오류: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of(
                        "status", "error",
                        "message", "헬스 체크 실패: " + e.getMessage()
                    ));
        }
    }
}
