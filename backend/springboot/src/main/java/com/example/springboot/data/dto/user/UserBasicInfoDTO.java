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
public class UserBasicInfoDTO {

    /**
     * 이메일
     */
    private String email;

    /**
     * 닉네임
     */
    private String nickname;
}