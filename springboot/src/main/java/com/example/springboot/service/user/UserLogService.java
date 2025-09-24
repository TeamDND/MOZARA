package com.example.springboot.service.user;

import com.example.springboot.data.dto.user.UserLogDTO;
import com.example.springboot.data.entity.UserLogEntity;
import com.example.springboot.data.entity.UserEntity;
import com.example.springboot.data.repository.UserLogRepository;
import com.example.springboot.data.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@RequiredArgsConstructor
@Transactional
public class UserLogService {

    private final UserLogRepository userLogRepository;
    private final UserRepository userRepository;

    // 유튜브 좋아요 추가/제거
    public UserLogDTO toggleYoutubeLike(String username, String videoId) {
        UserEntity user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        Optional<UserLogEntity> existingLog = userLogRepository.findByUserEntityIdForeign_Username(username);
        
        UserLogEntity userLog;
        if (existingLog.isPresent()) {
            userLog = existingLog.get();
            String currentYoutubeLike = userLog.getYoutubeLike();
            
            if (currentYoutubeLike == null || currentYoutubeLike.isEmpty()) {
                userLog.setYoutubeLike(videoId);
            } else {
                // 이미 좋아요한 영상인지 확인
                if (currentYoutubeLike.contains(videoId)) {
                    // 좋아요 제거
                    userLog.setYoutubeLike(currentYoutubeLike.replace(videoId + ",", "").replace("," + videoId, "").replace(videoId, ""));
                } else {
                    // 좋아요 추가
                    userLog.setYoutubeLike(currentYoutubeLike + "," + videoId);
                }
            }
        } else {
            userLog = UserLogEntity.builder()
                    .userEntityIdForeign(user)
                    .youtubeLike(videoId)
                    .build();
        }
        
        UserLogEntity savedLog = userLogRepository.save(userLog);
        return convertToDTO(savedLog);
    }

    // 사용자의 좋아요 목록 조회
    public UserLogDTO getUserLikes(String username) {
        UserLogEntity userLog = userLogRepository.findByUserEntityIdForeign_Username(username)
                .orElse(null);
        
        if (userLog == null) {
            return UserLogDTO.builder()
                    .username(username)
                    .youtubeLike("")
                    .mapLike("")
                    .hospitalLike("")
                    .build();
        }
        
        return convertToDTO(userLog);
    }

    // 유튜브 좋아요 목록만 조회
    public String getYoutubeLikes(String username) {
        UserLogEntity userLog = userLogRepository.findByUserEntityIdForeign_Username(username)
                .orElse(null);
        
        return userLog != null ? userLog.getYoutubeLike() : "";
    }

    // DTO 변환
    private UserLogDTO convertToDTO(UserLogEntity entity) {
        return UserLogDTO.builder()
                .id(entity.getId())
                .username(entity.getUserEntityIdForeign().getUsername())
                .youtubeLike(entity.getYoutubeLike())
                .mapLike(entity.getMapLike())
                .hospitalLike(entity.getHospitalLike())
                .build();
    }
}
