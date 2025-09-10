package com.example.springboot.data.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UserInfoDTO {
    private String username;
    private String email;
    private String address;
    private String nickname;
    private String gender;
    private Integer age;

}
