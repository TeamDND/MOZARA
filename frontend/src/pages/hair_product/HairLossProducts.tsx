import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { HairProduct, HairProductResponse, hairProductApi } from '../../services/hairProductApi';
import { elevenStApi } from '../../services/elevenStApi';
import {
  setSelectedStage,
  clearSelectedStage,
  addRecentProduct,
  addProductHistory,
  selectSelectedStage,
} from '../../utils/hairProductSlice';
import ProductList from './ProductList';
import { HAIR_LOSS_STAGES, STAGE_RECOMMENDATIONS } from '../../utils/hairLossStages';

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
    document.title = '단계별 제품 추천 | Hairfit - 맞춤형 탈모 관리 솔루션';
    
    // 메타 설명 설정
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', '탈모 단계별 맞춤형 제품을 추천해드립니다. 1-6단계 탈모 상태에 따른 전문 제품과 관리 가이드를 제공합니다. 간단한 단계 선택만으로 나에게 맞는 제품을 빠르게 찾아보세요.');
    }

    // 구조화된 데이터 추가
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "name": "단계별 제품 추천",
      "description": "탈모 단계별 맞춤형 제품을 추천해드립니다. 1-6단계 탈모 상태에 따른 전문 제품과 관리 가이드를 제공합니다.",
      "url": `${window.location.origin}/hair-loss-products`,
      "mainEntity": {
        "@type": "Service",
        "name": "탈모 제품 추천 서비스",
        "description": "간단한 단계 선택을 기반으로 한 탈모 단계별 맞춤형 제품 추천",
        "provider": {
          "@type": "Organization",
          "name": "Hairfit",
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
  const location = useLocation();
  const selectedStage = useSelector(selectSelectedStage);
  
  // 진단 결과 가져오기 (URL state 또는 localStorage)
  const diagnosisResult = location.state?.diagnosisResult || 
    (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('lastDiagnosisResult') || 'null') : null);
  
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
  const [searchKeyword, setSearchKeyword] = useState<string>('탈모 샴푸');

  // URL 파라미터 및 진단 결과에서 단계 정보 가져오기
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const stageParam = urlParams.get('stage');
    
    // 진단 결과가 있으면 우선적으로 적용
    if (diagnosisResult?.stage !== undefined) {
      const stage = diagnosisResult.stage; // 0~3 단계 그대로 사용
      if (stage >= 0 && stage <= 3) {
        dispatch(setSelectedStage(stage));
        handleStageSelect(stage);
      }
    } else if (stageParam) {
      const stage = parseInt(stageParam);
      if (stage >= 0 && stage <= 3) {
        dispatch(setSelectedStage(stage));
        handleStageSelect(stage);
      }
    }
  }, [diagnosisResult, dispatch]);

  // 단계 선택 핸들러
  const handleStageSelect = async (stage: number) => {
    dispatch(setSelectedStage(stage));
    setError(null);
    setIsLoading(true);
    setShowProducts(false);
    setSearchMode('recommended'); // 단계 선택 시에는 추천 모드

    try {
      // 추천 제품 조회
      const response = await hairProductApi.getProductsByStage(stage);
      
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
    } catch (error) {
      console.error('제품 조회 중 오류:', error);
      setError('제품을 불러오는 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  // 제품 클릭 핸들러
  const handleProductClick = (product: HairProduct) => {
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
      {/* Mobile-First Container - MainContent 스타일 적용 */}
      <div className="max-w-md mx-auto min-h-screen bg-white">
        {/* Main Content */}
        <main className="px-4 py-6">
          {/* 페이지 헤더 - MainContent 스타일 */}
          <div className="text-center mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">제품 추천</h2>
            <p className="text-sm text-gray-600">탈모 단계에 맞는 제품을 추천받으세요</p>
          </div>

          {/* 검색창 - 항상 표시 */}
          <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                placeholder="11번가 검색 (예: 탈모 샴푸, 두피 토닉)"
                className="w-full px-4 py-3 pr-20 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1F0101] focus:border-transparent"
                onKeyPress={async (e) => {
                  if (e.key === 'Enter' && searchKeyword.trim()) {
                    setIsLoading(true);
                    setError(null);
                    setSearchMode('11st');
                    try {
                      const response = await elevenStApi.searchProducts(searchKeyword, 1, 20);
                      setProducts(response.products || []);
                      setShowProducts(true);
                      setStageInfo({
                        stage: 0,
                        stageDescription: `"${searchKeyword}" 검색 결과`,
                        recommendation: `11번가에서 ${response.products?.length || 0}개의 제품을 찾았습니다.`,
                        disclaimer: '실시간 검색 결과이며, 가격과 재고는 변동될 수 있습니다.'
                      });
                    } catch (err: any) {
                      console.error('11번가 검색 오류:', err);
                      setError(err.message || '검색 중 오류가 발생했습니다.');
                    } finally {
                      setIsLoading(false);
                    }
                  }
                }}
              />
              <button
                onClick={async () => {
                  if (searchKeyword.trim()) {
                    setIsLoading(true);
                    setError(null);
                    setSearchMode('11st');
                    try {
                      const response = await elevenStApi.searchProducts(searchKeyword, 1, 20);
                      setProducts(response.products || []);
                      setShowProducts(true);
                      setStageInfo({
                        stage: 0,
                        stageDescription: `"${searchKeyword}" 검색 결과`,
                        recommendation: `11번가에서 ${response.products?.length || 0}개의 제품을 찾았습니다.`,
                        disclaimer: '실시간 검색 결과이며, 가격과 재고는 변동될 수 있습니다.'
                      });
                    } catch (err: any) {
                      console.error('11번가 검색 오류:', err);
                      setError(err.message || '검색 중 오류가 발생했습니다.');
                    } finally {
                      setIsLoading(false);
                    }
                  }
                }}
                disabled={isLoading}
                className="absolute right-2 top-2 px-4 py-2 bg-[#1F0101] text-white text-xs font-medium rounded-lg hover:bg-[#2A0202] transition-colors disabled:opacity-50"
              >
                검색
              </button>
            </div>
          </div>

          {/* 단계별 추천 - YouTube Videos 스타일 */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">AI 분석 기반 맞춤 추천</h3>
            <div className="space-y-2">
              <select
                value={selectedStage !== null && selectedStage !== undefined ? `stage${selectedStage}` : ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    dispatch(clearSelectedStage());
                    setShowProducts(false);
                  } else {
                    const stage = parseInt(value.replace('stage', ''));
                    handleStageSelect(stage);
                  }
                }}
                className="w-full px-4 py-3 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#1F0101] focus:border-transparent bg-white text-gray-700 text-sm max-w-full overflow-hidden text-ellipsis"
              >
                <option value="">단계를 선택하세요</option>
                <option value="stage0">0단계 - 정상 (예방 관리)</option>
                <option value="stage1">1단계 - 초기 (증상 관리)</option>
                <option value="stage2">2단계 - 중기 (약물 치료)</option>
                <option value="stage3">3단계 - 심화 (시술 정보)</option>
                </select>
            </div>
          </div>

          {/* 에러 메시지 - 간소화 */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-xl">⚠️</span>
                <div className="flex-1">
                  <h4 className="font-semibold text-red-800 text-sm mb-1">오류 발생</h4>
                  <p className="text-xs text-red-700">{error}</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => selectedStage && handleStageSelect(selectedStage)}
                  className="px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors"
                >
                  다시 시도
                </button>
                <button
                  onClick={handleReset}
                  className="px-3 py-1.5 bg-gray-600 text-white text-xs font-medium rounded-lg hover:bg-gray-700 transition-colors"
                >
                  처음부터
                </button>
              </div>
            </div>
          )}

          {/* 제품 목록 섹션 - 간소화 */}
          {showProducts && stageInfo && (
            <div className="mb-4">

              {/* 제품 목록 */}
              <ProductList
                products={products}
                totalCount={products.length}
                stage={stageInfo.stage}
                stageDescription={stageInfo.stageDescription}
                recommendation={stageInfo.recommendation}
                disclaimer={stageInfo.disclaimer}
                isLoading={isLoading}
                isSearchMode={searchMode === '11st'}
                onProductClick={handleProductClick}
              />
            </div>
          )}

          {/* 로딩 상태 - 간소화 */}
          {isLoading && !showProducts && (
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="space-y-3">
                  {[...Array(3)].map((_, index) => (
                    <div key={index} className="h-20 bg-gray-200 rounded-xl"></div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 탈모 관리 가이드 - 간소화 */}
          <div className="bg-gradient-to-br from-[#1F0101]/5 to-gray-50 rounded-xl p-4 mt-6">
            <h3 className="text-sm font-bold text-gray-800 mb-3 text-center">
              💡 탈모 관리 가이드
            </h3>
            
            <div className="space-y-3">
              <div className="flex items-start gap-3 bg-white rounded-lg p-3">
                <span className="text-lg">🏃‍♂️</span>
                <div>
                  <h4 className="font-semibold text-xs text-gray-800 mb-1">생활습관 개선</h4>
                  <p className="text-xs text-gray-600">
                    규칙적인 생활과 충분한 수면이 중요합니다
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white rounded-lg p-3">
                <span className="text-lg">🥗</span>
                <div>
                  <h4 className="font-semibold text-xs text-gray-800 mb-1">영양 관리</h4>
                  <p className="text-xs text-gray-600">
                    비오틴, 아연, 철분 등 필수 영양소 섭취
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-white rounded-lg p-3">
                <span className="text-lg">👨‍⚕️</span>
                <div>
                  <h4 className="font-semibold text-xs text-gray-800 mb-1">전문의 상담</h4>
                  <p className="text-xs text-gray-600">
                    정확한 진단을 위해 전문의 상담 권장
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Spacing for Mobile Navigation */}
          <div className="h-20"></div>
        </main>
      </div>
    </div>
  );
};

export default HairLossProducts;

