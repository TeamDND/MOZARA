// Python Backend를 통한 위치 기반 검색 API 클라이언트
import { Location, Hospital, SearchParams } from './locationService';
import pythonClient from './pythonClient';

/**
 * Python Backend LocationProvider
 *
 * LocationController(SpringBoot)를 Python으로 이전한 서비스
 * - 네이버/카카오 API 키를 Python .env에서 관리
 * - 로컬/배포 환경변수 통합 관리
 * - SpringBoot 의존성 제거
 */
class LocationProvider {
  constructor() {
  }

  /**
   * 네이버 로컬 검색 API (Python 프록시)
   * @param query 검색 키워드
   * @returns 네이버 검색 결과
   */
  async searchWithNaver(query: string): Promise<any> {
    try {
      const response = await pythonClient.get(`/api/naver/local/search`, {
        params: { query }
      });
      return response.data;
    } catch (error: any) {
      console.error('네이버 검색 중 오류:', error);
      throw new Error(error.message || '네이버 검색 서비스에 문제가 발생했습니다.');
    }
  }

  /**
   * 카카오 로컬 검색 API (Python 프록시)
   * @param query 검색 키워드
   * @param x 경도 (선택사항)
   * @param y 위도 (선택사항)
   * @param radius 반경 (기본 5000m)
   * @returns 카카오 검색 결과
   */
  async searchWithKakao(
    query: string,
    x?: number,
    y?: number,
    radius: number = 5000
  ): Promise<any> {
    try {
      const params: any = { query };
      if (x !== undefined && y !== undefined) {
        params.x = x;
        params.y = y;
        params.radius = radius;
      }

      const response = await pythonClient.get(`/api/kakao/local/search`, { params });
      return response.data;
    } catch (error: any) {
      console.error('카카오 검색 중 오류:', error);
      throw new Error(error.message || '카카오 검색 서비스에 문제가 발생했습니다.');
    }
  }

  /**
   * Python 위치 서비스 상태 확인
   * @returns 서비스 상태 정보
   */
  async checkLocationServiceStatus(): Promise<{
    status: string;
    message: string;
    naverApiConfigured: boolean;
    kakaoApiConfigured: boolean;
    timestamp?: string;
  }> {
    try {
      const response = await pythonClient.get(`/api/location/status`);
      return response.data;
    } catch (error: any) {
      console.error('Python 위치 서비스 상태 확인 실패:', error);
      return {
        status: 'error',
        message: 'Python 위치 서비스에 연결할 수 없습니다.',
        naverApiConfigured: false,
        kakaoApiConfigured: false,
      };
    }
  }

  /**
   * 기존 locationService와 호환되는 통합 검색
   * @param params 검색 파라미터
   * @returns Hospital 배열
   */
  async searchHospitals(params: SearchParams): Promise<Hospital[]> {
    const { query, location, radius = 5000 } = params;

    try {
      // 네이버와 카카오 동시 검색
      const [naverResults, kakaoResults] = await Promise.allSettled([
        this.searchWithNaver(query),
        location ? this.searchWithKakao(query, location.longitude, location.latitude, radius)
                : this.searchWithKakao(query),
      ]);

      const hospitals: Hospital[] = [];

      // 네이버 결과 처리
      if (naverResults.status === 'fulfilled' && naverResults.value?.items) {
        const naverHospitals = this.transformNaverToHospitals(naverResults.value.items, location);
        hospitals.push(...naverHospitals);
      }

      // 카카오 결과 처리
      if (kakaoResults.status === 'fulfilled' && kakaoResults.value?.documents) {
        const kakaoHospitals = this.transformKakaoToHospitals(kakaoResults.value.documents, location);
        hospitals.push(...kakaoHospitals);
      }

      // 중복 제거 (이름과 주소 기준)
      const uniqueHospitals = hospitals.filter((hospital, index, self) =>
        index === self.findIndex(h =>
          h.name === hospital.name && h.address === hospital.address
        )
      );

      // 거리순 정렬
      if (location) {
        uniqueHospitals.sort((a, b) => a.distance - b.distance);
      }

      return uniqueHospitals;
    } catch (error: any) {
      console.error('병원 검색 중 오류:', error);
      throw new Error('병원 검색 서비스에 문제가 발생했습니다.');
    }
  }

  /**
   * 네이버 결과를 Hospital 형태로 변환
   */
  private transformNaverToHospitals(items: any[], userLocation?: Location): Hospital[] {
    return items.map(item => ({
      id: `naver_${item.title.replace(/\s+/g, '_')}`,
      name: item.title.replace(/<[^>]*>/g, ''), // HTML 태그 제거
      address: item.address,
      roadAddress: item.roadAddress,
      phone: item.telephone || '전화번호 없음',
      specialties: this.extractSpecialties(item.category),
      rating: 4.0 + Math.random() * 1.0, // 4.0-5.0 사이 랜덤
      distance: userLocation ? this.calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        parseFloat(item.mapy) / 1000000,
        parseFloat(item.mapx) / 1000000
      ) : 0,
      description: item.description || '탈모 치료 전문 병원입니다.',
      category: item.category,
      placeUrl: item.link,
      latitude: parseFloat(item.mapy) / 1000000,
      longitude: parseFloat(item.mapx) / 1000000,
    }));
  }

  /**
   * 카카오 결과를 Hospital 형태로 변환
   */
  private transformKakaoToHospitals(documents: any[], userLocation?: Location): Hospital[] {
    return documents.map(doc => ({
      id: `kakao_${doc.id}`,
      name: doc.place_name,
      address: doc.address_name,
      roadAddress: doc.road_address_name,
      phone: doc.phone || '전화번호 없음',
      specialties: this.extractSpecialties(doc.category_name),
      rating: 4.0 + Math.random() * 1.0, // 4.0-5.0 사이 랜덤
      distance: userLocation ? this.calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        parseFloat(doc.y),
        parseFloat(doc.x)
      ) : 0,
      description: '탈모 치료 전문 병원입니다.',
      category: doc.category_name,
      placeUrl: doc.place_url,
      latitude: parseFloat(doc.y),
      longitude: parseFloat(doc.x),
    }));
  }

  /**
   * 카테고리에서 전문과목 추출
   */
  private extractSpecialties(category: string): string[] {
    const specialties: string[] = [];

    if (category.includes('피부과')) {
      specialties.push('탈모치료', '두피관리', '모발진단');
    }
    if (category.includes('성형외과')) {
      specialties.push('모발이식', '헤어라인복원', 'FUE');
    }
    if (category.includes('의원') || category.includes('병원')) {
      specialties.push('탈모치료', '두피진단', '탈모예방');
    }
    if (category.includes('미용') || category.includes('헤어')) {
      specialties.push('탈모전용미용실', '두피케어', '모발관리');
    }

    // 기본값
    if (specialties.length === 0) {
      specialties.push('탈모치료', '두피관리');
    }

    return Array.from(new Set(specialties));
  }

  /**
   * 두 지점 간의 거리 계산 (Haversine 공식)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000; // 지구 반지름 (미터)
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance);
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export const locationProvider = new LocationProvider();

// 기존 locationService와의 호환성을 위한 래퍼
export const createLocationProviderWrapper = () => ({
  // Python 기반 검색
  searchHospitalsWithPython: (params: SearchParams) => locationProvider.searchHospitals(params),

  // 서비스 상태 확인
  checkPythonLocationService: () => locationProvider.checkLocationServiceStatus(),

  // 개별 API 호출
  searchNaver: (query: string) => locationProvider.searchWithNaver(query),
  searchKakao: (query: string, location?: Location, radius?: number) =>
    location ? locationProvider.searchWithKakao(query, location.longitude, location.latitude, radius)
            : locationProvider.searchWithKakao(query),
});