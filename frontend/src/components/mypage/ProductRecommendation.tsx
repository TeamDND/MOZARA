import React from 'react';
import { Star, ShoppingCart } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ImageWithFallback } from '../../hooks/ImageWithFallback';

// TypeScript: ProductRecommendation 컴포넌트 타입 정의
interface Product {
  name: string;
  brand: string;
  price: string;
  rating: number;
  reviews: number;
  image: string;
  matchReason: string;
  category: string;
}

interface ProductRecommendationProps {
  products: Product[];
}

const ProductRecommendation: React.FC<ProductRecommendationProps> = ({ products }) => {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm">
      <h3 className="text-lg font-semibold text-gray-800 mb-2">맞춤형 제품 추천</h3>
      <p className="text-sm text-gray-600 mb-4">
        분석 결과에 따라 선별된 헤어케어 제품들입니다
      </p>
      
      <div className="space-y-4">
        {products.map((product, index) => (
          <div key={index} className="bg-gray-50 p-4 rounded-xl">
            <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-gray-200">
              <ImageWithFallback 
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </div>
            
            <Badge variant="outline" className="mb-2 text-xs px-2 py-1">
              {product.category}
            </Badge>
            
            <h4 className="text-base font-semibold text-gray-800 mb-1">{product.name}</h4>
            <p className="text-sm text-gray-600 mb-2">
              {product.brand}
            </p>
            
            <div className="flex items-center justify-between mb-3">
              <span className="font-semibold text-lg text-gray-800">{product.price}</span>
              <div className="flex items-center gap-1 text-sm">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span>{product.rating}</span>
                <span className="text-gray-500">({product.reviews})</span>
              </div>
            </div>
            
            <div className="bg-green-50 p-3 rounded-lg text-xs mb-3">
              ✨ {product.matchReason}
            </div>
            
            <Button className="w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-[0.98]">
              <ShoppingCart className="w-4 h-4 mr-2" />
              구매하기
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductRecommendation;
