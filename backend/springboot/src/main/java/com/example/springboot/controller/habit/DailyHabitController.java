package com.example.springboot.controller.habit;

import com.example.springboot.data.dto.habit.DailyHabitDTO;
import com.example.springboot.data.dto.habit.UserHabitLogDTO;
import com.example.springboot.service.habit.DailyHabitService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/habit")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class DailyHabitController {

    private static final Logger log = LoggerFactory.getLogger(DailyHabitController.class);

    private final DailyHabitService dailyHabitService;

    /**
     * 모든 일일 습관 조회
     */
    @GetMapping("/daily-habits")
    public ResponseEntity<?> getAllDailyHabits() {
        try {
            List<DailyHabitDTO> habits = dailyHabitService.getAllHabits();
            return ResponseEntity.ok(habits);
        } catch (Exception ex) {
            log.error("[DailyHabit] 습관 조회 실패: {}", ex.getMessage(), ex);
            Map<String, Object> error = new HashMap<>();
            error.put("message", "습관 정보를 불러오는데 실패했습니다.");
            error.put("reason", "habit_fetch_error");
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * 카테고리별 일일 습관 조회
     */
    @GetMapping("/daily-habits/category/{category}")
    public ResponseEntity<?> getDailyHabitsByCategory(@PathVariable String category) {
        try {
            List<DailyHabitDTO> habits = dailyHabitService.getHabitsByCategory(category);
            return ResponseEntity.ok(habits);
        } catch (Exception ex) {
            log.error("[DailyHabit] 카테고리별 습관 조회 실패 - category: {}, error: {}", category, ex.getMessage(), ex);
            Map<String, Object> error = new HashMap<>();
            error.put("message", "카테고리별 습관 정보를 불러오는데 실패했습니다.");
            error.put("reason", "habit_category_fetch_error");
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * 습관 완료 로그 저장
     */
    @PostMapping("/complete")
    public ResponseEntity<?> completeHabit(@RequestParam Integer userId, @RequestParam Integer habitId) {
        try {
            UserHabitLogDTO log = dailyHabitService.saveHabitCompletion(userId, habitId);
            return ResponseEntity.ok(log);
        } catch (RuntimeException ex) {
            log.error("[DailyHabit] 습관 완료 실패 - userId: {}, habitId: {}, error: {}", userId, habitId, ex.getMessage(), ex);
            Map<String, Object> error = new HashMap<>();
            error.put("message", ex.getMessage());
            error.put("reason", "habit_completion_failed");
            return ResponseEntity.status(400).body(error);
        } catch (Exception ex) {
            log.error("[DailyHabit] 습관 완료 중 알 수 없는 오류 - userId: {}, habitId: {}, error: {}", userId, habitId, ex.getMessage(), ex);
            Map<String, Object> error = new HashMap<>();
            error.put("message", "서버 오류가 발생했습니다.");
            error.put("reason", "internal_server_error");
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * 사용자의 오늘 완료한 습관 조회
     */
    @GetMapping("/completed/{userId}")
    public ResponseEntity<?> getTodayCompletedHabits(@PathVariable Integer userId) {
        try {
            List<DailyHabitDTO> completedHabits = dailyHabitService.getTodayCompletedHabits(userId);
            return ResponseEntity.ok(completedHabits);
        } catch (Exception ex) {
            log.error("[DailyHabit] 완료 습관 조회 실패 - userId: {}, error: {}", userId, ex.getMessage(), ex);
            Map<String, Object> error = new HashMap<>();
            error.put("message", "완료한 습관 정보를 불러오는데 실패했습니다.");
            error.put("reason", "completed_habits_fetch_error");
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * 사용자의 특정 날짜 완료한 습관 조회
     */
    @GetMapping("/completed/{userId}/date")
    public ResponseEntity<?> getCompletedHabitsByDate(
            @PathVariable Integer userId,
            @RequestParam String date) {
        try {
            List<DailyHabitDTO> completedHabits = dailyHabitService.getCompletedHabitsByDate(userId, date);
            return ResponseEntity.ok(completedHabits);
        } catch (Exception ex) {
            log.error("[DailyHabit] 특정 날짜 완료 습관 조회 실패 - userId: {}, date: {}, error: {}", 
                    userId, date, ex.getMessage(), ex);
            Map<String, Object> error = new HashMap<>();
            error.put("message", "완료한 습관 정보를 불러오는데 실패했습니다.");
            error.put("reason", "completed_habits_fetch_error");
            return ResponseEntity.status(500).body(error);
        }
    }
}
