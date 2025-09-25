import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { HairProduct, HairProductResponse, hairProductApi } from '../../services/hairProductApi';
// import { elevenStApi } from '../../services/elevenStApi';
// import { RootState } from '../../utils/store';
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
import { STAGE_KEYWORDS_MAP, elevenStApi } from '../../services/elevenStApi';

/**
 * 탈모 단계별 제품 추천 페이지
 * 
 * 이 페이지는 사용자의 탈모 단계에 따라 맞춤형 제품을 추천하는 서비스를 제공합니다.
 * 사용자가 직접 단계를 선택할 수 있습니다.
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
    document.title = '탈모 단계별 제품 추천 | 毛자라 - 맞춤형 탈모 관리 솔루션';
    
    // 메타 설명 설정
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute('content', '탈모 단계별 맞춤형 제품을 추천해드립니다. 1-6단계 탈모 상태에 따른 전문 제품과 관리 가이드를 제공합니다.');
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
        "description": "탈모 단계별 맞춤형 제품 추천",
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
  // 검색 모드 제거
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [keywordSuggestions, setKeywordSuggestions] = useState<string[]>([]);

  // URL 파라미터에서 단계 정보 가져오기
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
    const list = (STAGE_KEYWORDS_MAP[stage] || []).slice();
    // 제일 앞 키워드를 기본값으로 사용
    setKeywordSuggestions(list);
    if (!searchKeyword && list.length > 0) {
      setSearchKeyword(list[0]);
    }

    try {
      console.log(`${stage}단계 제품 조회 시작`);
      
      let response: HairProductResponse;
      if (searchKeyword && searchKeyword.trim()) {
        const r = await elevenStApi.searchProducts(searchKeyword.trim());
        response = {
          products: r.products,
          totalCount: r.totalCount,
          stage,
          stageDescription: `${stage}단계 탈모 관련 제품`,
          recommendation: `키워드 "${searchKeyword}" 기준으로 ${r.totalCount}개 검색` ,
          disclaimer: '11번가에서 제공하는 제품 정보입니다. 구매 전 제품 상세 정보를 확인해주세요.'
        };
      } else {
        response = await hairProductApi.getProductsByStage(stage);
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
      // 다른 페이지 영향 방지: 사용자 친화적 메시지 + UI 유지
      setError('현재 제품 추천 서버 연결이 원활하지 않습니다. 잠시 후 다시 시도해주세요.');
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

  // 불필요 기능 제거
  const handleGoToBaspCheck = () => {};

  // 다시 선택하기
  const handleReset = () => {
    dispatch(clearSelectedStage());
    setProducts([]);
    setStageInfo(null);
    setShowProducts(false);
    setError(null);
    setSearchKeyword('');
    setKeywordSuggestions([]);
  };

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ backgroundColor: "#f9f9f9" }}>
      <Header />

      {/* 배경 효과 - 기존 패턴과 일치 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-20 left-10 w-32 h-32 rounded-full blur-xl"
          style={{ backgroundColor: "rgba(0,115,255,0.2)" }}
        ></div>
        <div
          className="absolute top-40 right-20 w-24 h-24 rounded-full blur-lg"
          style={{ backgroundColor: "rgba(0,115,255,0.3)" }}
        ></div>
        <div
          className="absolute bottom-40 left-1/4 w-40 h-40 rounded-full blur-2xl"
          style={{ backgroundColor: "rgba(0,115,255,0.2)" }}
        ></div>
        <div
          className="absolute bottom-20 right-1/3 w-28 h-28 rounded-full blur-xl"
          style={{ backgroundColor: "rgba(0,115,255,0.25)" }}
        ></div>
        <div
          className="absolute top-1/3 left-1/2 w-20 h-20 rounded-full blur-lg"
          style={{ backgroundColor: "rgba(0,115,255,0.3)" }}
        ></div>
      </div>
      
      <div className="relative z-10 pt-20 pb-20">
        <div className="max-w-7xl mx-auto px-8">
          {/* 페이지 헤더 - 기존 패턴과 일치 */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 text-balance">
              <span style={{ color: "rgb(0,115,255)" }}>탈모 단계별</span>
              <br />
              제품 추천
            </h1>
            <p className="text-lg text-gray-700 mb-8 max-w-2xl mx-auto text-pretty">
              현재 탈모 상태에 맞는 맞춤형 제품을 추천해드립니다.
            </p>
          </div>

          {/* 에러 메시지 - 기존 패턴과 일치 */}
          {error && (
            <div className="mb-8 bg-white/70 backdrop-blur rounded-2xl p-6 border border-red-200 shadow-lg">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <span className="text-red-600 text-xl">⚠️</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-red-800 text-lg mb-1">오류가 발생했습니다</h4>
                  <p className="text-red-700">{error}</p>
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

          {/* 단계 선택 섹션 - 기존 패턴과 일치 */}
          {!showProducts && (
            <div className="bg-white/70 backdrop-blur rounded-2xl shadow-lg p-8 mb-8 border border-gray-200">
              {/* 키워드 입력 및 추천 */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">제품 검색 키워드</label>
                <div className="flex gap-2">
                  <input
                    value={searchKeyword}
                    onChange={(e) => setSearchKeyword(e.target.value)}
                    placeholder="예: 탈모 방지 샴푸, 두피 앰플"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => selectedStage && handleStageSelect(selectedStage)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    검색
                  </button>
                </div>
                {keywordSuggestions.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {keywordSuggestions.slice(0, 10).map((k) => (
                      <button
                        key={k}
                        onClick={() => setSearchKeyword(k)}
                        className={`px-3 py-1 text-sm rounded-full border ${searchKeyword===k? 'bg-blue-600 text-white border-blue-600':'bg-white text-gray-700 border-gray-300 hover:border-blue-400'}`}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <StageSelector
                selectedStage={selectedStage}
                onStageSelect={handleStageSelect}
                disabled={isLoading}
              />
              
              {/* 안내 섹션 제거됨 */}
            </div>
          )}

          {/* 제품 목록 섹션 - 기존 패턴과 일치 */}
          {showProducts && stageInfo && (
            <div className="mb-8">
              {/* 상단 액션 버튼 */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <span>←</span>
                    <span>다시 선택</span>
                  </button>
                  <div className="text-sm text-gray-500">
                    {stageInfo.stage}단계 탈모 제품 추천
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    value={searchKeyword}
                    onChange={(e)=> setSearchKeyword(e.target.value)}
                    placeholder="키워드 수정"
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => selectedStage && handleStageSelect(selectedStage)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    재검색
                  </button>
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

          {/* 로딩 상태 (전체 화면) - 기존 패턴과 일치 */}
          {isLoading && !showProducts && (
            <div className="bg-white/70 backdrop-blur rounded-2xl shadow-lg p-8 border border-gray-200">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded-lg w-1/3 mb-6"></div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {[...Array(6)].map((_, index) => (
                    <div key={index} className="h-32 bg-gray-200 rounded-xl"></div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 추가 정보 섹션 - 기존 패턴과 일치 */}
          <div className="bg-white/70 backdrop-blur rounded-2xl shadow-lg p-8 border border-gray-200">
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
                <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <span className="text-blue-600 text-2xl">🥗</span>
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
      
      <Footer />
    </div>
  );
};

export default HairLossProducts;
