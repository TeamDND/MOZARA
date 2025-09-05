package com.example.springboot.data.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BaspRequestDTO {
    private String hairline;  // A, M, C, U
    private Integer vertex;    // 0, 1, 2, 3
    private Integer density;  // 0, 1, 2, 3
    private LifestyleDTO lifestyle;
    
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class LifestyleDTO {
        private Boolean shedding6m;      // 6개월간 탈락모 증가 느낌
        private Boolean familyHistory;   // 가족력
        private String sleepHours;       // lt4, 5to7, ge8
        private Boolean smoking;         // 흡연
        private String alcohol;          // none, light, heavy
    }
}
