package com.example.springboot.controller.user;

import com.example.springboot.data.dto.user.SignUpDTO;
import com.example.springboot.data.dto.user.UserInfoDTO;
import com.example.springboot.data.dto.user.UserAdditionalInfoDTO;
import com.example.springboot.data.dto.user.UserBasicInfoDTO;
import com.example.springboot.service.user.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class UserController {

    private final UserService userService;

    /**
     * 회원가입
     */
    @PostMapping("/signup")
    public ResponseEntity<?> signUp(@RequestBody SignUpDTO signUpDTO) {
        try {
            UserInfoDTO userInfo = userService.signUp(signUpDTO);
            return ResponseEntity.ok(userInfo);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body("{\"error\": \"" + e.getMessage() + "\"}");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("{\"error\": \"회원가입 중 오류가 발생했습니다.\"}");
        }
    }

    /**
     * 사용자명 중복 확인
     */
    @GetMapping("/check-username/{username}")
    public ResponseEntity<?> checkUsername(@PathVariable String username) {
        try {
            boolean isAvailable = userService.checkUsernameAvailability(username);
            return ResponseEntity.ok("{\"available\": " + isAvailable + "}");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("{\"error\": \"사용자명 확인 중 오류가 발생했습니다.\"}");
        }
    }

    /**
     * 닉네임 중복 확인
     */
    @GetMapping("/check-nickname/{nickname}")
    public ResponseEntity<?> checkNickname(@PathVariable String nickname) {
        try {
            boolean isAvailable = userService.checkNicknameAvailability(nickname);
            return ResponseEntity.ok("{\"available\": " + isAvailable + "}");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("{\"error\": \"닉네임 확인 중 오류가 발생했습니다.\"}");
        }
    }

    /**
     * 사용자 정보 조회
     */
    @GetMapping("/userinfo/{username}")
    public ResponseEntity<?> getUserInfo(@PathVariable String username) {
        try {
            UserInfoDTO userInfo = userService.getUserInfo(username);
            return ResponseEntity.ok(userInfo);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body("{\"error\": \"" + e.getMessage() + "\"}");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("{\"error\": \"사용자 정보 조회 중 오류가 발생했습니다.\"}");
        }
    }

    /**
     * 사용자 기본 정보 업데이트 (이메일, 닉네임)
     */
    @PutMapping("/userinfo/basic/{username}")
    public ResponseEntity<?> updateBasicUserInfo(@PathVariable String username, @RequestBody UserBasicInfoDTO userBasicInfoDTO) {
        try {
            UserInfoDTO updatedUserInfo = userService.updateBasicUserInfo(username, userBasicInfoDTO);
            return ResponseEntity.ok(updatedUserInfo);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body("{\"error\": \"" + e.getMessage() + "\"}");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("{\"error\": \"사용자 기본 정보 업데이트 중 오류가 발생했습니다.\"}");
        }
    }

    /**
     * 사용자 추가 정보 업데이트 (가족력, 탈모 여부, 스트레스)
     */
    @PutMapping("/userinfo/{username}")
    public ResponseEntity<?> updateUserInfo(@PathVariable String username, @RequestBody UserAdditionalInfoDTO userAdditionalInfoDTO) {
        try {
            UserInfoDTO updatedUserInfo = userService.updateUserInfo(username, userAdditionalInfoDTO);
            return ResponseEntity.ok(updatedUserInfo);
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body("{\"error\": \"" + e.getMessage() + "\"}");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("{\"error\": \"사용자 정보 업데이트 중 오류가 발생했습니다.\"}");
        }
    }

    /**
     * 비밀번호 변경
     */
    @PutMapping("/password/reset/{username}")
    public ResponseEntity<?> resetPassword(@PathVariable String username, @RequestParam String password) {
        try {
            userService.resetPassword(username, password);
            return ResponseEntity.ok("비밀번호가 변경되었습니다.");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest()
                    .body("{\"error\": \"" + e.getMessage() + "\"}");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("{\"error\": \"비밀번호 변경 중 오류가 발생했습니다.\"}");
        }
    }
}
