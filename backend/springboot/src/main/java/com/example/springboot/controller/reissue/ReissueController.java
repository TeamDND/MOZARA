package com.example.springboot.controller.reissue;


import com.example.springboot.jwt.JwtUtil;
import io.jsonwebtoken.ExpiredJwtException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class ReissueController {
    private final JwtUtil jwtUtil;

    @PostMapping("/reissue")
    public ResponseEntity<String> reissue(
            HttpServletRequest request, HttpServletResponse response){
        String refreshToken = null;
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if (cookie.getName().equals("refresh")) {
                    refreshToken = cookie.getValue();
                    break;
                }
            }
        }
        if(refreshToken == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("refresh token is null");

        }
        try{
            this.jwtUtil.isExpired(refreshToken);
        }catch (ExpiredJwtException e){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("refresh token expired");
        }
        String category = this.jwtUtil.getCategory(refreshToken);
        if(!category.equals("refresh")){
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("refresh token invalid");
        }
        String username = this.jwtUtil.getUserName(refreshToken);
        String role  = this.jwtUtil.getRole(refreshToken);
        String access = this.jwtUtil.createToken("access",username,role,10*1000L);
        response.addHeader("Authorization", "Bearer " + access);
        return ResponseEntity.status(HttpStatus.OK).body("토큰 재발행 성공");
    }
    @DeleteMapping(value = "/logout")
    public ResponseEntity<String> logout(HttpServletRequest request, HttpServletResponse response) {
        System.out.println("로그아웃 요청 받음 - 쿠키 만료 처리 시작");
        
        Cookie cookie = new Cookie("refresh", null);
        cookie.setPath("/");
        cookie.setHttpOnly(true);
        cookie.setMaxAge(0);
        response.addCookie(cookie);
        
        System.out.println("Refresh Token 쿠키 만료 완료 (MaxAge: 0)");
        return ResponseEntity.status(HttpStatus.OK).body("Refresh token is expired. 로그아웃 성공");
    }
}
