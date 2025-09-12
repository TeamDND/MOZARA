package com.example.springboot.controller.ai;

import com.example.springboot.service.HairEncyclopediaService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/ai/encyclopedia")
@CrossOrigin(origins = "*")
public class HairEncyclopediaController {
    
    private final HairEncyclopediaService encyclopediaService;

    /**
     * Hair Encyclopedia 서비스 상태 및 논문 수 조회
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getStatus() {
        try {
            Map<String, Object> status = encyclopediaService.getServiceStatus();
            return ResponseEntity.ok(status);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "서비스 상태 조회 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }

    /**
     * 저장된 논문 수 조회
     */
    @GetMapping("/papers/count")
    public ResponseEntity<Map<String, Object>> getPapersCount() {
        try {
            Map<String, Object> count = encyclopediaService.getPapersCount();
            return ResponseEntity.ok(count);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "논문 수 조회 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }

    /**
     * 논문 검색
     */
    @PostMapping("/search")
    public ResponseEntity<List<Map<String, Object>>> searchPapers(@RequestBody Map<String, Object> searchQuery) {
        try {
            List<Map<String, Object>> papers = encyclopediaService.searchPapers(searchQuery);
            return ResponseEntity.ok(papers);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(List.of(Map.of("error", "논문 검색 중 오류가 발생했습니다: " + e.getMessage())));
        }
    }

    /**
     * 특정 논문 상세 정보 조회
     */
    @GetMapping("/paper/{paperId}")
    public ResponseEntity<Map<String, Object>> getPaperDetail(@PathVariable String paperId) {
        try {
            Map<String, Object> paper = encyclopediaService.getPaperDetail(paperId);
            return ResponseEntity.ok(paper);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "논문 상세 정보 조회 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }

    /**
     * 특정 논문 분석 결과 조회
     */
    @GetMapping("/paper/{paperId}/analysis")
    public ResponseEntity<Map<String, Object>> getPaperAnalysis(@PathVariable String paperId) {
        try {
            Map<String, Object> analysis = encyclopediaService.getPaperAnalysis(paperId);
            return ResponseEntity.ok(analysis);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "논문 분석 결과 조회 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }

    /**
     * 논문 Q&A 기능
     */
    @PostMapping("/qna")
    public ResponseEntity<Map<String, Object>> answerQuestion(@RequestBody Map<String, Object> qnaQuery) {
        try {
            Map<String, Object> answer = encyclopediaService.answerQuestion(qnaQuery);
            return ResponseEntity.ok(answer);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "질문 답변 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }

    /**
     * 수동 PubMed 논문 수집 트리거
     */
    @GetMapping("/pubmed/collect")
    public ResponseEntity<Map<String, Object>> triggerPubMedCollection() {
        try {
            Map<String, Object> result = encyclopediaService.triggerPubMedCollection();
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "PubMed 수집 트리거 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }

    /**
     * Pinecone 인덱스 초기화 (관리자 기능)
     */
    @DeleteMapping("/admin/clear-index")
    public ResponseEntity<Map<String, Object>> clearIndex() {
        try {
            Map<String, Object> result = encyclopediaService.clearPineconeIndex();
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "인덱스 초기화 중 오류가 발생했습니다: " + e.getMessage()));
        }
    }
}