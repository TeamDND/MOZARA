package com.example.springboot.data.dto.habit;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailyHabitDTO {
    private Integer habitId;
    private String description;
    private String habitName;
    private Integer rewardPoints;
    private String category;
}
