package com.example.springboot.data.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class DailyHabitDTO {
    
    private Integer id;
    private String habitName;
    private String description;
    private Integer rewardPoints;
}
