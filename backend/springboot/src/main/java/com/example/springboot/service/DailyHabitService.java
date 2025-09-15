package com.example.springboot.service;

import com.example.springboot.data.dto.DailyHabitDTO;
import com.example.springboot.data.entity.DailyHabitEntity;
import com.example.springboot.data.repository.DailyHabitRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class DailyHabitService {

    private final DailyHabitRepository dailyHabitRepository;

    // 일일 습관 추가
    public DailyHabitDTO addDailyHabit(DailyHabitDTO dailyHabitDTO) {
        DailyHabitEntity entity = DailyHabitEntity.builder()
                .habitName(dailyHabitDTO.getHabitName())
                .description(dailyHabitDTO.getDescription())
                .rewardPoints(dailyHabitDTO.getRewardPoints())
                .build();

        DailyHabitEntity savedEntity = dailyHabitRepository.save(entity);
        return convertToDTO(savedEntity);
    }

    // 모든 일일 습관 조회
    public List<DailyHabitDTO> getAllDailyHabits() {
        List<DailyHabitEntity> entities = dailyHabitRepository.findAll();
        return entities.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    // 습관명으로 검색
    public List<DailyHabitDTO> searchHabitsByName(String habitName) {
        List<DailyHabitEntity> entities = dailyHabitRepository.findByHabitNameContaining(habitName);
        return entities.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    // 보상 포인트 범위로 검색
    public List<DailyHabitDTO> searchHabitsByPoints(Integer minPoints, Integer maxPoints) {
        List<DailyHabitEntity> entities = dailyHabitRepository.findByRewardPointsBetween(minPoints, maxPoints);
        return entities.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    // 보상 포인트 높은 순으로 조회
    public List<DailyHabitDTO> getHabitsByPointsDesc() {
        List<DailyHabitEntity> entities = dailyHabitRepository.findAllByOrderByRewardPointsDesc();
        return entities.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    // DTO 변환
    private DailyHabitDTO convertToDTO(DailyHabitEntity entity) {
        return DailyHabitDTO.builder()
                .id(entity.getId())
                .habitName(entity.getHabitName())
                .description(entity.getDescription())
                .rewardPoints(entity.getRewardPoints())
                .build();
    }
}
