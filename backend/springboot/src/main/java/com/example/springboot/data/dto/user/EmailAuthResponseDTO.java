package com.example.springboot.data.dto.user;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmailAuthResponseDTO {
    private boolean success;
    private String message;
    private int remainingTime; // 남은 시간 (초)
}
