package com.example.springboot.data.repository;

import com.example.springboot.data.entity.DailyHabitEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface DailyHabitRepository extends JpaRepository<DailyHabitEntity, Integer> {
    
    /**
     * 카테고리별 습관 조회
     */
    List<DailyHabitEntity> findByCategory(String category);
    
    /**
     * 모든 습관 조회
     */
    List<DailyHabitEntity> findAllByOrderByCategoryAsc();
    
    /**
     * 습관 이름으로 검색
     */
    List<DailyHabitEntity> findByHabitNameContaining(String habitName);
    
    /**
     * 포인트 범위로 습관 조회
     */
    List<DailyHabitEntity> findByRewardPointsBetween(Integer minPoints, Integer maxPoints);
    
    /**
     * 포인트 순으로 정렬된 모든 습관 조회
     */
    List<DailyHabitEntity> findAllByOrderByRewardPointsDesc();

    /**
     * 오늘의 미션으로 설정된 습관 조회
     */
    List<DailyHabitEntity> findByIsTodayMission(Boolean isTodayMission);

    /**
     * 모든 습관의 is_today_mission을 FALSE로 초기화 (일일 미션용)
     */
    @Modifying
    @Transactional
    @Query("UPDATE DailyHabitEntity d SET d.isTodayMission = false WHERE d.habitId != 18")
    void resetAllTodayMissions();

    /**
     * 보너스 미션 18번만 초기화 (월별 스트릭용)
     */
    @Modifying
    @Transactional
    @Query("UPDATE DailyHabitEntity d SET d.isTodayMission = false WHERE d.habitId = 18")
    void resetMonthlyStreakMission();

    /**
     * habit_id가 특정 값들이 아닌 것 중에서 랜덤으로 N개 조회 (보너스 미션 제외)
     */
    @Query(value = "SELECT * FROM daily_habits WHERE habit_id NOT IN (17, 18) ORDER BY RAND() LIMIT :limit", nativeQuery = true)
    List<DailyHabitEntity> findRandomHabitsExcludingBonus(@Param("limit") Integer limit);
}