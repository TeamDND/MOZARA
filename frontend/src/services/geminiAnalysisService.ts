import axios from 'axios';

// API 기본 설정
const SPRING_BOOT_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:8080';

// Gemini 분석 결과 인터페이스
export interface GeminiAnalysisResult {
  grade: number;
  title: string;
  description: string;
  advice: string[];
}

// API 응답 인터페이스
export interface GeminiAnalysisResponse {
  analysis: GeminiAnalysisResult;
  save_result: {
    message: string;
    saved: boolean;
    saved_id?: number;
  };
}

// 에러 응답 인터페이스
export interface GeminiAnalysisError {
  error: string;
}

/**
 * Gemini를 통한 모발 분석 API 호출
 * @param imageFile - 분석할 이미지 파일
 * @param userId - 사용자 ID (선택적, 로그인한 경우)
 * @param imageUrl - 이미지 URL (선택적)
 * @returns Promise<GeminiAnalysisResponse>
 */
export const analyzeHairWithGemini = async (
  imageFile: File,
  userId?: number,
  imageUrl?: string
): Promise<GeminiAnalysisResponse> => {
  try {
    console.log('🔄 Gemini 모발 분석 요청 시작');
    console.log('📁 파일:', imageFile.name, imageFile.size, 'bytes');
    console.log('👤 사용자 ID:', userId);

    // FormData 생성
    const formData = new FormData();
    formData.append('image', imageFile);

    // 선택적 파라미터 추가
    if (userId !== undefined) {
      formData.append('user_id', userId.toString());
    }
    if (imageUrl) {
      formData.append('image_url', imageUrl);
    }

    // API 호출
    const response = await axios.post<GeminiAnalysisResponse>(
      `${SPRING_BOOT_BASE_URL}/api/ai/gemini-check/analyze`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30초 타임아웃
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

    console.log('✅ Gemini 분석 응답 성공:', response.data);
    return response.data;

  } catch (error) {
    console.error('❌ Gemini 분석 오류:', error);

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