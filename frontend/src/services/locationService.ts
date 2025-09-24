// 위치기반 서비스 API
export interface Location {
  latitude: number;
  longitude: number;
}

export interface Hospital {
  id: string;
  name: string;
  address: string;
  phone: string;
  specialties: string[];
  rating: number;
  distance: number; // 미터 단위
  description: string;
  imageUrl?: string;
  category: string;
  roadAddress?: string;
  placeUrl?: string;
  latitude?: number;
  longitude?: number;
}

export interface SearchParams {
  query: string;
  location?: Location;
  radius?: number; // 미터 단위, 기본값 5000m
  category?: string;
}

class LocationService {
  private apiBaseUrl: string;

  constructor() {
    // 백엔드 API URL 설정 (프로젝트 루트의 .env 파일 참조)
    const envBase = (process.env.REACT_APP_API_BASE_URL || '').trim();
    let base = envBase || 'http://localhost:8000/api';
    // 방어적 정규화: /api 누락 시 자동 보정
    try {
      const url = new URL(base);
      if (!url.pathname.endsWith('/api')) {
        url.pathname = (url.pathname.replace(/\/$/, '')) + '/api';
      }
      base = url.toString().replace(/\/$/, '');
    } catch {
      // 만약 URL 파싱 실패 시 안전 기본값 사용
      base = 'http://localhost:8000/api';
    }

    this.apiBaseUrl = base;

    console.log('LocationService 초기화 (프로젝트 루트 .env 참조):');
    console.log('API Base URL:', this.apiBaseUrl);
    console.log('REACT_APP_API_BASE_URL(raw):', process.env.REACT_APP_API_BASE_URL);
    console.log('프로젝트 루트의 .env 파일에서 환경변수를 로드합니다.');
  }
  // 주소/키워드로 좌표 보정 (카카오 키워드 검색 이용)
  private async fetchCoordsByKeyword(keyword: string, center?: Location, radius: number = 5000): Promise<{ lat: number; lng: number } | null> {
    try {
      let url = `${this.apiBaseUrl}/kakao/local/search?query=${encodeURIComponent(keyword)}`;
      if (center) {
        url += `&x=${center.longitude}&y=${center.latitude}&radius=${radius}`;
      }
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      const doc = (data.documents || [])[0];
      if (!doc) return null;
      const lat = parseFloat(doc.y);
      const lng = parseFloat(doc.x);
      if (isFinite(lat) && isFinite(lng)) return { lat, lng };
      return null;
    } catch {
      return null;
    }
  }

  private isValidKoreanCoord(lat?: number, lng?: number): boolean {
    if (typeof lat !== 'number' || typeof lng !== 'number' || !isFinite(lat) || !isFinite(lng)) return false;
    return lat >= 33 && lat <= 39 && lng >= 124 && lng <= 132; // 대략 한반도 영역
  }


  // 검색어를 내부 카테고리와 검색키워드로 정규화
  private normalizeQuery(rawQuery: string): { canonicalCategory: string | null; searchQuery: string } {
    const q = (rawQuery || '').toLowerCase().trim();

    // 병원 계열
    const hospitalSynonyms = [
      '병원 추천', '탈모 치료 병원', '피부과', '모발이식 전문 병원', '탈모 클리닉', '탈모병원', '탈모 전문 병원'
    ];
    if (hospitalSynonyms.some(s => q.includes(s.toLowerCase()))) {
      // 병원 + 의원을 아우르는 키워드로 검색
      return { canonicalCategory: '탈모병원', searchQuery: '탈모병원의원' };
    }

    // 전용 미용/관리 계열
    const salonSynonyms = [
      '전용 미용', '두피 관리 센터', '탈모 전문 헤어살롱', '헤드 스파', '탈모미용실', '탈모 전용 미용실'
    ];
    if (salonSynonyms.some(s => q.includes(s.toLowerCase()))) {
      return { canonicalCategory: '탈모미용실', searchQuery: '탈모 전용 미용실' };
    }

    // 두피문신(SMP)
    const smpSynonyms = [
      '두피 문신', 'smp', 'scalp micropigmentation', '두피 커버 시술', '두피문신'
    ];
    if (smpSynonyms.some(s => q.includes(s.toLowerCase()))) {
      // 두피문신 검색 시 SMP 키워드를 반드시 포함하여 정확도 향상
      return { canonicalCategory: '두피문신', searchQuery: '두피문신 SMP' };
    }

    // 가발/증모술
    const wigSynonyms = [
      '가발 전문점', '맞춤 가발', '탈모 보완 가발', '증모술', '가발전문점'
    ];
    if (wigSynonyms.some(s => q.includes(s.toLowerCase()))) {
      return { canonicalCategory: '가발전문점', searchQuery: '맞춤 가발 전문점' };
    }

    return { canonicalCategory: null, searchQuery: rawQuery };
  }

  // 현재 위치 가져오기
  async getCurrentLocation(): Promise<Location> {
    return new Promise((resolve, reject) => {
      // HTTPS 체크 (로컬 개발 환경 제외)
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        reject(new Error('HTTPS 환경에서만 위치 정보를 사용할 수 있습니다.'));
        return;
      }

      if (!navigator.geolocation) {
        reject(new Error('이 브라우저는 위치 정보를 지원하지 않습니다.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location: Location = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          console.log('현재 위치:', location);
          resolve(location);
        },
        (error) => {
          let errorMessage = '위치 정보를 가져올 수 없습니다.';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = '위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = '위치 정보를 사용할 수 없습니다.';
              break;
            case error.TIMEOUT:
              errorMessage = '위치 정보 요청 시간이 초과되었습니다.';
              break;
          }
          
          reject(new Error(`Geolocation error: ${errorMessage}`));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000, // 5분
        }
      );
    });
  }

  // 네이버 플레이스 API로 병원 검색 (백엔드 프록시 통해)
  async searchHospitalsWithNaver(params: SearchParams): Promise<Hospital[]> {
    const { query, location } = params;

    try {
      const response = await fetch(`${this.apiBaseUrl}/naver/local/search?query=${encodeURIComponent(query)}`);

      if (!response.ok) {
        console.warn('Naver API 호출 실패:', response.status);
        return [];
      }

      const data = await response.json();
      if ((data as any).error) throw new Error(String((data as any).error));
      return this.transformNaverResults(data.items || [], location, query);
    } catch (error) {
      console.error('Naver API error:', error);
      return []; // 에러 시 빈 배열 반환
    }
  }

  // 카카오 로컬 API로 병원 검색 (백엔드 프록시 통해)
  async searchHospitalsWithKakao(params: SearchParams): Promise<Hospital[]> {
    const { query, location, radius = 5000 } = params;

    try {
      let url = `${this.apiBaseUrl}/kakao/local/search?query=${encodeURIComponent(query)}`;

      if (location) {
        url += `&x=${location.longitude}&y=${location.latitude}&radius=${radius}`;
      }

      const response = await fetch(url);

      if (!response.ok) {
        console.warn('Kakao API 호출 실패:', response.status);
        return [];
      }

      const data = await response.json();
      if ((data as any).error) throw new Error(String((data as any).error));
      return this.transformKakaoResults(data.documents || [], location, query);
    } catch (error) {
      console.error('Kakao API error:', error);
      return []; // 에러 시 빈 배열 반환
    }
  }

  // 네이버 결과를 Hospital 형태로 변환
  private transformNaverResults(items: any[], userLocation?: Location, query?: string): Hospital[] {
    const q = (query || '').toLowerCase();
    const isSmp = q.includes('문신') || q.includes('smp') || q.includes('두피') || q.includes('scalp');
    const isHairSalon = q.includes('미용실') || q.includes('헤어살롱') || q.includes('탈모전용');
    const isWigShop = q.includes('가발') || q.includes('증모술');

    return items
      .filter(item => {
        const cat = item.category || '';
        const name = item.title || '';
        const desc = item.description || '';

        // 의료/병원 관련 - 더 광범위하게 수정
        const isMedical = cat.includes('의료') || cat.includes('병원') || cat.includes('클리닉') ||
                         cat.includes('의원') || cat.includes('피부과') || cat.includes('성형외과') ||
                         cat.includes('한의원') || cat.includes('치과') || cat.includes('내과') ||
                         cat.includes('외과') || cat.includes('센터') ||
                         name.includes('병원') || name.includes('의원') || name.includes('클리닉') ||
                         name.includes('센터') || name.includes('피부과');

        // 미용/헤어살롱 관련
        const isBeauty = cat.includes('미용') || cat.includes('헤어') || cat.includes('두피') ||
                        cat.includes('남성전문미용실') || cat.includes('여성전용미용실') ||
                        name.includes('미용실') || name.includes('헤어살롱') || name.includes('탈모전용') ||
                        name.includes('맨즈헤어') || name.includes('헤어');

        // 문신/SMP 관련
        const isTattoo = cat.includes('문신') || cat.includes('두피문신') || cat.includes('SMP') ||
                        name.includes('문신') || name.includes('SMP');

        // 가발 관련
        const isWig = cat.includes('가발') || name.includes('가발') || name.includes('증모술');

        // 카테고리별 필터링 - 탈모미용실은 모든 미용실 포함
        if (isSmp) return isTattoo || isMedical;
        if (isHairSalon) {
          // 탈모미용실 검색 시 모든 미용실/헤어살롱을 포함
          return isBeauty || isMedical ||
                 cat.includes('생활') || cat.includes('편의') ||
                 cat.includes('남성') || cat.includes('여성') ||
                 name.toLowerCase().includes('hair') ||
                 name.toLowerCase().includes('salon') ||
                 name.toLowerCase().includes('style');
        }
        if (isWigShop) return isWig;

        // 기본적으로 의료 관련만 포함 - 더 관대하게
        return isMedical ||
               cat.includes('건강') || cat.includes('의료') ||
               name.includes('의료') || name.includes('건강') ||
               (q.includes('탈모') && (cat.includes('미용') || name.includes('피부')));
      })
      .map(item => {
        const hospital: Hospital = {
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
        };
        return hospital;
      });
  }

  // 카카오 결과를 Hospital 형태로 변환
  private transformKakaoResults(documents: any[], userLocation?: Location, query?: string): Hospital[] {
    const q = (query || '').toLowerCase();
    const isSmp = q.includes('문신') || q.includes('smp') || q.includes('두피') || q.includes('scalp');
    const isHairSalon = q.includes('미용실') || q.includes('헤어살롱') || q.includes('탈모전용');
    const isWigShop = q.includes('가발') || q.includes('증모술');

    return documents
      .filter(doc => {
        const cat = doc.category_name || '';
        const name = doc.place_name || '';

        // 의료/병원 관련 - 더 광범위하게 수정
        const isMedical = cat.includes('의료') || cat.includes('병원') || cat.includes('클리닉') ||
                         cat.includes('의원') || cat.includes('피부과') || cat.includes('성형외과') ||
                         cat.includes('한의원') || cat.includes('치과') || cat.includes('내과') ||
                         cat.includes('외과') || cat.includes('센터') ||
                         name.includes('병원') || name.includes('의원') || name.includes('클리닉') ||
                         name.includes('센터') || name.includes('피부과');

        // 미용/헤어살롱 관련
        const isBeauty = cat.includes('미용') || cat.includes('헤어') || cat.includes('두피') ||
                        cat.includes('남성전문미용실') || cat.includes('여성전용미용실') ||
                        name.includes('미용실') || name.includes('헤어살롱') || name.includes('탈모전용') ||
                        name.includes('맨즈헤어') || name.includes('헤어');

        // 문신/SMP 관련
        const isTattoo = cat.includes('문신') || cat.includes('두피문신') || cat.includes('SMP') ||
                        name.includes('문신') || name.includes('SMP');

        // 가발 관련
        const isWig = cat.includes('가발') || name.includes('가발') || name.includes('증모술');

        // 카테고리별 필터링 - 탈모미용실은 모든 미용실 포함
        if (isSmp) return isTattoo || isMedical;
        if (isHairSalon) {
          // 탈모미용실 검색 시 모든 미용실/헤어살롱을 포함
          return isBeauty || isMedical ||
                 cat.includes('가정,생활') || cat.includes('생활') ||
                 cat.includes('남성') || cat.includes('여성') ||
                 name.toLowerCase().includes('hair') ||
                 name.toLowerCase().includes('salon') ||
                 name.toLowerCase().includes('style');
        }
        if (isWigShop) return isWig;

        // 기본적으로 의료 관련만 포함 - 더 관대하게
        return isMedical ||
               cat.includes('건강') || cat.includes('의료') ||
               name.includes('의료') || name.includes('건강') ||
               (q.includes('탈모') && (cat.includes('미용') || name.includes('피부')));
      })
      .map(doc => {
        const hospital: Hospital = {
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
        };
        return hospital;
      });
  }

  // 카테고리에서 전문과목 추출
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
    if (category.includes('문신') || category.includes('두피문신') || category.includes('SMP')) {
      specialties.push('두피문신', '헤어라인복원', '두피관리');
    }
    if (category.includes('미용') || category.includes('헤어') || category.includes('탈모전용')) {
      specialties.push('탈모전용미용실', '두피케어', '모발관리');
    }
    if (category.includes('가발') || category.includes('증모술')) {
      specialties.push('가발제작', '가발수리', '두피관리');
    }
    if (category.includes('클리닉') || category.includes('센터')) {
      specialties.push('탈모치료', '두피관리', '모발진단');
    }

    // 기본값
    if (specialties.length === 0) {
      specialties.push('탈모치료', '두피관리');
    }

    // 중복 제거하여 반환
    return Array.from(new Set(specialties));
  }

  // 두 지점 간의 거리 계산 (Haversine 공식)
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

  // 거리 포맷팅
  formatDistance(distance: number): string {
    if (distance < 1000) {
      return `${distance}m`;
    } else {
      return `${(distance / 1000).toFixed(1)}km`;
    }
  }

  // 샘플 병원 데이터 (현재 위치 기반으로 거리 계산) - 4개 카테고리만
  private getSampleHospitals(userLocation?: Location): Hospital[] {
    const sampleHospitals = [
      // 탈모병원
      {
        id: 'sample_1',
        name: "모자라 탈모 전문 클리닉",
        address: "서울특별시 강남구 테헤란로 123",
        phone: "02-1234-5678",
        specialties: ["탈모치료", "모발이식", "두피관리"],
        rating: 4.8,
        latitude: 37.5665,
        longitude: 127.0330,
        description: "20년 경력의 전문의가 직접 진료하는 탈모 전문 클리닉입니다.",
        category: "탈모병원",
      },
      {
        id: 'sample_2',
        name: "강남 탈모 치료센터",
        address: "서울특별시 강남구 논현로 234",
        phone: "02-6789-0123",
        specialties: ["탈모치료", "두피관리"],
        rating: 4.4,
        latitude: 37.5172,
        longitude: 127.0473,
        description: "강남 지역 최고의 탈모 치료 전문 센터입니다.",
        category: "탈모병원",
      },
      {
        id: 'sample_3',
        name: "스마트 헤어 클리닉",
        address: "서울특별시 영등포구 여의도동 202",
        phone: "02-5678-9012",
        specialties: ["탈모치료", "두피관리", "모발진단"],
        rating: 4.5,
        latitude: 37.5219,
        longitude: 126.9242,
        description: "AI 진단 시스템을 도입한 스마트 헤어 관리 클리닉입니다.",
        category: "탈모병원",
      },
      {
        id: 'sample_4',
        name: "프리미엄 모발이식원",
        address: "서울특별시 마포구 홍대입구역 101",
        phone: "02-4567-8901",
        specialties: ["모발이식", "FUE", "두피진단"],
        rating: 4.9,
        latitude: 37.5563,
        longitude: 126.9226,
        description: "FUE 기술을 활용한 고품질 모발이식 전문 병원입니다.",
        category: "탈모병원",
      },
      
      // 탈모미용실
      {
        id: 'sample_5',
        name: "탈모전용 헤어살롱",
        address: "서울특별시 강남구 압구정로 123",
        phone: "02-1111-2222",
        specialties: ["탈모전용미용실", "두피케어", "모발관리"],
        rating: 4.6,
        latitude: 37.5275,
        longitude: 127.0286,
        description: "탈모 고객을 위한 전문 헤어살롱입니다.",
        category: "탈모미용실",
      },
      {
        id: 'sample_6',
        name: "두피케어 헤어샵",
        address: "서울특별시 서초구 서초대로 456",
        phone: "02-3333-4444",
        specialties: ["탈모전용미용실", "두피관리", "모발진단"],
        rating: 4.4,
        latitude: 37.4946,
        longitude: 127.0276,
        description: "두피 건강에 특화된 전문 헤어샵입니다.",
        category: "탈모미용실",
      },
      {
        id: 'sample_7',
        name: "모발복원 헤어스튜디오",
        address: "서울특별시 마포구 홍대입구역 789",
        phone: "02-5555-6666",
        specialties: ["탈모전용미용실", "모발복원", "두피케어"],
        rating: 4.8,
        latitude: 37.5563,
        longitude: 126.9226,
        description: "모발 복원과 두피 케어 전문 헤어스튜디오입니다.",
        category: "탈모미용실",
      },
      {
        id: 'sample_8',
        name: "헤어라인 복원센터",
        address: "서울특별시 서초구 강남대로 456",
        phone: "02-2345-6789",
        specialties: ["모발이식", "헤어라인복원", "두피진단"],
        rating: 4.6,
        latitude: 37.4946,
        longitude: 127.0276,
        description: "최신 기술을 활용한 모발이식과 헤어라인 복원 전문 병원입니다.",
        category: "탈모미용실",
      },
      
      // 가발전문점
      {
        id: 'sample_9',
        name: "프리미엄 가발 전문점",
        address: "서울특별시 송파구 올림픽로 101",
        phone: "02-7777-8888",
        specialties: ["가발제작", "가발수리", "두피관리"],
        rating: 4.7,
        latitude: 37.5206,
        longitude: 127.1218,
        description: "고품질 가발 제작과 수리를 제공하는 전문점입니다.",
        category: "가발전문점",
      },
      {
        id: 'sample_10',
        name: "헤어라인 가발샵",
        address: "서울특별시 종로구 세종대로 202",
        phone: "02-9999-0000",
        specialties: ["가발제작", "가발수리", "두피진단"],
        rating: 4.3,
        latitude: 37.5665,
        longitude: 126.9780,
        description: "자연스러운 헤어라인 가발을 제작하는 전문샵입니다.",
        category: "가발전문점",
      },
      {
        id: 'sample_11',
        name: "모발복원 가발센터",
        address: "서울특별시 영등포구 여의도동 303",
        phone: "02-1234-5679",
        specialties: ["가발제작", "두피관리", "모발진단"],
        rating: 4.2,
        latitude: 37.5219,
        longitude: 126.9242,
        description: "모발 복원을 위한 고품질 가발을 제작하는 센터입니다.",
        category: "가발전문점",
      },
      {
        id: 'sample_12',
        name: "스타일 가발 스튜디오",
        address: "서울특별시 서대문구 신촌로 404",
        phone: "02-2345-6780",
        specialties: ["가발제작", "두피분석", "스타일링"],
        rating: 4.5,
        latitude: 37.5598,
        longitude: 126.9373,
        description: "개인 맞춤형 가발 제작과 스타일링을 제공하는 스튜디오입니다.",
        category: "가발전문점",
      },
      
      // 두피문신
      {
        id: 'sample_13',
        name: "두피문신 아트 스튜디오",
        address: "서울특별시 송파구 올림픽로 789",
        phone: "02-3456-7890",
        specialties: ["두피문신", "헤어라인복원", "두피관리"],
        rating: 4.7,
        latitude: 37.5206,
        longitude: 127.1218,
        description: "자연스러운 두피문신과 헤어라인 복원 전문 스튜디오입니다.",
        category: "두피문신",
      },
      {
        id: 'sample_14',
        name: "헤어라인 문신 클리닉",
        address: "서울특별시 종로구 세종대로 890",
        phone: "02-8901-2345",
        specialties: ["두피문신", "헤어라인복원", "두피관리"],
        rating: 4.3,
        latitude: 37.5665,
        longitude: 126.9780,
        description: "전문적인 두피문신과 헤어라인 복원 서비스를 제공합니다.",
        category: "두피문신",
      },
      {
        id: 'sample_15',
        name: "모발 재생 연구소",
        address: "서울특별시 서대문구 신촌로 567",
        phone: "02-7890-1234",
        specialties: ["두피문신", "FUE", "모발진단"],
        rating: 4.7,
        latitude: 37.5598,
        longitude: 126.9373,
        description: "최신 모발 재생 기술을 연구하는 전문 기관입니다.",
        category: "두피문신",
      },
      {
        id: 'sample_16',
        name: "두피 건강 클리닉",
        address: "서울특별시 종로구 세종대로 202",
        phone: "02-9999-0000",
        specialties: ["두피문신", "두피진단", "탈모예방"],
        rating: 4.3,
        latitude: 37.5665,
        longitude: 126.9780,
        description: "두피 건강에 특화된 전문 클리닉입니다.",
        category: "두피문신",
      }
    ];

    // 현재 위치가 있으면 실제 거리 계산, 없으면 기본 거리 사용
    return sampleHospitals.map(hospital => ({
      ...hospital,
      distance: userLocation ? 
        this.calculateDistance(
          userLocation.latitude, 
          userLocation.longitude, 
          hospital.latitude, 
          hospital.longitude
        ) : Math.random() * 5000 + 500
    }));
  }

  // 통합 병원 검색 (백엔드 프록시를 통한 안전한 호출)
  async searchHospitals(params: SearchParams): Promise<Hospital[]> {
    try {
      // 검색어 정규화 (전문 용어 → 내부 카테고리 및 API 검색어)
      const { canonicalCategory, searchQuery } = this.normalizeQuery(params.query);
      const normalizedParams: SearchParams = {
        ...params,
        query: searchQuery || params.query,
      };
      // 백엔드 서버 상태 확인
      const serverStatus = await this.checkBackendServer();
      
      if (!serverStatus) {
        console.warn('백엔드 서버가 연결되지 않아 샘플 데이터를 반환합니다.');
        // 샘플 데이터는 정규화된 카테고리를 우선 반영
        return this.getFilteredSampleData({ ...normalizedParams, query: (canonicalCategory ?? normalizedParams.query) as string });
      }

      const [naverResults, kakaoResults] = await Promise.allSettled([
        this.searchHospitalsWithNaver(normalizedParams),
        this.searchHospitalsWithKakao(normalizedParams),
      ]);

      const hospitals: Hospital[] = [];

      if (naverResults.status === 'fulfilled') {
        hospitals.push(...naverResults.value);
      }

      if (kakaoResults.status === 'fulfilled') {
        hospitals.push(...kakaoResults.value);
      }

      // API 결과가 없으면 샘플 데이터 반환
      if (hospitals.length === 0) {
        console.warn('No API results, returning sample data');
        return this.getFilteredSampleData({ ...normalizedParams, query: (canonicalCategory ?? normalizedParams.query) as string });
      }

      // 중복 제거 (이름과 주소 기준)
      let uniqueHospitals = hospitals.filter((hospital, index, self) =>
        index === self.findIndex(h =>
          h.name === hospital.name && h.address === hospital.address
        )
      );

      // 좌표가 없거나 비정상인 경우 주소로 보정
      if (uniqueHospitals.length > 0) {
        const filled = await Promise.all(uniqueHospitals.map(async (h) => {
          if (!this.isValidKoreanCoord(h.latitude, h.longitude)) {
            const coords = await this.fetchCoordsByKeyword(h.roadAddress || h.address || h.name, params.location, params.radius ?? 5000);
            if (coords) {
              h.latitude = coords.lat;
              h.longitude = coords.lng;
              if (params.location) {
                h.distance = this.calculateDistance(
                  params.location.latitude,
                  params.location.longitude,
                  coords.lat,
                  coords.lng
                );
              }
            }
          }
          return h;
        }));
        uniqueHospitals = filled;
      }

      // 위치 기반 필터링(반경) + 거리순 정렬 강제
      const radius = params.radius ?? 5000;
      let locationBounded = uniqueHospitals;
      if (params.location) {
        locationBounded = uniqueHospitals.filter(h =>
          typeof h.distance === 'number' && isFinite(h.distance) && h.distance <= radius
        );
      }

      return locationBounded.sort((a, b) => a.distance - b.distance);
    } catch (error) {
      console.error('Hospital search error:', error);
      // 에러 시 샘플 데이터 반환
      const { canonicalCategory } = this.normalizeQuery(params.query);
      return this.getFilteredSampleData({ ...params, query: (canonicalCategory ?? params.query) as string });
    }
  }

  // 백엔드 서버 상태 확인
  private async checkBackendServer(): Promise<boolean> {
    try {
      // 1차: 새로운 엔드포인트 (/location/status)
      let response = await fetch(`${this.apiBaseUrl}/location/status`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      if (response.ok) return true;

      // 2차: 과거 호환 (/config)
      response = await fetch(`${this.apiBaseUrl}/config`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch (error) {
      console.error('백엔드 서버 연결 실패:', error);
      return false;
    }
  }

  // 검색어에 따른 샘플 데이터 필터링
  private getFilteredSampleData(params: SearchParams): Hospital[] {
    const sampleData = this.getSampleHospitals(params.location);

    if (params.query) {
      const query = params.query.toLowerCase();
      
      // 카테고리별 필터링 (정확한 매칭)
      if (query === '탈모병원' || query === '탈모미용실' || query === '가발전문점' || query === '두피문신') {
        return sampleData.filter(hospital => hospital.category === query);
      }
      
      // 일반 검색어 필터링
      return sampleData.filter(hospital =>
        hospital.name.toLowerCase().includes(query) ||
        hospital.address.toLowerCase().includes(query) ||
        hospital.specialties.some(specialty => specialty.toLowerCase().includes(query)) ||
        hospital.description.toLowerCase().includes(query) ||
        hospital.category.toLowerCase().includes(query)
      );
    }

    return sampleData;
  }
}

export const locationService = new LocationService();