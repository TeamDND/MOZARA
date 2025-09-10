package com.example.springboot.data.repository;

import com.example.springboot.data.entity.UserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;


public interface UserRepository extends JpaRepository<UserEntity,Integer> {

    UserEntity findByUsername(String username);
}
