package com.example.springboot.data.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BaspResponseDTO {
    private String baspBasic;          // A/M/C/U
    private String baspSpecific;       // V0~V3
    private String stageLabel;         // 정상/초기/중등도/진행성
    private String summaryText;        // 요약 텍스트
    private List<String> recommendations;  // 권장사항
    private List<String> disclaimers;     // 디스클레이머
    private Integer rawScore;          // 원시 점수
    private Integer lifestyleRisk;     // 생활습관 리스크 점수
}
