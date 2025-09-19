// TypeScript: 탈모 제품 상태 관리
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { HairProduct } from '../services/hairProductApi';

// TypeScript: 탈모 제품 상태 인터페이스 정의
interface HairProductState {
  // 현재 선택된 탈모 단계
  selectedStage: number | null;
  
  // 즐겨찾기 제품 목록
  favoriteProducts: string[]; // productId 배열
  
  // 최근 조회한 제품 목록 (최대 10개)
  recentProducts: HairProduct[];
  
  // BASP 진단 결과 (제품 추천과 연동)
  baspResult: {
    stageNumber: number;
    stageLabel: string;
    baspCode: string;
    summaryText: string;
    recommendations: string[];
  } | null;
  
  // 제품 조회 히스토리
  productHistory: Array<{
    productId: string;
    productName: string;
    viewedAt: string;
    stage: number;
  }>;
  
  // UI 상태
  ui: {
    showFavoritesOnly: boolean;
    sortBy: 'rating' | 'price' | 'name' | 'recent';
    sortOrder: 'asc' | 'desc';
  };
}

// TypeScript: 초기 상태 정의
const initialState: HairProductState = {
  selectedStage: null,
  favoriteProducts: [],
  recentProducts: [],
  baspResult: null,
  productHistory: [],
  ui: {
    showFavoritesOnly: false,
    sortBy: 'rating',
    sortOrder: 'desc',
  },
};

// TypeScript: 탈모 제품 슬라이스 생성
const hairProductSlice = createSlice({
  name: 'hairProduct',
  initialState,
  reducers: {
    // TypeScript: 탈모 단계 선택 액션
    setSelectedStage: (state, action: PayloadAction<number>) => {
      state.selectedStage = action.payload;
    },
    
    // TypeScript: 탈모 단계 초기화 액션
    clearSelectedStage: (state) => {
      state.selectedStage = null;
    },
    
    // TypeScript: 즐겨찾기 제품 추가 액션
    addFavoriteProduct: (state, action: PayloadAction<string>) => {
      const productId = action.payload;
      if (!state.favoriteProducts.includes(productId)) {
        state.favoriteProducts.push(productId);
      }
    },
    
    // TypeScript: 즐겨찾기 제품 제거 액션
    removeFavoriteProduct: (state, action: PayloadAction<string>) => {
      const productId = action.payload;
      state.favoriteProducts = state.favoriteProducts.filter(id => id !== productId);
    },
    
    // TypeScript: 즐겨찾기 제품 토글 액션
    toggleFavoriteProduct: (state, action: PayloadAction<string>) => {
      const productId = action.payload;
      const index = state.favoriteProducts.indexOf(productId);
      if (index > -1) {
        state.favoriteProducts.splice(index, 1);
      } else {
        state.favoriteProducts.push(productId);
      }
    },
    
    // TypeScript: 최근 조회 제품 추가 액션
    addRecentProduct: (state, action: PayloadAction<HairProduct>) => {
      const product = action.payload;
      
      // 중복 제거
      state.recentProducts = state.recentProducts.filter(p => p.productId !== product.productId);
      
      // 맨 앞에 추가
      state.recentProducts.unshift(product);
      
      // 최대 10개로 제한
      if (state.recentProducts.length > 10) {
        state.recentProducts = state.recentProducts.slice(0, 10);
      }
    },
    
    // TypeScript: 최근 조회 제품 초기화 액션
    clearRecentProducts: (state) => {
      state.recentProducts = [];
    },
    
    // TypeScript: BASP 진단 결과 설정 액션
    setBaspResult: (state, action: PayloadAction<{
      stageNumber: number;
      stageLabel: string;
      baspCode: string;
      summaryText: string;
      recommendations: string[];
    }>) => {
      state.baspResult = action.payload;
      // BASP 결과가 있으면 자동으로 해당 단계 선택
      state.selectedStage = action.payload.stageNumber;
    },
    
    // TypeScript: BASP 진단 결과 초기화 액션
    clearBaspResult: (state) => {
      state.baspResult = null;
    },
    
    // TypeScript: 제품 조회 히스토리 추가 액션
    addProductHistory: (state, action: PayloadAction<{
      productId: string;
      productName: string;
      stage: number;
    }>) => {
      const historyItem = {
        ...action.payload,
        viewedAt: new Date().toISOString(),
      };
      
      // 중복 제거
      state.productHistory = state.productHistory.filter(
        item => item.productId !== historyItem.productId
      );
      
      // 맨 앞에 추가
      state.productHistory.unshift(historyItem);
      
      // 최대 20개로 제한
      if (state.productHistory.length > 20) {
        state.productHistory = state.productHistory.slice(0, 20);
      }
    },
    
    // TypeScript: 제품 조회 히스토리 초기화 액션
    clearProductHistory: (state) => {
      state.productHistory = [];
    },
    
    // TypeScript: UI 상태 업데이트 액션
    updateUIState: (state, action: PayloadAction<Partial<HairProductState['ui']>>) => {
      state.ui = { ...state.ui, ...action.payload };
    },
    
    // TypeScript: 즐겨찾기만 보기 토글 액션
    toggleShowFavoritesOnly: (state) => {
      state.ui.showFavoritesOnly = !state.ui.showFavoritesOnly;
    },
    
    // TypeScript: 정렬 방식 변경 액션
    setSortBy: (state, action: PayloadAction<HairProductState['ui']['sortBy']>) => {
      state.ui.sortBy = action.payload;
    },
    
    // TypeScript: 정렬 순서 변경 액션
    setSortOrder: (state, action: PayloadAction<HairProductState['ui']['sortOrder']>) => {
      state.ui.sortOrder = action.payload;
    },
    
    // TypeScript: 전체 상태 초기화 액션
    resetHairProductState: (state) => {
      return initialState;
    },
  },
});

// TypeScript: 액션 생성자들 export
export const {
  setSelectedStage,
  clearSelectedStage,
  addFavoriteProduct,
  removeFavoriteProduct,
  toggleFavoriteProduct,
  addRecentProduct,
  clearRecentProducts,
  setBaspResult,
  clearBaspResult,
  addProductHistory,
  clearProductHistory,
  updateUIState,
  toggleShowFavoritesOnly,
  setSortBy,
  setSortOrder,
  resetHairProductState,
} = hairProductSlice.actions;

// TypeScript: 리듀서 export
export default hairProductSlice.reducer;

// TypeScript: 셀렉터 함수들 export
export const selectSelectedStage = (state: { hairProduct: HairProductState }) => 
  state.hairProduct.selectedStage;

export const selectFavoriteProducts = (state: { hairProduct: HairProductState }) => 
  state.hairProduct.favoriteProducts;

export const selectRecentProducts = (state: { hairProduct: HairProductState }) => 
  state.hairProduct.recentProducts;

export const selectBaspResult = (state: { hairProduct: HairProductState }) => 
  state.hairProduct.baspResult;

export const selectProductHistory = (state: { hairProduct: HairProductState }) => 
  state.hairProduct.productHistory;

export const selectUIState = (state: { hairProduct: HairProductState }) => 
  state.hairProduct.ui;

export const selectIsFavorite = (productId: string) => (state: { hairProduct: HairProductState }) => 
  state.hairProduct.favoriteProducts.includes(productId);
