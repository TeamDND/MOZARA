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

    /**
     * 오늘의 미션 조회 (모든 사용자 공통)
     */
    @GetMapping("/today-missions")
    public ResponseEntity<?> getTodayMissions() {
        try {
            List<DailyHabitDTO> todayMissions = dailyHabitService.getTodayMissions();
            return ResponseEntity.ok(todayMissions);
        } catch (Exception ex) {
            log.error("[DailyHabit] 오늘의 미션 조회 실패: {}", ex.getMessage(), ex);
            Map<String, Object> error = new HashMap<>();
            error.put("message", "오늘의 미션을 불러오는데 실패했습니다.");
            error.put("reason", "today_missions_fetch_error");
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * 사용자별 오늘의 미션 완료 상태 조회
     */
    @GetMapping("/today-missions/{userId}")
    public ResponseEntity<?> getTodayMissionsWithStatus(@PathVariable Integer userId) {
        try {
            List<DailyHabitDTO> todayMissions = dailyHabitService.getTodayMissionsWithStatus(userId);
            List<DailyHabitDTO> completedHabits = dailyHabitService.getTodayCompletedHabits(userId);

            Map<String, Object> response = new HashMap<>();
            response.put("todayMissions", todayMissions);
            response.put("completedHabits", completedHabits);

            return ResponseEntity.ok(response);
        } catch (Exception ex) {
            log.error("[DailyHabit] 사용자별 오늘의 미션 조회 실패 - userId: {}, error: {}", userId, ex.getMessage(), ex);
            Map<String, Object> error = new HashMap<>();
            error.put("message", "오늘의 미션 정보를 불러오는데 실패했습니다.");
            error.put("reason", "today_missions_status_fetch_error");
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * 케어 스트릭 정보 조회
     */
    @GetMapping("/streak/{userId}")
    public ResponseEntity<?> getStreakInfo(@PathVariable Integer userId) {
        try {
            DailyHabitService.StreakInfo streakInfo = dailyHabitService.getStreakInfo(userId);

            Map<String, Object> response = new HashMap<>();
            response.put("currentStreak", streakInfo.currentStreak);
            response.put("hasAchieved10Days", streakInfo.hasAchieved10Days);
            response.put("isCompleted", streakInfo.isCompleted);

            return ResponseEntity.ok(response);
        } catch (Exception ex) {
            log.error("[DailyHabit] 스트릭 정보 조회 실패 - userId: {}, error: {}", userId, ex.getMessage(), ex);
            Map<String, Object> error = new HashMap<>();
            error.put("message", "스트릭 정보를 불러오는데 실패했습니다.");
            error.put("reason", "streak_fetch_error");
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * 습관 진행 상태 업데이트 (완료 전 중간 진행)
     */
    @PostMapping("/progress")
    public ResponseEntity<?> updateHabitProgress(
            @RequestParam Integer userId,
            @RequestParam Integer habitId,
            @RequestParam Integer progressCount) {
        try {
            UserHabitLogDTO result = dailyHabitService.updateHabitProgress(userId, habitId, progressCount);
            return ResponseEntity.ok(result);
        } catch (RuntimeException ex) {
            log.error("[DailyHabit] 진행 상태 업데이트 실패 - userId: {}, habitId: {}, progressCount: {}, error: {}",
                    userId, habitId, progressCount, ex.getMessage(), ex);
            Map<String, Object> error = new HashMap<>();
            error.put("message", ex.getMessage());
            error.put("reason", "progress_update_failed");
            return ResponseEntity.status(400).body(error);
        } catch (Exception ex) {
            log.error("[DailyHabit] 진행 상태 업데이트 중 알 수 없는 오류 - userId: {}, habitId: {}, progressCount: {}, error: {}",
                    userId, habitId, progressCount, ex.getMessage(), ex);
            Map<String, Object> error = new HashMap<>();
            error.put("message", "서버 오류가 발생했습니다.");
            error.put("reason", "internal_server_error");
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * 오늘의 습관 진행 상태 조회
     */
    @GetMapping("/progress/{userId}/{habitId}")
    public ResponseEntity<?> getTodayProgress(
            @PathVariable Integer userId,
            @PathVariable Integer habitId) {
        try {
            UserHabitLogDTO progress = dailyHabitService.getTodayProgress(userId, habitId);
            if (progress == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("message", "오늘의 진행 기록이 없습니다.");
                response.put("progressCount", 0);
                return ResponseEntity.ok(response);
            }
            return ResponseEntity.ok(progress);
        } catch (Exception ex) {
            log.error("[DailyHabit] 진행 상태 조회 실패 - userId: {}, habitId: {}, error: {}",
                    userId, habitId, ex.getMessage(), ex);
            Map<String, Object> error = new HashMap<>();
            error.put("message", "진행 상태를 불러오는데 실패했습니다.");
            error.put("reason", "progress_fetch_error");
            return ResponseEntity.status(500).body(error);
        }
    }

    /**
     * 특정 날짜의 습관 진행 상태 조회
     */
    @GetMapping("/progress/{userId}/{habitId}/date")
    public ResponseEntity<?> getProgressByDate(
            @PathVariable Integer userId,
            @PathVariable Integer habitId,
            @RequestParam String date) {
        try {
            java.time.LocalDate localDate = java.time.LocalDate.parse(date);
            UserHabitLogDTO progress = dailyHabitService.getProgressByDate(userId, habitId, localDate);
            if (progress == null) {
                Map<String, Object> response = new HashMap<>();
                response.put("message", "해당 날짜의 진행 기록이 없습니다.");
                response.put("progressCount", 0);
                return ResponseEntity.ok(response);
            }
            return ResponseEntity.ok(progress);
        } catch (Exception ex) {
            log.error("[DailyHabit] 특정 날짜 진행 상태 조회 실패 - userId: {}, habitId: {}, date: {}, error: {}",
                    userId, habitId, date, ex.getMessage(), ex);
            Map<String, Object> error = new HashMap<>();
            error.put("message", "진행 상태를 불러오는데 실패했습니다.");
            error.put("reason", "progress_fetch_error");
            return ResponseEntity.status(500).body(error);
        }
    }
}
