// TypeScript: Redux Store 설정
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import tokenReducer from './tokenSlice';
import userReducer from './userSlice';
import hairProductReducer from './hairProductSlice';
import seedlingReducer from './seedlingSlice';
import missionCounterReducer from './missionCounterSlice';

// TypeScript: 루트 리듀서 타입 정의
const rootReducer = combineReducers({
  token: tokenReducer,
  user: userReducer,
  hairProduct: hairProductReducer,
  seedling: seedlingReducer,
  missionCounter: missionCounterReducer,
});

// TypeScript: Redux Persist 설정
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['token', 'user', 'hairProduct', 'seedling', 'missionCounter'], // 저장할 상태들
};

// TypeScript: 지속화된 리듀서 생성
const persistedReducer = persistReducer(persistConfig, rootReducer);

// TypeScript: Redux Store 생성
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // redux-persist 관련 액션 무시 (직렬화 체크에서 제외)
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE', 'persist/PAUSE', 'persist/FLUSH', 'persist/PURGE', 'persist/REGISTER'],
      },
    }),
});

// TypeScript: 지속화된 스토어 생성
export const persistor = persistStore(store);

// TypeScript: 스토어 타입 추론
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

