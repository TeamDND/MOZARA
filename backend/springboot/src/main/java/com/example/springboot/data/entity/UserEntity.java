package com.example.springboot.data.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.*;

import java.time.LocalDate;

@Getter
@Setter
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "users")
public class UserEntity {
    @Id
    @Column(name = "username", nullable = false, length = 200)
    private String username;

    @Column(name = "password", nullable = false)
    @JsonIgnore
    private String password;

    @Column(name = "email", nullable = false)
    private String email;

    @Column(name = "created_at")
    private LocalDate createdAt;

    @Column(name = "role", nullable = false, length = 50)
    private String role;

    @Column(name = "nickname", nullable = false, length = 50)
    private String nickname;

    @Column(name = "gender",nullable = false,length = 50)
    private String gender;

    @Column(name = "age",nullable = false)
    private Integer age;
}