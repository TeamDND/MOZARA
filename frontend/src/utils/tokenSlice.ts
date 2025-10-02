// TypeScript: 토큰 상태 관리
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// TypeScript: 토큰 상태 인터페이스 정의
interface TokenState {
  token: string | null;
  jwtToken?: string; // JWT 토큰 필드 추가
  accessToken?: string; // OAuth2 Access Token
  refreshToken?: string; // OAuth2 Refresh Token
}

// TypeScript: 초기 상태 정의
const initialState: TokenState = {
  token: null,
  jwtToken: undefined,
  accessToken: undefined,
  refreshToken: undefined,
};

// TypeScript: 토큰 슬라이스 생성
const tokenSlice = createSlice({
  name: 'token',
  initialState,
  reducers: {
    // TypeScript: 토큰 설정 액션 (페이로드 타입 지정)
    setToken: (state, action: PayloadAction<string | { accessToken: string; refreshToken: string }>) => {
      if (typeof action.payload === 'string') {
        // 기존 방식: 단일 토큰 문자열
        state.token = action.payload;
        state.jwtToken = action.payload;
      } else {
        // OAuth2 방식: accessToken과 refreshToken 객체
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
        state.token = action.payload.accessToken; // 호환성을 위해 accessToken을 token으로도 설정
        state.jwtToken = action.payload.accessToken;
      }
    },
    // TypeScript: 토큰 클리어 액션
    clearToken: (state) => {
      state.token = null;
      state.jwtToken = undefined;
      state.accessToken = undefined;
      state.refreshToken = undefined;
    },
  },
});

// TypeScript: 액션 생성자들 export
export const { setToken, clearToken } = tokenSlice.actions;

// TypeScript: 리듀서 export
export default tokenSlice.reducer;

