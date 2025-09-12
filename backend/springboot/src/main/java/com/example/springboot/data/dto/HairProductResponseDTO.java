package com.example.springboot.data.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class HairProductResponseDTO {
    private List<HairProductDTO> products;
    private int totalCount;
    private int stage;
    private String stageDescription;
    private String recommendation;
    private String disclaimer;
}


