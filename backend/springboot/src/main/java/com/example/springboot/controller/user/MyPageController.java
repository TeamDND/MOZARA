package com.example.springboot.controller.user;

import com.example.springboot.data.dto.user.AnalysisResultDTO;
import com.example.springboot.service.user.MyPageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class MyPageController {

    private final MyPageService myPageService;

    /**
     * 사용자 분석 결과 개수 조회
     */
    @GetMapping("/analysis-count/{userId}")
    public ResponseEntity<?> getAnalysisCount(@PathVariable Integer userId) {
        try {
            long count = myPageService.getAnalysisCountByUserId(userId);
            return ResponseEntity.ok("{\"count\": " + count + "}");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body("{\"error\": \"" + e.getMessage() + "\"}");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("{\"error\": \"분석 결과 개수 조회 중 오류가 발생했습니다.\"}");
        }
    }

    /**
     * 사용자 분석 결과 리스트 조회 (정렬 옵션 포함)
     */
    @GetMapping("/analysis-results/{userId}")
    public ResponseEntity<?> getAnalysisResults(@PathVariable Integer userId, @RequestParam(value = "sort", defaultValue = "newest") String sortOrder) {
        try {
            List<AnalysisResultDTO> results = myPageService.getAnalysisResultsByUserId(userId, sortOrder);
            return ResponseEntity.ok(results);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body("{\"error\": \"" + e.getMessage() + "\"}");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("{\"error\": \"분석 결과 리스트 조회 중 오류가 발생했습니다.\"}");
        }
    }

    /**
     * 사용자명으로 분석 결과 리스트 조회
     */
    @GetMapping("/analysis-results/username/{username}")
    public ResponseEntity<?> getAnalysisResultsByUsername(@PathVariable String username) {
        try {
            List<AnalysisResultDTO> results = myPageService.getAnalysisResultsByUsername(username);
            return ResponseEntity.ok(results);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body("{\"error\": \"" + e.getMessage() + "\"}");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("{\"error\": \"분석 결과 리스트 조회 중 오류가 발생했습니다.\"}");
        }
    }

    /**
     * 분석 결과 ID로 개별 분석 결과 조회
     */
    @GetMapping("/analysis-result/{resultId}")
    public ResponseEntity<?> getAnalysisResultById(@PathVariable Integer resultId) {
        try {
            AnalysisResultDTO result = myPageService.getAnalysisResultById(resultId);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body("{\"error\": \"" + e.getMessage() + "\"}");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("{\"error\": \"분석 결과 조회 중 오류가 발생했습니다.\"}");
        }
    }

    /**
     * 사용자 ID와 분석 결과 ID로 개별 분석 결과 조회 (본인 것만 조회 가능)
     */
    @GetMapping("/analysis-result/{userId}/{resultId}")
    public ResponseEntity<?> getAnalysisResultByUserIdAndId(@PathVariable Integer userId, @PathVariable Integer resultId) {
        try {
            AnalysisResultDTO result = myPageService.getAnalysisResultByUserIdAndId(userId, resultId);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body("{\"error\": \"" + e.getMessage() + "\"}");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("{\"error\": \"분석 결과 조회 중 오류가 발생했습니다.\"}");
        }
    }

    /**
     * 사용자 ID와 분석 타입으로 분석 결과 존재 여부 확인
     */
    @GetMapping("/has-analysis/{userId}/{analysisType}")
    public ResponseEntity<?> hasAnalysisByType(@PathVariable Integer userId, @PathVariable String analysisType) {
        try {
            System.out.println("=== 분석 결과 존재 여부 확인 ===");
            System.out.println("userId: " + userId);
            System.out.println("analysisType: " + analysisType);
            
            boolean hasAnalysis = myPageService.hasAnalysisByType(userId, analysisType);
            
            System.out.println("hasAnalysis: " + hasAnalysis);
            
            Map<String, Object> response = Map.of("hasAnalysis", hasAnalysis);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.out.println("에러 발생: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "분석 결과 확인 중 오류가 발생했습니다."));
        }
    }

    /**
     * 사용자 ID와 분석 타입으로 분석 결과 리스트 조회 (정렬 옵션 포함)
     */
    @GetMapping("/analysis-results/{userId}/type/{analysisType}")
    public ResponseEntity<?> getAnalysisResultsByUserIdAndType(@PathVariable Integer userId, @PathVariable String analysisType, @RequestParam(value = "sort", defaultValue = "newest") String sortOrder) {
        try {
            List<AnalysisResultDTO> results = myPageService.getAnalysisResultsByUserIdAndType(userId, analysisType, sortOrder);
            return ResponseEntity.ok(results);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body("{\"error\": \"" + e.getMessage() + "\"}");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("{\"error\": \"분석 결과 리스트 조회 중 오류가 발생했습니다.\"}");
        }
    }

    /**
     * 사용자 ID와 분석 타입으로 분석 결과 개수 조회
     */
    @GetMapping("/analysis-count/{userId}/type/{analysisType}")
    public ResponseEntity<?> getAnalysisCountByUserIdAndType(@PathVariable Integer userId, @PathVariable String analysisType) {
        try {
            long count = myPageService.getAnalysisCountByUserIdAndType(userId, analysisType);
            return ResponseEntity.ok(Map.of("count", count));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body("{\"error\": \"" + e.getMessage() + "\"}");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("{\"error\": \"분석 결과 개수 조회 중 오류가 발생했습니다.\"}");
        }
    }

    /**
     * 오늘 날짜의 특정 분석 타입 결과 조회
     */
    @GetMapping("/today-analysis/{userId}/{analysisType}")
    public ResponseEntity<?> getTodayAnalysisByType(@PathVariable Integer userId, @PathVariable String analysisType) {
        try {
            AnalysisResultDTO result = myPageService.getTodayAnalysisByType(userId, analysisType);
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "오늘 날짜의 분석 결과 조회 중 오류가 발생했습니다."));
        }
    }

    /**
     * 이번주 일주일치 daily 분석 점수 조회 (일월화수목금토)
     */
    @GetMapping("/weekly-daily-analysis/{userId}")
    public ResponseEntity<?> getWeeklyDailyAnalysis(@PathVariable Integer userId) {
        try {
            Map<String, Object> result = myPageService.getWeeklyDailyAnalysis(userId);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "주간 분석 결과 조회 중 오류가 발생했습니다."));
        }
    }
}
