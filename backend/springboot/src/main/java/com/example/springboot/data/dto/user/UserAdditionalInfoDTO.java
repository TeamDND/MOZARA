package com.example.springboot.data.dto.user;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserAdditionalInfoDTO {
    
    /**
     * 성별
     */
    private String gender;
    
    /**
     * 나이
     */
    private Integer age;
    
    /**
     * 가족력 ('none': 없음, 'father': 아버지, 'mother': 어머니, 'both': 부모 모두, null: 미입력)
     */
    private String familyHistory;
    
    /**
     * 탈모 여부 (true: 있음, false: 없음, null: 미입력)
     */
    private Boolean isLoss;
    
    /**
     * 스트레스 수준 (예: "높음", "보통", "낮음", null: 미입력)
     */
    private String stress;
}
