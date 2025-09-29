import React, { useState } from 'react';
import { MapPin, Star } from 'lucide-react';
import { Button } from '../ui/button';
import { ImageWithFallback } from '../../hooks/ImageWithFallback';

// TypeScript: HospitalMap 컴포넌트 타입 정의
interface Hospital {
  name: string;
  specialty: string;
  category: string;
  rating: number;
  reviews: number;
  distance: string;
  phone: string;
  image: string;
  matchReason: string;
}

interface HospitalMapProps {
  hospitals: Hospital[];
}

const HospitalMap: React.FC<HospitalMapProps> = ({ hospitals }) => {
  const [selectedRegion, setSelectedRegion] = useState('서울');
  const [selectedCategory, setSelectedCategory] = useState('전체');

  const regions = ['서울', '경기', '부산', '대구', '인천', '광주', '대전', '울산'];
  const categories = ['전체', '탈모병원', '탈모클리닉', '모발이식', '가발'];

  // 카테고리별 병원 필터링
  const filteredHospitals = selectedCategory === '전체' 
    ? hospitals 
    : hospitals.filter(hospital => hospital.category === selectedCategory);

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800">내가 찜한 탈모 맵</h3>
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-gray-600" />
          <select 
            value={selectedRegion}
            onChange={(e) => setSelectedRegion(e.target.value)}
            className="bg-white border border-gray-300 rounded-lg px-2 py-1 text-sm"
          >
            {regions.map(region => (
              <option key={region} value={region}>{region}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 이중 탭 - 카테고리 선택 */}
      <div className="mb-4">
        <div className="flex overflow-x-auto space-x-1 pb-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`flex-shrink-0 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>
      
      <div className="space-y-4">
        {filteredHospitals.map((hospital, index) => (
          <div key={index} className="bg-gray-50 p-4 rounded-xl">
            <div className="aspect-video rounded-lg overflow-hidden mb-3 bg-gray-200">
              <ImageWithFallback 
                src={hospital.image}
                alt={hospital.name}
                className="w-full h-full object-cover"
              />
            </div>
            
            <h4 className="text-base font-semibold text-gray-800 mb-2">{hospital.name}</h4>
            <p className="text-sm text-gray-600 mb-2">
              {hospital.specialty}
            </p>
            
            <div className="flex items-center gap-4 text-sm mb-3">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span>{hospital.rating}</span>
                <span className="text-gray-500">({hospital.reviews})</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span>{hospital.distance}</span>
              </div>
            </div>
            
            <div className="bg-blue-50 p-3 rounded-lg text-xs mb-3">
              💡 {hospital.matchReason}
            </div>
            
            <Button className="w-full h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white active:scale-[0.98]">
              자세히 보기
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HospitalMap;
