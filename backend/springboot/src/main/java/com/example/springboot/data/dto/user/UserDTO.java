package com.example.springboot.data.dto.user;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder

public class UserDTO {
    private String username;
    private String password;
    private String email;
    private LocalDate createdAt;
    private String role;
    private String nickname;
    private String gender;
    private Integer age;
}
