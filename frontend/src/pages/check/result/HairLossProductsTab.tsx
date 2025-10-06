import React, { useState, useEffect } from 'react';
import { hairProductApi, HairProduct } from '../../../services/hairProductApi';
import { Star, ShoppingCart } from 'lucide-react';

interface HairLossProductsTabProps {
  currentStage: number;
}

const HairLossProductsTab: React.FC<HairLossProductsTabProps> = ({ currentStage }) => {
  const [products, setProducts] = useState<HairProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stageInfo, setStageInfo] = useState<{
    stage: number;
    stageDescription: string;
    recommendation: string;
    disclaimer: string;
  } | null>(null);

  // 단계별 추천 설명
  const stageDescriptions: Record<number, string> = {
    0: '예방 중심의 두피 케어 제품을 추천합니다',
    1: '초기 탈모 관리를 위한 제품을 추천합니다',
    2: '약물 치료와 전문 관리 제품을 추천합니다',
    3: '모발이식과 가발 등 집중 치료 관련 제품을 추천합니다',
  };

  // 제품 데이터 가져오기
  useEffect(() => {
    const fetchProducts = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await hairProductApi.getProductsByStage(currentStage);
        setProducts(response.products);
        setStageInfo({
          stage: response.stage,
          stageDescription: response.stageDescription,
          recommendation: response.recommendation,
          disclaimer: response.disclaimer
        });
      } catch (err) {
        console.error('제품 조회 실패:', err);
        setError('제품을 불러오는 중 오류가 발생했습니다.');
        setProducts([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, [currentStage]);

  return (
    <div className="space-y-4">
      {/* 단계별 추천 설명 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-800">
          💡 {stageDescriptions[currentStage]}
        </p>
      </div>

      {/* 로딩 상태 */}
      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1f0101]"></div>
          <span className="ml-3 text-gray-600 text-sm">제품을 불러오는 중...</span>
        </div>
      )}

      {/* 에러 상태 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">⚠️ {error}</p>
        </div>
      )}

      {/* 제품 목록 */}
      {!isLoading && !error && products.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {products.slice(0, 4).map((product) => (
            <div key={product.productId} className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-all active:scale-[0.98] cursor-pointer">
              {/* 제품 이미지 */}
              <div className="relative h-36 bg-gray-100 overflow-hidden">
                <img
                  src={product.productImage || 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&h=300&fit=crop&crop=center'}
                  alt={product.productName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&h=300&fit=crop&crop=center';
                  }}
                  loading="lazy"
                />
                
                {/* 브랜드 배지 */}
                <div className="absolute top-2 left-2">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-white bg-[#1F0101]/90 rounded-full">
                    ⭐ {product.brand || product.mallName}
                  </span>
                </div>
              </div>

              {/* 제품 정보 */}
              <div className="p-3">
                {/* 제품명 */}
                <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2 leading-snug">
                  {product.productName}
                </h3>

                {/* 평점 */}
                <div className="flex items-center gap-1 mb-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className={`text-xs ${i < Math.floor(product.productRating) ? 'text-yellow-400' : 'text-gray-300'}`}>
                        ★
                      </span>
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-600 ml-1">
                    ({product.productRating.toFixed(1)})
                  </span>
                </div>

                {/* 가격 */}
                <div className="text-base font-bold text-gray-900 mb-2">
                  {product.productPrice ? new Intl.NumberFormat('ko-KR').format(product.productPrice) + '원' : '가격 문의'}
                </div>

                {/* 적합 단계 배지 */}
                <div className="flex flex-wrap gap-1 mb-2">
                  <span className="text-[10px] bg-[#1F0101]/10 text-[#1F0101] px-2 py-0.5 rounded-full font-medium">
                    {currentStage}단계
                  </span>
                </div>

                {/* 구매 버튼 */}
                <button
                  className="w-full bg-[#1F0101] text-white py-2 px-3 rounded-lg font-medium hover:bg-[#2A0202] transition-colors text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (product.productUrl) {
                      window.open(product.productUrl, '_blank');
                    } else {
                      alert('연결된 제품 페이지가 없습니다.');
                    }
                  }}
                >
                  구매하기
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 결과 없음 */}
      {!isLoading && !error && products.length === 0 && (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-2">🛍️</div>
          <h3 className="text-sm font-medium text-gray-900 mb-2">제품이 없습니다</h3>
          <p className="text-xs text-gray-600">해당 단계의 제품이 없습니다.</p>
        </div>
      )}

      {/* 단계 정보 */}
      {stageInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <h4 className="text-xs font-semibold text-blue-800 mb-1">단계별 추천 정보</h4>
          <p className="text-xs text-blue-700 mb-2">{stageInfo.recommendation}</p>
          <p className="text-xs text-blue-600">{stageInfo.disclaimer}</p>
        </div>
      )}
    </div>
  );
};

export default HairLossProductsTab;
