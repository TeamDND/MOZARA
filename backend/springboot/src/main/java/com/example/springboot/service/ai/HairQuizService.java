package com.example.springboot.service.ai;

import com.example.springboot.data.dto.ai.HairQuizResponseDTO;
import com.example.springboot.data.dto.ai.HairQuizSubmissionDTO;
import com.example.springboot.data.dto.ai.HairQuizResultDTO;
import com.example.springboot.data.dto.ai.HairQuizQuestionDTO;
import com.example.springboot.service.user.SeedlingService;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.List;

@Service
public class HairQuizService {

    @Value("${ai.python.base-url}")
    private String pythonBaseUrl;

    private static final Logger log = LoggerFactory.getLogger(HairQuizService.class);
    private static final int QUIZ_PASS_THRESHOLD = 7; // 7개 이상 정답시 통과
    private static final int QUIZ_REWARD_POINTS = 50; // 퀴즈 통과시 지급 포인트

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    private final SeedlingService seedlingService;

    public HairQuizService(SeedlingService seedlingService) {
        this.seedlingService = seedlingService;
    }

    /**
     * 탈모 퀴즈 생성
     * @return 생성된 퀴즈 목록
     */
    public HairQuizResponseDTO generateQuiz() {
        try {
            String url = pythonBaseUrl + "/hair-quiz/generate";

            HttpHeaders headers = new HttpHeaders();
            headers.set("Content-Type", "application/json");
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(
                    url,
                    HttpMethod.POST,
                    entity,
                    String.class
            );

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                String body = response.getBody();
                try {
                    return objectMapper.readValue(body, HairQuizResponseDTO.class);
                } catch (Exception parseEx) {
                    log.error("[HairQuiz] Python 응답 파싱 실패: {}", parseEx.getMessage(), parseEx);
                    throw new RuntimeException("Python 응답 파싱 실패");
                }
            }
            log.error("[HairQuiz] Python 비정상 응답 status={}, body={}", response.getStatusCodeValue(), response.getBody());
            throw new RuntimeException("Python 서버 응답이 유효하지 않습니다.");
        } catch (Exception e) {
            log.error("[HairQuiz] Python 연동 예외: {}", e.getMessage(), e);
            throw new RuntimeException("Python 서버에서 퀴즈를 생성하는 중 오류가 발생했습니다: " + e.getMessage(), e);
        }
    }

    /**
     * 퀴즈 답변 제출 및 결과 처리
     * @param submission 퀴즈 답변 제출 데이터
     * @param quizQuestions 원본 퀴즈 문제들
     * @return 퀴즈 결과
     */
    public HairQuizResultDTO submitQuiz(HairQuizSubmissionDTO submission, List<HairQuizQuestionDTO> quizQuestions) {
        try {
            log.info("[HairQuiz] 퀴즈 답변 제출 - userId: {}, 답변 수: {}", 
                    submission.getUserId(), submission.getAnswers().size());

            // 답변 검증 및 채점
            List<HairQuizResultDTO.QuestionResultDTO> questionResults = new ArrayList<>();
            int correctCount = 0;

            for (HairQuizSubmissionDTO.QuizAnswerDTO userAnswer : submission.getAnswers()) {
                int questionIndex = userAnswer.getQuestionIndex();
                
                if (questionIndex >= 0 && questionIndex < quizQuestions.size()) {
                    HairQuizQuestionDTO question = quizQuestions.get(questionIndex);
                    boolean isCorrect = question.getAnswer().equals(userAnswer.getUserAnswer());
                    
                    if (isCorrect) {
                        correctCount++;
                    }

                    HairQuizResultDTO.QuestionResultDTO result = HairQuizResultDTO.QuestionResultDTO.builder()
                            .questionIndex(questionIndex)
                            .question(question.getQuestion())
                            .correctAnswer(question.getAnswer())
                            .userAnswer(userAnswer.getUserAnswer())
                            .isCorrect(isCorrect)
                            .explanation(question.getExplanation())
                            .build();
                    
                    questionResults.add(result);
                }
            }

            // 통과 여부 확인 (7개 이상 정답)
            boolean isPassed = correctCount >= QUIZ_PASS_THRESHOLD;
            int earnedPoints = isPassed ? QUIZ_REWARD_POINTS : 0;

            // 통과시 포인트 지급
            if (isPassed) {
                try {
                    seedlingService.updateSeedlingPoint(submission.getUserId(), earnedPoints);
                    log.info("[HairQuiz] 포인트 지급 완료 - userId: {}, points: {}", 
                            submission.getUserId(), earnedPoints);
                } catch (Exception e) {
                    log.error("[HairQuiz] 포인트 지급 실패 - userId: {}, error: {}", 
                            submission.getUserId(), e.getMessage());
                    // 포인트 지급 실패해도 퀴즈 결과는 반환
                }
            }

            HairQuizResultDTO result = HairQuizResultDTO.builder()
                    .userId(submission.getUserId())
                    .totalQuestions(quizQuestions.size())
                    .correctAnswers(correctCount)
                    .earnedPoints(earnedPoints)
                    .isPassed(isPassed)
                    .questionResults(questionResults)
                    .build();

            log.info("[HairQuiz] 퀴즈 결과 - userId: {}, 정답: {}/{}, 통과: {}, 포인트: {}", 
                    submission.getUserId(), correctCount, quizQuestions.size(), isPassed, earnedPoints);

            return result;

        } catch (Exception e) {
            log.error("[HairQuiz] 퀴즈 답변 처리 중 오류: {}", e.getMessage(), e);
            throw new RuntimeException("퀴즈 답변 처리 중 오류가 발생했습니다: " + e.getMessage(), e);
        }
    }

    /**
     * 퀴즈 서비스 헬스체크
     * @return 서비스 상태 정보
     */
    public String healthCheck() {
        try {
            String url = pythonBaseUrl + "/hair-quiz/health";
            
            HttpHeaders headers = new HttpHeaders();
            headers.set("Content-Type", "application/json");
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    entity,
                    String.class
            );

            return response.getBody();
        } catch (Exception e) {
            throw new RuntimeException("Python 서버 헬스체크 중 오류가 발생했습니다: " + e.getMessage(), e);
        }
    }
}
