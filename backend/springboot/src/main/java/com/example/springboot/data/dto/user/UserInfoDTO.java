package com.example.springboot.data.dto.user;

import com.example.springboot.data.dto.seedling.SeedlingStatusDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UserInfoDTO {
    private Integer userId;
    private String username;
    private String email;
    private String nickname;
    private String gender;
    private Integer age;
    private String role;
    private Boolean familyHistory;
    private Boolean isLoss;
    private String stress;
    private SeedlingStatusDTO seedlingStatus;

}
