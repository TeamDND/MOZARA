package com.example.springboot.service;

import com.example.springboot.data.dao.UserDAO;
import com.example.springboot.data.dto.UserDTO;
import com.example.springboot.data.entity.UserEntity;
import com.example.springboot.exception.MyException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Service
public class UserService {
    private final UserDAO userDAO;

    private final PasswordEncoder passwordEncoder;

    public UserService(UserDAO userDAO, PasswordEncoder passwordEncoder) {
        this.userDAO = userDAO;
        this.passwordEncoder = passwordEncoder;
    }

    public List<UserDTO> getAllUsers() {
        List<UserEntity> users = userDAO.findAll();
        List<UserDTO> userDTOs = new ArrayList<>();
        for (UserEntity user : users) {
            UserDTO userDTO = UserDTO.builder()
                    .username(user.getUsername())
                    .email(user.getEmail())
                    .nickname(user.getNickname())
                    .role(user.getRole())
                    .build();
            userDTOs.add(userDTO);
        }
        return userDTOs;
    }
    //아이디를 통해 객체 가져오기
    public UserDTO getUserByUsername(String username) {
        UserEntity user = userDAO.findByUsername(username);
        if(user == null){
            throw new UsernameNotFoundException("Username not found");
        }
        return UserDTO.builder()
                .username(user.getUsername())
                .email(user.getEmail())
                .gender(user.getGender())
                .age(user.getAge())
                .nickname(user.getNickname())
                .role(user.getRole())
                .build();
    }
    //회원가입
    public String addUser(UserDTO userDTO) {
        if (userDTO.getUsername() == null || userDTO.getPassword() == null){
            throw new UsernameNotFoundException("Username or email is null");
        }
        if(userDAO.findByUsername(userDTO.getUsername()) != null){
            throw new MyException("동일 아이디 존재");
        }
        UserEntity user =UserEntity.builder()
                .username(userDTO.getUsername())
                .email(userDTO.getEmail())
                .createdAt(LocalDate.now())
                .gender(userDTO.getGender())
                .age(userDTO.getAge())
                .nickname(userDTO.getNickname())
                .role("ROLE_USER")
                .password(passwordEncoder.encode(userDTO.getPassword()))
                .build();
        userDAO.addUser(user);
        return "회원가입 성공";
    }

}
