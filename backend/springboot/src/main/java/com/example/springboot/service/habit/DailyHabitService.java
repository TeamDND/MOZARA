package com.example.springboot.service.habit;

import com.example.springboot.data.repository.DailyHabitRepository;
import com.example.springboot.data.repository.UserHabitLogRepository;
import com.example.springboot.data.dto.habit.DailyHabitDTO;
import com.example.springboot.data.dto.habit.UserHabitLogDTO;
import com.example.springboot.data.entity.DailyHabitEntity;
import com.example.springboot.data.entity.UserEntity;
import com.example.springboot.data.entity.UserHabitLogEntity;
import com.example.springboot.service.user.SeedlingService;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DailyHabitService {

    private static final Logger log = LoggerFactory.getLogger(DailyHabitService.class);

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
        
        // 목표치 결정 (물=7, 이펙터=4, 일반=1)
        Integer targetCount = getTargetCount(habit.getHabitName());
        
        // 로그 저장
        UserHabitLogEntity logEntity = UserHabitLogEntity.builder()
                .userEntityIdForeign(user)
                .habitIdForeign(habit)
                .completionDate(today)
                .progressCount(targetCount)  // 완료 시 목표치만큼 저장
                .targetCount(targetCount)
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
                .progressCount(savedLog.getProgressCount())
                .targetCount(savedLog.getTargetCount())
                .build();
    }

    /**
     * 습관별 목표치 반환
     */
    private Integer getTargetCount(String habitName) {
        if ("물 마시기".equals(habitName)) {
            return 7;
        } else if ("이펙터 사용".equals(habitName)) {
            return 4;
        } else {
            return 1;  // 일반 미션
        }
    }

    /**
     * 진행 상태 업데이트 (완료 전 중간 진행 저장)
     */
    @Transactional
    public UserHabitLogDTO updateHabitProgress(Integer userId, Integer habitId, Integer progressCount) {
        UserEntity user = new UserEntity();
        user.setId(userId);
        
        DailyHabitEntity habit = dailyHabitRepository.findById(habitId)
                .orElseThrow(() -> new RuntimeException("습관을 찾을 수 없습니다."));
        
        LocalDate today = LocalDate.now();
        Integer targetCount = getTargetCount(habit.getHabitName());
        
        // 오늘 날짜의 로그가 있는지 확인
        List<UserHabitLogEntity> existingLogs = userHabitLogRepository.findByUserEntityIdForeignAndCompletionDate(user, today);
        UserHabitLogEntity logEntity = existingLogs.stream()
                .filter(log -> log.getHabitIdForeign().getHabitId().equals(habitId))
                .findFirst()
                .orElse(null);
        
        // 이전 진행 수를 저장 (포인트 중복 지급 방지)
        Integer oldProgressCount = 0;
        boolean shouldAddPoints = false;
        
        if (logEntity == null) {
            // 로그가 없으면 새로 생성
            logEntity = UserHabitLogEntity.builder()
                    .userEntityIdForeign(user)
                    .habitIdForeign(habit)
                    .completionDate(today)
                    .progressCount(progressCount)
                    .targetCount(targetCount)
                    .build();
            
            // 첫 생성 시 바로 목표 달성했으면 포인트 추가
            if (progressCount >= targetCount) {
                shouldAddPoints = true;
            }
        } else {
            // 기존 로그 업데이트 - 이전 값 저장
            oldProgressCount = logEntity.getProgressCount() != null ? logEntity.getProgressCount() : 0;
            logEntity.setProgressCount(progressCount);
            
            // 목표 달성 시 포인트 추가 (한 번만)
            // 이전에는 목표치 미달이었는데 이번에 달성한 경우만
            if (progressCount >= targetCount && oldProgressCount < targetCount) {
                shouldAddPoints = true;
            }
        }
        
        UserHabitLogEntity savedLog = userHabitLogRepository.save(logEntity);
        
        // 포인트 추가 (save 후에 실행)
        if (shouldAddPoints) {
            try {
                seedlingService.updateSeedlingPoint(userId, habit.getRewardPoints());
                log.info("습관 목표 달성 - 포인트 추가: userId={}, habitId={}, points={}", 
                        userId, habitId, habit.getRewardPoints());
            } catch (Exception ex) {
                log.error("새싹 포인트 업데이트 실패 - userId: {}, points: {}", userId, habit.getRewardPoints(), ex);
            }
        }
        
        return UserHabitLogDTO.builder()
                .logId(savedLog.getLogId())
                .habitId(habitId)
                .userId(userId)
                .completionDate(today)
                .progressCount(savedLog.getProgressCount())
                .targetCount(savedLog.getTargetCount())
                .build();
    }

    /**
     * 오늘의 진행 상태 조회
     */
    public UserHabitLogDTO getTodayProgress(Integer userId, Integer habitId) {
        return getProgressByDate(userId, habitId, LocalDate.now());
    }

    /**
     * 특정 날짜의 진행 상태 조회
     */
    public UserHabitLogDTO getProgressByDate(Integer userId, Integer habitId, LocalDate date) {
        UserEntity user = new UserEntity();
        user.setId(userId);
        
        DailyHabitEntity habit = dailyHabitRepository.findById(habitId)
                .orElseThrow(() -> new RuntimeException("습관을 찾을 수 없습니다."));
        
        List<UserHabitLogEntity> logs = userHabitLogRepository.findByUserEntityIdForeignAndCompletionDate(user, date);
        
        UserHabitLogEntity logEntity = logs.stream()
                .filter(log -> log.getHabitIdForeign().getHabitId().equals(habitId))
                .findFirst()
                .orElse(null);
        
        if (logEntity == null) {
            return null;
        }
        
        return UserHabitLogDTO.builder()
                .logId(logEntity.getLogId())
                .habitId(habitId)
                .userId(userId)
                .completionDate(date)
                .progressCount(logEntity.getProgressCount())
                .targetCount(logEntity.getTargetCount())
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
     * 케어 스트릭 정보 조회
     * - 현재 연속 출석 일수
     * - 이번 달 10일 연속 달성 여부
     * - habit_id=18 완료 여부
     */
    public StreakInfo getStreakInfo(Integer userId) {
        try {
            LocalDate today = LocalDate.now();

            // 이번 달 로그 조회
            List<UserHabitLogEntity> monthLogs = userHabitLogRepository.findCurrentMonthLogs(userId, today);
            log.info("=== 스트릭 계산: userId={}, 이번 달 로그 개수={}", userId, monthLogs.size());

            // 로그가 없으면 빈 결과 반환
            if (monthLogs == null || monthLogs.isEmpty()) {
                log.info("로그 없음 - 기본값 반환");
                return new StreakInfo(0, false, false);
            }

            // 날짜별로 그룹화 (하루에 여러 미션 완료 가능)
            List<LocalDate> uniqueDates = monthLogs.stream()
                .map(UserHabitLogEntity::getCompletionDate)
                .distinct()
                .sorted()
                .collect(Collectors.toList());

            log.info("고유 날짜 목록: {}", uniqueDates);

            // 1. 현재 연속 출석 일수 계산 (오늘 또는 어제부터 거슬러 올라가면서)
            int currentStreak = calculateCurrentStreak(uniqueDates, today);
            log.info("현재 스트릭: {}일", currentStreak);

            // 2. 이번 달에 10일 연속 달성한 적이 있는지 체크
            boolean hasAchieved10Days = checkMaxConsecutiveDays(uniqueDates) >= 10;
            log.info("10일 달성 여부: {}", hasAchieved10Days);

            // 3. habit_id=18 완료 여부 확인
            boolean isCompleted = monthLogs.stream()
                .anyMatch(logEntry -> logEntry.getHabitIdForeign().getHabitId() == 18);
            log.info("habit_id=18 완료 여부: {}", isCompleted);

            return new StreakInfo(currentStreak, hasAchieved10Days, isCompleted);
        } catch (Exception e) {
            log.error("스트릭 정보 계산 중 오류 발생: userId={}", userId, e);
            // 오류 발생 시 기본값 반환 (서비스 중단 방지)
            return new StreakInfo(0, false, false);
        }
    }

    /**
     * 현재 연속 출석 일수 계산 (오늘 또는 어제부터)
     */
    private int calculateCurrentStreak(List<LocalDate> dates, LocalDate today) {
        if (dates.isEmpty()) return 0;

        // 오늘이나 어제에 기록이 있는지 확인
        LocalDate yesterday = today.minusDays(1);
        LocalDate startDate = dates.contains(today) ? today :
                             (dates.contains(yesterday) ? yesterday : null);

        if (startDate == null) return 0;

        int streak = 0;
        LocalDate checkDate = startDate;

        while (dates.contains(checkDate)) {
            streak++;
            checkDate = checkDate.minusDays(1);
        }

        return streak;
    }

    /**
     * 주어진 날짜 리스트에서 최대 연속 일수 계산
     */
    private int checkMaxConsecutiveDays(List<LocalDate> dates) {
        if (dates.isEmpty()) return 0;

        int maxStreak = 1;
        int currentStreak = 1;

        for (int i = 1; i < dates.size(); i++) {
            if (dates.get(i).minusDays(1).equals(dates.get(i - 1))) {
                currentStreak++;
                maxStreak = Math.max(maxStreak, currentStreak);
            } else {
                currentStreak = 1;
            }
        }

        return maxStreak;
    }

    /**
     * 스트릭 정보 DTO
     */
    public static class StreakInfo {
        public int currentStreak;
        public boolean hasAchieved10Days;
        public boolean isCompleted;

        public StreakInfo(int currentStreak, boolean hasAchieved10Days, boolean isCompleted) {
            this.currentStreak = currentStreak;
            this.hasAchieved10Days = hasAchieved10Days;
            this.isCompleted = isCompleted;
        }
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