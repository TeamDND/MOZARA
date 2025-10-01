package com.example.springboot.data.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import lombok.ToString;

import java.time.LocalDate;

@Getter
@Setter
@ToString
@Entity
@Table(name = "analysis_results")
public class AnalysisResultEntity {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "result_id", nullable = false)
    private Integer id;

    @Column(name = "inspection_date")
    private LocalDate inspectionDate;

    @Column(name = "analysis_summary", length = 5000)
    private String analysisSummary;

    @Column(name = "advice", length = 5000)
    private String advice;

    @Column(name = "grade")
    private Integer grade;

    @Size(max = 255)
    @Column(name = "image_url")
    private String imageUrl;

    @Size(max = 50)
    @Column(name = "analysis_type")
    private String analysisType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id_foreign")
    private UserEntity userEntityIdForeign;

}