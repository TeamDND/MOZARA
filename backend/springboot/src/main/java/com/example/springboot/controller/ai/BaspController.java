package com.example.springboot.controller.ai;

import com.example.springboot.data.dto.BaspRequestDTO;
import com.example.springboot.data.dto.BaspResponseDTO;
import com.example.springboot.service.BaspService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/basp")
@CrossOrigin(origins = "http://localhost:3000")
public class BaspController {
    
    @Autowired
    private BaspService baspService;
    
    @PostMapping("/evaluate")
    public ResponseEntity<BaspResponseDTO> evaluateBasp(@RequestBody BaspRequestDTO request) {
        try {
            // 입력 검증
            if (request.getHairline() == null || request.getVertex() == null || request.getDensity() == null) {
                return ResponseEntity.badRequest().build();
            }
            
            BaspResponseDTO response = baspService.evaluateBasp(request);
            return ResponseEntity.ok(response);
            
        } catch (Exception e) {
            System.err.println("BASP 진단 중 오류 발생: " + e.getMessage());
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @GetMapping("/health")
    public ResponseEntity<String> healthCheck() {
        return ResponseEntity.ok("BASP API is running");
    }
}
