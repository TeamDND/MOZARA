package com.example.springboot.data.repository;

import com.example.springboot.data.entity.SeedlingStatusEntity;
import com.example.springboot.data.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SeedlingStatusRepository extends JpaRepository<SeedlingStatusEntity, Integer> {
    
    /**
     * 사용자 ID로 새싹 상태 조회
     */
    Optional<SeedlingStatusEntity> findByUserEntityIdForeign(UserEntity userEntity);
    
    /**
     * 사용자 ID로 새싹 상태 조회 (ID로)
     */
    Optional<SeedlingStatusEntity> findByUserEntityIdForeign_Id(Integer userId);
}




