package com.example.springboot.data.dao;

import com.example.springboot.data.entity.UserEntity;
import com.example.springboot.data.repository.UserRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UserDAO {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public Optional<UserEntity> findByUsername(String username){
        return userRepository.findByUsername(username);
    }

    public Optional<UserEntity> findByNickname(String nickname){
        return userRepository.findByNickname(nickname);
    }

    public UserEntity addUser(UserEntity userEntity){
        return userRepository.save(userEntity);
    }

    public UserEntity updateUser(UserEntity userEntity){
        return userRepository.save(userEntity);
    }

    public void resetPassword(String username, String password) {
        Optional<UserEntity> user = this.userRepository.findByUsername(username);
        if (user.isPresent()) {
            UserEntity userEntity = user.get();
            userEntity.setPassword(passwordEncoder.encode(password));
            this.userRepository.save(userEntity);
            return;
        }
        throw new EntityNotFoundException("user not found");
    }

}
