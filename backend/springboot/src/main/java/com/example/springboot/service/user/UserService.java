package com.example.springboot.service.user;

import com.example.springboot.data.dao.UserDAO;
import com.example.springboot.data.dao.UsersInfoDAO;
import com.example.springboot.data.dto.user.SignUpDTO;
import com.example.springboot.data.dto.user.UserInfoDTO;
import com.example.springboot.data.dto.seedling.SeedlingStatusDTO;
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
    private final SeedlingService seedlingService;
    private final PasswordEncoder passwordEncoder;

    /**
     * 회원가입
     */
    public UserInfoDTO signUp(SignUpDTO signUpDTO) {
        // 입력 데이터 검증
        validateSignUpData(signUpDTO);

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

        // SeedlingService를 통해 새싹 생성
        SeedlingStatusDTO seedlingStatusDTO = seedlingService.createSeedling(savedUser, savedUserInfo.getNickname());

        // UserInfoDTO로 변환하여 반환 (password, role 제외)
        return UserInfoDTO.builder()
                .username(savedUser.getUsername())
                .email(savedUser.getEmail())
                .address(savedUser.getAddress())
                .nickname(savedUserInfo.getNickname())
                .gender(savedUserInfo.getGender())
                .age(savedUserInfo.getAge())
                .seedlingStatus(seedlingStatusDTO)
                .build();
    }

    /**
     * 사용자명 중복 확인
     */
    public boolean checkUsernameAvailability(String username) {
        return userDAO.findByUsername(username).isEmpty();
    }

    /**
     * 닉네임 중복 확인
     */
    public boolean checkNicknameAvailability(String nickname) {
        return usersInfoDAO.findByNickname(nickname) == null;
    }


    /**
     * 사용자명으로 사용자 정보 조회
     */
    public UserInfoDTO getUserInfo(String username) {
        UserEntity userEntity = userDAO.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        // UsersInfoEntity에서 추가 정보 조회
        UsersInfoEntity usersInfoEntity = usersInfoDAO.findByUserId(userEntity.getId());
        
        // SeedlingService를 통해 새싹 정보 조회
        SeedlingStatusDTO seedlingStatusDTO = seedlingService.getSeedlingByUserId(userEntity.getId());
        
        return UserInfoDTO.builder()
                .username(userEntity.getUsername())
                .email(userEntity.getEmail())
                .address(userEntity.getAddress())
                .nickname(usersInfoEntity != null ? usersInfoEntity.getNickname() : null)
                .gender(usersInfoEntity != null ? usersInfoEntity.getGender() : null)
                .age(usersInfoEntity != null ? usersInfoEntity.getAge() : null)
                .seedlingStatus(seedlingStatusDTO)
                .build();
    }

    /**
     * 회원가입 데이터 검증
     */
    private void validateSignUpData(SignUpDTO signUpDTO) {
        // 아이디 검증: 6-18자, 영문과 숫자만
        String username = signUpDTO.getUsername();
        if (username == null || username.trim().isEmpty()) {
            throw new RuntimeException("username을 다시 확인해주세요");
        }
        if (username.length() < 6 || username.length() > 18) {
            throw new RuntimeException("username을 다시 확인해주세요");
        }
        if (!username.matches("^[a-zA-Z0-9]+$")) {
            throw new RuntimeException("username을 다시 확인해주세요");
        }

        // 비밀번호 검증: 8자 이상
        String password = signUpDTO.getPassword();
        if (password == null || password.length() < 8) {
            throw new RuntimeException("password를 다시 확인해주세요");
        }

        // 닉네임 검증: 한글 8자, 영문 14자까지, 특수문자 금지
        String nickname = signUpDTO.getNickname();
        if (nickname == null || nickname.trim().isEmpty()) {
            throw new RuntimeException("nickname을 다시 확인해주세요");
        }
        if (nickname.contains(" ")) {
            throw new RuntimeException("nickname을 다시 확인해주세요");
        }
        if (!nickname.matches("^[가-힣a-zA-Z0-9]+$")) {
            throw new RuntimeException("nickname을 다시 확인해주세요");
        }

        // 닉네임 길이 검증
        long koreanCount = nickname.chars().filter(c -> c >= '가' && c <= '힣').count();
        long englishCount = nickname.chars().filter(c -> (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z')).count();
        if (koreanCount > 8 || englishCount > 14) {
            throw new RuntimeException("nickname을 다시 확인해주세요");
        }

        // 이메일 기본 검증
        String email = signUpDTO.getEmail();
        if (email == null || !email.matches("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) {
            throw new RuntimeException("email을 다시 확인해주세요");
        }

        // 나이 검증
        Integer age = signUpDTO.getAge();
        if (age == null || age < 1 || age > 120) {
            throw new RuntimeException("age를 다시 확인해주세요");
        }
    }

}
