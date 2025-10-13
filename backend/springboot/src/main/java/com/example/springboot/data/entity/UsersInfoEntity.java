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
@Table(name = "users_info")
public class UsersInfoEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_info_id", nullable = false)
    private Integer id;

    @Size(max = 50)
    @Column(name = "gender", length = 50)
    private String gender;

    @Column(name = "age")
    private Integer age;

    @Size(max = 20)
    @Column(name = "family_history", length = 20)
    private String familyHistory;  // 'none', 'father', 'mother', 'both'

    @Column(name = "is_loss")
    private Boolean isLoss;

    @Size(max = 50)
    @Column(name = "stress", length = 50)
    private String stress;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id_foreign")
    private UserEntity userEntityIdForeign;

}