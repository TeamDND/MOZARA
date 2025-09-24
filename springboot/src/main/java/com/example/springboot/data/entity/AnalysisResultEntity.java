package com.example.springboot.data.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "analysis_results")
public class AnalysisResultEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "result_id", nullable = false)
    private Integer id;

    @Column(name = "inspection_date")
    private LocalDate inspectionDate;

    @Lob
    @Column(name = "analysis_summary")
    private String analysisSummary;

    @Lob
    @Column(name = "advice")
    private String advice;

    @Column(name = "grade")
    private Integer grade;

    @Size(max = 255)
    @Column(name = "image_url")
    private String imageUrl;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id_foreign")
    private UserEntity userEntityIdForeign;

}