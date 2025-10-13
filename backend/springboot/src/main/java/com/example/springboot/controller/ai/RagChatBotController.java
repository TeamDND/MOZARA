package com.example.springboot.controller.ai;

import com.example.springboot.service.ai.RagChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/ai/rag-chat")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class RagChatBotController {

    private final RagChatService ragChatService;

    /**
     * RAG 채팅 메시지 전송
     * @param request message, conversation_id
     * @return AI 응답
     */
    @PostMapping
    public ResponseEntity<?> chat(@RequestBody Map<String, Object> request) {
        try {
            String message = (String) request.get("message");
            String conversationId = (String) request.get("conversation_id");
            
            log.info("[RagChat] 채팅 요청 - message: {}, conversationId: {}", message, conversationId);

            Map<String, Object> response = ragChatService.chatWithText(message, conversationId);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            log.error("[RagChat] 채팅 실패: {}", e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", "채팅 처리 중 오류가 발생했습니다.");
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * RAG 채팅 대화 내역 초기화
     * @param request conversation_id
     * @return 초기화 결과
     */
    @PostMapping("/clear")
    public ResponseEntity<?> clearChat(@RequestBody Map<String, String> request) {
        try {
            String conversationId = request.get("conversation_id");
            log.info("[RagChat] 대화 초기화 요청 - conversationId: {}", conversationId);
            
            Map<String, Object> result = ragChatService.clearChatHistory(conversationId);
            return ResponseEntity.ok(result);
            
        } catch (Exception e) {
            log.error("[RagChat] 대화 초기화 실패: {}", e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", "대화 초기화 중 오류가 발생했습니다.");
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }
}

