package com.example.springboot.service.oauth2;

import com.example.springboot.data.entity.UserEntity;
import com.example.springboot.data.entity.UsersInfoEntity;
import com.example.springboot.data.repository.UserRepository;
import com.example.springboot.data.repository.UsersInfoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@Transactional
public class GoogleOAuth2UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private UsersInfoRepository usersInfoRepository;

    public UserEntity processGoogleOAuth2User(String email, String name, String picture) {
        // 이메일로 기존 사용자 찾기
        Optional<UserEntity> existingUser = userRepository.findByUsername(email);
        
        if (existingUser.isPresent()) {
            // 기존 사용자 업데이트
            UserEntity user = existingUser.get();
            updateGoogleUserInfo(user, name, picture);
            return user;
        } else {
            // 새 사용자 생성
            return createNewGoogleOAuth2User(email, name, picture);
        }
    }

    private UserEntity createNewGoogleOAuth2User(String email, String name, String picture) {
        // UserEntity 생성
        UserEntity user = new UserEntity();
        user.setUsername(email);
        user.setPassword(""); // OAuth2 사용자는 패스워드 없음
        user.setRole("USER");
        user.setCreatedat(java.time.Instant.now());
        user.setUpdatedat(java.time.Instant.now());
        
        UserEntity savedUser = userRepository.save(user);

        // UsersInfoEntity 생성
        UsersInfoEntity userInfo = new UsersInfoEntity();
        userInfo.setUserEntityIdForeign(savedUser);
        userInfo.setNickname(name != null ? name : "구글사용자");

        usersInfoRepository.save(userInfo);

        return savedUser;
    }

    private void updateGoogleUserInfo(UserEntity user, String name, String picture) {
        UsersInfoEntity userInfo = usersInfoRepository.findByUserEntityIdForeign_Id(user.getId());
        
        if (userInfo != null) {
            // 사용자 정보 업데이트 (프로필 이미지는 현재 스키마에 없음)
            usersInfoRepository.save(userInfo);
        } else {
            // UsersInfo가 없으면 생성
            UsersInfoEntity newUserInfo = new UsersInfoEntity();
            newUserInfo.setUserEntityIdForeign(user);
            newUserInfo.setNickname(name != null ? name : "구글사용자");
            
            usersInfoRepository.save(newUserInfo);
        }
        
        user.setUpdatedat(java.time.Instant.now());
        userRepository.save(user);
    }
}
