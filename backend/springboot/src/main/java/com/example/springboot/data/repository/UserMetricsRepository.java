package com.example.springboot.data.repository;

import com.example.springboot.data.entity.UserMetricEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface UserMetricsRepository extends JpaRepository<UserMetricEntity, Integer> {

    // 사용자별 메트릭 조회
    List<UserMetricEntity> findByUserIdForeign_IdOrderByRecordDateDesc(Integer userId);

    // 타입별 메트릭 조회
    List<UserMetricEntity> findByTypeOrderByRecordDateDesc(String type);

    // 특정 기간 메트릭 조회
    @Query("SELECT m FROM UserMetricEntity m WHERE m.recordDate >= :startDate AND m.recordDate <= :endDate ORDER BY m.recordDate DESC")
    List<UserMetricEntity> findByDateRange(@Param("startDate") Instant startDate, @Param("endDate") Instant endDate);

    // 사용자별 특정 타입 메트릭 조회
    @Query("SELECT m FROM UserMetricEntity m WHERE m.userIdForeign.id = :userId AND m.type = :type ORDER BY m.recordDate DESC")
    List<UserMetricEntity> findByUserAndType(@Param("userId") Integer userId, @Param("type") String type);

    // 인기 검색어 조회 (최근 N일)
    @Query("SELECT m.value FROM UserMetricEntity m WHERE m.type = 'RAG_SEARCH' AND m.recordDate >= :startDate GROUP BY m.value ORDER BY COUNT(m) DESC")
    List<String> findPopularSearchKeywords(@Param("startDate") Instant startDate);
}
