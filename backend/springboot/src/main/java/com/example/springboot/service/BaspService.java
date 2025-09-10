package com.example.springboot.service;

import com.example.springboot.data.dto.BaspRequestDTO;
import com.example.springboot.data.dto.BaspResponseDTO;
import com.example.springboot.data.dto.RagGuideDTO;
import com.example.springboot.data.dto.CitationDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class BaspService {
    
    @Autowired
    private RestTemplate restTemplate;
    
    private static final String PYTHON_API_URL = "http://localhost:8000/api/basp/evaluate";
    private static final String PYTHON_RAG_URL = "http://localhost:8000/api/rag/answer";
    
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
                // RAG 가이드 추가 시도
                try {
                    RagGuideDTO ragGuide = getRagGuide(response);
                    System.out.println("RAG 가이드 생성 완료: " + ragGuide);
                    response.setRagGuide(ragGuide);
                    System.out.println("응답에 RAG 가이드 설정 완료: " + response.getRagGuide());
                } catch (Exception ragError) {
                    System.err.println("RAG 가이드 생성 중 오류 발생: " + ragError.getMessage());
                    ragError.printStackTrace();
                    // RAG 실패해도 기본 응답은 반환
                }
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
        
        // 로컬 계산에서도 RAG 가이드 추가 시도
        try {
            RagGuideDTO ragGuide = getRagGuide(response);
            System.out.println("로컬 계산 RAG 가이드 생성 완료: " + ragGuide);
            response.setRagGuide(ragGuide);
        } catch (Exception ragError) {
            System.err.println("로컬 계산 RAG 가이드 생성 중 오류: " + ragError.getMessage());
        }
        
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
    
    private RagGuideDTO getRagGuide(BaspResponseDTO response) {
        try {
            System.out.println("=== RAG 가이드 요청 시작 ===");
            System.out.println("BASP Basic: " + response.getBaspBasic());
            System.out.println("BASP Specific: " + response.getBaspSpecific());
            System.out.println("Stage Label: " + response.getStageLabel());
            System.out.println("Risk Score: " + response.getLifestyleRisk());
            
            // RAG 요청 생성
            Map<String, Object> ragRequest = new HashMap<>();
            ragRequest.put("baspBasic", response.getBaspBasic());
            ragRequest.put("baspSpecific", response.getBaspSpecific());
            ragRequest.put("stageLabel", response.getStageLabel());
            ragRequest.put("riskScore", response.getLifestyleRisk());
            
            System.out.println("RAG 요청 데이터: " + ragRequest);
            System.out.println("RAG API URL: " + PYTHON_RAG_URL);
            
            // RAG API 호출
            Map<String, Object> ragResponse = restTemplate.postForObject(
                PYTHON_RAG_URL,
                ragRequest,
                Map.class
            );
            
            System.out.println("RAG 응답 받음: " + ragResponse);
            
            if (ragResponse != null) {
                @SuppressWarnings("unchecked")
                List<String> answers = (List<String>) ragResponse.get("answer");
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> citationsData = (List<Map<String, Object>>) ragResponse.get("citations");
                
                System.out.println("Answers: " + answers);
                System.out.println("Citations: " + citationsData);
                
                List<CitationDTO> citations = new ArrayList<>();
                if (citationsData != null) {
                    for (Map<String, Object> citationData : citationsData) {
                        CitationDTO citation = CitationDTO.builder()
                            .n(citationData.get("n") != null ? ((Number) citationData.get("n")).intValue() : 0)
                            .title(citationData.get("title") != null ? citationData.get("title").toString() : "")
                            .publisher(citationData.get("publisher") != null ? citationData.get("publisher").toString() : "")
                            .year(citationData.get("year") != null ? ((Number) citationData.get("year")).intValue() : null)
                            .url(citationData.get("url") != null ? citationData.get("url").toString() : null)
                            .snippet(citationData.get("snippet") != null ? citationData.get("snippet").toString() : null)
                            .build();
                        citations.add(citation);
                    }
                }
                
                RagGuideDTO result = RagGuideDTO.builder()
                    .answers(answers != null ? answers : new ArrayList<>())
                    .citations(citations)
                    .build();
                
                System.out.println("최종 RAG 가이드: " + result);
                return result;
            } else {
                System.out.println("RAG 응답이 null입니다.");
            }
            
        } catch (Exception e) {
            System.err.println("RAG 가이드 생성 중 오류: " + e.getMessage());
        }
        
        return null;
    }
}
