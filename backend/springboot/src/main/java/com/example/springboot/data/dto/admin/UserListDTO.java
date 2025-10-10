package com.example.springboot.data.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserListDTO {
    private Integer userId;
    private String username;
    private String nickname;
    private String email;
    private String role;
}
