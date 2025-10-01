package com.example.springboot.service.user;

import com.example.springboot.data.dto.user.EmailAuthDTO;
import com.example.springboot.data.dto.user.EmailAuthRequestDTO;
import com.example.springboot.data.dto.user.EmailAuthResponseDTO;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class EmailAuthService {
    
    @Autowired
    private JavaMailSender mailSender;
    
    // 메모리에 인증 정보 저장 (실제 운영에서는 Redis 사용 권장)
    private final Map<String, EmailAuthDTO> authStorage = new ConcurrentHashMap<>();
    
    private static final int AUTH_CODE_LENGTH = 6;
    private static final int AUTH_CODE_EXPIRE_MINUTES = 5;
    private static final int MAX_ATTEMPT_COUNT = 5;
    private static final int RESEND_COOLDOWN_SECONDS = 60;
    
    /**
     * 이메일 인증코드 발송
     */
    public EmailAuthResponseDTO sendAuthCode(String email) {
        // 이메일 형식 검증
        if (!isValidEmail(email)) {
            return new EmailAuthResponseDTO(false, "올바른 이메일 형식이 아닙니다.", 0);
        }
        
        // 기존 인증 정보 확인
        EmailAuthDTO existingAuth = authStorage.get(email);
        if (existingAuth != null) {
            // 재발송 쿨다운 체크
            LocalDateTime now = LocalDateTime.now();
            if (existingAuth.getCreatedAt().plusSeconds(RESEND_COOLDOWN_SECONDS).isAfter(now)) {
                long remainingSeconds = RESEND_COOLDOWN_SECONDS - 
                    java.time.Duration.between(existingAuth.getCreatedAt(), now).getSeconds();
                return new EmailAuthResponseDTO(false, 
                    "재발송은 " + remainingSeconds + "초 후에 가능합니다.", (int) remainingSeconds);
            }
        }
        
        // 인증코드 생성
        String authCode = generateAuthCode();
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime expiresAt = now.plusMinutes(AUTH_CODE_EXPIRE_MINUTES);
        
        // 인증 정보 저장
        EmailAuthDTO authInfo = new EmailAuthDTO(email, authCode, now, expiresAt, false, 0);
        authStorage.put(email, authInfo);
        
        // 이메일 발송
        try {
            sendEmail(email, authCode);
            return new EmailAuthResponseDTO(true, "인증코드가 발송되었습니다.", AUTH_CODE_EXPIRE_MINUTES * 60);
        } catch (Exception e) {
            // 테스트용: 이메일 발송 실패해도 인증코드는 콘솔에 출력하고 성공으로 처리
            System.out.println("=== 이메일 발송 실패, 테스트용 인증코드 ===");
            System.out.println("이메일: " + email);
            System.out.println("인증코드: " + authCode);
            System.out.println("오류: " + e.getMessage());
            System.out.println("=====================================");
            return new EmailAuthResponseDTO(true, "테스트용 인증코드가 콘솔에 출력되었습니다.", AUTH_CODE_EXPIRE_MINUTES * 60);
        }
    }
    
    /**
     * 인증코드 검증
     */
    public EmailAuthResponseDTO verifyAuthCode(EmailAuthRequestDTO request) {
        String email = request.getEmail();
        String inputCode = request.getAuthCode();
        
        EmailAuthDTO authInfo = authStorage.get(email);
        if (authInfo == null) {
            return new EmailAuthResponseDTO(false, "인증코드를 먼저 발송해주세요.", 0);
        }
        
        // 만료시간 체크
        if (LocalDateTime.now().isAfter(authInfo.getExpiresAt())) {
            authStorage.remove(email);
            return new EmailAuthResponseDTO(false, "인증코드가 만료되었습니다.", 0);
        }
        
        // 시도 횟수 체크
        if (authInfo.getAttemptCount() >= MAX_ATTEMPT_COUNT) {
            authStorage.remove(email);
            return new EmailAuthResponseDTO(false, "인증 시도 횟수를 초과했습니다.", 0);
        }
        
        // 인증코드 검증
        if (authInfo.getAuthCode().equals(inputCode)) {
            authInfo.setVerified(true);
            return new EmailAuthResponseDTO(true, "이메일 인증이 완료되었습니다.", 0);
        } else {
            // 시도 횟수 증가
            authInfo.setAttemptCount(authInfo.getAttemptCount() + 1);
            int remainingAttempts = MAX_ATTEMPT_COUNT - authInfo.getAttemptCount();
            return new EmailAuthResponseDTO(false, 
                "인증코드가 일치하지 않습니다. 남은 시도 횟수: " + remainingAttempts, 0);
        }
    }
    
    /**
     * 인증 상태 확인
     */
    public boolean isEmailVerified(String email) {
        EmailAuthDTO authInfo = authStorage.get(email);
        return authInfo != null && authInfo.isVerified() && 
               LocalDateTime.now().isBefore(authInfo.getExpiresAt());
    }
    
    /**
     * 인증 정보 삭제
     */
    public void clearAuthInfo(String email) {
        authStorage.remove(email);
    }
    
    /**
     * 인증코드 생성
     */
    private String generateAuthCode() {
        Random random = new Random();
        StringBuilder code = new StringBuilder();
        for (int i = 0; i < AUTH_CODE_LENGTH; i++) {
            code.append(random.nextInt(10));
        }
        return code.toString();
    }
    
    /**
     * 이메일 발송
     */
    private void sendEmail(String email, String authCode) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(email);
            message.setSubject("[HairFit] 이메일 인증코드");
            message.setText("안녕하세요! HairFit입니다.\n\n" +
                           "이메일 인증코드: " + authCode + "\n\n" +
                           "이 코드는 5분 후 만료됩니다.\n" +
                           "인증코드를 입력하여 이메일 인증을 완료해주세요.\n\n" +
                           "감사합니다.\n" +
                           "HairFit 팀");
            
            mailSender.send(message);
            System.out.println("이메일 발송 성공: " + email + " - 인증코드: " + authCode);
        } catch (Exception e) {
            System.err.println("이메일 발송 실패: " + e.getMessage());
            // 테스트용: 콘솔에 인증코드 출력
            System.out.println("=== 테스트용 인증코드 ===");
            System.out.println("이메일: " + email);
            System.out.println("인증코드: " + authCode);
            System.out.println("========================");
            throw e;
        }
    }
    
    /**
     * 이메일 형식 검증
     */
    private boolean isValidEmail(String email) {
        return email != null && email.matches("^[A-Za-z0-9+_.-]+@([A-Za-z0-9.-]+\\.[A-Za-z]{2,})$");
    }
}
