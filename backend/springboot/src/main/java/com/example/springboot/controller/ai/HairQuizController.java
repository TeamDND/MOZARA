package com.example.springboot.controller.ai;

import com.example.springboot.data.dto.ai.HairQuizResponseDTO;
import com.example.springboot.service.ai.HairQuizService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/ai/hair-quiz")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class HairQuizController {

    private static final Logger log = LoggerFactory.getLogger(HairQuizController.class);

    private final HairQuizService hairQuizService;

    /**
     * 탈모 퀴즈 생성
     * @return 생성된 퀴즈 목록
     */
    @PostMapping("/generate")
    public ResponseEntity<?> generateQuiz() {
        try {
            HairQuizResponseDTO response = hairQuizService.generateQuiz();
            return ResponseEntity.ok(response);
        } catch (RuntimeException ex) {
            log.error("[HairQuiz] Python 연동 실패: {}", ex.getMessage(), ex);
            Map<String, Object> error = new HashMap<>();
            error.put("message", "퀴즈 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
            error.put("reason", "python_gateway_error");
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(error);
        } catch (Exception ex) {
            log.error("[HairQuiz] 알 수 없는 오류: {}", ex.getMessage(), ex);
            Map<String, Object> error = new HashMap<>();
            error.put("message", "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * 퀴즈 서비스 헬스체크
     * @return 서비스 상태 정보
     */
    @GetMapping("/health")
    public ResponseEntity<?> healthCheck() {
        try {
            String healthStatus = hairQuizService.healthCheck();
            return ResponseEntity.ok(healthStatus);
        } catch (RuntimeException ex) {
            Map<String, Object> error = new HashMap<>();
            error.put("message", "Python 헬스체크 실패");
            error.put("reason", ex.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(error);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Service unavailable");
        }
    }
}
