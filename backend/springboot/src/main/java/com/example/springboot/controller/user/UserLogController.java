package com.example.springboot.controller.user;

import com.example.springboot.data.dto.user.UserLogDTO;
import com.example.springboot.service.user.UserLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/userlog")
@RequiredArgsConstructor
public class UserLogController {

    private final UserLogService userLogService;

    // 유튜브 영상 좋아요 토글
    @PostMapping("/youtube/like")
    public ResponseEntity<UserLogDTO> toggleYoutubeLike(
            @RequestParam String username,
            @RequestParam String videoId) {
        try {
            UserLogDTO result = userLogService.toggleYoutubeLike(username, videoId);
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
}
