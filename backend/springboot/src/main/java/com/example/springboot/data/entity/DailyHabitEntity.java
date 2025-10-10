package com.example.springboot.data.entity;

import jakarta.persistence.*;
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
@Entity
@Table(name = "daily_habits")
public class DailyHabitEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "habit_id", nullable = false)
    private Integer habitId;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "habit_name", length = 255)
    private String habitName;

    @Column(name = "reward_points")
    private Integer rewardPoints;

    @Column(name = "category", length = 100)
    private String category;

    @Column(name = "is_today_mission")
    private Boolean isTodayMission = false;
}