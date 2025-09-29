import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { HairProduct, HairProductResponse, hairProductApi } from '../../services/hairProductApi';
import { elevenStApi } from '../../services/elevenStApi';
import { RootState } from '../../utils/store';
import {
  setSelectedStage,
  clearSelectedStage,
  addRecentProduct,
  addProductHistory,
  setBaspResult,
  selectSelectedStage,
  selectBaspResult,
} from '../../utils/hairProductSlice';
import StageSelector from '../check/StageSelector';
import ProductList from '../hair_solutions/ProductList';
import Header from '../Header';
import Footer from '../Footer';

/**
 * 탈모 단계별 제품 추천 페이지
 * 
 * 이 페이지는 사용자의 탈모 단계에 따라 맞춤형 제품을 추천하는 서비스를 제공합니다.
 * BASP 진단 결과를 기반으로 하거나, 사용자가 직접 단계를 선택할 수 있습니다.
 */
const HairLossProducts: React.FC = () => {
  // 페이지 로드 시 분석 이벤트 (Google Analytics 등)
  useEffect(() => {
    // 페이지뷰 추적
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('config', 'GA_MEASUREMENT_ID', {
        page_title: '탈모 단계별 제품 추천',
        page_location: window.location.href,
      });
    }
  }, []);

  // 페이지 로드 시 메타데이터 설정
  useEffect(() => {
    // 페이지 제목 설정
    document.title = '탈모 단계별 제품 추천 | 맞춤형 탈모 관리 솔루션';
    
    // 메타 설명 설정
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', '탈모 단계별 맞춤형 제품을 추천해드립니다. 1-6단계 탈모 상태에 따른 전문 제품과 관리 가이드를 제공합니다. BASP 진단 기반 정확한 추천으로 효과적인 탈모 관리가 가능합니다.');
    }

    // 구조화된 데이터 추가
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "탈모 단계별 제품 추천",
      "description": "탈모 단계별 맞춤형 제품을 추천해드립니다. 1-6단계 탈모 상태에 따른 전문 제품과 관리 가이드를 제공합니다.",
      "url": `${window.location.origin}/hair-loss-products`,
      "mainEntity": {
        "@type": "Service",
        "name": "탈모 제품 추천 서비스",
        "description": "BASP 진단 기반 탈모 단계별 맞춤형 제품 추천",
        "provider": {
          "@type": "Organization",
          "name": "毛자라",
          "url": window.location.origin
        },
        "serviceType": "헬스케어",
        "category": "탈모 관리"
      }
    };

    // 기존 구조화된 데이터 제거
    const existingScript = document.querySelector('script[type="application/ld+json"]');
    if (existingScript) {
      existingScript.remove();
    }

    // 새로운 구조화된 데이터 추가
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);

    // 컴포넌트 언마운트 시 정리
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // Redux 상태 관리
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const selectedStage = useSelector(selectSelectedStage);
  const baspResult = useSelector(selectBaspResult);
  
  // 로컬 상태 관리
  const [products, setProducts] = useState<HairProduct[]>([]);
  const [stageInfo, setStageInfo] = useState<{
    stage: number;
    stageDescription: string;
    recommendation: string;
    disclaimer: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showProducts, setShowProducts] = useState(false);
  const [searchMode, setSearchMode] = useState<'recommended' | '11st'>('recommended');

  // URL 파라미터에서 단계 정보 가져오기 (BASP 진단 결과에서 넘어온 경우)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const stageParam = urlParams.get('stage');
    if (stageParam) {
      const stage = parseInt(stageParam);
      if (stage >= 1 && stage <= 6) {
        dispatch(setSelectedStage(stage));
        handleStageSelect(stage);
      }
    }
  }, [dispatch]);

  // 단계 선택 핸들러
  const handleStageSelect = async (stage: number) => {
    dispatch(setSelectedStage(stage));
    setError(null);
    setIsLoading(true);
    setShowProducts(false);

    try {
      console.log(`${stage}단계 제품 조회 시작`);
      
      let response: HairProductResponse;
      
      if (searchMode === 'recommended') {
        // 추천 제품 조회
        response = await hairProductApi.getProductsByStage(stage);
      } else {
        // 11번가 제품 검색
        const elevenStResponse = await elevenStApi.searchProductsByStage(stage);
        response = {
          products: elevenStResponse.products,
          totalCount: elevenStResponse.totalCount,
          stage: stage,
          stageDescription: `${stage}단계 탈모 관련 제품`,
          recommendation: `11번가에서 ${stage}단계 탈모 관련 제품 ${elevenStResponse.totalCount}개를 찾았습니다.`,
          disclaimer: "11번가에서 제공하는 제품 정보입니다. 구매 전 제품 상세 정보를 확인해주세요."
        };
      }
      
      setProducts(response.products);
      setStageInfo({
        stage: response.stage,
        stageDescription: response.stageDescription,
        recommendation: response.recommendation,
        disclaimer: response.disclaimer
      });
      setShowProducts(true);
      
      // 최근 조회 제품에 추가
      response.products.forEach(product => {
        dispatch(addRecentProduct(product));
        dispatch(addProductHistory({
          productId: product.productId,
          productName: product.productName,
          stage: stage,
        }));
      });
      
      console.log(`${stage}단계 제품 ${response.products.length}개 로드 완료`);
    } catch (error) {
      console.error('제품 조회 중 오류:', error);
      setError('제품을 불러오는 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  // 제품 클릭 핸들러
  const handleProductClick = (product: HairProduct) => {
    console.log('제품 클릭:', product.productName);
    
    // 최근 조회 제품에 추가
    dispatch(addRecentProduct(product));
    dispatch(addProductHistory({
      productId: product.productId,
      productName: product.productName,
      stage: selectedStage || 0,
    }));
    
    // 제품 상세 정보를 모달이나 새 페이지로 표시할 수 있음
  };


  // 다시 선택하기
  const handleReset = () => {
    dispatch(clearSelectedStage());
    setProducts([]);
    setStageInfo(null);
    setShowProducts(false);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="relative z-10">
        <div className="max-w-md mx-auto px-4 py-4">
          {/* 모바일 헤더 */}
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              탈모 단계별 제품 추천
            </h2>
            <p className="text-sm text-gray-600">
              상태에 맞는 맞춤형 제품을 추천해드립니다
            </p>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="mb-6 bg-white rounded-xl p-4 border border-red-200 shadow-md">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <span className="text-red-600 text-lg">⚠️</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-red-800 text-sm mb-1">오류 발생</h4>
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  onClick={() => selectedStage && handleStageSelect(selectedStage)}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                >
                  다시 시도
                </button>
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                >
                  처음부터
                </button>
              </div>
            </div>
          )}

          {/* 단계 선택 섹션 */}
          {!showProducts && (
            <div className="bg-white rounded-xl shadow-md p-4 mb-6 border border-gray-200">
              {/* 검색 모드 토글 */}
              <div className="mb-4">
                <div className="text-center mb-3">
                  <span className="text-sm font-medium text-gray-700">검색 모드</span>
                  <div className="flex bg-gray-100 rounded-lg p-1 mx-auto max-w-xs">
                    <button
                      onClick={() => setSearchMode('recommended')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        searchMode === 'recommended'
                          ? 'bg-white text-[#222222] shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      추천 제품
                    </button>
                    <button
                      onClick={() => setSearchMode('11st')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        searchMode === '11st'
                          ? 'bg-white text-[#222222] shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      11번가 검색
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 text-center mt-2">
                  {searchMode === 'recommended' 
                    ? '전문가가 선별한 탈모 단계별 추천 제품' 
                    : '11번가에서 실시간 검색한 탈모 관련 제품'
                  }
                </p>
              </div>

              <StageSelector
                selectedStage={selectedStage}
                onStageSelect={handleStageSelect}
                disabled={isLoading}
              />
              
            </div>
          )}

          {/* 제품 목록 섹션 */}
          {showProducts && stageInfo && (
            <div className="mb-6">
              {/* 상단 액션 버튼 */}
              <div className="flex items-center justify-between mb-4">
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <span>←</span>
                  <span className="text-sm">다시 선택</span>
                </button>
                <div className="text-xs text-gray-500">
                  {stageInfo.stage}단계 제품
                </div>
              </div>

              {/* 제품 목록 */}
              <ProductList
                products={products}
                stage={stageInfo.stage}
                stageDescription={stageInfo.stageDescription}
                recommendation={stageInfo.recommendation}
                disclaimer={stageInfo.disclaimer}
                isLoading={isLoading}
                onProductClick={handleProductClick}
              />
            </div>
          )}

          {/* 로딩 상태 */}
          {isLoading && !showProducts && (
            <div className="bg-white rounded-xl shadow-md p-4 border border-gray-200">
              <div className="animate-pulse">
                <div className="h-6 bg-gray-200 rounded-lg w-1/2 mb-4"></div>
                <div className="space-y-3">
                  {[...Array(4)].map((_, index) => (
                    <div key={index} className="h-24 bg-gray-200 rounded-lg"></div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 추가 정보 섹션 */}
          <div className="bg-white rounded-xl shadow-md p-4 border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              탈모 관리 가이드
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 생활습관 */}
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-green-600 text-2xl">🏃‍♂️</span>
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">생활습관 개선</h3>
                <p className="text-sm text-gray-600">
                  규칙적인 생활, 충분한 수면, 스트레스 관리가 중요합니다.
                </p>
              </div>

              {/* 영양 관리 */}
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-[#222222] text-2xl">🥗</span>
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">영양 관리</h3>
                <p className="text-sm text-gray-600">
                  비오틴, 아연, 철분 등 모발 건강에 필요한 영양소를 충분히 섭취하세요.
                </p>
              </div>

              {/* 전문의 상담 */}
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-purple-600 text-2xl">👨‍⚕️</span>
                </div>
                <h3 className="font-semibold text-gray-800 mb-2">전문의 상담</h3>
                <p className="text-sm text-gray-600">
                  정확한 진단과 치료를 위해 피부과 전문의 상담을 받으시기 바랍니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
};

export default HairLossProducts;
