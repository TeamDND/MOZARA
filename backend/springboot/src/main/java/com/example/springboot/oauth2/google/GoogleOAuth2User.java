package com.example.springboot.oauth2.google;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.core.user.OAuth2User;

import java.util.Collection;
import java.util.Collections;
import java.util.Map;

public class GoogleOAuth2User implements OAuth2User {
    
    private OAuth2User oauth2User;
    private String email;
    private String name;
    private String picture;
    private String provider = "GOOGLE";

    public GoogleOAuth2User(OAuth2User oauth2User) {
        this.oauth2User = oauth2User;
        this.email = oauth2User.getAttribute("email");
        this.name = oauth2User.getAttribute("name");
        this.picture = oauth2User.getAttribute("picture");
    }

    @Override
    public Map<String, Object> getAttributes() {
        return oauth2User.getAttributes();
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER"));
    }

    @Override
    public String getName() {
        return this.name != null ? this.name : oauth2User.getName();
    }

    public String getEmail() {
        return this.email;
    }

    public String getPicture() {
        return this.picture;
    }

    public String getUsername() {
        return this.email; // 이메일을 username으로 사용
    }

    public String getProvider() {
        return this.provider;
    }
}
