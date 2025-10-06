package com.example.springboot.service.user;

import com.example.springboot.data.dao.UserDAO;
import com.example.springboot.data.entity.UserEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CustomUserDetailService implements UserDetailsService {

    private final UserDAO userDAO;

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        // userDAO를 사용하여 데이터베이스에서 사용자 정보를 조회합니다.
        UserEntity user = userDAO.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("해당 사용자를 찾을 수 없습니다"));
        // --- 추가된 로그 코드 ---
        String userRole = user.getRole();
        System.out.println("User found. Role from database: " + userRole);
        // --- 추가된 로그 코드 ---
        
        // DB에서 가져온 사용자 정보로 UserDetails 객체를 생성하여 반환합니다.
        // Spring Security는 이 객체를 사용하여 인증을 진행합니다.
        // 비밀번호는 반드시 암호화된 상태여야 합니다.
        List<GrantedAuthority> grantedAuthorities = new ArrayList<>();
        
        // Role이 ROLE_ 접두사가 없으면 추가
        String role = user.getRole();
        if (role != null && !role.startsWith("ROLE_")) {
            role = "ROLE_" + role;
        }
        
        grantedAuthorities.add(new SimpleGrantedAuthority(role));
        return new User(user.getUsername(), user.getPassword(), grantedAuthorities);

    }
}
