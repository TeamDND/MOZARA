package com.example.springboot.data.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "seedling_status")
public class SeedlingStatusEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "seedling_id", nullable = false)
    private Integer id;

    @Size(max = 50)
    @Column(name = "seedling_name", length = 50)
    private String seedlingName;

    @Column(name = "current_point")
    private Integer currentPoint;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id_foreign")
    private UserEntity userEntityIdForeign;

}