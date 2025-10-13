package com.example.springboot.controller.ai;

import com.example.springboot.service.ai.WeatherService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/ai/weather")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@Slf4j
public class WeatherController {

    private final WeatherService weatherService;

    /**
     * 날씨 정보 조회 (UV, 습도, 대기질)
     * @param lat 위도
     * @param lon 경도
     * @return 날씨 정보 및 두피 케어 추천
     */
    @GetMapping
    public ResponseEntity<?> getWeatherInfo(
            @RequestParam Double lat,
            @RequestParam Double lon) {
        try {
            log.info("[Weather] 날씨 정보 요청 - lat: {}, lon: {}", lat, lon);
            Map<String, Object> result = weatherService.getWeatherInfo(lat, lon);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            log.error("[Weather] 날씨 정보 조회 실패: {}", e.getMessage(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("error", "날씨 정보를 가져오는데 실패했습니다.");
            error.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }
}

