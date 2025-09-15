package com.example.springboot.data.repository;

import com.example.springboot.data.entity.UsersInfoEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface UsersInfoRepository extends JpaRepository<UsersInfoEntity, Integer> {
    UsersInfoEntity findByUserEntityIdForeign_Id(Integer userId);
    UsersInfoEntity findByNickname(String nickname);
}
