package com.example.springboot.data.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@Entity
@AllArgsConstructor
@NoArgsConstructor
@Builder
@Table(name = "user_log")
public class UserLogEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "list_id", nullable = false)
    private Integer id;

    @Size(max = 2000)
    @Column(name = "map_like")
    private String mapLike;

    @Size(max = 2000)
    @Column(name = "youtube_like")
    private String youtubeLike;

    @Size(max = 2000)
    @Column(name = "hospital_like")
    private String hospitalLike;

    @Size(max = 2000)
    @Column(name = "product_like")
    private String productLike;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id_foreign")
    private UserEntity userEntityIdForeign;

}