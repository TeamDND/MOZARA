package com.example.springboot.jwt;

import io.jsonwebtoken.Jwts;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Component
public class JwtUtil {
    private SecretKey secretKey;

    public JwtUtil(@Value("${jwt.secret.key}") String secretKey) {
        this.secretKey = new SecretKeySpec(secretKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    }

    public String createToken(String category, String username, String role, Long expiredMs) {
        return Jwts.builder()
                .claim("category", category)
                .claim("username", username)
                .claim("role", role)
                .issuedAt(new Date(System.currentTimeMillis()))
                .expiration(new Date(System.currentTimeMillis() + expiredMs))
                .signWith(secretKey)
                .compact();
    }

    public String getUserName(String token) {
        return Jwts.parser().verifyWith(this.secretKey).build().parseSignedClaims(token).getPayload().get("username").toString();
    }

    public String getRole(String token) {
        return Jwts.parser().verifyWith(this.secretKey).build().parseSignedClaims(token).getPayload().get("role").toString();
    }

    public String getCategory(String token) {
        return Jwts.parser().verifyWith(this.secretKey).build().parseSignedClaims(token).getPayload().get("category",String.class);
    }

    public boolean isExpired(String token) {
        return Jwts.parser().verifyWith(this.secretKey).build().parseSignedClaims(token).getPayload().getExpiration().before(new Date());
    }

    // Access Token 생성 (15분)
    public String createAccessToken(String username) {
        return createToken("access", username, "ROLE_USER", 15 * 60 * 1000L);
    }

    // Refresh Token 생성 (7일)
    public String createRefreshToken(String username) {
        return createToken("refresh", username, "ROLE_USER", 7 * 24 * 60 * 60 * 1000L);
    }
}