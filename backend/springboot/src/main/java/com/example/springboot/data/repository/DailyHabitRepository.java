package com.example.springboot.data.repository;

import com.example.springboot.data.entity.DailyHabitEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DailyHabitRepository extends JpaRepository<DailyHabitEntity, Integer> {
    
    // 습관명으로 검색
    List<DailyHabitEntity> findByHabitNameContaining(String habitName);
    
    // 보상 포인트 범위로 검색
    List<DailyHabitEntity> findByRewardPointsBetween(Integer minPoints, Integer maxPoints);
    
    // 보상 포인트로 정렬하여 조회
    List<DailyHabitEntity> findAllByOrderByRewardPointsDesc();
}
