// TypeScript: 토큰 상태 관리
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// TypeScript: 토큰 상태 인터페이스 정의
interface TokenState {
  token: string | null;
  jwtToken?: string; // JWT 토큰 필드 추가
}

// TypeScript: 초기 상태 정의
const initialState: TokenState = {
  token: null,
  jwtToken: undefined,
};

// TypeScript: 토큰 슬라이스 생성
const tokenSlice = createSlice({
  name: 'token',
  initialState,
  reducers: {
    // TypeScript: 토큰 설정 액션 (페이로드 타입 지정)
    setToken: (state, action: PayloadAction<string>) => {
      state.token = action.payload;
      state.jwtToken = action.payload; // JWT 토큰도 함께 설정
    },
    // TypeScript: 토큰 클리어 액션
    clearToken: (state) => {
      state.token = null;
      state.jwtToken = undefined;
    },
  },
});

// TypeScript: 액션 생성자들 export
export const { setToken, clearToken } = tokenSlice.actions;

// TypeScript: 리듀서 export
export default tokenSlice.reducer;

