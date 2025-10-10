package com.example.springboot.controller.user;

import com.example.springboot.data.dto.user.UserLogDTO;
import com.example.springboot.service.user.UserLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/userlog")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class UserLogController {

    private final UserLogService userLogService;

    // 유튜브 영상 좋아요 토글
    @PostMapping("/youtube/like")
    public ResponseEntity<UserLogDTO> toggleYoutubeLike(
            @RequestParam String username,
            @RequestParam String videoId,
            @RequestParam(required = false, defaultValue = "") String videoTitle) {
        try {
            UserLogDTO result = userLogService.toggleYoutubeLike(username, videoId, videoTitle);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // 사용자의 모든 좋아요 목록 조회
    @GetMapping("/likes/{username}")
    public ResponseEntity<UserLogDTO> getUserLikes(@PathVariable String username) {
        try {
            UserLogDTO result = userLogService.getUserLikes(username);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // 유튜브 좋아요 목록만 조회
    @GetMapping("/youtube/likes/{username}")
    public ResponseEntity<String> getYoutubeLikes(@PathVariable String username) {
        try {
            String result = userLogService.getYoutubeLikes(username);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // 병원 좋아요 토글
    @PostMapping("/hospital/like")
    public ResponseEntity<UserLogDTO> toggleHospitalLike(
            @RequestParam String username,
            @RequestParam String hospitalId) {
        try {
            UserLogDTO result = userLogService.toggleHospitalLike(username, hospitalId);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // 병원 좋아요 목록만 조회
    @GetMapping("/hospital/likes/{username}")
    public ResponseEntity<String> getHospitalLikes(@PathVariable String username) {
        try {
            String result = userLogService.getHospitalLikes(username);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // 제품 좋아요 토글
    @PostMapping("/product/like")
    public ResponseEntity<UserLogDTO> toggleProductLike(
            @RequestParam String username,
            @RequestParam String productId,
            @RequestParam(required = false, defaultValue = "") String productName) {
        try {
            UserLogDTO result = userLogService.toggleProductLike(username, productId, productName);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // 제품 좋아요 목록만 조회
    @GetMapping("/product/likes/{username}")
    public ResponseEntity<String> getProductLikes(@PathVariable String username) {
        try {
            String result = userLogService.getProductLikes(username);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // 지도 기반 서비스(탈모클리닉, 모발이식, 가발) 좋아요 토글
    @PostMapping("/map/like")
    public ResponseEntity<UserLogDTO> toggleMapLike(
            @RequestParam String username,
            @RequestParam String mapId) {
        try {
            UserLogDTO result = userLogService.toggleMapLike(username, mapId);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    // 지도 기반 좋아요 목록만 조회
    @GetMapping("/map/likes/{username}")
    public ResponseEntity<String> getMapLikes(@PathVariable String username) {
        try {
            String result = userLogService.getMapLikes(username);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
}
