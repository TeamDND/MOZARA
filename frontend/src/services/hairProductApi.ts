import apiClient from './apiClient';

// TypeScript: 탈모 제품 정보 인터페이스 (수정 없음)
export interface HairProduct {
  productId: string;
  productName: string;
  productPrice: number;
  productRating: number;
  productReviewCount: number;
  productImage: string;
  productUrl: string;
  mallName: string;
  maker: string;
  brand: string;
  category1: string;
  category2: string;
  category3: string;
  category4: string;
  description: string;
  ingredients: string[];
  suitableStages: number[];
}

// TypeScript: API 요청 인터페이스 (수정 없음)
export interface HairProductRequest {
  stage: number;
}

// TypeScript: 단계별 API 응답 인터페이스 (수정 없음)
export interface HairProductResponse {
  products: HairProduct[];
  totalCount: number;
  stage: number;
  stageDescription: string;
  recommendation: string;
  disclaimer: string;
}

// TypeScript: 키워드 검색 API 응답 인터페이스 (⭐추가됨)
export interface HairProductSearchResponse {
    products: HairProduct[];
    totalCount: number;
}

// TypeScript: 헬스체크 응답 인터페이스 (수정 없음)
export interface HairProductHealthResponse {
  status: string;
  service: string;
  timestamp?: string;
}

/**
 * 탈모 단계별 제품 추천 API 클라이언트 및 검색 확장
 */
export const hairProductApi = {
  /**
   * 탈모 단계별 제품 목록 조회 (수정 없음)
   */
  async getProductsByStage(stage: number): Promise<HairProductResponse> {
    if (stage < 0 || stage > 3) {
      throw new Error('탈모 단계는 0-3 사이의 값이어야 합니다.');
    }

    try {
      // 스프링을 통해 Python API 호출
      const response = await apiClient.get<HairProductResponse>('/ai/products', {
        params: { stage },
        timeout: 10000, // 10초 타임아웃
      });

      return response.data;
    } catch (error: any) {
      console.error(`탈모 ${stage}단계 제품 조회 중 오류:`, error);
      
      // 에러 메시지 정제
      let errorMessage = '제품을 불러오는 중 오류가 발생했습니다.';
      
      if (error.response?.status === 400) {
        errorMessage = '잘못된 탈모 단계입니다. 1-6단계 중 선택해주세요.';
      } else if (error.response?.status === 404) {
        errorMessage = '해당 단계의 제품을 찾을 수 없습니다.';
      } else if (error.response?.status >= 500) {
        errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = '요청 시간이 초과되었습니다. 네트워크 연결을 확인해주세요.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    }
  },

  /**
   * 키워드로 제품 검색 (⭐추가된 메서드: 11번가 검색을 백엔드에서 수행할 엔드포인트)
   * @param keyword 검색 키워드
   * @returns 검색된 제품 목록
   */
  async searchProductsByKeyword(keyword: string): Promise<HairProductSearchResponse> {
    if (!keyword || keyword.trim() === '') {
      throw new Error('검색 키워드를 입력해주세요.');
    }

    try {
      // 백엔드의 새로운 검색 엔드포인트로 요청
      // 백엔드는 이 요청을 받아 11번가 API를 호출해야 합니다.
      const response = await apiClient.get<HairProductSearchResponse>('/ai/products/search', { 
        params: { keyword },
        timeout: 15000, // 검색은 더 오래 걸릴 수 있으므로 타임아웃 증가
      });

      return response.data;
    } catch (error: any) {
      console.error(`키워드 검색 중 오류:`, error);
      
      let errorMessage = '제품 검색 중 오류가 발생했습니다.';
      // ... (기타 에러 처리 로직)
      
      throw new Error(errorMessage);
    }
  },

  /**
   * 서비스 헬스체크 (수정 없음)
   */
  async healthCheck(): Promise<HairProductHealthResponse> {
    try {
      const response = await apiClient.get<HairProductHealthResponse>('/products/health', {
        timeout: 5000,
      });
      return response.data;
    } catch (error: any) {
      console.error('제품 추천 서비스 헬스체크 실패:', error);
      throw new Error('제품 추천 서비스에 연결할 수 없습니다.');
    }
  },

  /**
   * 특정 제품 상세 정보 조회 (향후 확장용, 수정 없음)
   */
  async getProductDetail(productId: string): Promise<HairProduct> {
    try {
      const response = await apiClient.get<HairProduct>(`/products/${productId}`, {
        timeout: 10000,
      });
      return response.data;
    } catch (error: any) {
      console.error(`제품 ${productId} 상세 정보 조회 중 오류:`, error);
      throw new Error('제품 상세 정보를 불러올 수 없습니다.');
    }
  },
};
