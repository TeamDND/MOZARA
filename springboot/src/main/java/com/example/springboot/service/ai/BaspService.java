package com.example.springboot.service.ai;

import com.example.springboot.data.dto.ai.BaspRequestDTO;
import com.example.springboot.data.dto.ai.BaspResponseDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class BaspService {
    
    @Autowired
    private RestTemplate restTemplate;
    
    private static final String PYTHON_API_URL = "http://localhost:8000/api/basp/evaluate";
    
    public BaspResponseDTO evaluateBasp(BaspRequestDTO request) {
        try {
//            System.out.println("1. 요청 전송, " + request);
            // Python FastAPI로 요청 전송
            BaspResponseDTO response = restTemplate.postForObject(
                PYTHON_API_URL, 
                request, 
                BaspResponseDTO.class
            );
            
            if (response != null) {
                return response;
            }
        } catch (Exception e) {
            System.err.println("Python API 호출 중 오류 발생: " + e.getMessage());
        }
        
        // Python API 호출 실패 시 기본 로직으로 폴백
        return calculateBaspLocally(request);
    }
    
    private BaspResponseDTO calculateBaspLocally(BaspRequestDTO request) {
        // Lifestyle Risk 계산 (0~8)
        int lifestyleRisk = calculateLifestyleRisk(request.getLifestyle());
        
        // Raw Score 계산
        int v = request.getVertex();
        int d = request.getDensity();
        int riskBucket = Math.min(2, lifestyleRisk / 3);
        int rawScore = v + d + riskBucket;
        
        // 진행 정도 매핑
        String stageLabel = getStageLabel(rawScore);
        
        // 헤어라인 설명
        String hairlineDesc = getHairlineDescription(request.getHairline());
        
        // 정수리 설명
        String vertexDesc = getVertexDescription(request.getVertex());
        
        // 요약 텍스트
        String summaryText = hairlineDesc + ", " + vertexDesc + ". 생활습관 리스크 점수: " + lifestyleRisk;
        
        // 권장사항
        List<String> recommendations = getRecommendations(stageLabel, request.getLifestyle());
        
        // 디스클레이머
        List<String> disclaimers = Arrays.asList(
            "본 도구는 의료 진단이 아닌 참고용입니다.",
            "증상이 지속·악화되면 피부과 전문의 상담을 권장합니다."
        );
        
        BaspResponseDTO response = BaspResponseDTO.builder()
                .baspBasic(request.getHairline())
                .baspSpecific("V" + request.getVertex())
                .stageLabel(stageLabel)
                .summaryText(summaryText)
                .recommendations(recommendations)
                .disclaimers(disclaimers)
                .rawScore(rawScore)
                .lifestyleRisk(lifestyleRisk)
                .build();
        
        
        return response;
    }
    
    private int calculateLifestyleRisk(BaspRequestDTO.LifestyleDTO lifestyle) {
        int risk = 0;
        
        if (lifestyle.getShedding6m()) risk += 2;
        if (lifestyle.getFamilyHistory()) risk += 2;
        
        switch (lifestyle.getSleepHours()) {
            case "lt4": risk += 2; break;
            case "5to7": risk += 1; break;
            case "ge8": risk += 0; break;
        }
        
        if (lifestyle.getSmoking()) risk += 1;
        if ("heavy".equals(lifestyle.getAlcohol())) risk += 1;
        
        return Math.min(8, risk);
    }
    
    private String getStageLabel(int rawScore) {
        if (rawScore == 0) return "정상";
        if (rawScore <= 2) return "초기";
        if (rawScore <= 5) return "중등도";
        return "진행성";
    }
    
    private String getHairlineDescription(String hairline) {
        switch (hairline) {
            case "A": return "이마 라인 안정적";
            case "M": return "양측 이마 후퇴(M형 경향)";
            case "C": return "곡선형 후퇴(C형 경향)";
            case "U": return "넓은 이마 상승(U형 경향)";
            default: return "알 수 없음";
        }
    }
    
    private String getVertexDescription(int vertex) {
        switch (vertex) {
            case 0: return "정수리 정상";
            case 1: return "약간 감소";
            case 2: return "감소";
            case 3: return "넓은 감소";
            default: return "알 수 없음";
        }
    }
    
    private List<String> getRecommendations(String stageLabel, BaspRequestDTO.LifestyleDTO lifestyle) {
        List<String> recommendations = Arrays.asList(
            "본 도구는 의료 진단이 아닌 참고용입니다. 지속 시 전문의 상담 권장."
        );
        
        if ("정상".equals(stageLabel) || "초기".equals(stageLabel)) {
            recommendations.add("순한 두피 전용 샴푸 사용");
            recommendations.add("수면 7~8시간 확보");
            recommendations.add("분기별 셀프 체크");
        } else {
            recommendations.add("전문의 상담/치료 옵션 안내");
            recommendations.add("주간 관찰 리포트");
            recommendations.add("두피 관리 전문 제품 사용");
        }
        
        if (lifestyle.getFamilyHistory()) {
            recommendations.add("가족력 있으므로 정기적 모니터링");
        }
        
        return recommendations;
    }
    
}
