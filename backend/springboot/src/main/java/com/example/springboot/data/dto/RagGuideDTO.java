package com.example.springboot.data.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RagGuideDTO {
    private List<String> answers;      // RAG 답변
    private List<CitationDTO> citations; // 출처 정보
}
