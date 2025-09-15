package com.example.springboot.controller.ai;

import com.example.springboot.data.dto.HairProductResponseDTO;
import com.example.springboot.service.HairProductService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/ai/products")
@RequiredArgsConstructor
public class HairProductController {

    private static final Logger log = LoggerFactory.getLogger(HairProductController.class);

    private final HairProductService hairProductService;

    /**
     * 탈모 단계별 제품 목록 조회
     * @param stage 탈모 단계 (0-3)
     * @return 제품 목록과 단계별 정보
     */
    @GetMapping
    public ResponseEntity<?> getProductsByStage(@RequestParam(name = "stage") int stage) {
        if (stage < 0 || stage > 3) {
            Map<String, Object> error = new HashMap<>();
            error.put("message", "잘못된 탈모 단계입니다. 0-3단계 중 선택해주세요.");
            error.put("stage", stage);
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        }

        try {
            HairProductResponseDTO response = hairProductService.getProductsByStage(stage);
            return ResponseEntity.ok(response);
        } catch (RuntimeException ex) {
            log.error("[Products] Python 연동 실패 stage={}: {}", stage, ex.getMessage(), ex);
            Map<String, Object> error = new HashMap<>();
            error.put("message", "서버 연동 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
            error.put("reason", "python_gateway_error");
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(error);
        } catch (Exception ex) {
            log.error("[Products] 알 수 없는 오류 stage={}: {}", stage, ex.getMessage(), ex);
            Map<String, Object> error = new HashMap<>();
            error.put("message", "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * 제품 추천 서비스 헬스체크
     * @return 서비스 상태 정보
     */
    @GetMapping("/health")
    public ResponseEntity<?> healthCheck() {
        try {
            String healthStatus = hairProductService.healthCheck();
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


