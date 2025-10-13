import axios from 'axios';

// API 기본 설정
const SPRING_BOOT_BASE_URL = process.env.REACT_APP_API_BASE_URL || '';

// Swin 분석 결과 인터페이스
export interface SwinAnalysisResult {
  stage: number;
  title: string;
  description: string;
  advice: string;
  confidence?: number;
  weights?: {
    top: number;
    side: number;
    survey: number;
  };
  survey_score?: number;
  weight_explanation?: {
    title: string;
    description: string;
    details: string[];
    references: string[];
  };
}

// API 응답 인터페이스
export interface SwinAnalysisResponse {
  analysis: SwinAnalysisResult;
  save_result: {
    message: string;
    saved: boolean;
    saved_id?: number;
  };
}

// 에러 응답 인터페이스
export interface SwinAnalysisError {
  error: string;
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
 * Swin Transformer를 통한 모발 분석 API 호출
 * @param topImageFile - Top View 이미지 파일
 * @param sideImageFile - Side View 이미지 파일
 * @param userId - 사용자 ID (선택적, 로그인한 경우)
 * @param imageUrl - 이미지 URL (선택적)
 * @param surveyData - 설문 데이터 (선택적, 동적 가중치 계산에 사용)
 * @returns Promise<SwinAnalysisResponse>
 */
export const analyzeHairWithSwin = async (
  topImageFile: File,
  sideImageFile: File,
  userId?: number,
  imageUrl?: string,
  surveyData?: SurveyData
): Promise<SwinAnalysisResponse> => {
  try {
    // FormData 생성
    const formData = new FormData();
    formData.append('top_image', topImageFile);
    formData.append('side_image', sideImageFile);

    // 선택적 파라미터 추가 (로그인 여부 확인)
    if (userId !== undefined && userId !== null) {
      formData.append('user_id', userId.toString());
    }
    if (imageUrl) {
      formData.append('image_url', imageUrl);
    }

    // 설문 데이터 추가
    if (surveyData) {
      formData.append('gender', surveyData.gender);
      formData.append('age', surveyData.age);
      formData.append('familyHistory', surveyData.familyHistory);
      formData.append('recentHairLoss', surveyData.recentHairLoss);
      formData.append('stress', surveyData.stress);
    }

    // API 호출
    const response = await axios.post<SwinAnalysisResponse>(
      `${SPRING_BOOT_BASE_URL}/api/ai/swin-check/analyze`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 120초 타임아웃 (Swin 모델 처리 시간 고려)
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
          }
        },
      }
    );

    return response.data;

  } catch (error) {
    console.error('❌ Swin 분석 오류:', error);

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
        throw new Error('분석 서비스를 찾을 수 없습니다.');
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

/**
 * 분석 단계에 따른 한글 설명 반환
 * @param stage - 분석 단계 (0-3)
 * @returns string
 */
export const getStageDescription = (stage: number): string => {
  switch (stage) {
    case 0:
      return '정상';
    case 1:
      return '초기 탈모';
    case 2:
      return '중등도 탈모';
    case 3:
      return '심각한 탈모';
    default:
      return '알 수 없음';
  }
};

/**
 * 분석 단계에 따른 색상 반환 (Tailwind CSS 클래스)
 * @param stage - 분석 단계 (0-3)
 * @returns string
 */
export const getStageColor = (stage: number): string => {
  switch (stage) {
    case 0:
      return 'text-green-600 bg-green-50';
    case 1:
      return 'text-yellow-600 bg-yellow-50';
    case 2:
      return 'text-orange-600 bg-orange-50';
    case 3:
      return 'text-red-600 bg-red-50';
    default:
      return 'text-gray-600 bg-gray-50';
  }
};