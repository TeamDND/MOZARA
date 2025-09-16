package com.example.springboot.service.user;

import com.example.springboot.data.repository.SeedlingStatusRepository;
import com.example.springboot.data.dto.seedling.SeedlingStatusDTO;
import com.example.springboot.data.dto.seedling.SeedlingNicknameUpdateDTO;
import com.example.springboot.data.entity.SeedlingStatusEntity;
import com.example.springboot.data.entity.UserEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class SeedlingService {
    
    private final SeedlingStatusRepository seedlingStatusRepository;

    /**
     * 새싹 생성 (회원가입 시 호출)
     */
    public SeedlingStatusDTO createSeedling(UserEntity userEntity, String nickname) {
        SeedlingStatusEntity seedlingStatusEntity = SeedlingStatusEntity.builder()
                .seedlingName(nickname + "의 새싹")
                .currentPoint(0) // 초기 포인트 0
                .userEntityIdForeign(userEntity)
                .build();
        
        SeedlingStatusEntity savedSeedling = seedlingStatusRepository.save(seedlingStatusEntity);

        return SeedlingStatusDTO.builder()
                .seedlingId(savedSeedling.getId())
                .seedlingName(savedSeedling.getSeedlingName())
                .currentPoint(savedSeedling.getCurrentPoint())
                .userId(userEntity.getId())
                .build();
    }

    /**
     * 새싹 닉네임 수정
     */
    public SeedlingStatusDTO updateSeedlingNickname(Integer userId, SeedlingNicknameUpdateDTO updateDTO) {
        // 새싹 상태 조회
        SeedlingStatusEntity seedlingStatusEntity = seedlingStatusRepository.findByUserEntityIdForeign_Id(userId)
                .orElseThrow(() -> new RuntimeException("새싹 정보를 찾을 수 없습니다."));

        // 새싹 닉네임 업데이트
        seedlingStatusEntity.setSeedlingName(updateDTO.getSeedlingName());
        SeedlingStatusEntity savedSeedling = seedlingStatusRepository.save(seedlingStatusEntity);

        // DTO로 변환하여 반환
        return SeedlingStatusDTO.builder()
                .seedlingId(savedSeedling.getId())
                .seedlingName(savedSeedling.getSeedlingName())
                .currentPoint(savedSeedling.getCurrentPoint())
                .userId(userId)
                .build();
    }

    /**
     * 사용자 ID로 새싹 정보 조회
     */
    public SeedlingStatusDTO getSeedlingByUserId(Integer userId) {
        SeedlingStatusEntity seedlingStatusEntity = seedlingStatusRepository.findByUserEntityIdForeign_Id(userId)
                .orElse(null);
        
        if (seedlingStatusEntity == null) {
            return null;
        }
        
        return SeedlingStatusDTO.builder()
                .seedlingId(seedlingStatusEntity.getId())
                .seedlingName(seedlingStatusEntity.getSeedlingName())
                .currentPoint(seedlingStatusEntity.getCurrentPoint())
                .userId(userId)
                .build();
    }

    /**
     * 새싹 포인트 업데이트
     */
    public SeedlingStatusDTO updateSeedlingPoint(Integer userId, Integer points) {
        SeedlingStatusEntity seedlingStatusEntity = seedlingStatusRepository.findByUserEntityIdForeign_Id(userId)
                .orElseThrow(() -> new RuntimeException("새싹 정보를 찾을 수 없습니다."));

        // 포인트 업데이트
        seedlingStatusEntity.setCurrentPoint(seedlingStatusEntity.getCurrentPoint() + points);
        SeedlingStatusEntity savedSeedling = seedlingStatusRepository.save(seedlingStatusEntity);

        return SeedlingStatusDTO.builder()
                .seedlingId(savedSeedling.getId())
                .seedlingName(savedSeedling.getSeedlingName())
                .currentPoint(savedSeedling.getCurrentPoint())
                .userId(userId)
                .build();
    }
}
