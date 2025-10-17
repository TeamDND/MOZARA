package com.example.springboot.controller.ai;

import com.example.springboot.service.ai.AIRecommendationService;
import com.example.springboot.service.ai.RagChatService;
import com.example.springboot.service.metrics.UserMetricsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
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
    private final AIRecommendationService aiRecommendationService;
    private final UserMetricsService userMetricsService;

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

    /**
     * ✨ NEW: 챗봇 답변 + AI 개인화 추천
     * 기존 답변을 그대로 주고, 끝에 추천을 자연스럽게 추가
     */
    @PostMapping("/chat-with-recommendation")
    public ResponseEntity<Map<String, Object>> chatWithRecommendation(
            @RequestBody Map<String, String> request,
            Authentication authentication
    ) {
        try {
            String userQuery = request.get("query");
            String chatResponse = request.get("response"); // 기존 챗봇 답변

            if (userQuery == null || chatResponse == null) {
                return ResponseEntity.badRequest().build();
            }

            // 1. 사용자 검색 기록 저장
            if (authentication != null && authentication.getName() != null) {
                Integer userId = Integer.parseInt(authentication.getName());
                userMetricsService.logRAGSearch(userId, userQuery, 1, false, "");

                // 2. AI 개인화 추천 생성
                Map<String, Object> recommendation = aiRecommendationService
                        .generatePersonalizedRecommendation(userId, userQuery);

                // 3. 응답 조합
                Map<String, Object> result = Map.of(
                        "chatResponse", chatResponse,
                        "recommendation", recommendation
                );

                return ResponseEntity.ok(result);
            }

            // 인증 정보 없으면 추천 없이 답변만
            return ResponseEntity.ok(Map.of(
                    "chatResponse", chatResponse,
                    "recommendation", Map.of("hasRecommendation", false)
            ));

        } catch (Exception e) {
            log.error("챗봇 추천 생성 오류: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
}
