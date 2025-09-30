package com.example.springboot.service.user;

import com.example.springboot.data.entity.UserEntity;
import com.example.springboot.data.repository.UserRepository;
import com.example.springboot.jwt.JwtUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class CustomOAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        OAuth2User oAuth2User = super.loadUser(userRequest);
        
        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        log.info("OAuth2 로그인 시도: {}", registrationId);
        
        OAuth2UserInfo oAuth2UserInfo = null;
        
        if (registrationId.equals("google")) {
            oAuth2UserInfo = new GoogleUserInfo(oAuth2User.getAttributes());
        } else {
            log.error("지원하지 않는 OAuth2 제공자입니다: {}", registrationId);
            throw new OAuth2AuthenticationException("지원하지 않는 OAuth2 제공자입니다.");
        }
        
        String email = oAuth2UserInfo.getEmail();
        String name = oAuth2UserInfo.getName();
        
        log.info("OAuth2 사용자 정보 - Email: {}, Name: {}", email, name);
        
        // 기존 사용자 확인
        log.info("DB에서 사용자 조회 시작 - Email: {}", email);
        Optional<UserEntity> existingUser = userRepository.findByEmail(email);
        
        UserEntity user;
        if (existingUser.isPresent()) {
            user = existingUser.get();
            log.info("기존 사용자 로그인 성공 - ID: {}, Email: {}, Nickname: {}, Username: {}, Role: {}", 
                    user.getId(), user.getEmail(), user.getNickname(), user.getUsername(), user.getRole());
            
            // 기존 사용자 정보도 DB에서 재조회해서 확인
            Optional<UserEntity> dbUser = userRepository.findById(user.getId());
            if (dbUser.isPresent()) {
                log.info("기존 사용자 DB 조회 검증 성공 - 실제 DB에서 조회된 사용자: ID={}, Email={}, Nickname={}, Username={}, Role={}", 
                        dbUser.get().getId(), dbUser.get().getEmail(), dbUser.get().getNickname(), 
                        dbUser.get().getUsername(), dbUser.get().getRole());
            } else {
                log.error("기존 사용자 DB 조회 검증 실패 - 사용자를 찾을 수 없음: ID={}", user.getId());
            }
        } else {
            // 새 사용자 생성 (Google 이름을 nickname으로 사용)
            log.info("새 사용자 생성 시작 - Email: {}, Name: {}", email, name);
            
            user = UserEntity.builder()
                    .email(email)
                    .nickname(name)
                    .username(email) // email을 username으로도 사용
                    .role("ROLE_USER")
                    .build();
            
            log.info("사용자 엔티티 생성 완료 - Email: {}, Nickname: {}, Username: {}, Role: {}", 
                    user.getEmail(), user.getNickname(), user.getUsername(), user.getRole());
            
            user = userRepository.save(user);
            log.info("새 사용자 DB 저장 완료 - ID: {}, Email: {}, Nickname: {}", 
                    user.getId(), user.getEmail(), user.getNickname());
            
            // DB 저장 후 실제 조회해서 확인
            Optional<UserEntity> savedUser = userRepository.findById(user.getId());
            if (savedUser.isPresent()) {
                UserEntity dbUser = savedUser.get();
                log.info("DB 저장 검증 성공 - 실제 DB에서 조회된 사용자: ID={}, Email={}, Nickname={}, Username={}, Role={}", 
                        dbUser.getId(), dbUser.getEmail(), dbUser.getNickname(), dbUser.getUsername(), dbUser.getRole());
            } else {
                log.error("DB 저장 검증 실패 - 저장된 사용자를 찾을 수 없음: ID={}", user.getId());
            }
        }
        
        return new CustomOAuth2User(user, oAuth2User.getAttributes());
    }
    
    // OAuth2UserInfo 인터페이스

    public interface OAuth2UserInfo {
        String getProvider();
        String getProviderId();
        String getEmail();
        String getName();
    }
    
    // Google 사용자 정보 클래스
    public static class GoogleUserInfo implements OAuth2UserInfo {
        private Map<String, Object> attributes;
        
        public GoogleUserInfo(Map<String, Object> attributes) {
            this.attributes = attributes;
        }
        
        @Override
        public String getProvider() {
            return "google";
        }
        
        @Override
        public String getProviderId() {
            return (String) attributes.get("sub");
        }
        
        @Override
        public String getEmail() {
            return (String) attributes.get("email");
        }
        
        @Override
        public String getName() {
            return (String) attributes.get("name");
        }
    }
    
    // Custom OAuth2User 구현
    public static class CustomOAuth2User implements OAuth2User {
        private UserEntity user;
        private Map<String, Object> attributes;
        
        public CustomOAuth2User(UserEntity user, Map<String, Object> attributes) {
            this.user = user;
            this.attributes = attributes;
        }
        
        @Override
        public Map<String, Object> getAttributes() {
            return attributes;
        }
        
        @Override
        public java.util.Collection<? extends org.springframework.security.core.GrantedAuthority> getAuthorities() {
            return java.util.Collections.singletonList(
                new org.springframework.security.core.authority.SimpleGrantedAuthority(user.getRole())
            );
        }
        
        @Override
        public String getName() {
            return user.getNickname();
        }
        
        public UserEntity getUser() {
            return user;
        }
        
        public String getEmail() {
            return user.getEmail();
        }
        
        public UserEntity getUserEntity() {
            return user;
        }
    }
}
