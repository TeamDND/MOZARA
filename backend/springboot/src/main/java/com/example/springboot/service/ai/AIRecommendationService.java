package com.example.springboot.service.ai;

import com.example.springboot.data.entity.UserEntity;
import com.example.springboot.data.entity.UsersInfoEntity;
import com.example.springboot.data.repository.UserRepository;
import com.example.springboot.data.repository.UsersInfoRepository;
import com.example.springboot.service.metrics.UserMetricsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.LocalDate;
import java.time.Period;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class AIRecommendationService {

    private final UserMetricsService userMetricsService;
    private final UserRepository userRepository;
    private final UsersInfoRepository usersInfoRepository;
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${ai.python.base-url:http://localhost:8000}")
    private String pythonBaseUrl;

    /**
     * 사용자 프로필 기반 AI 추천 생성
     * 챗봇 답변 끝에 자연스럽게 추가될 추천 텍스트 생성
     */
    public Map<String, Object> generatePersonalizedRecommendation(Integer userId, String userQuery) {
        try {
            // 1. 사용자 프로필 분석
            UserProfile profile = analyzeUserProfile(userId);

            // 2. LLM 프롬프트 생성 (나이대별 맞춤)
            String prompt = buildPromptForAge(profile, userQuery);

            // 3. Python LLM API 호출
            Map<String, Object> recommendation = callLLMAPI(prompt);

            // 4. 추천 결과 포맷팅
            return formatRecommendation(recommendation, profile);

        } catch (Exception e) {
            log.error("AI 추천 생성 실패", e);
            return getDefaultRecommendation();
        }
    }

    /**
     * 사용자 프로필 분석
     */
    private UserProfile analyzeUserProfile(Integer userId) {
        UserProfile profile = new UserProfile();

        // 사용자 기본 정보
        UserEntity user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // UsersInfoEntity에서 나이 정보 가져오기
        UsersInfoEntity userInfo = usersInfoRepository.findByUserEntityIdForeign_Id(userId);

        profile.setUserId(userId);
        profile.setAge(userInfo != null ? userInfo.getAge() : 30);
        profile.setAgeGroup(determineAgeGroup(profile.getAge()));

        // UserMetrics에서 행동 패턴 분석
        profile.setRecentSearches(userMetricsService.getUserRecentSearches(userId, 5));
        profile.setProductPreferences(userMetricsService.getUserProductPreferences(userId));

        Map<String, Object> metricsSummary = userMetricsService.getUserMetricsSummary(userId);
        profile.setEngagementLevel(determineEngagementLevel(metricsSummary));

        return profile;
    }

    /**
     * 나이대별 맞춤 프롬프트 생성
     */
    private String buildPromptForAge(UserProfile profile, String userQuery) {
        StringBuilder prompt = new StringBuilder();

        // 사용자 컨텍스트
        prompt.append(String.format("사용자 정보:\n"));
        prompt.append(String.format("- 나이: %d세 (%s)\n", profile.getAge(), profile.getAgeGroup()));
        prompt.append(String.format("- 활동 수준: %s\n", profile.getEngagementLevel()));

        if (!profile.getRecentSearches().isEmpty()) {
            prompt.append(String.format("- 최근 검색: %s\n", String.join(", ", profile.getRecentSearches())));
        }

        if (!profile.getProductPreferences().isEmpty()) {
            String topCategory = profile.getProductPreferences().entrySet().stream()
                    .max(Map.Entry.comparingByValue())
                    .map(Map.Entry::getKey)
                    .orElse("없음");
            prompt.append(String.format("- 관심 제품: %s\n", topCategory));
        }

        prompt.append("\n");

        // 나이대별 맞춤 지침
        switch (profile.getAgeGroup()) {
            case "20대":
                prompt.append("이 사용자는 20대로 탈모 **예방**에 중점을 두어야 합니다.\n");
                prompt.append("가벼운 케어 루틴과 생활습관 개선을 추천하세요.\n");
                break;

            case "30대":
                prompt.append("이 사용자는 30대로 탈모 초기 증상이 나타날 수 있는 시기입니다.\n");
                prompt.append("적극적인 **개선과 관리**를 병행한 케어를 추천하세요.\n");
                break;

            case "40대":
                prompt.append("이 사용자는 40대로 탈모가 진행 중일 가능성이 높습니다.\n");
                prompt.append("효과 입증된 제품과 **집중 케어**를 추천하세요.\n");
                break;

            case "50대 이상":
                prompt.append("이 사용자는 50대 이상으로 현재 상태 **유지**에 중점을 두어야 합니다.\n");
                prompt.append("순한 제품과 지속 가능한 케어를 추천하세요.\n");
                break;
        }

        prompt.append("\n");
        prompt.append("사용자 질문: ").append(userQuery).append("\n\n");

        prompt.append("위 정보를 바탕으로, 다음 형식으로 **자연스럽고 짧은** 추천을 생성해주세요:\n");
        prompt.append("1. 맞춤 제품 1-2가지 (간단한 이유 포함)\n");
        prompt.append("2. 케어 팁 1가지\n");
        prompt.append("3. 생활습관 조언 1가지\n");
        prompt.append("\n답변은 친근하고 짧게 (3-4문장), 구체적인 제품명이나 브랜드는 언급하지 마세요.");

        return prompt.toString();
    }

    /**
     * Python LLM API 호출
     */
    private Map<String, Object> callLLMAPI(String prompt) {
        try {
            String url = pythonBaseUrl + "/api/ai/llm-recommendation";

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            Map<String, Object> requestBody = new HashMap<>();
            requestBody.put("prompt", prompt);

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            Map<String, Object> response = restTemplate.postForObject(url, entity, Map.class);

            if (response != null && response.containsKey("recommendation")) {
                return response;
            }

            return getDefaultRecommendation();

        } catch (Exception e) {
            log.error("LLM API 호출 실패: {}", e.getMessage());
            return getDefaultRecommendation();
        }
    }

    /**
     * 추천 결과 포맷팅
     */
    private Map<String, Object> formatRecommendation(Map<String, Object> llmResponse, UserProfile profile) {
        Map<String, Object> result = new HashMap<>();

        String recommendation = (String) llmResponse.getOrDefault("recommendation", "");

        result.put("hasRecommendation", true);
        result.put("recommendationText", recommendation);
        result.put("ageGroup", profile.getAgeGroup());
        result.put("icon", "✨"); // 추천 아이콘
        result.put("divider", "---"); // 구분선

        return result;
    }

    /**
     * 기본 추천 (LLM 실패 시)
     */
    private Map<String, Object> getDefaultRecommendation() {
        Map<String, Object> result = new HashMap<>();
        result.put("hasRecommendation", true);
        result.put("recommendationText", "두피 건강을 위해 꾸준한 관리가 중요합니다. " +
                "나이와 두피 상태에 맞는 제품을 선택하고, 규칙적인 생활습관을 유지하세요!");
        result.put("icon", "💡");
        result.put("divider", "---");
        return result;
    }

    // 유틸리티 메서드들
    private int calculateAge(String birthString) {
        if (birthString == null || birthString.isEmpty()) {
            return 30; // 기본값
        }
        try {
            LocalDate birth = LocalDate.parse(birthString);
            return Period.between(birth, LocalDate.now()).getYears();
        } catch (Exception e) {
            return 30;
        }
    }

    private String determineAgeGroup(int age) {
        if (age < 30) return "20대";
        else if (age < 40) return "30대";
        else if (age < 50) return "40대";
        else return "50대 이상";
    }

    private String determineEngagementLevel(Map<String, Object> summary) {
        long totalCount = (long) summary.getOrDefault("ragSearchCount", 0L) +
                (long) summary.getOrDefault("productClickCount", 0L) +
                (long) summary.getOrDefault("careMissionCount", 0L);

        if (totalCount > 20) return "매우 높음";
        else if (totalCount > 10) return "높음";
        else if (totalCount > 5) return "보통";
        else return "낮음";
    }

    // 내부 클래스: 사용자 프로필
    private static class UserProfile {
        private Integer userId;
        private int age;
        private String ageGroup;
        private List<String> recentSearches = new ArrayList<>();
        private Map<String, Long> productPreferences = new HashMap<>();
        private String engagementLevel;

        // Getters and Setters
        public Integer getUserId() { return userId; }
        public void setUserId(Integer userId) { this.userId = userId; }
        public int getAge() { return age; }
        public void setAge(int age) { this.age = age; }
        public String getAgeGroup() { return ageGroup; }
        public void setAgeGroup(String ageGroup) { this.ageGroup = ageGroup; }
        public List<String> getRecentSearches() { return recentSearches; }
        public void setRecentSearches(List<String> recentSearches) { this.recentSearches = recentSearches; }
        public Map<String, Long> getProductPreferences() { return productPreferences; }
        public void setProductPreferences(Map<String, Long> productPreferences) { this.productPreferences = productPreferences; }
        public String getEngagementLevel() { return engagementLevel; }
        public void setEngagementLevel(String engagementLevel) { this.engagementLevel = engagementLevel; }
    }
}
