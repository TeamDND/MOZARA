package com.example.springboot.data.repository;

import com.example.springboot.data.entity.UserHabitLogEntity;
import com.example.springboot.data.entity.UserEntity;
import com.example.springboot.data.entity.DailyHabitEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface UserHabitLogRepository extends JpaRepository<UserHabitLogEntity, Integer> {
    
    /**
     * 사용자와 습관으로 오늘 완료한 로그 조회
     */
    boolean existsByUserEntityIdForeignAndHabitIdForeignAndCompletionDate(
        UserEntity user, DailyHabitEntity habit, LocalDate date);
    
    /**
     * 사용자의 특정 날짜 완료 로그 조회
     */
    List<UserHabitLogEntity> findByUserEntityIdForeignAndCompletionDate(
        UserEntity user, LocalDate date);
    
    /**
     * 사용자의 모든 완료 로그 조회
     */
    List<UserHabitLogEntity> findByUserEntityIdForeignOrderByCompletionDateDesc(UserEntity user);

    /**
     * 이번 달 사용자의 완료 로그 조회 (날짜 순으로 정렬)
     */
    @Query(value = "SELECT * FROM user_habit_log " +
                   "WHERE user_id_foreign = :userId " +
                   "AND YEAR(completion_date) = YEAR(:currentDate) " +
                   "AND MONTH(completion_date) = MONTH(:currentDate) " +
                   "ORDER BY completion_date ASC",
           nativeQuery = true)
    List<UserHabitLogEntity> findCurrentMonthLogs(@Param("userId") Integer userId, @Param("currentDate") LocalDate currentDate);

    void deleteAllByUserEntityIdForeign(UserEntity userEntity);
}
