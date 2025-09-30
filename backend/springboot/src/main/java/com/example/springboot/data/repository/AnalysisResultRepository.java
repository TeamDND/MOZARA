package com.example.springboot.data.repository;

import com.example.springboot.data.entity.AnalysisResultEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AnalysisResultRepository extends JpaRepository<AnalysisResultEntity, Integer> {
    
    /**
     * 사용자 ID로 분석 결과 개수 조회
     */
    long countByUserEntityIdForeign_Id(Integer userId);
    
    /**
     * 사용자 ID로 분석 결과 목록 조회
     */
    List<AnalysisResultEntity> findByUserEntityIdForeign_IdOrderByInspectionDateDesc(Integer userId);
    
    /**
     * 사용자 ID로 최근 분석 결과 조회
     */
    AnalysisResultEntity findFirstByUserEntityIdForeign_IdOrderByInspectionDateDesc(Integer userId);

    void deleteAllByUserEntityIdForeign(com.example.springboot.data.entity.UserEntity userEntity);
}