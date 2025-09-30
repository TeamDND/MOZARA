package com.example.springboot.data.dto.user;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmailAuthDTO {
    private String email;
    private String authCode;
    private LocalDateTime createdAt;
    private LocalDateTime expiresAt;
    private boolean isVerified;
    private int attemptCount;
}
