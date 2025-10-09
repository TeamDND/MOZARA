package com.example.springboot.data.dao;

import com.example.springboot.data.entity.UserEntity;
import com.example.springboot.data.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminDAO {

    private final UserRepository userRepository;

    /**
     * 전체 유저 목록 조회 (페이징)
     * @param pageable 페이징 정보 (page, size, sort)
     * @return 페이징된 유저 엔티티 목록
     */
    public Page<UserEntity> findAllUsers(Pageable pageable) {
        return userRepository.findAll(pageable);
    }
}
