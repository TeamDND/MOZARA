package com.example.springboot.controller.ai;

import com.example.springboot.service.ai.RagChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/ai/rag-v2-check")
@CrossOrigin(origins = "*")
@Slf4j
public class RagChatController {

    private final RagChatService ragChatService;

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
            log.error("연관 질문 생성 오류: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
