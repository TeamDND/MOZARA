package com.example.springboot.data.entity;

import jakarta.persistence.*;
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
@Entity
@Table(name = "user_habit_log")
public class UserHabitLogEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "log_id", nullable = false)
    private Integer logId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "habit_id_foreign")
    private DailyHabitEntity habitIdForeign;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id_foreign")
    private UserEntity userEntityIdForeign;

    @Column(name = "completion_date")
    private LocalDate completionDate;
}