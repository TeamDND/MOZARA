import axios from 'axios';
import apiClient from './apiClient';

// RAG 분석 결과 인터페이스 (Swin과 동일한 구조로 통일)
export interface RAGAnalysisResult {
  stage: number;
  title: string;
  description: string;
  advice: string;
}

// API 응답 인터페이스
export interface RAGAnalysisResponse {
  analysis: RAGAnalysisResult;
  save_result: {
    message: string;
    saved: boolean;
    saved_id?: number;
  };
}

// 설문 데이터 인터페이스
export interface SurveyData {
  gender: string;
  age: string;
  familyHistory: string;
  recentHairLoss: string;
  stress: string;
}

/**
 * RAG v2를 통한 여성 모발 분석 API 호출 (Top View만 사용)
 * Spring Boot를 거쳐 Python 호출하여 DB 저장까지 수행
 * @param topImageFile - Top View 이미지 파일
 * @param userId - 사용자 ID (선택적, 로그인한 경우)
 * @param imageUrl - 이미지 URL (선택적)
 * @param surveyData - 설문 데이터 (선택적)
 * @returns Promise<RAGAnalysisResponse>
 */
export const analyzeHairWithRAG = async (
  topImageFile: File,
  userId?: number,
  imageUrl?: string,
  surveyData?: SurveyData
): Promise<RAGAnalysisResponse> => {
  try {
    console.log('🔄 RAG v2 여성 모발 분석 요청 시작 (Spring Boot 경유)');
    console.log('📁 Top View 파일:', topImageFile.name, topImageFile.size, 'bytes');
    console.log('👤 사용자 ID:', userId);
    console.log('📋 설문 데이터:', surveyData);

    // FormData 생성
    const formData = new FormData();
    formData.append('top_image', topImageFile);

    // 선택적 파라미터 추가
    if (userId !== undefined && userId !== null) {
      formData.append('user_id', userId.toString());
    }
    if (imageUrl) {
      formData.append('image_url', imageUrl);
    }

    // 설문 데이터 추가 (Gemini LLM 맞춤형 분석용)
    if (surveyData) {
      formData.append('gender', surveyData.gender);
      formData.append('age', surveyData.age);
      formData.append('familyHistory', surveyData.familyHistory);
      formData.append('recentHairLoss', surveyData.recentHairLoss);
      formData.append('stress', surveyData.stress);
    }

    // API 호출 (Spring Boot 경유)
    const response = await apiClient.post<RAGAnalysisResponse>(
      '/ai/rag-v2-check/analyze',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 120초 타임아웃
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            console.log(`📤 업로드 진행률: ${percentCompleted}%`);
          }
        },
      }
    );

    console.log('✅ RAG v2 분석 응답 성공:', response.data);
    return response.data;

  } catch (error) {
    console.error('❌ RAG v2 분석 오류:', error);

    if (axios.isAxiosError(error)) {
      if (error.response?.data?.error) {
        throw new Error(error.response.data.error);
      }
      if (error.code === 'ECONNABORTED') {
        throw new Error('분석 요청 시간이 초과되었습니다. 다시 시도해주세요.');
      }
      if (error.response?.status === 500) {
        throw new Error('서버에서 분석 중 오류가 발생했습니다.');
      }
      if (error.response?.status === 404) {
        throw new Error('RAG 분석 서비스를 찾을 수 없습니다.');
      }
    }

    throw new Error('모발 분석 중 예상치 못한 오류가 발생했습니다.');
  }
};

/**
 * 이미지 파일 유효성 검사
 * @param file - 검사할 이미지 파일
 * @returns boolean
 */
export const validateImageFile = (file: File): { isValid: boolean; message?: string } => {
  // 파일 크기 검사 (10MB 제한)
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  if (file.size > MAX_SIZE) {
    return {
      isValid: false,
      message: '이미지 파일은 10MB 이하여야 합니다.'
    };
  }

  // 파일 형식 검사
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      isValid: false,
      message: 'JPEG, PNG, WEBP 형식의 이미지만 업로드 가능합니다.'
    };
  }

  return { isValid: true };
};
