package com.example.springboot.data.dto.user;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@Builder
public class AnalysisResultDTO {
    private Integer id;
    private LocalDate inspectionDate;
    private String analysisSummary;
    private String advice;
    private Integer grade;
    private String imageUrl;
    private String analysisType; // 분석 유형 (daily, swin_dual_model_llm_enhanced, rag_v2_analysis 등)
    private String improvement; // 개선 정도
}
