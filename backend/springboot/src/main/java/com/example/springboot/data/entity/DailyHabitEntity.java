package com.example.springboot.data.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "daily_habits")
public class DailyHabitEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "habit_id", nullable = false)
    private Integer id;

    @Lob
    @Column(name = "description")
    private String description;

    @Size(max = 255)
    @Column(name = "habit_name")
    private String habitName;

    @Column(name = "reward_points")
    private Integer rewardPoints;

}