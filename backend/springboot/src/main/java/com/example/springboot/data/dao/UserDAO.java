package com.example.springboot.data.dao;

import com.example.springboot.data.entity.UserEntity;
import com.example.springboot.data.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserDAO {
    private final UserRepository userRepository;

    public List<UserEntity> findAll() {
        return userRepository.findAll();
    }
    public UserEntity findByUsername(String username) {
        return this.userRepository.findById(username).orElse(null);
    }
    public UserEntity addUser(UserEntity userEntity) {
        return this.userRepository.save(userEntity);
    }
    public UserEntity updateUser(UserEntity userEntity) {
        return this.userRepository.save(userEntity);
    }
    public void deleteUser(String username) {
        this.userRepository.deleteById(username);
    }

}
