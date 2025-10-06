package com.example.springboot.data.dto.ai;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@JsonIgnoreProperties(ignoreUnknown = true)
public class HairQuizResultDTO {
    private Integer userId;
    private Integer totalQuestions; // 전체 문제 수
    private Integer correctAnswers; // 정답 수
    private Integer earnedPoints; // 획득한 포인트
    private boolean isPassed; // 7개 이상 정답 여부
    private List<QuestionResultDTO> questionResults; // 각 문제별 결과
    
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class QuestionResultDTO {
        private Integer questionIndex;
        private String question;
        private String correctAnswer;
        private String userAnswer;
        private boolean isCorrect;
        private String explanation;
    }
}
