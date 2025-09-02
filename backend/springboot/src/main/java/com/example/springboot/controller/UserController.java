package com.example.springboot.controller;

import com.example.springboot.data.dto.UserDTO;
import com.example.springboot.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api")
public class UserController {
    private final UserService userService;

    @PostMapping("/join")
    public ResponseEntity<String> addUser(@Valid @RequestBody UserDTO userDTO){
        userService.addUser(userDTO);
        return  ResponseEntity.status(HttpStatus.CREATED).body("회원가입 성공");
    }
    @GetMapping("/userinfo/{username}")
    public ResponseEntity<UserDTO> getUser(@PathVariable String username){
        return ResponseEntity.status(HttpStatus.OK).body(userService.getUserByUsername(username));
    }
}
