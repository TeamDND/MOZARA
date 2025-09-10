package com.example.springboot.data.dao;

import com.example.springboot.data.entity.UserEntity;
import com.example.springboot.data.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserDAO {
    private final UserRepository userRepository;

    public UserEntity findByUsername(String username){
        return userRepository.findByUsername(username);
    }
    public UserEntity addUser(UserEntity userEntity){
        return userRepository.save(userEntity);
    }

}
