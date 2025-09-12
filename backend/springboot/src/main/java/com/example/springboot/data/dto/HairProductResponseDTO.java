package com.example.springboot.data.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class HairProductResponseDTO {
    private List<HairProductDTO> products;
    private int totalCount;
    private int stage;
    private String stageDescription;
    private String recommendation;
    private String disclaimer;
    private String timestamp;
}




