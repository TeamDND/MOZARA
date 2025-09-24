package com.example.springboot.data.dto.seedling;

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
public class SeedlingStatusDTO {
    private Integer seedlingId;
    private String seedlingName;
    private Integer currentPoint;
    private Integer userId;
}




