package com.example.springboot.oauth2.google;

import com.example.springboot.jwt.JwtUtil;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/oauth2/google")
@CrossOrigin(origins = "*")
public class GoogleOAuth2Controller {

    @Autowired
    private JwtUtil jwtUtil;

    @GetMapping("/success")
    public ResponseEntity<?> googleOAuth2Success(@AuthenticationPrincipal OAuth2User principal, HttpServletResponse response) {
        try {
            if (principal == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("error", "Google OAuth2 인증 실패"));
            }

            // Google OAuth2 사용자 정보 처리
            String email = principal.getAttribute("email");
            String name = principal.getAttribute("name");
            String picture = principal.getAttribute("picture");

            // JWT 토큰 생성 (이메일을 username으로 사용)
            String accessToken = jwtUtil.createAccessToken(email);
            String refreshToken = jwtUtil.createRefreshToken(email);

            // 응답 헤더에 토큰 설정
            response.setHeader("Authorization", "Bearer " + accessToken);
            response.setHeader("Refresh-Token", refreshToken);

            Map<String, Object> responseData = new HashMap<>();
            responseData.put("message", "Google OAuth2 로그인 성공");
            responseData.put("provider", "google");
            responseData.put("user", Map.of(
                "username", email,
                "email", email,
                "name", name,
                "picture", picture != null ? picture : ""
            ));
            responseData.put("accessToken", accessToken);
            responseData.put("refreshToken", refreshToken);

            return ResponseEntity.ok(responseData);

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", "Google OAuth2 처리 중 오류 발생: " + e.getMessage()));
        }
    }

    @GetMapping("/failure")
    public ResponseEntity<?> googleOAuth2Failure() {
        Map<String, String> response = new HashMap<>();
        response.put("error", "Google OAuth2 로그인 실패");
        response.put("message", "구글 로그인에 실패했습니다. 다시 시도해주세요.");
        response.put("provider", "google");
        
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(response);
    }

    @GetMapping("/login")
    public ResponseEntity<?> googleOAuth2Login() {
        Map<String, String> response = new HashMap<>();
        response.put("message", "구글 로그인 페이지로 리다이렉트");
        response.put("url", "/oauth2/authorization/google");
        response.put("provider", "google");
        
        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<?> googleOAuth2Logout() {
        Map<String, String> response = new HashMap<>();
        response.put("message", "구글 로그아웃 성공");
        response.put("provider", "google");
        
        return ResponseEntity.ok(response);
    }
}
