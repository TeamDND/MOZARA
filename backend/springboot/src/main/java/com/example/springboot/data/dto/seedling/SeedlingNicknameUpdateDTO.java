package com.example.springboot.data.dto.seedling;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SeedlingNicknameUpdateDTO {
    
    @NotBlank(message = "새싹 닉네임은 필수입니다.")
    @Size(max = 50, message = "새싹 닉네임은 50자를 초과할 수 없습니다.")
    private String seedlingName;
}
