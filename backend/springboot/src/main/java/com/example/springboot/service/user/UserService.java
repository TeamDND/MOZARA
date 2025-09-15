package com.example.springboot.service.user;

import com.example.springboot.data.dao.UserDAO;
import com.example.springboot.data.dao.UsersInfoDAO;
import com.example.springboot.data.dto.user.SignUpDTO;
import com.example.springboot.data.dto.user.UserInfoDTO;
import com.example.springboot.data.entity.UserEntity;
import com.example.springboot.data.entity.UsersInfoEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class UserService {
    private final UserDAO userDAO;
    private final UsersInfoDAO usersInfoDAO;
    private final PasswordEncoder passwordEncoder;

    /**
     * 회원가입
     */
    public UserInfoDTO signUp(SignUpDTO signUpDTO) {
        // 중복 사용자명 체크
        if (userDAO.findByUsername(signUpDTO.getUsername()).isPresent()) {
            throw new RuntimeException("이미 존재하는 사용자명입니다.");
        }

        // 비밀번호 암호화
        String encodedPassword = passwordEncoder.encode(signUpDTO.getPassword());

        // UserEntity 생성 (기본 정보만)
        UserEntity userEntity = UserEntity.builder()
                .username(signUpDTO.getUsername())
                .password(encodedPassword)
                .email(signUpDTO.getEmail())
                .address(signUpDTO.getAddress())
                .role(signUpDTO.getRole() != null ? signUpDTO.getRole() : "ROLE_USER")
                .createdat(Instant.now())
                .build();

        // 사용자 저장
        UserEntity savedUser = userDAO.addUser(userEntity);

        // UsersInfoEntity 생성 및 저장
        UsersInfoEntity usersInfoEntity = UsersInfoEntity.builder()
                .gender(signUpDTO.getGender())
                .age(signUpDTO.getAge())
                .nickname(signUpDTO.getNickname())
                .userEntityIdForeign(savedUser)
                .build();
        
        UsersInfoEntity savedUserInfo = usersInfoDAO.addUserInfo(usersInfoEntity);

        // UserInfoDTO로 변환하여 반환 (password, role 제외)
        return UserInfoDTO.builder()
                .username(savedUser.getUsername())
                .email(savedUser.getEmail())
                .address(savedUser.getAddress())
                .nickname(savedUserInfo.getNickname())
                .gender(savedUserInfo.getGender())
                .age(savedUserInfo.getAge())
                .build();
    }

    /**
     * 사용자명으로 사용자 정보 조회
     */
    public UserInfoDTO getUserInfo(String username) {
        UserEntity userEntity = userDAO.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        // UsersInfoEntity에서 추가 정보 조회
        UsersInfoEntity usersInfoEntity = usersInfoDAO.findByUserId(userEntity.getId());
        
        return UserInfoDTO.builder()
                .username(userEntity.getUsername())
                .email(userEntity.getEmail())
                .address(userEntity.getAddress())
                .nickname(usersInfoEntity != null ? usersInfoEntity.getNickname() : null)
                .gender(usersInfoEntity != null ? usersInfoEntity.getGender() : null)
                .age(usersInfoEntity != null ? usersInfoEntity.getAge() : null)
                .build();
    }

}
