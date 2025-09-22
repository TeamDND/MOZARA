/**
 * 모발 손상 분석 서비스
 */
import React from 'react';
import apiClient from '../services/apiClient';
import Header from '../pages/Header';
import Footer from '../pages/Footer';

export interface HairAnalysisRequest {
  image?: File;
  textQuery?: string;
}

// Python API 구조에 맞는 인터페이스
export interface SimilarCase {
  id: string;
  score: number;
  metadata: {
    image_id: string;
    image_file_name: string;
    image_path?: string;
    category: string;
    severity: string;
    severity_level: string;
    value_1: string;
    value_2: string;
    value_3: string;
    value_4: string;
    value_5: string;
    value_6: string;
  };
}

export interface RAGAnalysis {
  primary_category: string;
  primary_severity: string;
  average_confidence: number;
  category_distribution: Record<string, number>;
  severity_distribution: Record<string, number>;
  diagnosis_scores: Record<string, number>;
  recommendations: string[];
}

export interface AIAnalysis {
  diagnosis: string;
  main_issues: string[];
  causes: string[];
  management_plan: string[];
  precautions: string[];
  medical_consultation: boolean;
  prevention_tips: string[];
  confidence_level: string;
}

export interface HairAnalysisResponse {
  success: boolean;
  analysis?: RAGAnalysis;
  ai_analysis?: AIAnalysis;
  similar_cases: SimilarCase[];
  total_similar_cases: number;
  model_info: Record<string, any>;
  error?: string;
}



class HairDamageService {
  // 스프링 중계 엔드포인트로 연결 (/api + baseURL 설정 기준)
  private readonly baseUrl = '/ai/hair-loss-daily';
  
  /**
   * Header와 Footer를 포함한 레이아웃 컴포넌트
   */
  renderWithLayout(children: React.ReactNode): React.ReactElement {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container mx-auto px-4 py-8">
          {children}
        </main>
        <Footer />
      </div>
    );
  }

  /**
   * 모발 손상 분석
   */
  async analyzeHairDamage(request: HairAnalysisRequest): Promise<HairAnalysisResponse> {
    try {
      // 스프링 중계: POST /ai/hair-damage/analyze (multipart/form-data)
      const formData = new FormData();
      if (request.image) {
        formData.append('image', request.image);
      }
      if (request.textQuery) {
        formData.append('textQuery', request.textQuery);
      }
      const response = await apiClient.post(`${this.baseUrl}/analyze`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return response.data;
    } catch (error) {
      console.error('모발 손상 분석 오류:', error);
      throw new Error('모발 손상 분석 중 오류가 발생했습니다.');
    }
  }

  

  /**
   * 분석 결과 저장
   */
  async saveAnalysisResult(analysisResult: any): Promise<any> {
    try {
      // 스프링 중계: POST /ai/hair-damage/save-result
      const response = await apiClient.post(`${this.baseUrl}/save-result`, analysisResult);
      return response.data;
    } catch (error) {
      console.error('분석 결과 저장 오류:', error);
      throw new Error('분석 결과 저장 중 오류가 발생했습니다.');
    }
  }

  /**
   * 이미지를 base64로 변환
   */
  convertImageToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // data:image/jpeg;base64, 부분을 제거하고 순수 base64 문자열만 반환
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * 모발 손상 유무 판단
   */
  determineHairDamageStatus(diagnosis: string): { status: string; color: string } {
    if (diagnosis === "정상" || diagnosis === "normal") {
      return { status: "모발 손상 없음", color: "success" };
    } else if (diagnosis === "경미" || diagnosis === "경미한 손상" || diagnosis === "탈모 초기") {
      return { status: "모발 손상 의심", color: "warning" };
    } else if (diagnosis === "중등도" || diagnosis === "중간 손상" || diagnosis === "심각" || diagnosis === "심각한 손상" || 
               diagnosis === "탈모 진행" || diagnosis === "탈모 중기" || diagnosis === "탈모 후기") {
      return { status: "모발 손상 있음", color: "error" };
    } else {
      return { status: "모발 손상 의심", color: "warning" };
    }
  }
}

export const hairDamageService = new HairDamageService();