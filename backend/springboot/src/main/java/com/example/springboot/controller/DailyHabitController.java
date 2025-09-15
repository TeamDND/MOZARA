package com.example.springboot.controller;

import com.example.springboot.data.dto.DailyHabitDTO;
import com.example.springboot.service.DailyHabitService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/daily-habits")
@RequiredArgsConstructor
public class DailyHabitController {

    private final DailyHabitService dailyHabitService;

    // 일일 습관 추가 (POST)
    @PostMapping
    public ResponseEntity<DailyHabitDTO> addDailyHabit(@RequestBody DailyHabitDTO dailyHabitDTO) {
        try {
            DailyHabitDTO result = dailyHabitService.addDailyHabit(dailyHabitDTO);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // 모든 일일 습관 조회
    @GetMapping
    public ResponseEntity<List<DailyHabitDTO>> getAllDailyHabits() {
        try {
            List<DailyHabitDTO> result = dailyHabitService.getAllDailyHabits();
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // 습관명으로 검색
    @GetMapping("/search")
    public ResponseEntity<List<DailyHabitDTO>> searchHabitsByName(@RequestParam String habitName) {
        try {
            List<DailyHabitDTO> result = dailyHabitService.searchHabitsByName(habitName);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // 보상 포인트 범위로 검색
    @GetMapping("/search/points")
    public ResponseEntity<List<DailyHabitDTO>> searchHabitsByPoints(
            @RequestParam Integer minPoints, 
            @RequestParam Integer maxPoints) {
        try {
            List<DailyHabitDTO> result = dailyHabitService.searchHabitsByPoints(minPoints, maxPoints);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // 보상 포인트 높은 순으로 조회
    @GetMapping("/top")
    public ResponseEntity<List<DailyHabitDTO>> getHabitsByPointsDesc() {
        try {
            List<DailyHabitDTO> result = dailyHabitService.getHabitsByPointsDesc();
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
