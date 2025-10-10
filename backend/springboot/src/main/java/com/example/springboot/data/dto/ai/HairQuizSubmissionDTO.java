package com.example.springboot.data.dto.ai;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class HairQuizSubmissionDTO {
    private Integer userId;
    private List<HairQuizQuestionDTO> quizQuestions; // 퀴즈 문제들
    private List<QuizAnswerDTO> answers;
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class QuizAnswerDTO {
        private Integer questionIndex; // 문제 번호 (0부터 시작)
        private String userAnswer; // 사용자가 선택한 답 ("O" 또는 "X")
    }
}
