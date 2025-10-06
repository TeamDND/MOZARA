import React, { useState, useEffect } from 'react';
import { locationService, Hospital, Location } from '../../../services/locationService';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { MapPin, Star, Phone, ArrowRight } from 'lucide-react';
import MapPreview from '../../../components/ui/MapPreview';
import DirectionModal from '../../../components/ui/DirectionModal';

interface StoreFinderTabProps {
  currentStage: number;
  currentLocation: { latitude: number; longitude: number } | null;
}

const StoreFinderTab: React.FC<StoreFinderTabProps> = ({ currentStage, currentLocation }) => {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [directionTarget, setDirectionTarget] = useState<Hospital | null>(null);

  // 4개 카테고리 정의
  const categories = [
    { name: "탈모병원", icon: "🏥", searchTerm: "탈모병원", category: "탈모병원" },
    { name: "탈모미용실", icon: "💇", searchTerm: "탈모미용실", category: "탈모미용실" },
    { name: "가발전문점", icon: "🎭", searchTerm: "가발전문점", category: "가발전문점" },
    { name: "두피문신", icon: "🎨", searchTerm: "두피문신", category: "두피문신" }
  ];

  // 단계별 카테고리 매핑
  const stageCategoryMap: Record<number, string[]> = {
    0: ['탈모미용실'],
    1: ['탈모병원', '탈모미용실'],
    2: ['탈모병원', '가발전문점', '두피문신'],
    3: ['탈모병원', '가발전문점'],
  };

  // 단계별 추천 설명
  const stageDescriptions: Record<number, string> = {
    0: '예방 중심의 두피 케어와 관리 전문점을 추천합니다',
    1: '초기 탈모 관리를 위한 병원과 케어샵을 추천합니다',
    2: '약물 치료와 전문 관리를 위한 병원과 솔루션을 추천합니다',
    3: '모발이식과 가발 등 집중 치료 솔루션을 추천합니다',
  };

  // 단계에 따른 보이는 카테고리 필터링
  const visibleCategories = categories.filter(c => (stageCategoryMap[currentStage] || []).includes(c.category));

  // 첫 번째 카테고리를 기본 선택으로 설정
  useEffect(() => {
    if (visibleCategories.length > 0 && !selectedCategory) {
      setSelectedCategory(visibleCategories[0].searchTerm);
    }
  }, [visibleCategories, selectedCategory]);

  // 병원 데이터 가져오기
  useEffect(() => {
    const fetchHospitals = async () => {
      if (!currentLocation || !selectedCategory) {
        setHospitals([]);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const searchParams = {
          query: selectedCategory,
          location: currentLocation,
          radius: 10000,
        };

        const results = await locationService.searchHospitals(searchParams);
        const filteredResults = locationService.filterHospitalsByStage(results, currentStage);
        setHospitals(filteredResults.length > 0 ? filteredResults : results);
      } catch (err) {
        console.error('병원 검색 실패:', err);
        setError('병원 검색 중 오류가 발생했습니다.');
        setHospitals([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHospitals();
  }, [currentStage, currentLocation, selectedCategory]);

  // 카테고리별 그룹화
  const groupedHospitals = hospitals.reduce((groups, hospital) => {
    const category = hospital.category || '기타';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(hospital);
    return groups;
  }, {} as Record<string, Hospital[]>);

  // 그룹 순서 정의
  const groupOrder = ['탈모병원', '탈모미용실', '가발전문점', '두피문신', '기타'];

  // 그룹별 섹션 생성
  const sections = groupOrder
    .filter(group => groupedHospitals[group] && groupedHospitals[group].length > 0)
    .map(group => ({
      group,
      items: groupedHospitals[group]
    }));


  return (
    <div className="space-y-4">
      {/* 단계별 추천 설명 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-800">
          💡 {stageDescriptions[currentStage]}
        </p>
      </div>

      {/* 카테고리 선택 탭 */}
      <div className="flex gap-2 w-full pb-2 bg-transparent overflow-x-auto">
        {visibleCategories.map((category) => (
          <button
            key={category.name}
            onClick={() => setSelectedCategory(category.searchTerm)}
            className={`flex-shrink-0 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
              selectedCategory === category.searchTerm
                ? 'bg-[#222222] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <span className="mr-1">{category.icon}</span>
            {category.name}
          </button>
        ))}
      </div>

      {/* 검색 결과 통합 지도 */}
      {!isLoading && hospitals.length > 0 && currentLocation && (
        <div className="mb-4">
          <div className="bg-white rounded-xl overflow-hidden border border-gray-200">
            <div className="px-3 py-2 bg-gray-50 border-b">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">📍 검색 결과 ({hospitals.length}개)</span>
              </div>
            </div>
            <MapPreview
              latitude={currentLocation.latitude}
              longitude={currentLocation.longitude}
              hospitals={hospitals}
              userLocation={currentLocation}
              zoom={13}
              className="h-[200px]"
            />
          </div>
        </div>
      )}

      {/* 로딩 상태 */}
      {isLoading && (
        <div className="flex justify-center items-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#222222]"></div>
          <span className="ml-3 text-gray-600 text-sm">검색 중...</span>
        </div>
      )}

      {/* 에러 상태 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800">⚠️ {error}</p>
        </div>
      )}

      {/* 검색 결과 */}
      {!isLoading && !error && sections.length > 0 && (
        <div className="space-y-4">
          {sections.map((section) => (
            <div key={section.group}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <span>
                    {section.group === '탈모병원' && '🏥'}
                    {section.group === '탈모미용실' && '💇'}
                    {section.group === '가발전문점' && '🎭'}
                    {section.group === '두피문신' && '🎨'}
                    {section.group === '기타' && '🏢'}
                  </span>
                  {section.group} ({section.items.length})
                </h3>
              </div>
              <div className="space-y-3">
                {section.items.slice(0, 3).map((hospital) => (
                  <div 
                    key={hospital.id}
                    className={`bg-white rounded-xl border ${hospital.isRecommended ? 'border-[#1F0101] ring-2 ring-[#1F0101]/10' : 'border-gray-100'} hover:shadow-md transition-all overflow-hidden relative`}
                  >
                    {hospital.isRecommended && (
                      <div className="absolute top-2 right-2 z-10">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-white bg-[#1F0101] rounded-full">
                          ⭐ 추천
                        </span>
                      </div>
                    )}
                    
                    <div className="p-4">
                      <h3 className="font-semibold text-gray-900 mb-2 pr-14">{hospital.name}</h3>
                      <div className="space-y-1 text-xs text-gray-600 mb-3">
                        <div className="flex items-center gap-1">
                          <span>📍</span>
                          <span className="line-clamp-1">{hospital.address}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span>📞 {hospital.phone}</span>
                          <span>📏 {locationService.formatDistance(hospital.distance)}</span>
                        </div>
                      </div>
                      
                      {hospital.specialties && hospital.specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {hospital.specialties.slice(0, 2).map((specialty, index) => (
                            <span key={index} className="px-2 py-0.5 bg-[#1F0101]/10 text-[#1F0101] text-[10px] rounded-full">
                              {specialty}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          onClick={() => setDirectionTarget(hospital)}
                          className="flex-1 px-3 py-2 bg-[#1F0101] hover:bg-[#2A0202] text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          지도보기
                        </button>
                        <button
                          onClick={() => {
                            if (hospital.phone) {
                              window.location.href = `tel:${hospital.phone}`;
                            }
                          }}
                          className="flex-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition-colors"
                        >
                          전화하기
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 결과 없음 */}
      {!isLoading && !error && sections.length === 0 && selectedCategory && (
        <div className="text-center py-8">
          <div className="text-gray-400 text-4xl mb-2">🏥</div>
          <h3 className="text-sm font-medium text-gray-900 mb-2">검색 결과가 없습니다</h3>
          <p className="text-xs text-gray-600">주변에 해당 병원이 없습니다.</p>
        </div>
      )}

      {/* Direction Modal */}
      <DirectionModal
        isOpen={!!directionTarget}
        onClose={() => setDirectionTarget(null)}
        name={directionTarget?.name || ''}
        address={directionTarget?.roadAddress || directionTarget?.address}
        latitude={directionTarget?.latitude}
        longitude={directionTarget?.longitude}
        userLocation={currentLocation || undefined}
      />
    </div>
  );
};

export default StoreFinderTab;
