package com.example.springboot.data.repository;

import com.example.springboot.data.entity.AnalysisResultEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AnalysisResultRepository extends JpaRepository<AnalysisResultEntity, Integer> {
}


