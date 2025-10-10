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
}