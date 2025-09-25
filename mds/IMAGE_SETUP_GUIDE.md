# 실제 병원 이미지 설정 가이드

## 개요
MOZARA 프로젝트에서 실제 병원 이미지를 사용하기 위한 설정 가이드입니다.

## 지원하는 이미지 소스

### 1. Google Places API (추천)
- **장점**: 실제 병원 사진 제공, 고품질 이미지
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

### 2. Unsplash API (현재 사용 중)
- **장점**: 무료, 고품질 이미지, 다양한 카테고리
- **단점**: 실제 병원 사진이 아닌 일반적인 이미지
- **비용**: 무료

#### 현재 설정:
- 탈모병원: `hospital+medical`
- 탈모미용실: `hair+salon`
- 가발전문점: `wig+hair`
- 두피문신: `tattoo+studio`

### 3. 웹 스크래핑 (실험적)
- **장점**: 실제 병원 사진 가능
- **단점**: 불안정, 법적 이슈 가능성
- **비용**: 무료

## 이미지 최적화 기능

### 1. 자동 크기 조정
- Google Places API: `maxwidth=400&maxheight=200`
- Unsplash: `400x200` 크기로 자동 조정

### 2. 캐싱 시스템
- 백엔드: 24시간 메모리 캐시
- 프론트엔드: 이미지 로드 에러 상태 관리

### 3. Fallback 시스템
1. Google Places API 이미지
2. Unsplash 이미지
3. 카테고리별 기본 이미지

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
# Google Places API (선택사항)
GOOGLE_PLACES_API_KEY=your_key_here

# 기존 API 키들
NAVER_CLIENT_ID=your_naver_client_id
NAVER_CLIENT_SECRET=your_naver_client_secret
KAKAO_REST_API_KEY=your_kakao_api_key
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
