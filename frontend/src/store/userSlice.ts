// TypeScript: 사용자 상태 관리
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// TypeScript: 사용자 상태 인터페이스 정의
interface UserState {
  username: string | null;
  role: string | null;
}

// TypeScript: 사용자 데이터 인터페이스 정의
interface UserData {
  username: string;
  role: string;
}

// TypeScript: 초기 상태 정의
const initialState: UserState = {
  username: null,
  role: null,
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
      state.username = null;
      state.role = null;
    },
  },
});

// TypeScript: 액션 생성자들 export
export const { setUser, clearUser } = userSlice.actions;

// TypeScript: 리듀서 export
export default userSlice.reducer;


