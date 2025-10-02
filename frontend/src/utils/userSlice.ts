// TypeScript: 사용자 상태 관리
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// TypeScript: 사용자 상태 인터페이스 정의
interface UserState {
  userId: number | null;
  username: string | null;
  nickname: string | null;
  email: string | null;
  gender: string | null;
  age: number | null;
  role: string | null;
  createdAt: string | null;
}

// TypeScript: 사용자 데이터 인터페이스 정의
interface UserData {
  userId?: number;
  username: string;
  nickname: string;
  email: string;
  gender: string;
  age: number;
  role?: string;
  createdAt?: string;
}

// TypeScript: 초기 상태 정의
const initialState: UserState = {
  userId: null,
  username: null,
  nickname: null,
  email: null,
  gender: null,
  age: null,
  role: null,
  createdAt: null,
};

// TypeScript: 사용자 슬라이스 생성
const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    // TypeScript: 사용자 설정 액션 (페이로드 타입 지정)
    setUser: (state, action: PayloadAction<UserData>) => {
      Object.assign(state, action.payload);
    },
    // TypeScript: 사용자 클리어 액션
    clearUser: (state) => {
      state.userId = null;
      state.username = null;
      state.nickname = null;
      state.email = null;
      state.gender = null;
      state.age = null;
      state.role = null;
      state.createdAt = null;
    },
  },
});

// TypeScript: 액션 생성자들 export
export const { setUser, clearUser } = userSlice.actions;

// TypeScript: 리듀서 export
export default userSlice.reducer;


