import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { locationService, Hospital, Location } from '../services/locationService';
import HairLossStageSelector from '../components/ui/HairLossStageSelector';
import MapPreview from '../components/ui/MapPreview';
import DirectionModal from '../components/ui/DirectionModal';
import { HAIR_LOSS_STAGES, STAGE_RECOMMENDATIONS } from '../utils/hairLossStages';

const StoreFinder: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [filteredHospitals, setFilteredHospitals] = useState<Hospital[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isUsingSampleData, setIsUsingSampleData] = useState(false);
  const [selectedStage, setSelectedStage] = useState<number | null>(null);
  const [showStageSelector, setShowStageSelector] = useState(true);
  const [imageLoadErrors, setImageLoadErrors] = useState<Set<string>>(new Set());
  const [directionTarget, setDirectionTarget] = useState<Hospital | null>(null);

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
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="text-gray-600 hover:text-gray-800"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">병원찾기</h1>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowStageSelector(!showStageSelector)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  showStageSelector 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {showStageSelector ? '단계 선택 숨기기' : '단계 선택 보기'}
              </button>
            </div>
            <div className="text-sm text-gray-500">
              {currentLocation 
                ? `주변 10km 내 결과 ${effectiveHospitals.length}개`
                : `결과 ${effectiveHospitals.length}개`
              }
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 탈모 단계 선택기 */}
        {showStageSelector && (
          <div className="mb-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <HairLossStageSelector
                selectedStage={selectedStage}
                onStageSelect={setSelectedStage}
              />
            </div>
          </div>
        )}

        {/* 선택된 단계 정보 표시 */}
        {selectedStage !== null && (
          <div className="mb-6">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-blue-900">
                    {selectedStage}단계: {HAIR_LOSS_STAGES[selectedStage]?.name}
                  </h3>
                  <p className="text-blue-700 text-sm mt-1">
                    {STAGE_RECOMMENDATIONS[selectedStage as keyof typeof STAGE_RECOMMENDATIONS]?.message}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedStage(null)}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  단계 초기화
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stage-based Map Preview */}
        {selectedStage !== null && (
          <div className="mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">현재 단계 추천 장소 미리보기</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {getStagePreviewTargets().map((h) => (
                  <MapPreview
                    key={`preview-${h.id}`}
                    latitude={h.latitude ?? (currentLocation?.latitude as number)}
                    longitude={h.longitude ?? (currentLocation?.longitude as number)}
                    title={h.name}
                    className=""
                    zoom={15}
                  />
                ))}
                {getStagePreviewTargets().length === 0 && (
                  <div className="text-sm text-gray-500">추천 미리보기 대상을 찾지 못했습니다. 검색을 입력해 보세요.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Search Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              병원명 또는 주소 검색
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="병원명, 주소로 검색... (위치 기반으로 자동 검색)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Category Buttons - 단계별 가시성 제어 */}
        <div className="mb-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {visibleCategories.map((category) => (
              <button
                key={category.name}
                onClick={() => setSearchTerm(category.searchTerm)}
                className="flex flex-col items-center p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 hover:border-blue-300"
              >
                <span className="text-2xl mb-2">{category.icon}</span>
                <span className="text-sm font-medium text-gray-700">{category.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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

        {/* Results */}
        {!isLoading && sections.length > 0 && (
          <div className="space-y-8">
            {sections.map((section) => (
              <div key={section.group} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div 
                  className="flex items-center justify-between p-4 bg-gray-50 border-b cursor-pointer hover:bg-gray-100"
                  onClick={() => toggleGroup(section.group)}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">
                      {section.group === '탈모병원' && '🏥'}
                      {section.group === '탈모미용실' && '💇'}
                      {section.group === '가발전문점' && '🎭'}
                      {section.group === '두피문신' && '🎨'}
                      {section.group === '기타' && '🏢'}
                    </span>
                    <h2 className="text-lg font-semibold text-gray-900">{section.group}</h2>
                  </div>
                  <span className="text-sm text-gray-500">{section.items.length}개</span>
                </div>
                {!collapsedGroups[section.group] && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
                    {section.items.map((hospital, idx) => (
                      <div key={`${hospital.id}_${idx}`} className={`bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-lg transition-shadow relative ${
                        hospital.isRecommended ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
                      }`}>
                        {/* Hospital Image */}
                        <div className="relative">
                          {hospital.imageUrl && !hospital.imageUrl.includes('placeholder') && !imageLoadErrors.has(hospital.id) ? (
                            <div className="w-full h-48 bg-gray-200 overflow-hidden relative group">
                              <img 
                                src={optimizeImageUrl(hospital.imageUrl, 400, 200)} 
                                alt={hospital.name}
                                className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105"
                                loading="lazy"
                                onError={() => {
                                  console.log(`이미지 로드 실패: ${hospital.name} - ${hospital.imageUrl}`);
                                  setImageLoadErrors(prev => new Set(prev).add(hospital.id));
                                }}
                                onLoad={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.opacity = '1';
                                  const loadingElement = document.getElementById(`loading-${hospital.id}`);
                                  if (loadingElement) {
                                    loadingElement.style.display = 'none';
                                  }
                                  console.log(`이미지 로드 성공: ${hospital.name} - ${hospital.imageUrl}`);
                                }}
                                style={{ opacity: 0 }}
                              />
                              {/* 로딩 인디케이터 */}
                              <div className="absolute inset-0 flex items-center justify-center bg-gray-100" id={`loading-${hospital.id}`}>
                                <div className="flex flex-col items-center">
                                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
                                  <span className="text-xs text-gray-500">이미지 로딩 중...</span>
                                </div>
                              </div>
                              
                              {/* 이미지 소스 표시 (디버깅용) */}
                              <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                {hospital.imageUrl.includes('naver.com') ? '네이버' : 
                                 hospital.imageUrl.includes('kakao.com') ? '카카오' :
                                 hospital.imageUrl.includes('google') ? '구글' :
                                 hospital.imageUrl.includes('unsplash') ? 'Unsplash' : '기타'}
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-48 overflow-hidden">
                              {getDefaultImageContent(hospital)}
                            </div>
                          )}
                          <div className="absolute top-3 right-3">
                            <div className="flex items-center space-x-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full">
                              <span className="text-yellow-400">{renderStars(hospital.rating)}</span>
                              <span className="text-xs text-gray-600">({hospital.rating.toFixed(1)})</span>
                            </div>
                          </div>
                          
                          {/* 추천 배지 */}
                          {hospital.isRecommended && (
                            <div className="absolute top-3 left-3">
                              <div className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                                추천
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Hospital Info */}
                        <div className="p-4">
                          <h3 className="text-lg font-semibold text-gray-900 mb-2 overflow-hidden" style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical'
                          }}>
                            {hospital.name}
                          </h3>
                          
                          <div className="space-y-2 text-sm text-gray-600">
                            <div className="flex items-start space-x-2">
                              <svg className="w-4 h-4 mt-0.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span className="flex-1">{hospital.address}</span>
                            </div>
                            
                            {hospital.phone && (
                              <div className="flex items-center space-x-2">
                                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <span>{hospital.phone}</span>
                              </div>
                            )}
                            
                            <div className="flex items-center space-x-2">
                              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span>{locationService.formatDistance(hospital.distance)}</span>
                            </div>
                          </div>

                          {hospital.specialties && hospital.specialties.length > 0 && (
                            <div className="mt-3">
                              <div className="flex flex-wrap gap-1">
                                {hospital.specialties.slice(0, 3).map((specialty, index) => (
                                  <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                    {specialty}
                                  </span>
                                ))}
                                {hospital.specialties.length > 3 && (
                                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                                    +{hospital.specialties.length - 3}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="mt-4 flex space-x-2">
                            <button
                              onClick={() => setDirectionTarget(hospital)}
                              className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              지도보기
                            </button>
                            <button
                              onClick={() => {
                                if (hospital.phone) {
                                  window.location.href = `tel:${hospital.phone}`;
                                }
                              }}
                              className="px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                            >
                              전화
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-yellow-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-yellow-800 text-sm">
                현재 샘플 데이터를 표시하고 있습니다. 실제 API 연동을 위해 백엔드 설정을 확인해주세요.
              </span>
            </div>
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
        />
      </div>
    </div>
  );
};

export default StoreFinder;
