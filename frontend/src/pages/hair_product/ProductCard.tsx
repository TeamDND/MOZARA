import React from 'react';
import { HairProduct } from '../../services/hairProductApi';
import LikeButton from '../../components/LikeButton';
import apiClient from '../../services/apiClient';

interface ProductCardProps {
  product: HairProduct;
  onProductClick?: (product: HairProduct) => void;
  recommendedBy?: string; // '진단결과', '챗봇', '인기제품' 등
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onProductClick,
  recommendedBy = '직접검색'
}) => {

  // 제품 클릭 시 메트릭 저장
  const handleProductClick = async () => {
    try {
      await apiClient.post('/api/metrics/product-click', {
        productCategory: product.category1 || '탈모케어',
        productName: product.productName,
        recommendedBy: recommendedBy
      });
    } catch (error) {
      console.log('제품 클릭 메트릭 저장 실패 (무시됨):', error);
    }

    // 원래 콜백 실행
    onProductClick?.(product);
  };
  
  // 가격 포맷팅 (수정 없음)
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('ko-KR').format(price);
  };

  // 평점 별 표시 (수정 없음)
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

  // 카테고리 아이콘 (수정 없음)
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

  
  // 이미지 오류 발생 시 대체 이미지
  const defaultImageUrl = 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=300&h=300&fit=crop&crop=center';

  return (
    <div
      className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition-all active:scale-[0.98] cursor-pointer"
      onClick={handleProductClick}
    >
      {/* 제품 이미지 */}
      <div className="relative h-40 bg-gray-100 overflow-hidden">
        <img
          src={product.productImage || defaultImageUrl} // product.productImage가 없을 경우 대비
          alt={product.productName}
          className="w-full h-full object-cover"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.src = defaultImageUrl; // 이미지 로드 실패 시 대체 이미지
          }}
          loading="lazy"
        />
        
        {/* 브랜드 배지 */}
        <div className="absolute top-2 left-2">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-white bg-[#1F0101]/90 rounded-full">
            ⭐ {product.brand || product.mallName} {/* 브랜드 정보 없을 경우 쇼핑몰 이름 표시 */}
          </span>
        </div>
        
        {/* 즐겨찾기 버튼 */}
        <div
          className="absolute bottom-2 right-2"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <LikeButton
            type="product"
            itemId={product.productId}
            itemName={product.productName}
            size="sm"
            className="bg-white/95 backdrop-blur shadow-sm hover:bg-white"
          />
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

        {/* 구매 버튼 - 11번가 링크는 product.productUrl을 사용 (수정 없음) */}
        <button
          className="w-full bg-[#1F0101] text-white py-2 px-3 rounded-lg font-medium hover:bg-[#2A0202] transition-colors text-xs"
          onClick={(e) => {
            e.stopPropagation();
            if (product.productUrl) {
                window.open(product.productUrl, '_blank');
            } else {
                alert('연결된 11번가 제품 페이지가 없습니다.');
            }
          }}
        >
          {product.mallName || '11번가'}에서 구매하기
        </button>
      </div>
    </div>
  );
};

export default ProductCard;
