# JWT 토큰 검증 시스템 구조

## 📋 개요
MOZARA 프로젝트의 JWT 기반 인증 시스템 구조와 토큰 검증 흐름을 정리한 문서입니다.

## 🏗️ 백엔드 JWT 구조

### 1. JWT 토큰 구조
```json
{
  "category": "access" | "refresh",
  "username": "사용자명",
  "role": "USER" | "ADMIN",
  "exp": 1234567890,  // 만료 시간
  "iat": 1234567890   // 발급 시간
}
```

### 2. 토큰 타입
- **Access Token**: 1시간 유효, API 인증용
- **Refresh Token**: 24시간 유효, Access Token 재발급용

### 3. 주요 클래스들

#### `JwtUtil.java` - JWT 유틸리티
```java
// 위치: backend/springboot/src/main/java/com/example/springboot/jwt/JwtUtil.java
```
- `createToken(category, username, role, expiredMs)`: 토큰 생성
- `getUserName(token)`: 토큰에서 사용자명 추출
- `getRole(token)`: 토큰에서 역할 추출
- `getCategory(token)`: 토큰에서 카테고리 추출
- `isExpired(token)`: 토큰 만료 여부 확인

#### `JwtFilter.java` - JWT 검증 필터
```java
// 위치: backend/springboot/src/main/java/com/example/springboot/jwt/JwtFilter.java
```
- Authorization 헤더에서 Bearer 토큰 추출
- 토큰 만료 시간 검증 (456 상태코드 반환)
- 토큰 카테고리 검증 (access 토큰만 허용)
- Spring Security Context에 인증 정보 설정

#### `CustomUserDetailService.java` - 사용자 정보 서비스
```java
// 위치: backend/springboot/src/main/java/com/example/springboot/service/user/CustomUserDetailService.java
```
- 데이터베이스에서 사용자 정보 조회
- ROLE_ 접두사 자동 추가
- UserDetails 객체 생성

#### `ReissueController.java` - 토큰 재발급
```java
// 위치: backend/springboot/src/main/java/com/example/springboot/controller/ReissueController.java
```
- Refresh 토큰으로 Access 토큰 재발급
- 로그아웃 시 쿠키 만료 처리

## 🔐 프론트엔드 인증 시스템

### 1. 이중검증 시스템

#### 1차 검증 (클라이언트 사이드)
- 토큰과 사용자명 존재 확인
- 토큰 만료 시간 확인
- 토큰 타입 확인 (access 토큰)
- 토큰 사용자명과 Redux 사용자명 일치 확인

#### 2차 검증 (서버 사이드)
- 백엔드 `/api/user/seedling/my-seedling` API 호출
- 401/456 응답 시 자동 로그아웃 처리

### 2. Redux 상태 관리

#### `tokenSlice.ts`
```typescript
interface TokenState {
  token: string | null;
  jwtToken?: string;
}
```

#### `userSlice.ts`
```typescript
interface UserState {
  userId: number | null;
  username: string | null;
  nickname: string | null;
  email: string | null;
  address: string | null;
  gender: string | null;
  age: number | null;
  role: string | null;
}
```

### 3. 인증 유틸리티 (`authUtils.ts`)

#### 주요 함수들
- `verifyLoginStatus(state, dispatch)`: 이중검증 로그인 상태 확인
- `hasBasicAuth(state)`: 기본 로그인 상태 확인 (UI 표시용)
- `parseJwtToken(token)`: JWT 토큰 파싱
- `isTokenExpired(token)`: 토큰 만료 확인
- `isAccessToken(token)`: access 토큰 타입 확인
- `extractUserInfoFromToken(token)`: 토큰에서 사용자 정보 추출
- `isTokenUserMatch(state)`: 토큰과 Redux 사용자 정보 일치 확인

## 🔄 JWT 토큰 검증 흐름

### 1. 로그인 과정
```
1. 사용자 로그인 요청
2. CustomUserDetailService에서 사용자 인증
3. JwtLoginFilter에서 성공 시 토큰 발급
4. Authorization 헤더와 refresh 쿠키 설정
5. 프론트엔드에서 토큰 저장
```

### 2. API 요청 과정
```
1. 프론트엔드에서 Authorization 헤더에 토큰 포함
2. JwtFilter에서 토큰 검증
   - Bearer 토큰 추출
   - 토큰 만료 확인
   - 토큰 카테고리 확인 (access)
   - 사용자명과 역할 추출
3. SecurityContextHolder에 인증 정보 설정
4. 컨트롤러에서 @AuthenticationPrincipal로 사용자 정보 접근
```

### 3. 프론트엔드 검증 과정
```
1. 1차 검증: 토큰 존재, 만료, 타입, 사용자 일치 확인
2. 2차 검증: 백엔드 API 호출로 실제 인증 상태 확인
3. 검증 실패 시: 자동 로그아웃 및 상태 정리
4. 검증 성공 시: 보호된 기능 접근 허용
```

## 🛡️ 보안 설정

### SecurityConfig.java
```java
// 인증 규칙
.requestMatchers("/api/admin/**").hasRole("ADMIN")
.requestMatchers("/api/user/**").hasAnyRole("USER","ADMIN")

// JWT 필터 체인
.addFilterBefore(new JwtFilter(jwtUtil), JwtLoginFilter.class)
.addFilterAt(new JwtLoginFilter(...), UsernamePasswordAuthenticationFilter.class)
```

### 에러 처리
- **401 Unauthorized**: 인증 실패
- **456**: 토큰 만료 (커스텀 상태코드)
- **403 Forbidden**: 권한 부족

## 📱 사용 예시

### 프론트엔드에서 사용
```typescript
import { verifyLoginStatus, withAuthCheck } from '../utils/authUtils';

// 직접 검증
const result = await verifyLoginStatus(state, dispatch);
if (result.isVerified) {
  // 로그인된 사용자
}

// 래퍼 함수 사용
await withAuthCheck(
  state, 
  dispatch,
  () => navigate('/protected-page'), // 성공 시
  () => navigate('/login')           // 실패 시
);
```

### 백엔드에서 사용
```java
@GetMapping("/protected")
public ResponseEntity<?> protectedEndpoint(
    @AuthenticationPrincipal UserDetails userDetails) {
    String username = userDetails.getUsername();
    // 보호된 로직 실행
}
```

## 🔧 주요 엔드포인트

### 인증 관련
- `POST /api/login`: 로그인
- `POST /api/reissue`: 토큰 재발급
- `DELETE /api/logout`: 로그아웃

### 보호된 엔드포인트
- `GET /api/user/seedling/my-seedling`: 새싹 정보 조회 (토큰 검증용)
- `GET /api/user/**`: 사용자 관련 API
- `GET /api/admin/**`: 관리자 관련 API

## ⚠️ 주의사항

1. **토큰 보안**: Access Token은 1시간 후 만료
2. **자동 갱신**: Refresh Token으로 Access Token 자동 재발급
3. **상태 동기화**: 토큰과 Redux 상태 일치 확인 필수
4. **에러 처리**: 401/456 응답 시 자동 로그아웃 처리
5. **CORS 설정**: localhost:3000에서만 허용

---

*최종 업데이트: 2024년 12월*