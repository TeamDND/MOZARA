# 실용적 병원 이미지 설정 가이드 (개선 버전)

## 개요
MOZARA 프로젝트에서 실제 병원 이미지를 안정적이고 실용적으로 사용하기 위한 설정 가이드입니다.

## 개선된 이미지 소스 시스템

### 1. Google Places API (1순위 - 추천)
- **장점**: 실제 병원 사진 제공, 고품질 이미지, 안정적
- **단점**: API 키 필요, 사용량 제한
- **비용**: 월 200달러 무료 크레딧

#### 설정 방법:
1. [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트 생성
2. Places API 활성화
3. API 키 생성
4. `.env` 파일에 추가:
```env
GOOGLE_PLACES_API_KEY=your_google_places_api_key_here
```

### 2. 네이버 플레이스 API (2순위 - 실용적)
- **장점**: 실제 병원 사진, 한국 내 병원 정보 풍부, 무료
- **단점**: API 키 필요, 한국 내 서비스만 지원
- **비용**: 무료

#### 설정 방법:
1. [네이버 개발자 센터](https://developers.naver.com/)에서 애플리케이션 등록
2. 검색 API 사용 신청
3. `.env` 파일에 추가:
```env
NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_client_secret
```

### 3. 카카오맵 API (3순위 - 실용적)
- **장점**: 실제 병원 사진, 상세한 장소 정보, 무료
- **단점**: API 키 필요, 사용량 제한
- **비용**: 무료 (일일 10,000회)

#### 설정 방법:
1. [카카오 개발자 콘솔](https://developers.kakao.com/)에서 애플리케이션 생성
2. REST API 키 복사
3. `.env` 파일에 추가:
```env
KAKAO_REST_API_KEY=your_kakao_rest_api_key_here
```

### 4. Google Custom Search API (4순위 - 보조)
- **장점**: Google Images 검색 결과, 안전한 이미지 필터링
- **단점**: API 키 필요, 사용량 제한
- **비용**: 일일 100회 무료

#### 설정 방법:
1. [Google Custom Search Engine](https://cse.google.com/)에서 검색 엔진 생성
2. [Google Cloud Console](https://console.cloud.google.com/)에서 Custom Search API 활성화
3. `.env` 파일에 추가:
```env
GOOGLE_CUSTOM_SEARCH_API_KEY=your_google_custom_search_api_key_here
GOOGLE_CUSTOM_SEARCH_ENGINE_ID=your_custom_search_engine_id_here
```

### 5. Unsplash API (5순위 - Fallback)
- **장점**: 무료, 고품질 이미지, 다양한 카테고리
- **단점**: 실제 병원 사진이 아닌 일반적인 이미지
- **비용**: 무료

#### 개선된 설정:
- 탈모병원: `hospital+medical`, `clinic+medical`, `doctor+office` 등 8개 쿼리
- 탈모미용실: `hair+salon`, `barbershop`, `hair+stylist` 등 8개 쿼리
- 가발전문점: `wig+hair`, `hair+piece`, `hair+extension` 등 8개 쿼리
- 두피문신: `tattoo+studio`, `scalp+micropigmentation`, `hair+tattoo` 등 8개 쿼리

## 이미지 최적화 기능

### 1. 자동 크기 조정
- Google Places API: `maxwidth=400&maxheight=200`
- Unsplash: `400x200` 크기로 자동 조정

### 2. 캐싱 시스템
- 백엔드: 24시간 메모리 캐시
- 프론트엔드: 이미지 로드 에러 상태 관리

### 3. 개선된 Fallback 시스템
1. **Google Places API** (실제 병원 사진)
2. **네이버 플레이스 API** (실제 병원 사진)
3. **카카오맵 API** (실제 병원 사진)
4. **Google Custom Search API** (관련 이미지)
5. **Unsplash 컬렉션** (고품질 관련 이미지)
6. **Unsplash 사용자** (전문 사진작가)
7. **기본 Unsplash** (랜덤 관련 이미지)

## 성능 최적화

### 1. Lazy Loading
```tsx
<img loading="lazy" />
```

### 2. 이미지 프리로딩
```tsx
const preloadImage = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(url);
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = url;
  });
};
```

### 3. 에러 처리
- 이미지 로드 실패 시 자동으로 기본 이미지로 대체
- 로딩 인디케이터 표시

## 사용법

### 백엔드에서 이미지 URL 생성:
```python
# Google Places API 사용
image_url = await get_google_places_image("병원명", "주소")

# 웹 스크래핑 사용
image_url = await scrape_hospital_images("병원명", "주소")

# 기본 이미지 생성
image_url = generate_default_image_url("카테고리", "병원명")
```

### 프론트엔드에서 이미지 최적화:
```tsx
// 이미지 URL 최적화
const optimizedUrl = optimizeImageUrl(hospital.imageUrl, 400, 200);

// 이미지 프리로딩
preloadImage(optimizedUrl).then(() => {
  // 이미지 로드 완료
});
```

## 권장 설정

### 개발 환경:
```env
# 1순위: Google Places API (실제 병원 사진)
GOOGLE_PLACES_API_KEY=your_google_places_api_key_here

# 2순위: 네이버 플레이스 API (실제 병원 사진)
NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_client_secret

# 3순위: 카카오맵 API (실제 병원 사진)
KAKAO_REST_API_KEY=your_kakao_rest_api_key_here

# 4순위: Google Custom Search API (관련 이미지)
GOOGLE_CUSTOM_SEARCH_API_KEY=your_google_custom_search_api_key_here
GOOGLE_CUSTOM_SEARCH_ENGINE_ID=your_custom_search_engine_id_here

# 5순위: Unsplash API (Fallback)
UNSPLASH_ACCESS_KEY=your_unsplash_access_key_here
```

### 프로덕션 환경:
1. Google Places API 키 설정 (권장)
2. 이미지 CDN 사용 고려
3. 이미지 압축 및 최적화

## 문제 해결

### 1. 이미지가 로드되지 않는 경우:
- API 키 확인
- 네트워크 연결 확인
- CORS 설정 확인

### 2. 이미지 품질이 낮은 경우:
- Google Places API 사용
- 이미지 크기 파라미터 조정

### 3. 로딩 속도가 느린 경우:
- 이미지 캐싱 확인
- CDN 사용 고려
- 이미지 압축 적용

## 추가 개선 방안

### 1. 이미지 CDN 사용
- Cloudinary
- AWS CloudFront
- Azure CDN

### 2. 이미지 압축
- WebP 포맷 사용
- 적응형 이미지 크기

### 3. 고급 캐싱
- Redis 캐시
- 브라우저 캐시 최적화

## 라이선스 고려사항

### Google Places API:
- Google의 이용약관 준수
- 이미지 사용 권한 확인

### Unsplash:
- Unsplash License (무료 사용 가능)
- 크레딧 표시 권장

### 웹 스크래핑:
- robots.txt 준수
- 저작권 고려
- 서버 부하 고려
