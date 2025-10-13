package com.example.springboot.controller.image;

import com.example.springboot.component.FileStore;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/images")
public class ImageUploadController {

    private final FileStore fileStore;

    @Value("${cloud.aws.s3.bucket}")
    private String bucket;

    /**
     * 탈모 검사 이미지 업로드
     *
     * @param username 사용자 이름
     * @param viewType 뷰 타입 (top 또는 side)
     * @param image 업로드할 이미지 파일
     * @return 업로드된 이미지 URL
     */
    @PostMapping("/upload/hair-loss")
    public ResponseEntity<?> uploadHairLossImage(
            @RequestParam("username") String username,
            @RequestParam("viewType") String viewType,
            @RequestParam("image") MultipartFile image) {

        if (image.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "이미지 파일이 비어있습니다."));
        }

        // viewType 검증
        if (!viewType.equals("top") && !viewType.equals("side")) {
            return ResponseEntity.badRequest().body(Map.of("message", "viewType은 'top' 또는 'side'만 가능합니다."));
        }

        try {
            String folder = "hair-loss-analysis";
            String imageUrl = fileStore.storeHairLossImage(image, bucket, folder, username, viewType);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("imageUrl", imageUrl);
            response.put("viewType", viewType);

            return ResponseEntity.ok(response);
        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("success", false, "message", "이미지 업로드에 실패했습니다."));
        }
    }

    /**
     * 모발 검사 이미지 업로드
     *
     * @param username 사용자 이름
     * @param image 업로드할 이미지 파일
     * @return 업로드된 이미지 URL
     */
    @PostMapping("/upload/hair-damage")
    public ResponseEntity<?> uploadHairDamageImage(
            @RequestParam("username") String username,
            @RequestParam("image") MultipartFile image) {

        if (image.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "이미지 파일이 비어있습니다."));
        }

        try {
            String folder = "hair-damage-analysis";
            String imageUrl = fileStore.storeHairDamageImage(image, bucket, folder, username);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("imageUrl", imageUrl);

            return ResponseEntity.ok(response);
        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("success", false, "message", "이미지 업로드에 실패했습니다."));
        }
    }

    /**
     * S3 이미지 삭제
     *
     * @param imageUrl 삭제할 이미지 URL
     * @return 삭제 결과
     */
    @DeleteMapping("/delete")
    public ResponseEntity<?> deleteImage(@RequestParam("imageUrl") String imageUrl) {
        if (imageUrl == null || imageUrl.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("message", "이미지 URL이 필요합니다."));
        }

        try {
            fileStore.deleteFile(imageUrl, bucket);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "이미지가 삭제되었습니다."
            ));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.internalServerError()
                    .body(Map.of("success", false, "message", "이미지 삭제에 실패했습니다."));
        }
    }

    /**
     * 헬스 체크 엔드포인트
     */
    @GetMapping("/health")
    public ResponseEntity<?> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "fileStore", fileStore != null ? "AVAILABLE" : "NULL",
                "bucket", bucket
        ));
    }
}
