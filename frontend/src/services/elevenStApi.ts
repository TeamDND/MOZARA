import apiClient from './apiClient';
import { HairProduct } from './hairProductApi';

// TypeScript: 11번가 제품 검색 요청 인터페이스
export interface ElevenStSearchRequest {
  keyword: string;
  page?: number;
  pageSize?: number;
}

// TypeScript: 11번가 제품 검색 응답 인터페이스
export interface ElevenStSearchResponse {
  products: HairProduct[];
  totalCount: number;
  page: number;
  pageSize: number;
  keyword: string;
  source: string;
}

/**
 * 11번가 제품 검색 API 클라이언트
 */
export const elevenStApi = {
  /**
   * 11번가에서 제품 검색
   * @param keyword 검색 키워드
   * @param page 페이지 번호 (기본값: 1)
   * @param pageSize 페이지 크기 (기본값: 20)
   * @returns 검색된 제품 목록
   */
  async searchProducts(
    keyword: string, 
    page: number = 1, 
    pageSize: number = 20
  ): Promise<ElevenStSearchResponse> {
    if (!keyword.trim()) {
      throw new Error('검색 키워드를 입력해주세요.');
    }

    try {
      console.log(`11번가 제품 검색 시작: keyword=${keyword}, page=${page}, pageSize=${pageSize}`);
      
      // 스프링을 통해 Python 11번가 API 호출
      const response = await apiClient.get<ElevenStSearchResponse>('/ai/11st/products', {
        params: { 
          keyword: keyword.trim(),
          page,
          pageSize 
        },
        timeout: 15000, // 15초 타임아웃 (외부 API이므로 더 길게)
      });

      console.log(`11번가에서 ${response.data.products.length}개 제품 검색 완료`);
      return response.data;
    } catch (error: any) {
      console.error(`11번가 제품 검색 중 오류:`, error);
      
      // 에러 메시지 정제
      let errorMessage = '11번가에서 제품을 검색하는 중 오류가 발생했습니다.';
      
      if (error.response?.status === 400) {
        errorMessage = '검색 키워드가 올바르지 않습니다.';
      } else if (error.response?.status === 500) {
        errorMessage = '11번가 서버에 일시적인 문제가 있습니다. 잠시 후 다시 시도해주세요.';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = '요청 시간이 초과되었습니다. 다시 시도해주세요.';
      }
      
      throw new Error(errorMessage);
    }
  },

  /**
   * 탈모 관련 제품 검색 (키워드 자동 추가)
   * @param baseKeyword 기본 키워드
   * @param page 페이지 번호
   * @param pageSize 페이지 크기
   * @returns 탈모 관련 제품 목록
   */
  async searchHairLossProducts(
    baseKeyword: string = '탈모',
    page: number = 1,
    pageSize: number = 20
  ): Promise<ElevenStSearchResponse> {
    const hairLossKeywords = [
      '탈모',
      '모발',
      '두피',
      '샴푸',
      '트리트먼트',
      '에센스',
      '스케일링'
    ];
    
    // 기본 키워드에 탈모 관련 키워드 추가
    const searchKeyword = hairLossKeywords.includes(baseKeyword) 
      ? baseKeyword 
      : `${baseKeyword} 탈모`;
    
    return this.searchProducts(searchKeyword, page, pageSize);
  },

  /**
   * 단계별 탈모 제품 검색
   * @param stage 탈모 단계 (1-6)
   * @param page 페이지 번호
   * @param pageSize 페이지 크기
   * @returns 단계별 추천 제품 목록
   */
  async searchProductsByStage(
    stage: number,
    page: number = 1,
    pageSize: number = 20
  ): Promise<ElevenStSearchResponse> {
    const stageKeywords = {
      0: '탈모 예방 샴푸',
      1: '탈모 방지 샴푸',
      2: '두피 앰플',
      3: '탈모 치료'
    };
    
    const keyword = stageKeywords[stage as keyof typeof stageKeywords] || '탈모 제품';
    return this.searchProducts(keyword, page, pageSize);
  }
};
