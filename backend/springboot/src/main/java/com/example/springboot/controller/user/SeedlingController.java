package com.example.springboot.controller.user;

import com.example.springboot.data.dto.seedling.SeedlingNicknameUpdateDTO;
import com.example.springboot.data.dto.seedling.SeedlingStatusDTO;
import com.example.springboot.service.user.SeedlingService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
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

    /**
     * 새싹 닉네임 수정
     * @param userId 사용자 ID
     * @param updateDTO 새싹 닉네임 수정 정보
     * @return 수정된 새싹 정보
     */
    @PutMapping("/{userId}/nickname")
    public ResponseEntity<?> updateSeedlingNickname(
            @PathVariable Integer userId,
            @Valid @RequestBody SeedlingNicknameUpdateDTO updateDTO) {
        try {
            SeedlingStatusDTO updatedSeedling = seedlingService.updateSeedlingNickname(userId, updateDTO);
            return ResponseEntity.ok(updatedSeedling);
        } catch (RuntimeException ex) {
            log.error("[Seedling] 새싹 닉네임 수정 실패 - userId: {}, error: {}", userId, ex.getMessage(), ex);
            Map<String, Object> error = new HashMap<>();
            error.put("message", ex.getMessage());
            error.put("reason", "seedling_update_failed");
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
        } catch (Exception ex) {
            log.error("[Seedling] 새싹 닉네임 수정 중 알 수 없는 오류 - userId: {}, error: {}", userId, ex.getMessage(), ex);
            Map<String, Object> error = new HashMap<>();
            error.put("message", "서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
            error.put("reason", "internal_server_error");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }

    /**
     * 새싹 정보 조회
     */
    @GetMapping("/{userId}")
    public ResponseEntity<?> getSeedlingInfo(@PathVariable Integer userId) {
        try {
            SeedlingStatusDTO seedlingInfo = seedlingService.getSeedlingByUserId(userId);
            if (seedlingInfo == null) {
                Map<String, Object> error = new HashMap<>();
                error.put("message", "새싹 정보를 찾을 수 없습니다.");
                error.put("reason", "seedling_not_found");
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
            }
            return ResponseEntity.ok(seedlingInfo);
        } catch (Exception ex) {
            log.error("[Seedling] 새싹 정보 조회 실패 - userId: {}, error: {}", userId, ex.getMessage(), ex);
            Map<String, Object> error = new HashMap<>();
            error.put("message", "새싹 정보를 불러오는데 실패했습니다.");
            error.put("reason", "seedling_fetch_error");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
        }
    }
}
