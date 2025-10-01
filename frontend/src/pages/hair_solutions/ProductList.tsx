import React from 'react';
import { HairProduct } from '../../services/hairProductApi';
import ProductCard from '../hair_solutions/ProductCard';

interface ProductListProps {
  products: HairProduct[];
  stage: number;
  stageDescription: string;
  recommendation: string;
  disclaimer: string;
  isLoading?: boolean;
  onProductClick?: (product: HairProduct) => void;
}

const ProductList: React.FC<ProductListProps> = ({
  products,
  stage,
  stageDescription,
  recommendation,
  disclaimer,
  isLoading = false,
  onProductClick
}) => {
  if (isLoading) {
    return (
      <div className="w-full">
        {/* 로딩 상태 */}
        <div className="bg-white/70 backdrop-blur rounded-2xl shadow-lg p-8 border border-gray-200">
          <div className="animate-pulse">
            {/* 헤더 로딩 */}
            <div className="mb-6">
              <div className="h-8 bg-gray-200 rounded-lg w-1/3 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>

            {/* 제품 그리드 로딩 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="bg-gray-100 rounded-xl h-96">
                  <div className="h-48 bg-gray-200 rounded-t-xl"></div>
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-full"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    <div className="h-8 bg-gray-200 rounded w-full"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="w-full">
        <div className="bg-white/70 backdrop-blur rounded-2xl shadow-lg p-8 text-center border border-gray-200">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            제품을 찾을 수 없습니다
          </h3>
          <p className="text-gray-600 mb-4">
            선택하신 단계에 해당하는 제품이 없습니다.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-[#1F0101] text-white px-6 py-2 rounded-lg hover:bg-[#2A0202] transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* 헤더 정보 - 모바일 우선 간소화 */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-900">
            {stage}단계 제품 추천
          </h2>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {products.length}개
          </span>
        </div>

        {/* 단계별 안내 - 간소화 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <div className="text-blue-600 text-base flex-shrink-0">💡</div>
            <p className="text-xs text-blue-800 leading-relaxed">
              {stage === 0 && '두피 건강 유지와 예방에 효과적인 기본 케어 제품들을 추천합니다.'}
              {stage === 1 && '두피 건강 관리와 예방에 중점을 둔 제품들을 추천합니다.'}
              {stage === 2 && '모발 강화와 탈모 억제에 효과적인 제품들을 추천합니다.'}
              {stage === 3 && '탈모 진행 억제와 치료에 도움이 되는 제품들을 추천합니다.'}
              {stage === 4 && '집중적인 탈모 치료를 위한 강력한 제품들을 추천합니다.'}
              {stage === 5 && '전문가 처방용 제품과 고농도 성분의 제품들을 추천합니다.'}
              {stage === 6 && '의료진 상담 후 사용하실 수 있는 전문 치료 제품들을 추천합니다.'}
            </p>
          </div>
        </div>
      </div>

      {/* 제품 그리드 - 모바일 우선 */}
      <div className="grid grid-cols-2 gap-3">
        {products.map((product) => (
          <ProductCard
            key={product.productId}
            product={product}
            onProductClick={onProductClick}
          />
        ))}
      </div>

      {/* 디스클레이머 - 간소화 */}
      <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3">
        <div className="flex items-start gap-2">
          <div className="text-red-600 text-base flex-shrink-0">⚠️</div>
          <div>
            <h4 className="font-semibold text-red-800 mb-1 text-xs">중요 안내사항</h4>
            <p className="text-[10px] text-red-700 leading-relaxed">
              제품 사용 전 피부과 전문의 상담을 권장합니다. 본 추천은 참고용이며 개인차가 있을 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductList;
