package com.example.springboot.data.repository;

import com.example.springboot.data.entity.UserLogEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserLogRepository extends JpaRepository<UserLogEntity, Integer> {
    Optional<UserLogEntity> findByUserEntityIdForeign_Username(String username);
}
