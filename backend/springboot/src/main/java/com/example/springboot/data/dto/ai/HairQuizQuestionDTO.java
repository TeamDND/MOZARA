package com.example.springboot.data.dto.ai;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class HairQuizQuestionDTO {
    private String question;
    private String answer; // "O" 또는 "X"
    private String explanation;
}
