package com.example.springboot.data.dto.user;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class SignUpDTO {
    private String username;
    private String password;
    private String email;
    private String nickname;
    private String role;
}
