package com.example.springboot.controller;

import com.example.springboot.data.dto.SignUpDTO;
import com.example.springboot.data.dto.UserInfoDTO;
import com.example.springboot.service.UserService;
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
}
