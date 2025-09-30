package com.example.springboot.controller.user;

import com.example.springboot.data.dto.user.EmailAuthRequestDTO;
import com.example.springboot.data.dto.user.EmailAuthResponseDTO;
import com.example.springboot.service.user.EmailAuthService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/email-auth")
@CrossOrigin(origins = "*")
public class EmailAuthController {
    
    @Autowired
    private EmailAuthService emailAuthService;
    
    @Value("${spring.mail.username:}")
    private String emailUsername;
    
    @Value("${spring.mail.password:}")
    private String emailPassword;
    
    /**
     * 이메일 인증코드 발송
     */
    @PostMapping("/send")
    public ResponseEntity<EmailAuthResponseDTO> sendAuthCode(@RequestBody EmailAuthRequestDTO request) {
        EmailAuthResponseDTO response = emailAuthService.sendAuthCode(request.getEmail());
        return ResponseEntity.ok(response);
    }
    
    /**
     * 인증코드 검증
     */
    @PostMapping("/verify")
    public ResponseEntity<EmailAuthResponseDTO> verifyAuthCode(@RequestBody EmailAuthRequestDTO request) {
        EmailAuthResponseDTO response = emailAuthService.verifyAuthCode(request);
        return ResponseEntity.ok(response);
    }
    
    /**
     * 인증 상태 확인
     */
    @GetMapping("/status/{email}")
    public ResponseEntity<EmailAuthResponseDTO> checkAuthStatus(@PathVariable String email) {
        boolean isVerified = emailAuthService.isEmailVerified(email);
        EmailAuthResponseDTO response = new EmailAuthResponseDTO(
            isVerified, 
            isVerified ? "인증 완료" : "인증 필요", 
            0
        );
        return ResponseEntity.ok(response);
    }
    
    /**
     * 인증 정보 삭제 (테스트용)
     */
    @DeleteMapping("/clear/{email}")
    public ResponseEntity<EmailAuthResponseDTO> clearAuthInfo(@PathVariable String email) {
        emailAuthService.clearAuthInfo(email);
        EmailAuthResponseDTO response = new EmailAuthResponseDTO(true, "인증 정보가 삭제되었습니다.", 0);
        return ResponseEntity.ok(response);
    }
    
    /**
     * 환경변수 확인 (테스트용)
     */
    @GetMapping("/test-env")
    public ResponseEntity<String> testEnv() {
        String result = "EMAIL_USERNAME: " + emailUsername + "\n" +
                       "EMAIL_PASSWORD: " + (emailPassword.isEmpty() ? "비어있음" : "설정됨");
        return ResponseEntity.ok(result);
    }
}
