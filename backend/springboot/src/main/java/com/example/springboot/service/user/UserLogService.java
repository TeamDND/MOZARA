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
    public UserLogDTO toggleYoutubeLike(String username, String videoId, String videoTitle) {
        UserEntity user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        Optional<UserLogEntity> existingLog = userLogRepository.findByUserEntityIdForeign_Username(username);

        // videoId:videoTitle 형식으로 저장
        String videoEntry = videoId + ":" + videoTitle;

        UserLogEntity userLog;
        if (existingLog.isPresent()) {
            userLog = existingLog.get();
            String currentYoutubeLike = userLog.getYoutubeLike();

            if (currentYoutubeLike == null || currentYoutubeLike.isEmpty()) {
                userLog.setYoutubeLike(videoEntry);
            } else {
                // videoId가 포함되어 있는지 확인 (제목이 바뀌었을 수도 있으므로 ID로만 체크)
                boolean alreadyLiked = false;
                StringBuilder newYoutubeLike = new StringBuilder();
                String[] videos = currentYoutubeLike.split(",");

                for (String video : videos) {
                    // 빈 문자열 무시
                    if (video == null || video.trim().isEmpty()) {
                        continue;
                    }

                    if (video.startsWith(videoId + ":")) {
                        // 이미 좋아요한 영상이면 제거
                        alreadyLiked = true;
                    } else {
                        if (newYoutubeLike.length() > 0) {
                            newYoutubeLike.append(",");
                        }
                        newYoutubeLike.append(video);
                    }
                }

                if (!alreadyLiked) {
                    // 좋아요 추가
                    if (newYoutubeLike.length() > 0) {
                        newYoutubeLike.append(",");
                    }
                    newYoutubeLike.append(videoEntry);
                }

                userLog.setYoutubeLike(newYoutubeLike.toString());
            }
        } else {
            userLog = UserLogEntity.builder()
                    .userEntityIdForeign(user)
                    .youtubeLike(videoEntry)
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
                    .productLike("")
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

    // 병원 좋아요 추가/제거
    public UserLogDTO toggleHospitalLike(String username, String hospitalId) {
        UserEntity user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        Optional<UserLogEntity> existingLog = userLogRepository.findByUserEntityIdForeign_Username(username);

        UserLogEntity userLog;
        if (existingLog.isPresent()) {
            userLog = existingLog.get();
            String currentHospitalLike = userLog.getHospitalLike();

            if (currentHospitalLike == null || currentHospitalLike.isEmpty()) {
                userLog.setHospitalLike(hospitalId);
            } else {
                // 이미 좋아요한 병원인지 확인
                if (currentHospitalLike.contains(hospitalId)) {
                    // 좋아요 제거
                    userLog.setHospitalLike(currentHospitalLike.replace(hospitalId + ",", "").replace("," + hospitalId, "").replace(hospitalId, ""));
                } else {
                    // 좋아요 추가
                    userLog.setHospitalLike(currentHospitalLike + "," + hospitalId);
                }
            }
        } else {
            userLog = UserLogEntity.builder()
                    .userEntityIdForeign(user)
                    .hospitalLike(hospitalId)
                    .build();
        }

        UserLogEntity savedLog = userLogRepository.save(userLog);
        return convertToDTO(savedLog);
    }

    // 병원 좋아요 목록만 조회
    public String getHospitalLikes(String username) {
        UserLogEntity userLog = userLogRepository.findByUserEntityIdForeign_Username(username)
                .orElse(null);

        return userLog != null ? userLog.getHospitalLike() : "";
    }

    // 제품 좋아요 추가/제거
    public UserLogDTO toggleProductLike(String username, String productId, String productName) {
        UserEntity user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        Optional<UserLogEntity> existingLog = userLogRepository.findByUserEntityIdForeign_Username(username);

        // productId:productName 형식으로 저장
        String productEntry = productId + ":" + productName;

        UserLogEntity userLog;
        if (existingLog.isPresent()) {
            userLog = existingLog.get();
            String currentProductLike = userLog.getProductLike();

            if (currentProductLike == null || currentProductLike.isEmpty()) {
                userLog.setProductLike(productEntry);
            } else {
                // productId가 포함되어 있는지 확인 (이름이 바뀌었을 수도 있으므로 ID로만 체크)
                boolean alreadyLiked = false;
                StringBuilder newProductLike = new StringBuilder();
                String[] products = currentProductLike.split(",");

                for (String product : products) {
                    // 빈 문자열 무시
                    if (product == null || product.trim().isEmpty()) {
                        continue;
                    }

                    if (product.startsWith(productId + ":")) {
                        // 이미 좋아요한 제품이면 제거
                        alreadyLiked = true;
                    } else {
                        if (newProductLike.length() > 0) {
                            newProductLike.append(",");
                        }
                        newProductLike.append(product);
                    }
                }

                if (!alreadyLiked) {
                    // 좋아요 추가
                    if (newProductLike.length() > 0) {
                        newProductLike.append(",");
                    }
                    newProductLike.append(productEntry);
                }

                userLog.setProductLike(newProductLike.toString());
            }
        } else {
            userLog = UserLogEntity.builder()
                    .userEntityIdForeign(user)
                    .productLike(productEntry)
                    .build();
        }

        UserLogEntity savedLog = userLogRepository.save(userLog);
        return convertToDTO(savedLog);
    }

    // 제품 좋아요 목록만 조회
    public String getProductLikes(String username) {
        UserLogEntity userLog = userLogRepository.findByUserEntityIdForeign_Username(username)
                .orElse(null);

        return userLog != null ? userLog.getProductLike() : "";
    }

    // 지도 기반 서비스(탈모클리닉, 모발이식, 가발) 좋아요 추가/제거
    public UserLogDTO toggleMapLike(String username, String mapId) {
        UserEntity user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));

        Optional<UserLogEntity> existingLog = userLogRepository.findByUserEntityIdForeign_Username(username);

        UserLogEntity userLog;
        if (existingLog.isPresent()) {
            userLog = existingLog.get();
            String currentMapLike = userLog.getMapLike();

            if (currentMapLike == null || currentMapLike.isEmpty()) {
                userLog.setMapLike(mapId);
            } else {
                // 이미 좋아요한 항목인지 확인
                if (currentMapLike.contains(mapId)) {
                    // 좋아요 제거
                    userLog.setMapLike(currentMapLike.replace(mapId + ",", "").replace("," + mapId, "").replace(mapId, ""));
                } else {
                    // 좋아요 추가
                    userLog.setMapLike(currentMapLike + "," + mapId);
                }
            }
        } else {
            userLog = UserLogEntity.builder()
                    .userEntityIdForeign(user)
                    .mapLike(mapId)
                    .build();
        }

        UserLogEntity savedLog = userLogRepository.save(userLog);
        return convertToDTO(savedLog);
    }

    // 지도 기반 좋아요 목록만 조회
    public String getMapLikes(String username) {
        UserLogEntity userLog = userLogRepository.findByUserEntityIdForeign_Username(username)
                .orElse(null);

        return userLog != null ? userLog.getMapLike() : "";
    }

    // DTO 변환
    private UserLogDTO convertToDTO(UserLogEntity entity) {
        return UserLogDTO.builder()
                .id(entity.getId())
                .username(entity.getUserEntityIdForeign().getUsername())
                .youtubeLike(entity.getYoutubeLike())
                .mapLike(entity.getMapLike())
                .hospitalLike(entity.getHospitalLike())
                .productLike(entity.getProductLike())
                .build();
    }
}
