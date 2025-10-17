package com.example.springboot.data.entity;

import com.example.springboot.data.entity.UserEntity;
import jakarta.persistence.*;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Getter
@Setter
@Entity
@Table(name = "user_metrics")
public class UserMetricEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_metrics_id", nullable = false)
    private Integer id;

    @Column(name = "record_date")
    private Instant recordDate;

    @Size(max = 255)
    @Column(name = "type")
    private String type;

    @Size(max = 255)
    @Column(name = "value")
    private String value;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id_foreign")
    private UserEntity userIdForeign;

}