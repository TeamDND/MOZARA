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
        user.setCreatedAt(LocalDateTime.now());
        user.setUpdatedAt(LocalDateTime.now());
        
        UserEntity savedUser = userRepository.save(user);

        // UsersInfoEntity 생성
        UsersInfoEntity userInfo = new UsersInfoEntity();
        userInfo.setUserId(savedUser.getUserId());
        userInfo.setNickname(name != null ? name : "구글사용자");
        userInfo.setProfileImage(picture);
        userInfo.setOauthProvider("GOOGLE");
        userInfo.setOauthId(email);
        userInfo.setCreatedAt(LocalDateTime.now());
        userInfo.setUpdatedAt(LocalDateTime.now());
        
        usersInfoRepository.save(userInfo);

        return savedUser;
    }

    private void updateGoogleUserInfo(UserEntity user, String name, String picture) {
        Optional<UsersInfoEntity> userInfoOpt = usersInfoRepository.findByUserId(user.getUserId());
        
        if (userInfoOpt.isPresent()) {
            UsersInfoEntity userInfo = userInfoOpt.get();
            
            // 프로필 이미지가 변경되었으면 업데이트
            if (picture != null && !picture.equals(userInfo.getProfileImage())) {
                userInfo.setProfileImage(picture);
                userInfo.setUpdatedAt(LocalDateTime.now());
                usersInfoRepository.save(userInfo);
            }
        } else {
            // UsersInfo가 없으면 생성
            UsersInfoEntity userInfo = new UsersInfoEntity();
            userInfo.setUserId(user.getUserId());
            userInfo.setNickname(name != null ? name : "구글사용자");
            userInfo.setProfileImage(picture);
            userInfo.setOauthProvider("GOOGLE");
            userInfo.setOauthId(user.getUsername());
            userInfo.setCreatedAt(LocalDateTime.now());
            userInfo.setUpdatedAt(LocalDateTime.now());
            
            usersInfoRepository.save(userInfo);
        }
        
        user.setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
    }
}
