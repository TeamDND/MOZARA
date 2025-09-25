import apiClient from './apiClient';
import { configApi } from './configApi';
import axios from 'axios';
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

// 단계별 추천 검색 키워드 맵 (0~3단계)
export const STAGE_KEYWORDS_MAP: Record<number, string[]> = {
  0: [
    '탈모 예방 샴푸',
    '두피 클렌저',
    '두피 스케일링',
    '약산성 샴푸',
    '두피 브러시',
    // 사용자 추가 키워드 (예방/관리 위주)
    '두피샴푸',
    '비듬전용샴푸',
    '두피팩',
    '두피쿨링샴푸',
    '두피각질샴푸',
    '두피 가려움 샴푸',
    '두피 가려움샴푸'
  ],
  1: [
    '탈모 방지 샴푸',
    '두피 토닉',
    '비오틴 영양제',
    '카페인 샴푸',
    '탈모 앰플',
    // 사용자 추가 키워드 (초기 탈모 중심)
    '탈모샴푸',
    '탈모방지샴푸',
    '려 탈모샴푸',
    '탈모삼퓨',
    '탈모린스',
    '탈모토닉',
    // 가림(컨실러) 제품: 초기 단계에서도 사용 가능
    '탈모 팡팡',
    '헤어 팡팡',
    '헤어파우더',
    '헤어 섀도우',
    '헤어 컨실러'
  ],
  2: [
    '두피 앰플',
    '미녹시딜',
    '두피 에센스',
    'LED 두피기기',
    'DHT 차단 샴푸',
    // 사용자 추가 키워드 (중등도, 적극 관리)
    '탈모앰플',
    '탈모약',
    '두피 탈모',
    // 가림(컨실러) 제품: 진행 단계 보조 사용
    '탈모 팡팡',
    '헤어 팡팡',
    '헤어파우더',
    '헤어 섀도우',
    '헤어 컨실러'
  ],
  3: [
    '가발 남성',
    '가발 여성',
    '부분 가발',
    '두피 문신 SMP',
    '모발이식 케어',
    // 가림(컨실러) 제품: 고도 단계 임시커버
    '탈모 팡팡',
    '헤어 팡팡',
    '헤어파우더',
    '헤어 섀도우',
    '헤어 컨실러'
  ],
};

const getPrimaryStageKeyword = (stage: number): string => {
  const list = STAGE_KEYWORDS_MAP[stage];
  return (list && list.length > 0) ? list[0] : '탈모 제품';
};

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
      
      // 백엔드 프록시 호출 (자격 증명 비포함으로 CORS 문제 회피)
      const base = await configApi.getApiBaseUrl();
      // 백엔드 라우트는 "/11st/products" (루트) 이므로 /api 접미사가 있으면 제거
      const serverRoot = base.replace(/\/?api\/?$/, '');
      const url = `${serverRoot.replace(/\/$/, '')}/11st/products`;

      const response = await axios.get<ElevenStSearchResponse>(url, {
        params: {
          keyword: keyword.trim(),
          page,
          pageSize,
        },
        timeout: 15000,
        withCredentials: false,
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
    const keyword = getPrimaryStageKeyword(stage);
    return this.searchProducts(keyword, page, pageSize);
  }
};
