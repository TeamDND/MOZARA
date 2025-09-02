package com.example.springboot.jwt;

import io.jsonwebtoken.ExpiredJwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

@RequiredArgsConstructor
public class JwtFilter extends OncePerRequestFilter {
    private final JwtUtil jwtUtil;

    public void doFilterInternal(
            HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException{
        String header = request.getHeader("Authorization");
        if (header == null || !header.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }
        String token = header.substring(7);

        try{
            jwtUtil.isExpired(token);
        }catch (ExpiredJwtException e){
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED,"Malformed JWT");
            return;
        }

        if(!"access".equals(jwtUtil.getCategory(token))){
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED,"token is invalid");
            return;
        }
        String username = this.jwtUtil.getUsername(token);
        String role = this.jwtUtil.getRole(token);
        List<GrantedAuthority> auths = List.of(new SimpleGrantedAuthority(role));
        Authentication auth = new UsernamePasswordAuthenticationToken(new User(username,"",auths), null, auths);
        SecurityContextHolder.getContext().setAuthentication(auth);
        filterChain.doFilter(request, response);
    }

}
