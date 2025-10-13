import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface MissionCounterState {
  date: string;
  counters: {
    water: number;      // 물 마시기 (목표: 7)
    effector: number;   // 이펙터 사용 (목표: 4)
  };
}

const initialState: MissionCounterState = {
  date: new Date().toISOString().split('T')[0],
  counters: {
    water: 0,
    effector: 0
  }
};

const missionCounterSlice = createSlice({
  name: 'missionCounter',
  initialState,
  reducers: {
    // 카운터 증가
    incrementCounter: (state, action: PayloadAction<'water' | 'effector'>) => {
      const today = new Date().toISOString().split('T')[0];

      // 날짜 바뀌면 초기화
      if (state.date !== today) {
        state.date = today;
        state.counters = { water: 0, effector: 0 };
      }

      const key = action.payload;
      const maxCount = key === 'water' ? 7 : 4;

      // 최대값 제한
      if (state.counters[key] < maxCount) {
        state.counters[key]++;
      }
    },

    // 카운터 감소
    decrementCounter: (state, action: PayloadAction<'water' | 'effector'>) => {
      const key = action.payload;
      if (state.counters[key] > 0) {
        state.counters[key]--;
      }
    },

    // 특정 카운터 설정 (백엔드에서 완료된 상태 로드 시 사용)
    setCounter: (state, action: PayloadAction<{ key: 'water' | 'effector'; value: number }>) => {
      const today = new Date().toISOString().split('T')[0];

      // 날짜 바뀌면 초기화
      if (state.date !== today) {
        state.date = today;
        state.counters = { water: 0, effector: 0 };
      }

      state.counters[action.payload.key] = action.payload.value;
    },

    // 모든 카운터 초기화
    resetCounters: (state) => {
      state.date = new Date().toISOString().split('T')[0];
      state.counters = { water: 0, effector: 0 };
    }
  }
});

export const { incrementCounter, decrementCounter, setCounter, resetCounters } = missionCounterSlice.actions;
export default missionCounterSlice.reducer;
