import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { locationService, Hospital, Location } from '../../services/locationService';
import HairLossStageSelector from '../../components/ui/HairLossStageSelector';
import MapPreview from '../../components/ui/MapPreview';
import DirectionModal from '../../components/ui/DirectionModal';
import { HAIR_LOSS_STAGES, STAGE_RECOMMENDATIONS } from '../../utils/hairLossStages';

const StoreFinder: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [filteredHospitals, setFilteredHospitals] = useState<Hospital[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isUsingSampleData, setIsUsingSampleData] = useState(false);
  const [selectedStage, setSelectedStage] = useState<number | null>(null);
  const [showStageSelector, setShowStageSelector] = useState(true);
  const [showCategoryButtons, setShowCategoryButtons] = useState(true);
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(new Set());
  const [directionTarget, setDirectionTarget] = useState<Hospital | null>(null);
  
  // 진단 결과 가져오기 (URL state 또는 localStorage)
  const diagnosisResult = location.state?.diagnosisResult || 
    (typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('lastDiagnosisResult') || 'null') : null);

  // 4개 카테고리 정의
  const categories = [
    { name: "탈모병원", icon: "🏥", searchTerm: "탈모병원", category: "탈모병원" },
    { name: "탈모미용실", icon: "💇", searchTerm: "탈모미용실", category: "탈모미용실" },
    { name: "가발전문점", icon: "🎭", searchTerm: "가발전문점", category: "가발전문점" },
    { name: "두피문신", icon: "🎨", searchTerm: "두피문신", category: "두피문신" }
  ];

  // 단계별 노출 카테고리 매핑
  const stageCategoryMap: Record<number, string[]> = {
    0: ["탈모미용실"],
    1: ["탈모병원", "탈모미용실"],
    2: ["탈모병원", "가발전문점", "두피문신"],
    3: ["탈모병원", "가발전문점"],
  };

  const visibleCategories = selectedStage === null
    ? categories
    : categories.filter(c => (stageCategoryMap[selectedStage] || []).includes(c.category));

  // URL 파라미터에서 카테고리 읽기 및 진단 결과 적용
  useEffect(() => {
    const category = searchParams.get('category');
    const stage = searchParams.get('stage');
    
    if (category) {
      setSearchTerm(category);
      setShowStageSelector(false);
      setShowCategoryButtons(false);
    }
    
    // 진단 결과가 있으면 자동으로 단계 설정
    if (diagnosisResult?.stage !== undefined) {
      setSelectedStage(diagnosisResult.stage);
      setShowStageSelector(false);
    } else if (stage) {
      setSelectedStage(parseInt(stage));
      setShowStageSelector(false);
    }
  }, [diagnosisResult]); // 진단 결과 변경 시 재실행

  // 단계 선택 시 기본 검색어 자동 설정 (검색어 비어있을 때)
  useEffect(() => {
    if (selectedStage !== null && (!searchTerm || searchTerm.trim() === '')) {
      const first = (stageCategoryMap[selectedStage] || [])[0];
      if (first) setSearchTerm(first);
    }
  }, [selectedStage]);

  // 위치 정보 가져오기
  useEffect(() => {
    const initializeData = async () => {
      try {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const location = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              };
              setCurrentLocation(location);
              setLocationError(null);
            },
            (error) => {
              console.error('위치 정보를 가져올 수 없습니다:', error);
              setLocationError('위치 정보를 가져올 수 없습니다.');
            }
          );
        } else {
          setLocationError('이 브라우저는 위치 정보를 지원하지 않습니다.');
        }
      } catch (error) {
        console.error('위치 초기화 오류:', error);
        setLocationError('위치 정보 초기화에 실패했습니다.');
      }
    };

    initializeData();
  }, []);

  // 병원 검색
  useEffect(() => {
    const searchHospitals = async () => {
      if (!searchTerm.trim()) {
        setHospitals([]);
        setFilteredHospitals([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const searchParams = {
          query: searchTerm,
          location: currentLocation || undefined,
          radius: 10000, // 기본 10km로 확대
        };

        console.log('검색 시작:', searchParams);
        const results = await locationService.searchHospitals(searchParams);
        console.log('검색 결과:', results);
        
        setHospitals(results);
        
        // 단계가 선택된 경우 필터링 적용
        if (selectedStage !== null) {
          const filteredResults = locationService.filterHospitalsByStage(results, selectedStage);
          setFilteredHospitals(filteredResults);
        } else {
          setFilteredHospitals(results);
        }

        // 실제 API 결과가 있는지 확인하여 샘플 데이터 사용 여부 결정
        setIsUsingSampleData(results.some(hospital => hospital.id.startsWith('sample_')));
      } catch (error) {
        console.error('병원 검색 실패:', error);
        // 에러 발생 시 빈 배열로 설정
        setHospitals([]);
        setFilteredHospitals([]);
      } finally {
        setIsLoading(false);
      }
    };

    searchHospitals();
  }, [searchTerm, currentLocation, selectedStage]);

  // 단계 선택 시 필터링 적용
  useEffect(() => {
    if (selectedStage !== null && hospitals.length > 0) {
      const filteredResults = locationService.filterHospitalsByStage(hospitals, selectedStage);
      setFilteredHospitals(filteredResults);
    } else if (selectedStage === null) {
      setFilteredHospitals(hospitals);
    }
  }, [selectedStage, hospitals]);

  // 필터링 로직 - 검색 결과를 그대로 표시 (locationService에서 이미 필터링됨)
  useEffect(() => {
    setFilteredHospitals(hospitals);
  }, [hospitals]);

  // 단계 필터 결과가 없으면 전체 결과로 자동 대체
  const effectiveHospitals = (selectedStage !== null && filteredHospitals.length === 0)
    ? hospitals
    : filteredHospitals;

  // 카테고리별 그룹화
  const groupedHospitals = effectiveHospitals.reduce((groups, hospital) => {
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

  // 단계별 대표 카테고리별 첫 번째 장소로 미리보기 맵 생성
  const getStagePreviewTargets = () => {
    if (!currentLocation) return [] as Hospital[];
    if (selectedStage === null) return [] as Hospital[];

    const stageToCategories: Record<number, string[]> = {
      0: ['탈모미용실'],
      1: ['탈모병원', '두피클리닉', '피부과'],
      2: ['탈모병원', '모발이식', '가발전문점', '두피문신'],
      3: ['모발이식', '가발전문점'],
    };

    const targets: Hospital[] = [];
    const wanted = stageToCategories[selectedStage] || [];
    for (const cat of wanted) {
      const list = groupedHospitals[cat];
      if (list && list.length > 0) {
        targets.push(list[0]);
      }
    }
    return targets;
  };

  // 별점 렌더링 함수
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push('★');
    }
    if (hasHalfStar) {
      stars.push('☆');
    }
    while (stars.length < 5) {
      stars.push('☆');
    }
    return stars.join('');
  };

  // 기본 이미지 콘텐츠 생성
  const getDefaultImageContent = (hospital: Hospital) => {
    const category = hospital.category || '기타';
    const firstLetter = hospital.name.charAt(0).toUpperCase();
    
    const categoryColors = {
      '탈모병원': 'bg-blue-100 text-blue-800',
      '탈모미용실': 'bg-purple-100 text-purple-800',
      '가발전문점': 'bg-green-100 text-green-800',
      '두피문신': 'bg-orange-100 text-orange-800',
      '기타': 'bg-gray-100 text-gray-800'
    };

    const categoryIcons = {
      '탈모병원': '🏥',
      '탈모미용실': '💇',
      '가발전문점': '🎭',
      '두피문신': '🎨',
      '기타': '🏢'
    };

    return (
      <div className={`w-full h-48 flex items-center justify-center ${categoryColors[category as keyof typeof categoryColors] || categoryColors['기타']}`}>
        <div className="text-center">
          <div className="text-4xl mb-2">{categoryIcons[category as keyof typeof categoryIcons] || '🏢'}</div>
          <div className="text-2xl font-bold">{firstLetter}</div>
          <div className="text-sm mt-1">{category}</div>
        </div>
      </div>
    );
  };

  // 이미지 URL 최적화
  const optimizeImageUrl = (url: string, width: number, height: number): string => {
    if (url.includes('unsplash.com')) {
      return url.replace(/\/\d+x\d+/, `/${width}x${height}`);
    }
    return url;
  };

  // 그룹 토글 상태
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (g: string) => {
    setCollapsedGroups(prev => ({ ...prev, [g]: !prev[g] }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-First Container - MainContent 스타일 적용 */}
      <div className="max-w-md mx-auto min-h-screen bg-white">
        {/* Main Content */}
        <main className="px-4 py-6">
          {/* 페이지 헤더 - MainContent 스타일 */}
          <div className="text-center mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">
              {!showCategoryButtons && searchTerm === '가발전문점' 
                ? '가발 매장 찾기'
                : !showCategoryButtons && searchTerm === '두피문신'
                ? '두피문신 매장 찾기'
                : '탈모 전문 병원 찾기'}
            </h2>
            <p className="text-sm text-gray-600">
              {!showCategoryButtons && searchTerm === '가발전문점' 
                ? '내 주변 가발 전문점을 찾아보세요'
                : !showCategoryButtons && searchTerm === '두피문신'
                ? '내 주변 두피문신 전문점을 찾아보세요'
                : '주변 탈모 전문 병원과 클리닉을 쉽게 찾아보세요'}
            </p>
          </div>

          {/* 검색창 - 간소화 */}
          <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="병원명, 주소로 검색..."
                className="w-full px-4 py-3 pr-10 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#1F0101] focus:border-transparent"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>

          {/* 단계별 추천 - YouTube Videos 스타일 */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">AI 분석 기반 맞춤 추천</h3>
            <div className="space-y-2">
              <select
                value={selectedStage !== null ? `stage${selectedStage}` : ''}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    setSelectedStage(null);
                  } else {
                    const stage = parseInt(value.replace('stage', ''));
                    setSelectedStage(stage);
                    setShowStageSelector(false);
                    // 단계에 맞는 첫 번째 카테고리로 자동 검색
                    const firstCategory = stageCategoryMap[stage]?.[0];
                    if (firstCategory) {
                      setSearchTerm(firstCategory);
                    }
                  }
                }}
                className="w-full px-4 py-3 border border-gray-100 rounded-xl focus:ring-2 focus:ring-[#1F0101] focus:border-transparent bg-white text-gray-700 text-sm"
              >
                <option value="">전체 단계 보기</option>
                <option value="stage0">0단계 - 정상 (예방 관리)</option>
                <option value="stage1">1단계 - 초기 (증상 관리)</option>
                <option value="stage2">2단계 - 중기 (약물 치료)</option>
                <option value="stage3">3단계 - 심화 (시술 정보)</option>
              </select>
              {selectedStage !== null && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-xs text-blue-800">
                    {selectedStage === 0 && "💡 예방 중심의 두피 케어와 관리 전문점을 추천합니다"}
                    {selectedStage === 1 && "💡 초기 탈모 관리를 위한 병원과 케어샵을 추천합니다"}
                    {selectedStage === 2 && "💡 약물 치료와 전문 관리를 위한 병원과 솔루션을 추천합니다"}
                    {selectedStage === 3 && "💡 모발이식과 가발 등 집중 치료 솔루션을 추천합니다"}
                  </p>
                </div>
              )}
            </div>
          </div>

        {/* 검색 결과 통합 지도 - 간소화 */}
        {!isLoading && effectiveHospitals.length > 0 && currentLocation && (
          <div className="mb-4">
            <div className="bg-white rounded-xl overflow-hidden border border-gray-200">
              <div className="px-3 py-2 bg-gray-50 border-b">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-gray-700">📍 검색 결과 ({effectiveHospitals.length}개)</span>
                </div>
              </div>
              <MapPreview
                latitude={currentLocation.latitude}
                longitude={currentLocation.longitude}
                hospitals={effectiveHospitals}
                userLocation={currentLocation}
                zoom={13}
                className="h-[250px]"
              />
            </div>
          </div>
        )}

        {/* Category Buttons - MainContent 배너 스타일 */}
        {showCategoryButtons && (
          <div className="mb-6">
            <div className="space-y-3">
              {visibleCategories.map((category) => (
                <div key={category.name} className="relative">
                  <div className="absolute top-2 right-2 z-10">
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] leading-none text-white bg-[#222222]/90 rounded-full shadow-sm">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="text-yellow-300">
                        <path d="M12 2l1.9 5.8h6.1l-4.9 3.6 1.9 5.8-5-3.6-5 3.6 1.9-5.8L4 7.8h6.1L12 2z"/>
                      </svg>
                      NEW
                    </span>
                  </div>
                  <div 
                    className="bg-white rounded-xl border border-gray-100 hover:shadow-md transition-all cursor-pointer active:scale-[0.98] touch-manipulation"
                    onClick={() => setSearchTerm(category.searchTerm)}
                  >
                    <div className="flex items-center p-4">
                      {/* 아이콘 영역 */}
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 mr-4 flex items-center justify-center text-3xl">
                        {category.icon}
                      </div>
                      
                      {/* 텍스트 영역 */}
                      <div className="flex-1">
                        <h3 className="text-base font-semibold text-gray-900 mb-1">{category.name}</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {category.name === "탈모병원" && "탈모 전문 병원과 클리닉 찾기"}
                          {category.name === "탈모미용실" && "탈모 전용 미용실과 케어샵 찾기"}
                          {category.name === "가발전문점" && "맞춤 가발 제작 전문점 찾기"}
                          {category.name === "두피문신" && "두피 문신(SMP) 전문점 찾기"}
                        </p>
                      </div>
                      
                      {/* 화살표 */}
                      <div className="flex-shrink-0 ml-2">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1F0101]"></div>
            <span className="ml-3 text-gray-600">검색 중...</span>
          </div>
        )}

        {/* Stage filter fallback 안내 */}
        {!isLoading && selectedStage !== null && filteredHospitals.length === 0 && hospitals.length > 0 && (
          <div className="mb-4">
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm rounded-md px-4 py-3">
              선택한 단계 기준에 맞는 결과가 없어 일반 결과를 대신 표시합니다.
            </div>
          </div>
        )}

        {/* Results - MainContent 카드 스타일 */}
        {!isLoading && sections.length > 0 && (
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
                  {section.items.map((hospital) => (
                    <div 
                      key={hospital.id}
                      className={`bg-white rounded-xl border ${hospital.isRecommended ? 'border-[#1F0101] ring-2 ring-[#1F0101]/10' : 'border-gray-100'} hover:shadow-md transition-all overflow-hidden relative`}
                    >
                      {hospital.isRecommended && (
                        <div className="absolute top-2 right-2">
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

        {/* No Results */}
        {!isLoading && sections.length === 0 && searchTerm && (
          <div className="text-center py-12">
            <div className="text-gray-400 text-6xl mb-4">🔍</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">검색 결과가 없습니다</h3>
            <p className="text-gray-600">다른 검색어를 시도해보세요.</p>
          </div>
        )}

        {/* Sample Data Notice */}
        {isUsingSampleData && (
          <div className="mt-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
            ⚠️ 샘플 데이터가 표시되고 있습니다
          </div>
        )}

        {/* Bottom Spacing for Mobile Navigation */}
        <div className="h-20"></div>
        </main>

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
    </div>
  );
};

export default StoreFinder;
