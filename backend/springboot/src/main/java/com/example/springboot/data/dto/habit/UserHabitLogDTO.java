package com.example.springboot.data.dto.habit;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserHabitLogDTO {
    private Integer logId;
    private Integer habitId;
    private Integer userId;
    private LocalDate completionDate;
    private Integer progressCount;
    private Integer targetCount;
}
