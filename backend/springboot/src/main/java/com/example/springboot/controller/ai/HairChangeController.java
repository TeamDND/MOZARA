package com.example.springboot.controller.ai;

import com.example.springboot.service.HairChangeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/ai/hair-change")
@CrossOrigin(origins = "*")
public class HairChangeController {

    @Autowired
    private HairChangeService hairChangeService;

    @PostMapping(value = "/generate", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> generateHairstyle(
            @RequestParam("image") MultipartFile image,
            @RequestParam("hairstyle") String hairstyle,
            @RequestParam(value = "customPrompt", required = false) String customPrompt) {
        
        try {
            if (image.isEmpty() || hairstyle == null || hairstyle.trim().isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(Map.of("error", "이미지와 헤어스타일을 모두 선택해주세요"));
            }

            Map<String, Object> result = hairChangeService.generateHairstyle(image, hairstyle, customPrompt);
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "오류가 발생했습니다: " + e.getMessage()));
        }
    }

    @GetMapping("/hairstyles")
    public ResponseEntity<Map<String, String>> getHairstyles() {
        try {
            Map<String, String> hairstyles = hairChangeService.getHairstyles();
            return ResponseEntity.ok(hairstyles);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "헤어스타일 목록을 가져오는데 실패했습니다: " + e.getMessage()));
        }
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, String>> healthCheck() {
        return ResponseEntity.ok(Map.of(
            "status", "healthy",
            "service", "hair-change-controller"
        ));
    }
}
