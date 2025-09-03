package com.example.springboot.jwt;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationServiceException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import java.io.IOException;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

public class JwtLoginFilter extends UsernamePasswordAuthenticationFilter {
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;

    public JwtLoginFilter(AuthenticationManager authenticationManager, JwtUtil jwtUtil) {
        this.authenticationManager = authenticationManager;
        this.jwtUtil = jwtUtil;
        this.setFilterProcessesUrl("/api/login");
    }

    @Override
    public Authentication attemptAuthentication(HttpServletRequest request, HttpServletResponse response)
            throws AuthenticationException {
        String username;
        String password;

        if (request.getContentType() != null && request.getContentType().contains("application/json")) {
            try {
                ObjectMapper objectMapper = new ObjectMapper();
                Map<String, String> loginRequest = objectMapper.readValue(request.getInputStream(), Map.class);
                username = loginRequest.get("username");
                password = loginRequest.get("password");
            } catch (IOException e) {
                throw new AuthenticationServiceException("Error parsing login request JSON", e);
            }
        } else {
            username = obtainUsername(request);
            password = obtainPassword(request);
        }

        UsernamePasswordAuthenticationToken authRequest = new UsernamePasswordAuthenticationToken(username, password);
        return authenticationManager.authenticate(authRequest);
    }

    @Override
    public void successfulAuthentication(HttpServletRequest request, HttpServletResponse response, FilterChain chain,
                                         Authentication authResult) throws IOException, ServletException {
        UserDetails userDetails = (UserDetails) authResult.getPrincipal();
        String username = userDetails.getUsername();

        // 권한 컬렉션이 비어있지 않은지 확인 후 첫 번째 권한을 안전하게 가져옵니다.
        String role = userDetails.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .findFirst()
                .orElse("ROLE_UNSPECIFIED"); // 권한이 없을 경우 기본값

        Map<String, Object> responseData = new HashMap<>();
        responseData.put("role", role);
        responseData.put("result", "로그인 성공");

        ObjectMapper mapper = new ObjectMapper();
        String json = mapper.writeValueAsString(responseData);

        String access_token = this.jwtUtil.createToken("access", username, role, 60 * 60 * 1000L);
        String refresh_token = this.jwtUtil.createToken("refresh", username, role, 60 * 60 * 24 * 1000L);
        response.addHeader("Authorization", "Bearer " + access_token);
        response.addCookie(this.createCookie("refresh", refresh_token));

        response.setCharacterEncoding("UTF-8");
        response.setContentType("application/json");
        response.setStatus(HttpServletResponse.SC_OK);
        response.getWriter().write(json);
    }

    @Override
    public void unsuccessfulAuthentication(HttpServletRequest request, HttpServletResponse response, AuthenticationException failed) throws IOException {
        Map<String, Object> responseData = new HashMap<>();
        responseData.put("error", "로그인 실패");

        ObjectMapper objectMapper = new ObjectMapper();
        String jsonmessage = objectMapper.writeValueAsString(responseData);

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.getWriter().write(jsonmessage);
    }

    private Cookie createCookie(String key, String value) {
        Cookie cookie = new Cookie(key, value);
        cookie.setPath("/");
        cookie.setHttpOnly(true);
        cookie.setMaxAge(60 * 60 * 24);
        return cookie;
    }
}
