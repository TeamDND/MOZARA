// TypeScript: 새싹 상태 관리
import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import apiClient from '../services/apiClient';

// TypeScript: 새싹 상태 인터페이스 정의
interface SeedlingState {
  seedlingId: number | null;
  seedlingName: string | null;
  currentPoint: number | null;
  userId: number | null;
  loading: boolean;
  error: string | null;
}

// TypeScript: 새싹 데이터 인터페이스 정의
interface SeedlingData {
  seedlingId: number;
  seedlingName: string;
  currentPoint: number;
  userId: number;
}

// TypeScript: 새싹 이름 업데이트 요청 인터페이스
interface SeedlingNicknameUpdateRequest {
  seedlingName: string;
}

// TypeScript: 초기 상태 정의
const initialState: SeedlingState = {
  seedlingId: null,
  seedlingName: null,
  currentPoint: null,
  userId: null,
  loading: false,
  error: null,
};

// TypeScript: 새싹 정보 조회 비동기 액션
export const fetchSeedlingInfo = createAsyncThunk(
  'seedling/fetchSeedlingInfo',
  async (userId: number, { rejectWithValue }) => {
    try {
      const response = await apiClient.get('/user/seedling/my-seedling');
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || '새싹 정보를 불러오는데 실패했습니다.');
    }
  }
);

// TypeScript: 새싹 이름 업데이트 비동기 액션
export const updateSeedlingNickname = createAsyncThunk(
  'seedling/updateSeedlingNickname',
  async (seedlingName: string, { rejectWithValue }) => {
    try {
      const response = await apiClient.put('/user/seedling/my-seedling/nickname', {
        seedlingName
      });
      return response.data;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || '새싹 이름 변경에 실패했습니다.');
    }
  }
);

// TypeScript: 새싹 슬라이스 생성
const seedlingSlice = createSlice({
  name: 'seedling',
  initialState,
  reducers: {
    // TypeScript: 새싹 정보 설정 액션
    setSeedling: (state, action: PayloadAction<SeedlingData>) => {
      state.seedlingId = action.payload.seedlingId;
      state.seedlingName = action.payload.seedlingName;
      state.currentPoint = action.payload.currentPoint;
      state.userId = action.payload.userId;
      state.error = null;
    },
    // TypeScript: 새싹 정보 클리어 액션
    clearSeedling: (state) => {
      state.seedlingId = null;
      state.seedlingName = null;
      state.currentPoint = null;
      state.userId = null;
      state.loading = false;
      state.error = null;
    },
    // TypeScript: 에러 클리어 액션
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // 새싹 정보 조회
    builder
      .addCase(fetchSeedlingInfo.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSeedlingInfo.fulfilled, (state, action) => {
        state.loading = false;
        state.seedlingId = action.payload.seedlingId;
        state.seedlingName = action.payload.seedlingName;
        state.currentPoint = action.payload.currentPoint;
        state.userId = action.payload.userId;
        state.error = null;
      })
      .addCase(fetchSeedlingInfo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(updateSeedlingNickname.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSeedlingNickname.fulfilled, (state, action) => {
        state.loading = false;
        state.seedlingName = action.payload.seedlingName;
        state.error = null;
      })
      .addCase(updateSeedlingNickname.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

// TypeScript: 액션 생성자들 export
export const { setSeedling, clearSeedling, clearError } = seedlingSlice.actions;

// TypeScript: 리듀서 export
export default seedlingSlice.reducer;
