package com.example.springboot.data.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CitationDTO {
    private Integer n;                 // 각주 번호
    private String title;             // 제목
    private String publisher;         // 발행처
    private Integer year;             // 연도
    private String url;               // URL
    private String snippet;           // 스니펫
}
