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
public class HairProductDTO {
    private String productId;
    private String productName;
    private int productPrice;
    private double productRating;
    private int productReviewCount;
    private String productImage;
    private String productUrl;
    private String mallName;
    private String maker;
    private String brand;
    private String category1;
    private String category2;
    private String category3;
    private String category4;
    private String description;
    private List<String> ingredients;
    private List<Integer> suitableStages;
}


