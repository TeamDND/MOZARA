package com.example.springboot.config;

import com.example.springboot.component.CustomAccessDeniedHandler;
import com.example.springboot.component.CustomAuthEntryPoint;
import com.example.springboot.jwt.JwtFilter;
import com.example.springboot.jwt.JwtLoginFilter;
import com.example.springboot.jwt.JwtUtil;
import com.example.springboot.service.user.CustomOAuth2UserService;
import com.example.springboot.data.repository.UserRepository;

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
    private final UserRepository userRepository;

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public CustomOAuth2UserService customOAuth2UserService() {
        return new CustomOAuth2UserService(userRepository, jwtUtil);
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable())
                .logout(logout -> logout.disable())

                .authorizeHttpRequests(auth -> auth
                        // 권한이 필요한 경로 먼저 설정 (순서 중요!)
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/user/**").hasAnyRole("USER","ADMIN")
                        // 인증 없이 접근 가능한 경로
                        .requestMatchers(
                                "/",
                                "/error", // 에러 페이지 허용
                                "/uploads/**", // 이미지 경로 허용
                                "/api/join",
                                "/api/signup",
                                "/api/login",
                                "/api/reissue",
                                "/api/check-username/**",
                                "/api/check-nickname/**",
                                "/api/email-auth/**", // 이메일 인증 API 허용
                                "/api/userinfo/**", // 로그인 후 사용자 정보 조회용
                                "/api/naver",
                                "/api/kakao",
                                "/api/google",
                                "/api/oauth2/**", // OAuth2 관련 엔드포인트 허용
                                "/login/oauth2/**", // OAuth2 로그인 리다이렉트 허용
                                "/oauth2/**", // 모든 OAuth2 경로 허용
                                "/oauth2/authorization/**", // OAuth2 인증 허용
                                "/api/login/oauth2/code/*",
                                "/oauth2/success",
                                "/oauth2/fail",
                                "/login/oauth2/code/**", // OAuth2 콜백 허용
                                "/api/naver/local/**", // 네이버 로컬 검색 API 허용
                                "/api/kakao/local/**", // 카카오 로컬 검색 API 허용
                                "/api/config", // 설정 API 허용
                                "/api/ai/**" // AI 관련 API 허용
                        ).permitAll()
                        .anyRequest().authenticated()
                )

                .cors(cors -> cors.configurationSource(request -> {
                    CorsConfiguration corsConfiguration = new CorsConfiguration();
                    corsConfiguration.setAllowCredentials(true);
                    corsConfiguration.addAllowedHeader("*");
                    corsConfiguration.setExposedHeaders(List.of("Authorization"));
                    corsConfiguration.addAllowedOrigin("http://localhost:3000");
                    corsConfiguration.addAllowedOrigin("http://15.165.239.48");
                    corsConfiguration.addAllowedOrigin("https://hairfit.duckdns.org");
                    corsConfiguration.addAllowedOrigin("http://hairfit.duckdns.org");
                    corsConfiguration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
                    return corsConfiguration;
                }))



                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))

                .oauth2Login(oauth2 -> oauth2
                        .loginPage("/oauth2/authorization/google")
                        .defaultSuccessUrl("/oauth2/success", true)
                        .failureUrl("/oauth2/fail")
                        .userInfoEndpoint(userInfo -> userInfo
                                .userService(customOAuth2UserService())
                        )
                )

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