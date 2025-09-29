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
            className="bg-[#222222] text-white px-6 py-2 rounded-lg hover:bg-[#333333] transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* 헤더 정보 */}
      <div className="bg-white/70 backdrop-blur rounded-2xl shadow-lg p-6 mb-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {stage}단계 탈모 제품 추천
            </h2>
            <p className="text-gray-600">
              {stageDescription} - {recommendation}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-[#222222]">
              {products.length}개
            </div>
            <div className="text-sm text-gray-500">추천 제품</div>
          </div>
        </div>

        {/* 단계별 안내 */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="text-[#222222] text-lg">💡</div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-1">
                {stage}단계 탈모 관리 가이드
              </h4>
              <p className="text-sm text-gray-700">
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
      </div>

      {/* 제품 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {products.map((product) => (
          <ProductCard
            key={product.productId}
            product={product}
            onProductClick={onProductClick}
          />
        ))}
      </div>

      {/* 디스클레이머 */}
      <div className="mt-8 bg-red-50 border border-red-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <div className="text-red-600 text-lg">⚠️</div>
          <div>
            <h4 className="font-bold text-red-800 mb-2">중요 안내사항</h4>
            <p className="text-sm text-red-700 mb-2">
              {disclaimer}
            </p>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• 본 추천은 참고용이며, 개인차가 있을 수 있습니다.</li>
              <li>• 제품 사용 전 피부과 전문의 상담을 권장합니다.</li>
              <li>• 알레르기 반응이 있을 경우 즉시 사용을 중단하세요.</li>
              <li>• 지속적인 사용과 올바른 생활습관이 중요합니다.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 추가 정보 */}
      <div className="mt-6 bg-gray-50 rounded-xl p-6">
        <h4 className="font-semibold text-gray-800 mb-3">추가 정보</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <h5 className="font-medium mb-2">제품 선택 기준</h5>
            <ul className="space-y-1">
              <li>• 탈모 단계별 적합성</li>
              <li>• 사용자 리뷰 및 평점</li>
              <li>• 성분의 안전성</li>
              <li>• 가격 대비 효과</li>
            </ul>
          </div>
          <div>
            <h5 className="font-medium mb-2">사용 시 주의사항</h5>
            <ul className="space-y-1">
              <li>• 정확한 사용법 준수</li>
              <li>• 꾸준한 사용 필요</li>
              <li>• 부작용 발생 시 중단</li>
              <li>• 전문의 상담 권장</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductList;
