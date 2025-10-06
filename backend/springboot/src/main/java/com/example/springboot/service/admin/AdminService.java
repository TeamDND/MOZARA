package com.example.springboot.service.admin;

import com.example.springboot.data.dao.AdminDAO;
import com.example.springboot.data.dto.admin.UserListDTO;
import com.example.springboot.data.entity.UserEntity;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminService {

    private final AdminDAO adminDAO;

    /**
     * 전체 유저 목록 조회 (페이징)
     */
    public Page<UserListDTO> getAllUsers(Pageable pageable) {
        Page<UserEntity> userPage = adminDAO.findAllUsers(pageable);

        return userPage.map(user -> UserListDTO.builder()
                .userId(user.getId())
                .username(user.getUsername())
                .nickname(user.getNickname())
                .email(user.getEmail())
                .role(user.getRole())
                .build());
    }
}
