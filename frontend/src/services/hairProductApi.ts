import apiClient from './apiClient';
import { configApi } from './configApi';
import { elevenStApi } from './elevenStApi';

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
   * @param stage 탈모 단계 (0-3)
   * @returns 제품 목록과 단계별 정보
   */
  async getProductsByStage(stage: number): Promise<HairProductResponse> {
    if (stage < 0 || stage > 3) {
      throw new Error('탈모 단계는 0-3 사이의 값이어야 합니다.');
    }

    // 요구사항: 내부 추천/11번가 버튼 모두 11번가 결과만 사용
    console.log(`탈모 ${stage}단계 제품 조회 시작(11번가)`);
    const eleven = await elevenStApi.searchProductsByStage(stage);
    // 방어적 매핑: 백엔드/11번가 응답 필드명이 다를 경우를 대비해 표준 필드로 변환
    const normalizedProducts: HairProduct[] = (eleven.products || []).map((p: any): HairProduct => ({
      productId: String(p.productId || p.id || p.prdNo || p.code || ''),
      productName: p.productName || p.title || p.name || '',
      productPrice: Number(
        p.productPrice ?? p.price ?? p.salePrice ?? p.finalPrice ?? 0
      ),
      productRating: Number(p.productRating ?? p.rating ?? p.reviewScore ?? 0),
      productReviewCount: Number(
        p.productReviewCount ?? p.reviewCount ?? p.reviewCnt ?? 0
      ),
      productImage: p.productImage || p.imageUrl || p.image || p.imgUrl || '',
      productUrl: p.productUrl || p.link || p.url || '',
      mallName: p.mallName || p.sellerName || p.shopName || '11번가',
      maker: p.maker || p.manufacturer || '',
      brand: p.brand || p.brandName || '',
      category1: p.category1 || p.cat1 || '',
      category2: p.category2 || p.cat2 || '',
      category3: p.category3 || p.cat3 || '',
      category4: p.category4 || p.cat4 || '',
      description: p.description || p.summary || '',
      ingredients: p.ingredients || [],
      suitableStages: p.suitableStages || p.stages || [stage],
    }));
    const mapped: HairProductResponse = {
      products: normalizedProducts,
      totalCount: eleven.totalCount,
      stage,
      stageDescription: `${stage}단계 탈모 관련 제품`,
      recommendation: `11번가에서 ${stage}단계 관련 제품 ${eleven.totalCount}개를 찾았습니다.`,
      disclaimer: '11번가 데이터 기반 결과입니다. 구매 전 상세정보를 확인하세요.',
    } as HairProductResponse;
    console.log(`탈모 ${stage}단계 제품 ${mapped.products.length}개 조회 완료(11번가)`);
    return mapped;
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