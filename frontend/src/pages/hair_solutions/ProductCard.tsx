import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { HairProduct } from '../../services/hairProductApi';
import { toggleFavoriteProduct, selectIsFavorite } from '../../utils/hairProductSlice';

interface ProductCardProps {
  product: HairProduct;
  onProductClick?: (product: HairProduct) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onProductClick
}) => {
  const dispatch = useDispatch();
  const isFavorite = useSelector(selectIsFavorite(product.productId));
  // 가격 포맷팅
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  // 평점 별 표시
  const renderStars = (rating: number): React.ReactElement => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <span key={i} className="text-yellow-400">★</span>
      );
    }

    if (hasHalfStar) {
      stars.push(
        <span key="half" className="text-yellow-400">☆</span>
      );
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <span key={`empty-${i}`} className="text-gray-300">★</span>
      );
    }

    return <div className="flex">{stars}</div>;
  };

  // 카테고리 아이콘
  const getCategoryIcon = (category: string): string => {
    switch (category) {
      case '탈모샴푸': return '🧴';
      case '헤어토닉': return '💧';
      case '헤어세럼': return '✨';
      case '모발영양제': return '💊';
      case '두피마사지기': return '🖐️';
      case '영양제': return '💊';
      default: return '🛍️';
    }
  };

  // 즐겨찾기 토글 핸들러
  const handleFavoriteToggle = (e: React.MouseEvent) => {
    e.stopPropagation(); // 제품 클릭 이벤트 방지
    dispatch(toggleFavoriteProduct(product.productId));
  };

  return (
    <div 
      className="bg-white/70 backdrop-blur rounded-2xl shadow-lg border border-gray-200 overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group"
      onClick={() => onProductClick?.(product)}
    >
      {/* 제품 이미지 */}
      <div className="relative h-48 bg-gray-100 overflow-hidden">
        <img
          src={product.productImage}
          alt={product.productName}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&h=200&fit=crop&crop=center';
          }}
        />
        
        {/* 카테고리 배지 */}
        <div className="absolute top-3 left-3 bg-white bg-opacity-90 rounded-full px-3 py-1 flex items-center gap-1">
          <span className="text-lg">{getCategoryIcon(product.category2)}</span>
          <span className="text-xs font-medium text-gray-700">{product.category2}</span>
        </div>

        {/* 브랜드 배지 */}
        <div className="absolute top-3 right-3 bg-blue-600 text-white rounded-full px-2 py-1">
          <span className="text-xs font-medium">{product.brand}</span>
        </div>
        
        {/* 즐겨찾기 버튼 */}
        <button
          onClick={handleFavoriteToggle}
          className="absolute bottom-3 right-3 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center hover:bg-white transition-colors"
        >
          <span className={`text-lg ${isFavorite ? 'text-red-500' : 'text-gray-400'}`}>
            {isFavorite ? '❤️' : '🤍'}
          </span>
        </button>
      </div>

      {/* 제품 정보 */}
      <div className="p-4">
        {/* 제품명 */}
        <h3 className="font-semibold text-gray-800 text-lg mb-2 line-clamp-2 group-hover:text-blue-600 transition-colors">
          {product.productName}
        </h3>

        {/* 설명 */}
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {product.description}
        </p>

        {/* 평점 및 리뷰 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {renderStars(product.productRating)}
            <span className="text-sm text-gray-600">
              {product.productRating.toFixed(1)}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            리뷰 {product.productReviewCount.toLocaleString()}개
          </span>
        </div>

        {/* 가격 */}
        <div className="flex items-center justify-between mb-3">
          <div className="text-xl font-bold text-gray-800">
            {formatPrice(product.productPrice)}원
          </div>
          <div className="text-xs text-gray-500">
            {product.mallName}
          </div>
        </div>

        {/* 성분 정보 */}
        {product.ingredients && product.ingredients.length > 0 && (
          <div className="mb-3">
            <div className="text-xs text-gray-500 mb-1">주요 성분</div>
            <div className="flex flex-wrap gap-1">
              {product.ingredients.slice(0, 3).map((ingredient, index) => (
                <span
                  key={index}
                  className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full"
                >
                  {ingredient}
                </span>
              ))}
              {product.ingredients.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{product.ingredients.length - 3}개
                </span>
              )}
            </div>
          </div>
        )}

        {/* 적합 단계 */}
        <div className="mb-3">
          <div className="text-xs text-gray-500 mb-1">적합 단계</div>
          <div className="flex gap-1">
            {product.suitableStages.map((stage) => (
              <span
                key={stage}
                className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium"
              >
                {stage}단계
              </span>
            ))}
          </div>
        </div>

        {/* 구매 버튼 */}
        <button
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          onClick={(e) => {
            e.stopPropagation();
            window.open(product.productUrl, '_blank');
          }}
        >
          제품 보러가기
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
