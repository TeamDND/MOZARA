package com.example.springboot.data.dao;

import com.example.springboot.data.entity.UserEntity;
import com.example.springboot.data.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserDAO {
    private final UserRepository userRepository;

    public Optional<UserEntity> findByUsername(String username){
        return userRepository.findByUsername(username);
    }

    public Optional<UserEntity> findByNickname(String nickname){
        return userRepository.findByNickname(nickname);
    }

    public UserEntity addUser(UserEntity userEntity){
        return userRepository.save(userEntity);
    }

}
