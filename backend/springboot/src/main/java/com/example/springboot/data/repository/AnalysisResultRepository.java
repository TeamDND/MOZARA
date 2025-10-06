package com.example.springboot.data.repository;

import com.example.springboot.data.entity.AnalysisResultEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface AnalysisResultRepository extends JpaRepository<AnalysisResultEntity, Integer> {
    
    /**
     * 사용자 ID로 분석 결과 개수 조회
     */
    long countByUserEntityIdForeign_Id(Integer userId);
    
    /**
     * 사용자 ID로 분석 결과 목록 조회 (날짜 내림차순 → ID 내림차순)
     */
    List<AnalysisResultEntity> findByUserEntityIdForeign_IdOrderByInspectionDateDescIdDesc(Integer userId);
    
    /**
     * 사용자 ID로 최근 분석 결과 조회
     */
    AnalysisResultEntity findFirstByUserEntityIdForeign_IdOrderByInspectionDateDesc(Integer userId);

    /**
     * 사용자 ID와 분석 타입으로 분석 결과 존재 여부 조회
     */
    boolean existsByUserEntityIdForeign_IdAndAnalysisType(Integer userId, String analysisType);

    void deleteAllByUserEntityIdForeign(com.example.springboot.data.entity.UserEntity userEntity);

    /**
     * 사용자 ID와 분석 타입으로 특정 날짜의 분석 결과 조회
     */
    @Query("SELECT a FROM AnalysisResultEntity a WHERE a.userEntityIdForeign.id = :userId AND a.analysisType = :analysisType AND a.inspectionDate = :date ORDER BY a.inspectionDate DESC")
    List<AnalysisResultEntity> findByUserIdAndAnalysisTypeAndDate(@Param("userId") Integer userId, 
                                                                 @Param("analysisType") String analysisType, 
                                                                 @Param("date") LocalDate date);

    /**
     * 사용자 ID와 분석 타입으로 특정 날짜 범위의 분석 결과 조회
     */
    @Query("SELECT a FROM AnalysisResultEntity a WHERE a.userEntityIdForeign.id = :userId AND a.analysisType = :analysisType AND a.inspectionDate BETWEEN :startDate AND :endDate ORDER BY a.inspectionDate DESC")
    List<AnalysisResultEntity> findByUserIdAndAnalysisTypeAndDateRange(@Param("userId") Integer userId, 
                                                                       @Param("analysisType") String analysisType, 
                                                                       @Param("startDate") LocalDate startDate, 
                                                                       @Param("endDate") LocalDate endDate);

    /**
     * 사용자 ID와 분석 타입으로 최근 분석 결과 조회
     */
    @Query("SELECT a FROM AnalysisResultEntity a WHERE a.userEntityIdForeign.id = :userId AND a.analysisType = :analysisType ORDER BY a.inspectionDate DESC")
    List<AnalysisResultEntity> findByUserIdAndAnalysisTypeOrderByDateDesc(@Param("userId") Integer userId, 
                                                                          @Param("analysisType") String analysisType);
}