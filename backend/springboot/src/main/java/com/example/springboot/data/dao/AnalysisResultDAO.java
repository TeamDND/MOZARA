package com.example.springboot.data.dao;

import com.example.springboot.data.entity.AnalysisResultEntity;
import com.example.springboot.data.repository.AnalysisResultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AnalysisResultDAO {
    private final AnalysisResultRepository analysisResultRepository;

    /**
     * 사용자 ID로 분석 결과 개수 조회
     */
    public long countByUserId(Integer userId) {
        return analysisResultRepository.countByUserEntityIdForeign_Id(userId);
    }

    /**
     * 사용자 ID로 분석 결과 목록 조회
     */
    public List<AnalysisResultEntity> findByUserId(Integer userId) {
        return analysisResultRepository.findByUserEntityIdForeign_IdOrderByInspectionDateDesc(userId);
    }

    /**
     * 사용자 ID로 최근 분석 결과 조회
     */
    public AnalysisResultEntity findLatestByUserId(Integer userId) {
        return analysisResultRepository.findFirstByUserEntityIdForeign_IdOrderByInspectionDateDesc(userId);
    }

    /**
     * 분석 결과 저장
     */
    public AnalysisResultEntity save(AnalysisResultEntity analysisResultEntity) {
        return analysisResultRepository.save(analysisResultEntity);
    }

    /**
     * 분석 결과 ID로 조회
     */
    public Optional<AnalysisResultEntity> findById(Integer id) {
        return analysisResultRepository.findById(id);
    }

    /**
     * 사용자 ID와 분석 타입으로 분석 결과 존재 여부 조회
     */
    public boolean existsByUserIdAndAnalysisType(Integer userId, String analysisType) {
        System.out.println("=== AnalysisResultDAO.existsByUserIdAndAnalysisType ===");
        System.out.println("userId: " + userId);
        System.out.println("analysisType: " + analysisType);
        
        boolean exists = analysisResultRepository.existsByUserEntityIdForeign_IdAndAnalysisType(userId, analysisType);
        
        System.out.println("Repository 결과: " + exists);
        
        return exists;
    }
}
