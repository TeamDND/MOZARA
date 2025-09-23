package com.example.springboot.data.dao;

import com.example.springboot.data.entity.UsersInfoEntity;
import com.example.springboot.data.repository.UsersInfoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UsersInfoDAO {
    private final UsersInfoRepository usersInfoRepository;

    public UsersInfoEntity findByUserId(Integer userId) {
        return usersInfoRepository.findByUserEntityIdForeign_Id(userId);
    }

    public UsersInfoEntity addUserInfo(UsersInfoEntity usersInfoEntity) {
        return usersInfoRepository.save(usersInfoEntity);
    }

    public UsersInfoEntity findByNickname(String nickname) {
        return usersInfoRepository.findByNickname(nickname);
    }
}
