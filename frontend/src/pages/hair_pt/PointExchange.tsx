import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '../../utils/store';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { 
  ArrowLeft, 
  Star, 
  ChevronRight,
  ExternalLink,
  Clock,
  CheckCircle
} from 'lucide-react';

interface ExchangeItem {
  id: number;
  icon: string;
  title: string;
  description: string;
  pointsRequired: number;
  category: string;
  isAvailable: boolean;
  validityPeriod?: string;
  discount?: string;
}

const PointExchange: React.FC = () => {
  const navigate = useNavigate();
  const { currentPoint } = useSelector((state: RootState) => state.seedling);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // 교환 가능한 아이템 데이터
  const exchangeItems: ExchangeItem[] = [
    {
      id: 1,
      icon: '💇‍♀️',
      title: '프리미엄 미용실 30% 할인 쿠폰',
      description: '전문 탈모 관리 미용실 서비스 30% 할인 쿠폰',
      pointsRequired: 800,
      category: 'salon',
      isAvailable: true,
      validityPeriod: '30일',
      discount: '30% 할인'
    },
    {
      id: 2,
      icon: '🎭',
      title: '가발 전문업체 무료 상담권',
      description: '프리미엄 가발 제작업체 전문 상담 + 맞춤형 컨설팅',
      pointsRequired: 600,
      category: 'consultation',
      isAvailable: true,
      validityPeriod: '60일',
      discount: '무료 상담'
    },
    {
      id: 3,
      icon: '🧴',
      title: '탈모 전문 샴푸 20% 할인',
      description: 'DHT 차단 샴푸 스마트스토어 20% 할인 쿠폰',
      pointsRequired: 400,
      category: 'products',
      isAvailable: true,
      validityPeriod: '45일',
      discount: '20% 할인'
    },
    {
      id: 4,
      icon: '💊',
      title: '두피 영양제 세트 할인',
      description: '비오틴, 셀레늄 함유 두피 영양제 25% 할인',
      pointsRequired: 700,
      category: 'products',
      isAvailable: true,
      validityPeriod: '30일',
      discount: '25% 할인'
    },
    {
      id: 5,
      icon: '🏥',
      title: '탈모 전문병원 상담권',
      description: '탈모 전문의 1:1 상담 + 두피 진단 무료',
      pointsRequired: 1000,
      category: 'consultation',
      isAvailable: true,
      validityPeriod: '90일',
      discount: '무료 상담'
    },
    {
      id: 6,
      icon: '🔬',
      title: '두피 진단 키트 무료',
      description: '정밀 두피 상태 진단 키트 + 분석 리포트',
      pointsRequired: 500,
      category: 'diagnosis',
      isAvailable: true,
      validityPeriod: '30일',
      discount: '무료 제공'
    },
    {
      id: 7,
      icon: '💆‍♂️',
      title: '두피 마사지 기계 할인',
      description: '혈액순환 개선 두피 마사지 기계 15% 할인',
      pointsRequired: 600,
      category: 'products',
      isAvailable: true,
      validityPeriod: '60일',
      discount: '15% 할인'
    },
    {
      id: 8,
      icon: '🌿',
      title: '천연 헤어토닉 할인',
      description: '천연 성분 두피 토닉 30% 할인 쿠폰',
      pointsRequired: 350,
      category: 'products',
      isAvailable: true,
      validityPeriod: '30일',
      discount: '30% 할인'
    }
  ];

  const categories = [
    { id: 'all', name: '전체', count: exchangeItems.length },
    { id: 'salon', name: '미용실', count: exchangeItems.filter(item => item.category === 'salon').length },
    { id: 'products', name: '제품', count: exchangeItems.filter(item => item.category === 'products').length },
    { id: 'consultation', name: '상담', count: exchangeItems.filter(item => item.category === 'consultation').length },
    { id: 'diagnosis', name: '진단', count: exchangeItems.filter(item => item.category === 'diagnosis').length }
  ];

  const filteredItems = selectedCategory === 'all' 
    ? exchangeItems 
    : exchangeItems.filter(item => item.category === selectedCategory);

  const handleExchange = (item: ExchangeItem) => {
    if (!item.isAvailable) return;
    
    const userPoints = currentPoint || 0;
    if (userPoints < item.pointsRequired) {
      alert(`포인트가 부족합니다. 현재 포인트: ${userPoints}P, 필요 포인트: ${item.pointsRequired}P`);
      return;
    }

    // 실제 교환 로직은 추후 구현
    alert(`${item.title} 교환이 완료되었습니다!`);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'salon': return '💇‍♀️';
      case 'products': return '🧴';
      case 'consultation': return '🏥';
      case 'diagnosis': return '🔬';
      default: return '🎁';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-First Container - PC에서도 모바일 레이아웃 중앙 정렬 */}
      <div className="max-w-md mx-auto min-h-screen bg-white">
        {/* Header Section */}
        <div className="bg-white p-6 border-b border-gray-200">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">포인트 사용</h1>
          <p className="text-gray-600 mb-4">
            모은 포인트로 탈모관련 각종 제휴혜택을 받아보세요
          </p>
          <div className="flex items-center justify-center space-x-2">
            <Star className="h-5 w-5 text-yellow-400" />
            <span className="text-lg font-semibold text-[#1F0101]">{currentPoint || 0}P 보유</span>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="bg-white p-3 border-b border-gray-200">
        <div className="flex justify-center space-x-1">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex-shrink-0 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedCategory === category.id
                  ? 'bg-[#1F0101] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span className="mr-1 text-xs">{getCategoryIcon(category.id)}</span>
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Exchange Items */}
      <div className="p-4 space-y-4">
        {filteredItems.map((item) => (
          <Card key={item.id} className="bg-white shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                {/* Left: Icon */}
                <div className="flex-shrink-0 mr-4">
                  <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center text-2xl">
                    {item.icon}
                  </div>
                </div>

                {/* Center: Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                      {item.title}
                    </h3>
                    {item.discount && (
                      <Badge className="bg-green-100 text-green-700 text-xs ml-2">
                        {item.discount}
                      </Badge>
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                    {item.description}
                  </p>

                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    {item.validityPeriod && (
                      <div className="flex items-center space-x-1">
                        <Clock className="h-3 w-3" />
                        <span>{item.validityPeriod} 유효</span>
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      <span>교환 가능</span>
                    </div>
                  </div>
                </div>

                {/* Right: Points and Action */}
                <div className="flex-shrink-0 ml-4 text-right">
                  <div className="mb-2">
                    <div className="text-sm font-bold text-[#1F0101]">
                      {item.pointsRequired}P 필요
                    </div>
                    <div className="text-xs text-gray-500">
                      보유: {currentPoint || 0}P
                    </div>
                  </div>
                  
                  <ChevronRight className="h-5 w-5 text-gray-400 mx-auto" />
                </div>
              </div>

              {/* Exchange Button */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <button
                  onClick={() => handleExchange(item)}
                  disabled={!item.isAvailable || (currentPoint || 0) < item.pointsRequired}
                  className={`w-full py-3 rounded-xl font-medium text-sm transition-colors flex items-center justify-center space-x-2 ${
                    item.isAvailable && (currentPoint || 0) >= item.pointsRequired
                      ? 'bg-[#1F0101] hover:bg-[#2A0202] text-white'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <span>교환하기</span>
                  <ExternalLink className="h-4 w-4" />
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Bottom Info */}
      <div className="p-4 bg-white border-t border-gray-200">
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-2">
            💡 <strong>포인트 적립 팁</strong>
          </p>
          <p className="text-xs text-gray-500">
            탈모 PT에서 매일 습관을 실천하고 포인트를 모아보세요!
          </p>
        </div>
      </div>
      </div>
    </div>
  );
};

export default PointExchange;
