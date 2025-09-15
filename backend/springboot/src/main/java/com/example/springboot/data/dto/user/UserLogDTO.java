package com.example.springboot.data.dto.user;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UserLogDTO {
    
    private Integer id;
    private String mapLike;
    private String youtubeLike;
    private String hospitalLike;
    private String username;
}
