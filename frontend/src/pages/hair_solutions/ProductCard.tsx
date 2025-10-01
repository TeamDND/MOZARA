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
      className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
      onClick={() => onProductClick?.(product)}
    >
      {/* 제품 이미지 */}
      <div className="relative h-36 bg-gray-100 overflow-hidden">
        <img
          src={product.productImage}
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
            ⭐ {product.brand}
          </span>
        </div>
        
        {/* 즐겨찾기 버튼 */}
        <button
          onClick={handleFavoriteToggle}
          className="absolute bottom-2 right-2 w-7 h-7 bg-white/95 backdrop-blur rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-sm"
        >
          <span className={`text-base ${isFavorite ? 'text-red-500' : 'text-gray-400'}`}>
            {isFavorite ? '❤️' : '🤍'}
          </span>
        </button>
      </div>

      {/* 제품 정보 */}
      <div className="p-3">
        {/* 제품명 */}
        <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2 leading-snug">
          {product.productName}
        </h3>

        {/* 평점 */}
        <div className="flex items-center gap-1 mb-2">
          {renderStars(product.productRating)}
          <span className="text-[10px] text-gray-600 ml-1">
            ({product.productRating.toFixed(1)})
          </span>
        </div>

        {/* 가격 */}
        <div className="text-base font-bold text-gray-900 mb-2">
          {formatPrice(product.productPrice)}원
        </div>

        {/* 적합 단계 배지 */}
        <div className="flex flex-wrap gap-1 mb-2">
          {product.suitableStages.slice(0, 2).map((stage) => (
            <span
              key={stage}
              className="text-[10px] bg-[#1F0101]/10 text-[#1F0101] px-2 py-0.5 rounded-full font-medium"
            >
              {stage}단계
            </span>
          ))}
          {product.suitableStages.length > 2 && (
            <span className="text-[10px] text-gray-500">
              +{product.suitableStages.length - 2}
            </span>
          )}
        </div>

        {/* 구매 버튼 - 간소화 */}
        <button
          className="w-full bg-[#1F0101] text-white py-2 px-3 rounded-lg font-medium hover:bg-[#2A0202] transition-colors text-xs"
          onClick={(e) => {
            e.stopPropagation();
            window.open(product.productUrl, '_blank');
          }}
        >
          구매하기
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
