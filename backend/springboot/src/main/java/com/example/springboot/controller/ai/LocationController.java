package com.example.springboot.controller.ai;

import com.example.springboot.service.ai.LocationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/ai/location")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class LocationController {

    private final LocationService locationService;

    /**
     * 네이버 로컬 검색 API
     * @param query 검색 키워드
     * @return 네이버 검색 결과
     */
    @GetMapping("/naver/search")
    public ResponseEntity<?> searchWithNaver(@RequestParam String query) {
        try {
            log.info("[Location] 네이버 검색 요청 - query: {}", query);
            Map<String, Object> result = locationService.searchWithNaver(query);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("[Location] 네이버 검색 실패: {}", e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", "네이버 검색 서비스에 문제가 발생했습니다.");
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * 카카오 로컬 검색 API
     * @param query 검색 키워드
     * @param x 경도 (선택사항)
     * @param y 위도 (선택사항)
     * @param radius 반경 (기본 5000m)
     * @return 카카오 검색 결과
     */
    @GetMapping("/kakao/search")
    public ResponseEntity<?> searchWithKakao(
            @RequestParam String query,
            @RequestParam(required = false) Double x,
            @RequestParam(required = false) Double y,
            @RequestParam(defaultValue = "5000") Integer radius) {
        try {
            log.info("[Location] 카카오 검색 요청 - query: {}, x: {}, y: {}, radius: {}", 
                    query, x, y, radius);
            Map<String, Object> result = locationService.searchWithKakao(query, x, y, radius);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("[Location] 카카오 검색 실패: {}", e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", "카카오 검색 서비스에 문제가 발생했습니다.");
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * 위치 서비스 상태 확인
     * @return 서비스 상태 정보
     */
    @GetMapping("/status")
    public ResponseEntity<?> checkStatus() {
        try {
            log.info("[Location] 상태 확인 요청");
            Map<String, Object> status = locationService.checkLocationServiceStatus();
            return ResponseEntity.ok(status);
        } catch (Exception e) {
            log.error("[Location] 상태 확인 실패: {}", e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("status", "error");
            error.put("message", "위치 서비스 상태 확인에 실패했습니다.");
            error.put("naverApiConfigured", false);
            error.put("kakaoApiConfigured", false);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }
}

