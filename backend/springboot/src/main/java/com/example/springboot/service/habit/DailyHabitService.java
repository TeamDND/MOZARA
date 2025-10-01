package com.example.springboot.service.habit;

import com.example.springboot.data.repository.DailyHabitRepository;
import com.example.springboot.data.repository.UserHabitLogRepository;
import com.example.springboot.data.dto.habit.DailyHabitDTO;
import com.example.springboot.data.dto.habit.UserHabitLogDTO;
import com.example.springboot.data.entity.DailyHabitEntity;
import com.example.springboot.data.entity.UserEntity;
import com.example.springboot.data.entity.UserHabitLogEntity;
import com.example.springboot.service.user.SeedlingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DailyHabitService {
    
    private final DailyHabitRepository dailyHabitRepository;
    private final UserHabitLogRepository userHabitLogRepository;
    private final SeedlingService seedlingService;

    /**
     * 모든 일일 습관 조회
     */
    public List<DailyHabitDTO> getAllHabits() {
        List<DailyHabitEntity> entities = dailyHabitRepository.findAllByOrderByCategoryAsc();
        return entities.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * 카테고리별 일일 습관 조회
     */
    public List<DailyHabitDTO> getHabitsByCategory(String category) {
        List<DailyHabitEntity> entities = dailyHabitRepository.findByCategory(category);
        return entities.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * 습관 완료 로그 저장
     */
    public UserHabitLogDTO saveHabitCompletion(Integer userId, Integer habitId) {
        // 사용자와 습관 엔티티 조회
        UserEntity user = new UserEntity();
        user.setId(userId);
        
        DailyHabitEntity habit = dailyHabitRepository.findById(habitId)
                .orElseThrow(() -> new RuntimeException("습관을 찾을 수 없습니다."));
        
        // 오늘 이미 완료했는지 확인
        LocalDate today = LocalDate.now();
        boolean alreadyCompleted = userHabitLogRepository.existsByUserEntityIdForeignAndHabitIdForeignAndCompletionDate(
                user, habit, today);
        
        if (alreadyCompleted) {
            throw new RuntimeException("이미 오늘 완료한 습관입니다.");
        }
        
        // 로그 저장
        UserHabitLogEntity logEntity = UserHabitLogEntity.builder()
                .userEntityIdForeign(user)
                .habitIdForeign(habit)
                .completionDate(today)
                .build();
        
        UserHabitLogEntity savedLog = userHabitLogRepository.save(logEntity);
        
        // 새싹에 포인트 추가
        try {
            seedlingService.updateSeedlingPoint(userId, habit.getRewardPoints());
        } catch (Exception ex) {
            // 새싹 포인트 업데이트 실패해도 로그는 저장됨 (부분 성공)
            // 로그에만 기록하고 예외는 던지지 않음
            System.err.println("새싹 포인트 업데이트 실패 - userId: " + userId + ", points: " + habit.getRewardPoints() + ", error: " + ex.getMessage());
        }
        
        return UserHabitLogDTO.builder()
                .logId(savedLog.getLogId())
                .habitId(habitId)
                .userId(userId)
                .completionDate(today)
                .build();
    }

    /**
     * 사용자의 오늘 완료한 습관 조회
     */
    public List<DailyHabitDTO> getTodayCompletedHabits(Integer userId) {
        UserEntity user = new UserEntity();
        user.setId(userId);
        
        LocalDate today = LocalDate.now();
        List<UserHabitLogEntity> completedLogs = userHabitLogRepository.findByUserEntityIdForeignAndCompletionDate(user, today);
        
        return completedLogs.stream()
                .map(log -> convertToDTO(log.getHabitIdForeign()))
                .collect(Collectors.toList());
    }

    /**
     * 사용자의 특정 날짜 완료한 습관 조회
     */
    public List<DailyHabitDTO> getCompletedHabitsByDate(Integer userId, String dateStr) {
        UserEntity user = new UserEntity();
        user.setId(userId);
        
        LocalDate date = LocalDate.parse(dateStr);
        List<UserHabitLogEntity> completedLogs = userHabitLogRepository.findByUserEntityIdForeignAndCompletionDate(user, date);
        
        return completedLogs.stream()
                .map(log -> convertToDTO(log.getHabitIdForeign()))
                .collect(Collectors.toList());
    }

    /**
     * Entity를 DTO로 변환
     */
    private DailyHabitDTO convertToDTO(DailyHabitEntity entity) {
        return DailyHabitDTO.builder()
                .habitId(entity.getHabitId())
                .description(entity.getDescription())
                .habitName(entity.getHabitName())
                .rewardPoints(entity.getRewardPoints())
                .category(entity.getCategory())
                .build();
    }
}