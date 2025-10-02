package com.example.springboot.controller;

import com.example.springboot.jwt.JwtUtil;
import com.example.springboot.service.user.CustomOAuth2UserService;
import com.example.springboot.data.entity.UserEntity;
import com.example.springboot.data.repository.UserRepository;
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
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import com.fasterxml.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api/oauth2")
@RequiredArgsConstructor
@Slf4j
public class OAuth2Controller {

    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

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
            
            // 실제 구글 사용자 정보 로그 출력
            log.info("=== OAuth2 Success에서 실제 사용자 정보 확인 ===");
            log.info("실제 Gmail: {}", oauth2User.getEmail());
            log.info("실제 Google 이름: {}", oauth2User.getName());
            log.info("실제 사용자 엔티티: {}", oauth2User.getUserEntity());
            
            // JWT 토큰 생성
            log.info("JWT 토큰 생성 시작 - 실제 Gmail: {}", oauth2User.getEmail());
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
            
            // Google OAuth2 인증 코드를 사용하여 사용자 정보 조회
            log.info("Google OAuth2 인증 코드로 사용자 정보 조회 시작");
            
            // Google OAuth2 인증 코드를 사용하여 실제 사용자 정보 가져오기
            // CustomOAuth2UserService를 통해 실제 Google 사용자 정보 처리
            log.info("CustomOAuth2UserService를 통해 실제 Google 사용자 정보 처리 시작");
            
            // Google OAuth2 인증 코드를 사용하여 실제 Google API에서 사용자 정보 가져오기
            // 실제로는 Google OAuth2 API를 호출해야 하지만, 현재는 CustomOAuth2UserService를 통해 처리
            // CustomOAuth2UserService에서 이미 처리된 사용자 정보를 가져와야 함
            
            // CustomOAuth2UserService에서 이미 처리된 실제 Google 사용자 정보 사용
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            log.info("현재 인증 상태: {}", authentication);
            
            UserEntity user;
            if (authentication != null && authentication.getPrincipal() instanceof CustomOAuth2UserService.CustomOAuth2User) {
                CustomOAuth2UserService.CustomOAuth2User oauth2User = 
                    (CustomOAuth2UserService.CustomOAuth2User) authentication.getPrincipal();
                
                user = oauth2User.getUserEntity();
                log.info("CustomOAuth2UserService에서 처리된 사용자 정보 사용 - ID: {}, Email: {}, Name: {}", 
                        user.getId(), user.getEmail(), user.getNickname());
            } else {
                log.error("CustomOAuth2UserService에서 사용자 정보를 찾을 수 없음");
                throw new RuntimeException("OAuth2 사용자 정보를 찾을 수 없습니다.");
            }
            
            // JWT 토큰 생성
            String accessToken = jwtUtil.createAccessToken(user.getEmail());
            String refreshToken = jwtUtil.createRefreshToken(user.getEmail());
            
            log.info("JWT 토큰 생성 완료 - AccessToken: {}, RefreshToken: {}",
                    accessToken.substring(0, 20) + "...", refreshToken.substring(0, 20) + "...");
            
            // CustomOAuth2UserService에서 처리된 실제 사용자 정보 사용
            log.info("=== OAuth2Controller에서 사용자 정보 응답 생성 ===");
            log.info("실제 DB 사용자 ID: {}", user.getId());
            log.info("실제 Gmail 주소: {}", user.getEmail());
            log.info("실제 사용자명 (Gmail): {}", user.getUsername());
            log.info("실제 닉네임 (Google 이름): {}", user.getNickname());
            log.info("실제 권한: {}", user.getRole());
            
            Map<String, Object> userInfo = new HashMap<>();
            userInfo.put("userId", user.getId()); // auto increment된 실제 userId
            userInfo.put("email", user.getEmail()); // 실제 Gmail
            userInfo.put("username", user.getUsername()); // 실제 Gmail (username으로도 사용)
            userInfo.put("nickname", user.getNickname()); // 실제 Google 이름
            userInfo.put("role", user.getRole());
            
            // 응답 데이터 생성
            Map<String, Object> response = new HashMap<>();
            response.put("accessToken", accessToken);
            response.put("refreshToken", refreshToken);
            response.put("user", userInfo);
            response.put("success", true);
            
            log.info("OAuth2 토큰 생성 성공 - 사용자: {}", user.getEmail());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            log.error("OAuth2 토큰 생성 실패", e);
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "토큰 생성에 실패했습니다.");
            return ResponseEntity.status(500).body(errorResponse);
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
