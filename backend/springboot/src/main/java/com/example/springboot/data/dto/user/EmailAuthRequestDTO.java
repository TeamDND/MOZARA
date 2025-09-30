package com.example.springboot.data.dto.user;

import lombok.Data;

@Data
public class EmailAuthRequestDTO {
    private String email;
    private String authCode;
}
