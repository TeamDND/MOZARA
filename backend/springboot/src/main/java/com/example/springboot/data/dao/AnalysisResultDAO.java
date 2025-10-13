package com.example.springboot.data.dao;

import com.example.springboot.data.entity.AnalysisResultEntity;
import com.example.springboot.data.entity.UserEntity;
import com.example.springboot.data.repository.AnalysisResultRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AnalysisResultDAO {
    
    private static final Logger log = LoggerFactory.getLogger(AnalysisResultDAO.class);
    private final AnalysisResultRepository analysisResultRepository;

    /**
     * 분석 결과 저장
     */
    @Transactional
    public AnalysisResultEntity save(AnalysisResultEntity entity) {
        try {
            AnalysisResultEntity savedEntity = analysisResultRepository.save(entity);
            log.info("[AnalysisResultDAO] 분석 결과 저장 완료 - ID: {}, analysisType: {}", 
                    savedEntity.getId(), savedEntity.getAnalysisType());
            return savedEntity;
        } catch (Exception e) {
            log.error("[AnalysisResultDAO] 분석 결과 저장 실패: {}", e.getMessage(), e);
            throw new RuntimeException("분석 결과 저장 중 오류가 발생했습니다.", e);
        }
    }

    /**
     * 사용자 ID와 분석 타입으로 특정 날짜의 분석 결과 조회
     */
    public List<AnalysisResultEntity> findByUserIdAndAnalysisTypeAndDate(Integer userId, String analysisType, LocalDate date) {
        try {
            List<AnalysisResultEntity> results = analysisResultRepository.findByUserIdAndAnalysisTypeAndDate(userId, analysisType, date);
            log.info("[AnalysisResultDAO] 특정 날짜 분석 결과 조회 - userId: {}, analysisType: {}, date: {}, count: {}", 
                    userId, analysisType, date, results.size());
            return results;
        } catch (Exception e) {
            log.error("[AnalysisResultDAO] 특정 날짜 분석 결과 조회 실패 - userId: {}, analysisType: {}, date: {}, error: {}", 
                    userId, analysisType, date, e.getMessage(), e);
            throw new RuntimeException("특정 날짜 분석 결과 조회 중 오류가 발생했습니다.", e);
        }
    }

    /**
     * 사용자 ID와 분석 타입으로 특정 날짜 범위의 분석 결과 조회
     */
    public List<AnalysisResultEntity> findByUserIdAndAnalysisTypeAndDateRange(Integer userId, String analysisType, LocalDate startDate, LocalDate endDate) {
        try {
            List<AnalysisResultEntity> results = analysisResultRepository.findByUserIdAndAnalysisTypeAndDateRange(userId, analysisType, startDate, endDate);
            log.info("[AnalysisResultDAO] 날짜 범위 분석 결과 조회 - userId: {}, analysisType: {}, startDate: {}, endDate: {}, count: {}", 
                    userId, analysisType, startDate, endDate, results.size());
            return results;
        } catch (Exception e) {
            log.error("[AnalysisResultDAO] 날짜 범위 분석 결과 조회 실패 - userId: {}, analysisType: {}, startDate: {}, endDate: {}, error: {}", 
                    userId, analysisType, startDate, endDate, e.getMessage(), e);
            throw new RuntimeException("날짜 범위 분석 결과 조회 중 오류가 발생했습니다.", e);
        }
    }

    /**
     * 사용자 ID와 분석 타입으로 최근 분석 결과 조회 (최신순)
     */
    public List<AnalysisResultEntity> findByUserIdAndAnalysisTypeOrderByDateDesc(Integer userId, String analysisType) {
        try {
            List<AnalysisResultEntity> results = analysisResultRepository.findByUserIdAndAnalysisTypeOrderByDateDesc(userId, analysisType);
            log.info("[AnalysisResultDAO] 최근 분석 결과 조회 (최신순) - userId: {}, analysisType: {}, count: {}", 
                    userId, analysisType, results.size());
            return results;
        } catch (Exception e) {
            log.error("[AnalysisResultDAO] 최근 분석 결과 조회 실패 - userId: {}, analysisType: {}, error: {}", 
                    userId, analysisType, e.getMessage(), e);
            throw new RuntimeException("최근 분석 결과 조회 중 오류가 발생했습니다.", e);
        }
    }

    /**
     * 사용자 ID와 분석 타입으로 최근 분석 결과 조회 (오래된순)
     */
    public List<AnalysisResultEntity> findByUserIdAndAnalysisTypeOrderByDateAsc(Integer userId, String analysisType) {
        try {
            List<AnalysisResultEntity> results = analysisResultRepository.findByUserIdAndAnalysisTypeOrderByDateAsc(userId, analysisType);
            log.info("[AnalysisResultDAO] 최근 분석 결과 조회 (오래된순) - userId: {}, analysisType: {}, count: {}", 
                    userId, analysisType, results.size());
            return results;
        } catch (Exception e) {
            log.error("[AnalysisResultDAO] 최근 분석 결과 조회 실패 - userId: {}, analysisType: {}, error: {}", 
                    userId, analysisType, e.getMessage(), e);
            throw new RuntimeException("최근 분석 결과 조회 중 오류가 발생했습니다.", e);
        }
    }

    /**
     * 사용자 ID와 분석 타입으로 분석 결과 조회 (정렬 옵션 포함)
     */
    public List<AnalysisResultEntity> findByUserIdAndAnalysisType(Integer userId, String analysisType, String sortOrder) {
        if ("oldest".equals(sortOrder)) {
            return findByUserIdAndAnalysisTypeOrderByDateAsc(userId, analysisType);
        } else {
            return findByUserIdAndAnalysisTypeOrderByDateDesc(userId, analysisType);
        }
    }

    /**
     * 사용자 ID와 분석 타입으로 분석 결과 조회 (기본: 최신순)
     */
    public List<AnalysisResultEntity> findByUserIdAndAnalysisType(Integer userId, String analysisType) {
        return findByUserIdAndAnalysisTypeOrderByDateDesc(userId, analysisType);
    }

    /**
     * 사용자 ID로 분석 결과 개수 조회
     */
    public long countByUserId(Integer userId) {
        try {
            long count = analysisResultRepository.countByUserEntityIdForeign_Id(userId);
            log.info("[AnalysisResultDAO] 사용자 분석 결과 개수 조회 - userId: {}, count: {}", userId, count);
            return count;
        } catch (Exception e) {
            log.error("[AnalysisResultDAO] 사용자 분석 결과 개수 조회 실패 - userId: {}, error: {}", userId, e.getMessage(), e);
            return 0L;
        }
    }

    /**
     * 사용자 ID로 분석 결과 목록 조회 (날짜 내림차순 → ID 내림차순)
     */
    public List<AnalysisResultEntity> findByUserIdOrderByDateDesc(Integer userId) {
        try {
            List<AnalysisResultEntity> results = analysisResultRepository.findByUserEntityIdForeign_IdOrderByInspectionDateDescIdDesc(userId);
            log.info("[AnalysisResultDAO] 사용자 분석 결과 목록 조회 (날짜↓, ID↓) - userId: {}, count: {}", userId, results.size());
            return results;
        } catch (Exception e) {
            log.error("[AnalysisResultDAO] 사용자 분석 결과 목록 조회 실패 - userId: {}, error: {}", userId, e.getMessage(), e);
            throw new RuntimeException("사용자 분석 결과 목록 조회 중 오류가 발생했습니다.", e);
        }
    }

    /**
     * 사용자 ID로 분석 결과 목록 조회 (날짜 오름차순 → ID 오름차순)
     */
    public List<AnalysisResultEntity> findByUserIdOrderByDateAsc(Integer userId) {
        try {
            List<AnalysisResultEntity> results = analysisResultRepository.findByUserEntityIdForeign_IdOrderByInspectionDateAscIdAsc(userId);
            log.info("[AnalysisResultDAO] 사용자 분석 결과 목록 조회 (날짜↑, ID↑) - userId: {}, count: {}", userId, results.size());
            return results;
        } catch (Exception e) {
            log.error("[AnalysisResultDAO] 사용자 분석 결과 목록 조회 실패 - userId: {}, error: {}", userId, e.getMessage(), e);
            throw new RuntimeException("사용자 분석 결과 목록 조회 중 오류가 발생했습니다.", e);
        }
    }

    /**
     * 사용자 ID로 분석 결과 목록 조회 (정렬 옵션 포함)
     */
    public List<AnalysisResultEntity> findByUserId(Integer userId, String sortOrder) {
        if ("oldest".equals(sortOrder)) {
            return findByUserIdOrderByDateAsc(userId);
        } else {
            return findByUserIdOrderByDateDesc(userId);
        }
    }

    /**
     * 사용자 ID로 분석 결과 목록 조회 (별칭 메서드 - 기본값: 최신순)
     */
    public List<AnalysisResultEntity> findByUserId(Integer userId) {
        return findByUserIdOrderByDateDesc(userId);
    }

    /**
     * ID로 분석 결과 조회
     */
    public java.util.Optional<AnalysisResultEntity> findById(Integer id) {
        try {
            java.util.Optional<AnalysisResultEntity> result = analysisResultRepository.findById(id);
            log.info("[AnalysisResultDAO] ID로 분석 결과 조회 - id: {}, found: {}", 
                    id, result.isPresent() ? "true" : "false");
            return result;
        } catch (Exception e) {
            log.error("[AnalysisResultDAO] ID로 분석 결과 조회 실패 - id: {}, error: {}", id, e.getMessage(), e);
            return java.util.Optional.empty();
        }
    }

    /**
     * 사용자 ID로 최근 분석 결과 조회 (1개)
     */
    public AnalysisResultEntity findLatestByUserId(Integer userId) {
        try {
            AnalysisResultEntity result = analysisResultRepository.findFirstByUserEntityIdForeign_IdOrderByInspectionDateDesc(userId);
            log.info("[AnalysisResultDAO] 사용자 최근 분석 결과 조회 - userId: {}, found: {}", 
                    userId, result != null ? "true" : "false");
            return result;
        } catch (Exception e) {
            log.error("[AnalysisResultDAO] 사용자 최근 분석 결과 조회 실패 - userId: {}, error: {}", userId, e.getMessage(), e);
            return null;
        }
    }

    /**
     * 사용자 ID와 분석 타입으로 분석 결과 존재 여부 조회
     */
    public boolean existsByUserIdAndAnalysisType(Integer userId, String analysisType) {
        try {
            boolean exists = analysisResultRepository.existsByUserEntityIdForeign_IdAndAnalysisType(userId, analysisType);
            log.info("[AnalysisResultDAO] 분석 결과 존재 여부 조회 - userId: {}, analysisType: {}, exists: {}", 
                    userId, analysisType, exists);
            return exists;
        } catch (Exception e) {
            log.error("[AnalysisResultDAO] 분석 결과 존재 여부 조회 실패 - userId: {}, analysisType: {}, error: {}", 
                    userId, analysisType, e.getMessage(), e);
            return false;
        }
    }

    /**
     * 사용자의 모든 분석 결과 삭제
     */
    @Transactional
    public void deleteAllByUser(UserEntity user) {
        try {
            analysisResultRepository.deleteAllByUserEntityIdForeign(user);
            log.info("[AnalysisResultDAO] 사용자 분석 결과 전체 삭제 완료 - userId: {}", user.getId());
        } catch (Exception e) {
            log.error("[AnalysisResultDAO] 사용자 분석 결과 전체 삭제 실패 - userId: {}, error: {}", 
                    user.getId(), e.getMessage(), e);
            throw new RuntimeException("사용자 분석 결과 삭제 중 오류가 발생했습니다.", e);
        }
    }

    /**
     * AnalysisResultEntity를 Map으로 변환하는 헬퍼 메서드
     */
    public Map<String, Object> convertEntityToMap(AnalysisResultEntity entity) {
        return Map.of(
                "id", entity.getId(),
                "inspectionDate", entity.getInspectionDate().toString(),
                "analysisSummary", entity.getAnalysisSummary() != null ? entity.getAnalysisSummary() : "",
                "advice", entity.getAdvice() != null ? entity.getAdvice() : "",
                "grade", entity.getGrade() != null ? entity.getGrade() : 0,
                "imageUrl", entity.getImageUrl() != null ? entity.getImageUrl() : "",
                "analysisType", entity.getAnalysisType() != null ? entity.getAnalysisType() : ""
        );
    }

    /**
     * AnalysisResultEntity 리스트를 Map 리스트로 변환하는 헬퍼 메서드
     */
    public List<Map<String, Object>> convertEntityListToMapList(List<AnalysisResultEntity> entities) {
        return entities.stream()
                .map(this::convertEntityToMap)
                .collect(Collectors.toList());
    }

    /**
     * 사용자 ID와 분석 타입으로 오늘 날짜의 분석 결과 1개 조회
     */
    public AnalysisResultEntity findTodayAnalysisByUserIdAndType(Integer userId, String analysisType) {
        try {
            LocalDate today = LocalDate.now();
            AnalysisResultEntity result = analysisResultRepository.findFirstByUserIdAndAnalysisTypeAndDate(userId, analysisType, today);
            log.info("[AnalysisResultDAO] 오늘 날짜 분석 결과 조회 - userId: {}, analysisType: {}, date: {}, found: {}", 
                    userId, analysisType, today, result != null ? "true" : "false");
            return result;
        } catch (Exception e) {
            log.error("[AnalysisResultDAO] 오늘 날짜 분석 결과 조회 실패 - userId: {}, analysisType: {}, error: {}", 
                    userId, analysisType, e.getMessage(), e);
            return null;
        }
    }
}