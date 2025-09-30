package com.example.springboot.controller;

import com.example.springboot.jwt.JwtUtil;
import com.example.springboot.service.user.CustomOAuth2UserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/oauth2")
@RequiredArgsConstructor
@Slf4j
public class OAuth2Controller {

    private final JwtUtil jwtUtil;

    @GetMapping("/success")
    public void oauth2Success(HttpServletRequest request, HttpServletResponse response) throws IOException {
        log.info("=== OAuth2 Success 엔드포인트 호출됨 ===");
        log.info("Request URL: {}", request.getRequestURL());
        log.info("Request Parameters: {}", request.getQueryString());
        
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        log.info("Authentication 객체: {}", authentication);
        log.info("Authentication Principal: {}", authentication != null ? authentication.getPrincipal() : "null");
        
        if (authentication != null && authentication.getPrincipal() instanceof CustomOAuth2UserService.CustomOAuth2User) {
            CustomOAuth2UserService.CustomOAuth2User oauth2User = 
                (CustomOAuth2UserService.CustomOAuth2User) authentication.getPrincipal();
            
            // JWT 토큰 생성
            log.info("JWT 토큰 생성 시작 - 사용자: {}", oauth2User.getEmail());
            String accessToken = jwtUtil.createAccessToken(oauth2User.getEmail());
            String refreshToken = jwtUtil.createRefreshToken(oauth2User.getEmail());
            
            log.info("JWT 토큰 생성 완료 - AccessToken: {}, RefreshToken: {}", 
                    accessToken.substring(0, 20) + "...", refreshToken.substring(0, 20) + "...");
            log.info("OAuth2 로그인 성공 - 사용자: {}, 토큰 생성 완료", oauth2User.getEmail());
            
            // 프론트엔드로 리다이렉트 (토큰을 쿼리 파라미터로 전달)
            String redirectUrl = "https://hairfit.duckdns.org/oauth2/callback?access_token=" + accessToken + 
                               "&refresh_token=" + refreshToken + "&success=true";
            
            response.sendRedirect(redirectUrl);
        } else {
            log.error("=== OAuth2 인증 실패 ===");
            log.error("Authentication이 null이거나 CustomOAuth2User가 아님");
            log.error("Authentication: {}", authentication);
            if (authentication != null) {
                log.error("Principal 타입: {}", authentication.getPrincipal().getClass().getName());
            }
            response.sendRedirect("https://hairfit.duckdns.org/oauth2/callback?success=false&error=auth_failed");
        }
    }

    @GetMapping("/fail")
    public void oauth2Fail(HttpServletResponse response) throws IOException {
        log.error("OAuth2 로그인 실패");
        response.sendRedirect("https://hairfit.duckdns.org/oauth2/callback?success=false&error=login_failed");
    }

    @PostMapping("/token")
    public ResponseEntity<?> oauth2Token(@RequestBody Map<String, String> request) {
        log.info("=== OAuth2 토큰 생성 요청 ===");
        log.info("요청 데이터: {}", request);
        
        try {
            String code = request.get("code");
            String state = request.get("state");
            String scope = request.get("scope");
            
            log.info("OAuth2 파라미터 - Code: {}, State: {}, Scope: {}", code, state, scope);
            
            // Google OAuth2 인증 정보를 사용하여 사용자 정보 조회
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            log.info("현재 인증 상태: {}", authentication);
            
            if (authentication != null && authentication.getPrincipal() instanceof CustomOAuth2UserService.CustomOAuth2User) {
                CustomOAuth2UserService.CustomOAuth2User oauth2User = 
                    (CustomOAuth2UserService.CustomOAuth2User) authentication.getPrincipal();
                
                // JWT 토큰 생성
                String accessToken = jwtUtil.createAccessToken(oauth2User.getEmail());
                String refreshToken = jwtUtil.createRefreshToken(oauth2User.getEmail());
                
                log.info("JWT 토큰 생성 완료 - AccessToken: {}, RefreshToken: {}",
                        accessToken.substring(0, 20) + "...", refreshToken.substring(0, 20) + "...");
                
                // 사용자 정보 반환
                Map<String, Object> response = new HashMap<>();
                response.put("accessToken", accessToken);
                response.put("refreshToken", refreshToken);
                response.put("user", oauth2User.getUserEntity());
                response.put("success", true);
                
                log.info("OAuth2 토큰 생성 성공 - 사용자: {}", oauth2User.getEmail());
                
                return ResponseEntity.ok(response);
            } else {
                log.error("OAuth2 인증 정보를 찾을 수 없음");
                return ResponseEntity.status(401).body(Map.of("error", "인증 정보를 찾을 수 없습니다."));
            }
        } catch (Exception e) {
            log.error("OAuth2 토큰 생성 실패", e);
            return ResponseEntity.status(500).body(Map.of("error", "토큰 생성에 실패했습니다."));
        }
    }

    @GetMapping("/login/google")
    public ResponseEntity<Map<String, String>> googleLogin() {
        Map<String, String> response = new HashMap<>();
        response.put("loginUrl", "/oauth2/authorization/google");
        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout() {
        SecurityContextHolder.clearContext();
        
        Map<String, String> response = new HashMap<>();
        response.put("message", "로그아웃 성공");
        return ResponseEntity.ok(response);
    }
}
