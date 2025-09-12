import apiClient from './apiClient';

// TypeScript: 환경변수 설정 인터페이스
export interface ConfigResponse {
  apiBaseUrl: string;
  youtubeApiKey: string | null;
  hasYouTubeKey: boolean;
}

// TypeScript: 환경변수 설정 캐시
let configCache: ConfigResponse | null = null;
let configPromise: Promise<ConfigResponse> | null = null;

/**
 * 환경변수 설정 조회 API
 * 캐싱을 통해 중복 요청 방지
 */
export const configApi = {
  /**
   * 환경변수 설정 조회
   * @returns 환경변수 설정 정보
   */
  async getConfig(): Promise<ConfigResponse> {
    // 캐시된 설정이 있으면 반환
    if (configCache) {
      return configCache;
    }

    // 이미 요청 중이면 기존 Promise 반환
    if (configPromise) {
      return configPromise;
    }

    // 새로운 요청 생성
    configPromise = this.fetchConfig();
    
    try {
      const config = await configPromise;
      configCache = config;
      return config;
    } finally {
      configPromise = null;
    }
  },

  /**
   * 실제 API 호출
   */
  async fetchConfig(): Promise<ConfigResponse> {
    try {
      const response = await apiClient.get<ConfigResponse>('/config');
      return response.data;
    } catch (error) {
      console.error('환경변수 설정 조회 중 오류:', error);
      // 기본값 반환
      return {
        apiBaseUrl: 'http://localhost:8080/api',
        youtubeApiKey: null,
        hasYouTubeKey: false,
      };
    }
  },

  /**
   * 캐시 초기화 (환경변수 변경 시 사용)
   */
  clearCache(): void {
    configCache = null;
    configPromise = null;
  },

  /**
   * YouTube API 키 조회
   */
  async getYouTubeApiKey(): Promise<string | null> {
    const config = await this.getConfig();
    return config.youtubeApiKey;
  },

  /**
   * API Base URL 조회
   */
  async getApiBaseUrl(): Promise<string> {
    const config = await this.getConfig();
    return config.apiBaseUrl;
  },
};
