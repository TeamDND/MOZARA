import apiClient from './apiClient';
import { configApi } from './configApi';

// TypeScript: 탈모 제품 정보 인터페이스
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

// TypeScript: API 요청 인터페이스
export interface HairProductRequest {
  stage: number;
}

// TypeScript: API 응답 인터페이스 (기존 패턴과 일치)
export interface HairProductResponse {
  products: HairProduct[];
  totalCount: number;
  stage: number;
  stageDescription: string;
  recommendation: string;
  disclaimer: string;
}

// TypeScript: 헬스체크 응답 인터페이스 (기존 패턴과 일치)
export interface HairProductHealthResponse {
  status: string;
  service: string;
  timestamp?: string;
}

/**
 * 탈모 단계별 제품 추천 API 클라이언트
 * 
 * 기존 프로젝트의 API 호출 패턴을 따라 구현:
 * - apiClient 사용 (JWT 토큰 자동 추가)
 * - 일관된 에러 처리
 * - TypeScript 타입 안전성
 */
export const hairProductApi = {
  /**
   * 탈모 단계별 제품 목록 조회
   * @param stage 탈모 단계 (1-6)
   * @returns 제품 목록과 단계별 정보
   */
  async getProductsByStage(stage: number): Promise<HairProductResponse> {
    if (stage < 1 || stage > 6) {
      throw new Error('탈모 단계는 1-6 사이의 값이어야 합니다.');
    }

    try {
      console.log(`탈모 ${stage}단계 제품 조회 시작`);
      
      // Spring Boot를 통해 Python API 호출
      const response = await apiClient.get<HairProductResponse>('/products', {
        params: { stage },
        timeout: 10000, // 10초 타임아웃
      });

      console.log(`탈모 ${stage}단계 제품 ${response.data.products.length}개 조회 완료`);
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
   * 서비스 헬스체크
   * @returns 서비스 상태 정보
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
   * 특정 제품 상세 정보 조회 (향후 확장용)
   * @param productId 제품 ID
   * @returns 제품 상세 정보
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