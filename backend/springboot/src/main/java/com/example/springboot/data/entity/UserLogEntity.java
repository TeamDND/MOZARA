package com.example.springboot.data.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "user_log")
public class UserLogEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "list_id", nullable = false)
    private Integer id;

    @Size(max = 255)
    @Column(name = "map_like")
    private String mapLike;

    @Size(max = 255)
    @Column(name = "youtube_like")
    private String youtubeLike;

    @Size(max = 255)
    @Column(name = "hospital_like")
    private String hospitalLike;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id_foreign")
    private UserEntity userEntityIdForeign;

}