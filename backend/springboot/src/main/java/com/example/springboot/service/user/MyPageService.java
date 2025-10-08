package com.example.springboot.service.user;

import com.example.springboot.data.dao.AnalysisResultDAO;
import com.example.springboot.data.dao.UserDAO;
import com.example.springboot.data.dto.user.AnalysisResultDTO;
import com.example.springboot.data.entity.AnalysisResultEntity;
import com.example.springboot.data.entity.UserEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MyPageService {
    private final AnalysisResultDAO analysisResultDAO;
    private final UserDAO userDAO;

    /**
     * 사용자 ID로 분석 결과 개수 조회
     */
    public long getAnalysisCountByUserId(Integer userId) {
        return analysisResultDAO.countByUserId(userId);
    }

    /**
     * 사용자명으로 분석 결과 개수 조회
     */
    public long getAnalysisCountByUsername(String username) {
        UserEntity userEntity = userDAO.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
        return analysisResultDAO.countByUserId(userEntity.getId());
    }

    /**
     * 사용자 ID로 분석 결과 리스트 조회 (정렬 옵션 포함)
     */
    public List<AnalysisResultDTO> getAnalysisResultsByUserId(Integer userId, String sortOrder) {
        List<AnalysisResultEntity> entities = analysisResultDAO.findByUserId(userId, sortOrder);
        return entities.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * 사용자 ID로 분석 결과 리스트 조회 (기본값: 최신순)
     */
    public List<AnalysisResultDTO> getAnalysisResultsByUserId(Integer userId) {
        return getAnalysisResultsByUserId(userId, "newest");
    }

    /**
     * 사용자명으로 분석 결과 리스트 조회
     */
    public List<AnalysisResultDTO> getAnalysisResultsByUsername(String username) {
        UserEntity userEntity = userDAO.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
        return getAnalysisResultsByUserId(userEntity.getId());
    }

    /**
     * 분석 결과 ID로 개별 분석 결과 조회
     */
    public AnalysisResultDTO getAnalysisResultById(Integer resultId) {
        AnalysisResultEntity entity = analysisResultDAO.findById(resultId)
                .orElseThrow(() -> new RuntimeException("분석 결과를 찾을 수 없습니다."));
        return convertToDTO(entity);
    }

    /**
     * 사용자 ID와 분석 결과 ID로 개별 분석 결과 조회 (본인 것만 조회 가능)
     */
    public AnalysisResultDTO getAnalysisResultByUserIdAndId(Integer userId, Integer resultId) {
        AnalysisResultEntity entity = analysisResultDAO.findById(resultId)
                .orElseThrow(() -> new RuntimeException("분석 결과를 찾을 수 없습니다."));
        
        // 본인의 분석 결과인지 확인
        if (!entity.getUserEntityIdForeign().getId().equals(userId)) {
            throw new RuntimeException("접근 권한이 없습니다.");
        }
        
        return convertToDTO(entity);
    }

    /**
     * AnalysisResultEntity를 AnalysisResultDTO로 변환
     */
    private AnalysisResultDTO convertToDTO(AnalysisResultEntity entity) {
        return AnalysisResultDTO.builder()
                .id(entity.getId())
                .inspectionDate(entity.getInspectionDate())
                .analysisSummary(entity.getAnalysisSummary())
                .advice(entity.getAdvice())
                .grade(entity.getGrade())
                .imageUrl(entity.getImageUrl())
                .analysisType(entity.getAnalysisType() != null ? entity.getAnalysisType() : determineAnalysisType(entity.getAnalysisSummary()))
                .improvement(calculateImprovement(entity.getGrade()))
                .build();
    }

    /**
     * 분석 요약을 기반으로 분석 유형 결정
     */
    private String determineAnalysisType(String analysisSummary) {
        if (analysisSummary == null) return "종합 진단";
        
        if (analysisSummary.contains("모발 밀도") || analysisSummary.contains("밀도")) {
            return "모발 밀도";
        } else if (analysisSummary.contains("두피") || analysisSummary.contains("두피 상태")) {
            return "두피 상태";
        } else if (analysisSummary.contains("탈모") || analysisSummary.contains("탈모 정도")) {
            return "탈모 분석";
        } else {
            return "종합 진단";
        }
    }

    /**
     * 점수를 기반으로 개선 정도 계산
     */
    private String calculateImprovement(Integer grade) {
        if (grade == null) return "분석 중";
        
        if (grade >= 90) {
            return "25% 개선됨";
        } else if (grade >= 80) {
            return "20% 개선됨";
        } else if (grade >= 70) {
            return "15% 개선됨";
        } else if (grade >= 60) {
            return "10% 개선됨";
        } else {
            return "5% 개선됨";
        }
    }

    /**
     * 사용자 ID와 분석 타입으로 분석 결과 존재 여부 확인
     */
    public boolean hasAnalysisByType(Integer userId, String analysisType) {
        System.out.println("=== MyPageService.hasAnalysisByType ===");
        System.out.println("userId: " + userId);
        System.out.println("analysisType: " + analysisType);
        
        boolean exists = analysisResultDAO.existsByUserIdAndAnalysisType(userId, analysisType);
        
        System.out.println("exists: " + exists);
        
        return exists;
    }

    /**
     * 사용자 ID와 분석 타입으로 분석 결과 리스트 조회 (정렬 옵션 포함)
     */
    public List<AnalysisResultDTO> getAnalysisResultsByUserIdAndType(Integer userId, String analysisType, String sortOrder) {
        List<AnalysisResultEntity> entities = analysisResultDAO.findByUserIdAndAnalysisType(userId, analysisType, sortOrder);
        return entities.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    /**
     * 사용자 ID와 분석 타입으로 분석 결과 리스트 조회 (기본값: 최신순)
     */
    public List<AnalysisResultDTO> getAnalysisResultsByUserIdAndType(Integer userId, String analysisType) {
        return getAnalysisResultsByUserIdAndType(userId, analysisType, "newest");
    }

    /**
     * 사용자 ID와 분석 타입으로 분석 결과 개수 조회
     */
    public long getAnalysisCountByUserIdAndType(Integer userId, String analysisType) {
        List<AnalysisResultEntity> entities = analysisResultDAO.findByUserIdAndAnalysisTypeOrderByDateDesc(userId, analysisType);
        return entities.size();
    }

    /**
     * 오늘 날짜의 특정 분석 타입 결과 조회
     */
    public AnalysisResultDTO getTodayAnalysisByType(Integer userId, String analysisType) {
        AnalysisResultEntity entity = analysisResultDAO.findTodayAnalysisByUserIdAndType(userId, analysisType);
        
        if (entity == null) {
            throw new RuntimeException("오늘 날짜의 " + analysisType + " 분석 결과가 없습니다.");
        }
        
        return convertToDTO(entity);
    }

    /**
     * 이번주 일주일치 daily 분석 결과 조회 (일월화수목금토)
     */
    public Map<String, Object> getWeeklyDailyAnalysis(Integer userId) {
        // 이번주 일요일 계산
        LocalDate today = LocalDate.now();
        LocalDate sunday = today.with(DayOfWeek.SUNDAY);
        
        // 만약 오늘이 일요일보다 이전이면 (이번주가 아직 안 시작했으면) 지난주로 설정
        if (today.isBefore(sunday)) {
            sunday = sunday.minusWeeks(1);
        }
        
        LocalDate saturday = sunday.plusDays(6);
        
        // daily 타입의 분석 결과 조회
        List<AnalysisResultEntity> entities = analysisResultDAO.findByUserIdAndAnalysisTypeAndDateRange(
            userId, 
            "daily", 
            sunday, 
            saturday
        );
        
        // 요일별로 그룹화 (일월화수목금토 순서)
        Map<String, Integer> weeklyData = new HashMap<>();
        weeklyData.put("일", null);
        weeklyData.put("월", null);
        weeklyData.put("화", null);
        weeklyData.put("수", null);
        weeklyData.put("목", null);
        weeklyData.put("금", null);
        weeklyData.put("토", null);
        
        // 각 날짜의 최신 분석 결과의 grade를 요일별로 저장
        for (AnalysisResultEntity entity : entities) {
            LocalDate date = entity.getInspectionDate();
            DayOfWeek dayOfWeek = date.getDayOfWeek();
            String dayName = getDayName(dayOfWeek);
            
            // 해당 요일에 이미 데이터가 있으면 최신 것만 유지 (ID가 큰 것)
            if (weeklyData.get(dayName) == null) {
                weeklyData.put(dayName, entity.getGrade());
            }
        }
        
        Map<String, Object> result = new HashMap<>();
        result.put("weeklyData", weeklyData);
        result.put("startDate", sunday);
        result.put("endDate", saturday);
        
        return result;
    }
    
    /**
     * DayOfWeek를 한글 요일명으로 변환
     */
    private String getDayName(DayOfWeek dayOfWeek) {
        switch (dayOfWeek) {
            case SUNDAY: return "일";
            case MONDAY: return "월";
            case TUESDAY: return "화";
            case WEDNESDAY: return "수";
            case THURSDAY: return "목";
            case FRIDAY: return "금";
            case SATURDAY: return "토";
            default: return "";
        }
    }
}
