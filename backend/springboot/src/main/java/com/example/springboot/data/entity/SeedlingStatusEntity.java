package com.example.springboot.data.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Size;
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