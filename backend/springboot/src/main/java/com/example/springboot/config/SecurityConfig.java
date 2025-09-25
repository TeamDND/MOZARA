package com.example.springboot.config;

import com.example.springboot.component.CustomAccessDeniedHandler;
import com.example.springboot.component.CustomAuthEntryPoint;
import com.example.springboot.jwt.JwtFilter;
import com.example.springboot.jwt.JwtLoginFilter;
import com.example.springboot.jwt.JwtUtil;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;

import java.util.List;

@Configuration
@EnableWebSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final AuthenticationConfiguration authenticationConfiguration;
    private final CustomAuthEntryPoint customAuthEntryPoint;
    private final CustomAccessDeniedHandler customAccessDeniedHandler;
    private final JwtUtil jwtUtil;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable())
                .logout(logout -> logout.disable())

                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/",
                                "/uploads/**", // 이미지 경로 허용
                                "/api/join",
                                "/api/login",
                                "/api/reissue",
                                "/api/naver",
                                "/api/kakao",
                                "/api/google",
                                "/api/oauth2/**", // OAuth2 관련 엔드포인트 허용
                                "/login/oauth2/**", // OAuth2 로그인 리다이렉트 허용
                                "/oauth2/authorization/**", // OAuth2 인증 허용
                                "/api/login/oauth2/code/*",
                                "/oauth2/success",
                                "/oauth2/fail",
                                "/api/naver/local/**", // 네이버 로컬 검색 API 허용
                                "/api/kakao/local/**", // 카카오 로컬 검색 API 허용
                                "/api/config", // 설정 API 허용
                                "/api/**"
                        ).permitAll()
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/user/**").hasAnyRole("USER","ADMIN")
                        .anyRequest().authenticated()
                )

                .cors(cors -> cors.configurationSource(request -> {
                    CorsConfiguration corsConfiguration = new CorsConfiguration();
                    corsConfiguration.setAllowCredentials(true);
                    corsConfiguration.addAllowedHeader("*");
                    corsConfiguration.setExposedHeaders(List.of("Authorization"));
                    corsConfiguration.addAllowedOrigin("http://localhost:3000");
                    corsConfiguration.addAllowedOrigin("http://15.165.239.48");
                    corsConfiguration.addAllowedOrigin("https://mozaracare.duckdns.org");
                    corsConfiguration.addAllowedOrigin("http://mozaracare.duckdns.org");
                    corsConfiguration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
                    return corsConfiguration;
                }))



                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))


                .addFilterBefore(new JwtFilter(jwtUtil), JwtLoginFilter.class)
                .addFilterAt(new JwtLoginFilter(authenticationManager(authenticationConfiguration), jwtUtil),
                        UsernamePasswordAuthenticationFilter.class)

                .exceptionHandling(ex -> {
                    ex.authenticationEntryPoint(customAuthEntryPoint);
                    ex.accessDeniedHandler(customAccessDeniedHandler);
                })
        ;

        return http.build();
    }
}