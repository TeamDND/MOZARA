package com.example.springboot.controller.user;

import com.example.springboot.data.dto.seedling.SeedlingNicknameUpdateDTO;
import com.example.springboot.data.dto.seedling.SeedlingStatusDTO;
import com.example.springboot.data.dto.user.UserInfoDTO;
import com.example.springboot.service.user.SeedlingService;
import com.example.springboot.service.user.UserService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/user/seedling")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SeedlingController {

    private static final Logger log = LoggerFactory.getLogger(SeedlingController.class);

    private final SeedlingService seedlingService;
    private final UserService userService;


    /**
     * 내 새싹 정보 조회 (보안 강화)
     */
    @GetMapping("/my-seedling")
    public ResponseEntity<?> getMySeedlingInfo(@AuthenticationPrincipal UserDetails userDetails) {
        try {
            // 현재 로그인한 사용자의 username 가져오기
            String username = userDetails.getUsername();
            log.info("[Seedling] 현재 로그인한 사용자: {}", username);
            
            // 사용자 정보에서 userId 가져오기
            UserInfoDTO userInfo = userService.getUserInfo(username);
            Integer userId = userInfo.getUserId();
            log.info("[Seedling] 사용자 ID: {}", userId);
            
            // 새싹 정보 조회
            SeedlingStatusDTO seedlingInfo = seedlingService.getSeedlingByUserId(userId);
            if (seedlingInfo == null) {
                Map<String, Object> error = new HashMap<>();
                error.put("message", "새싹 정보를 찾을 수 없습니다.");
                error.put("reason", "seedling_not_found");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
            }
            
            // 새싹 이름이 null이거나 비어있으면 기본값 설정
            if (seedlingInfo.getSeedlingName() == null || seedlingInfo.getSeedlingName().trim().isEmpty()) {
                String currentNickname = userInfo.getNickname();
                seedlingInfo.setSeedlingName(currentNickname + "의 새싹");
                log.info("[Seedling] 새싹 이름 기본값 설정: {}", seedlingInfo.getSeedlingName());
            }
            
            return ResponseEntity.ok(seedlingInfo);
        } catch (Exception ex) {
            log.error("[Seedling] 새싹 정보 조회 실패 - error: {}", ex.getMessage(), ex);
            Map<String, Object> error = new HashMap<>();
            error.put("message", "새싹 정보를 불러오는데 실패했습니다.");
            error.put("reason", "seedling_fetch_error");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * 내 새싹 닉네임 수정 (보안 강화)
     */
    @PutMapping("/my-seedling/nickname")
    public ResponseEntity<?> updateMySeedlingNickname(
            @Valid @RequestBody SeedlingNicknameUpdateDTO updateDTO,
            @AuthenticationPrincipal UserDetails userDetails) {
        try {
            // 현재 로그인한 사용자의 username 가져오기
            String username = userDetails.getUsername();
            
            // 사용자 정보에서 userId 가져오기
            UserInfoDTO userInfo = userService.getUserInfo(username);
            Integer userId = userInfo.getUserId();
            
            SeedlingStatusDTO updatedSeedling = seedlingService.updateSeedlingNickname(userId, updateDTO);
            return ResponseEntity.ok(updatedSeedling);
        } catch (RuntimeException ex) {
            log.error("[Seedling] 새싹 닉네임 수정 실패 - error: {}", ex.getMessage(), ex);
            Map<String, Object> error = new HashMap<>();
            error.put("message", ex.getMessage());
            error.put("reason", "seedling_update_failed");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        } catch (Exception ex) {
            log.error("[Seedling] 새싹 닉네임 수정 중 알 수 없는 오류 - error: {}", ex.getMessage(), ex);
            Map<String, Object> error = new HashMap<>();
            error.put("message", "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
            error.put("reason", "internal_server_error");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

}
