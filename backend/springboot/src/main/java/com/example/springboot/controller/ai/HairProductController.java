package com.example.springboot.controller.ai;

import com.example.springboot.data.dto.HairProductResponseDTO;
import com.example.springboot.service.HairProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/products")
@RequiredArgsConstructor
public class HairProductController {

    private final HairProductService hairProductService;

    /**
     * 탈모 단계별 제품 목록 조회
     * @param stage 탈모 단계 (1-6)
     * @return 제품 목록과 단계별 정보
     */
    @GetMapping
    public ResponseEntity<HairProductResponseDTO> getProductsByStage(
            @RequestParam int stage) {
        try {
            if (stage < 1 || stage > 6) {
                return ResponseEntity.badRequest().build();
            }

            HairProductResponseDTO response = hairProductService.getProductsByStage(stage);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * 제품 추천 서비스 헬스체크
     * @return 서비스 상태 정보
     */
    @GetMapping("/health")
    public ResponseEntity<String> healthCheck() {
        try {
            String healthStatus = hairProductService.healthCheck();
            return ResponseEntity.ok(healthStatus);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Service unavailable");
        }
    }
}
