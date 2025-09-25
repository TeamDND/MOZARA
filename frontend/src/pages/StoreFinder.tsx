import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { locationService, Hospital, Location } from '../services/locationService';

const StoreFinder: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [filteredHospitals, setFilteredHospitals] = useState<Hospital[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isUsingSampleData, setIsUsingSampleData] = useState(false);

  // 4개 카테고리만 표시
  const categories = [
    { name: "탈모병원", icon: "🏥", searchTerm: "탈모병원", category: "탈모병원" },
    { name: "탈모미용실", icon: "💇", searchTerm: "탈모미용실", category: "탈모미용실" },
    { name: "가발전문점", icon: "🎭", searchTerm: "가발전문점", category: "가발전문점" },
    { name: "두피문신", icon: "🎨", searchTerm: "두피문신", category: "두피문신" }
  ];

  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [showMap, setShowMap] = useState<boolean>(false);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [groupByCategory, setGroupByCategory] = useState<boolean>(true);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const [firstGroup, setFirstGroup] = useState<string>('탈모병원');

  const isValidKoreanCoord = (lat?: number, lng?: number) => {
    if (typeof lat !== 'number' || typeof lng !== 'number' || !isFinite(lat) || !isFinite(lng)) return false;
    return lat >= 33 && lat <= 39 && lng >= 124 && lng <= 132;
  };

  // 현재 위치 가져오기 및 초기 데이터 로드
  useEffect(() => {
    const initializeData = async () => {
      // 위치 정보 가져오기
      try {
        const location = await locationService.getCurrentLocation();
        setCurrentLocation(location);
        setLocationError(null);
        console.log('현재 위치 설정됨:', location);
      } catch (error) {
        console.error('위치 정보 가져오기 실패:', error);
        const errorMessage = error instanceof Error ? error.message : '위치 정보를 가져올 수 없습니다.';
        setLocationError(errorMessage);
      }

      // 초기 카테고리 설정
      setSelectedCategory('탈모병원');
      setSearchTerm('탈모병원');
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
          radius: 5000, // 기본 5km
        };

        console.log('검색 시작:', searchParams);
        const results = await locationService.searchHospitals(searchParams);
        console.log('검색 결과:', results);
        
        setHospitals(results);
        setFilteredHospitals(results);

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
  }, [searchTerm, currentLocation]);

  // 필터링 로직 - 검색 결과를 그대로 표시 (locationService에서 이미 필터링됨)
  useEffect(() => {
    setFilteredHospitals(hospitals);
  }, [hospitals]);

  const renderStars = (rating: number) => {
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

    const remainingStars = 5 - Math.ceil(rating);
    for (let i = 0; i < remainingStars; i++) {
      stars.push(
        <span key={`empty-${i}`} className="text-gray-300">★</span>
      );
    }

    return stars;
  };

  const normalizeGroup = (h: Hospital): string => {
    const cat = (h.category || '').toLowerCase();
    const name = (h.name || '').toLowerCase();
    const specs = (h.specialties || []).map(s => s.toLowerCase()).join(' ');
    if (cat.includes('문신') || cat.includes('두피문신') || name.includes('문신') || specs.includes('문신') || name.includes('smp')) {
      return '두피문신';
    }
    if (name.includes('가발') || specs.includes('가발') || cat.includes('가발')) {
      return '가발전문점';
    }
    if (cat.includes('헤어살롱') || cat.includes('미용') || name.includes('미용') || specs.includes('미용')) {
      return '탈모미용실';
    }
    return '탈모병원';
  };

  const categoriesOrder = ['탈모병원', '두피문신', '가발전문점', '탈모미용실'];

  const renderOrder = (() => {
    if (!groupByCategory || !firstGroup) return categoriesOrder;
    const others = categoriesOrder.filter(c => c !== firstGroup);
    return [firstGroup, ...others];
  })();

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
            <div className="text-sm text-gray-500">
              탈모 전문 병원 {filteredHospitals.length}개
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Location Status */}
        {locationError && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <svg className="h-5 w-5 text-yellow-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="ml-3 flex-1">
                <p className="text-sm text-yellow-800 mb-2">{locationError}</p>
                <button
                  onClick={async () => {
                    try {
                      const location = await locationService.getCurrentLocation();
                      setCurrentLocation(location);
                      setLocationError(null);
                    } catch (error) {
                      const errorMessage = error instanceof Error ? error.message : '위치 정보를 가져올 수 없습니다.';
                      setLocationError(errorMessage);
                    }
                  }}
                  className="text-sm bg-yellow-100 text-yellow-800 px-3 py-1 rounded-md hover:bg-yellow-200 transition-colors"
                >
                  위치 권한 다시 요청
                </button>
              </div>
            </div>
          </div>
        )}

        {currentLocation && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p className="ml-3 text-sm text-green-800">
                현재 위치를 기반으로 병원을 검색합니다. (위도: {currentLocation.latitude.toFixed(4)}, 경도: {currentLocation.longitude.toFixed(4)})
              </p>
            </div>
          </div>
        )}

        {isUsingSampleData && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="ml-3">
                <p className="text-sm text-blue-800">
                  <strong>데모 모드:</strong> API 키가 설정되지 않아 샘플 데이터를 표시합니다.
                  실제 병원 검색을 위해서는 프로젝트 루트의 .env 파일에 네이버/카카오 API 키를 설정해주세요.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 위치 정보 사용 안내 */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <svg className="h-5 w-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-gray-800 mb-1">위치 정보 사용 안내</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• 위치 권한을 허용하면 주변 병원을 더 정확하게 찾을 수 있습니다</li>
                <li>• 위치 정보 없이도 병원명이나 주소로 검색 가능합니다</li>
                <li>• 브라우저 주소창의 자물쇠 아이콘에서 위치 권한을 관리할 수 있습니다</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Category Selection */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">카테고리 선택</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((category) => (
              <button
                key={category.name}
                onClick={() => {
                  setSelectedCategory(category.category);
                  setSearchTerm(category.searchTerm);
                }}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedCategory === category.category
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="text-2xl mb-2">{category.icon}</div>
                <div className="font-medium">{category.name}</div>
              </button>
            ))}
          </div>

        </div>

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
                placeholder="병원명, 주소로 검색..."
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

        {/* Results */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">병원 정보를 검색하는 중...</p>
          </div>
        ) : !searchTerm.trim() ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">병원을 검색해보세요</h3>
            <p className="mt-1 text-sm text-gray-500">위의 검색창에 병원명이나 주소를 입력하거나 빠른 검색 버튼을 클릭하세요.</p>
          </div>
        ) : filteredHospitals.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">검색 결과가 없습니다</h3>
            <p className="mt-1 text-sm text-gray-500">다른 검색어로 다시 시도해보세요.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {(groupByCategory
              ? renderOrder.map(group => ({
                  group,
                  items: filteredHospitals.filter(h => normalizeGroup(h) === group)
                })).filter(g => g.items.length > 0)
              : [{ group: selectedCategory || '결과', items: filteredHospitals }]
            ).map(section => (
              <div key={section.group}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleGroup(section.group)}
                      className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-300 hover:bg-gray-50"
                      aria-label="toggle"
                    >
                      <svg className={`w-4 h-4 transition-transform ${collapsedGroups[section.group] ? '' : 'rotate-90'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <h2 className="text-xl font-semibold text-gray-900">{section.group}</h2>
                  </div>
                  <span className="text-sm text-gray-500">{section.items.length}개</span>
                </div>
                {!collapsedGroups[section.group] && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {section.items.map((hospital) => (
                  <div key={hospital.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-lg transition-shadow">
                {/* Hospital Image */}
                <div className="relative">
                  <div className="w-full h-48 bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
                    <svg className="w-16 h-16 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div className="absolute top-3 right-3">
                    <div className="flex items-center space-x-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full">
                      <span className="text-yellow-400">{renderStars(hospital.rating)}</span>
                      <span className="text-xs text-gray-600">({hospital.rating.toFixed(1)})</span>
                    </div>
                  </div>
                </div>

                {/* Hospital Info */}
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 overflow-hidden" style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>{hospital.name}</h3>
                  
                  <p className="text-sm text-gray-600 mb-3 overflow-hidden" style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>{hospital.description}</p>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-xs text-gray-600">
                      <svg className="w-3 h-3 mr-2 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="truncate">{hospital.address}</span>
                    </div>
                    <div className="flex items-center text-xs text-gray-600">
                      <svg className="w-3 h-3 mr-2 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span>{hospital.phone}</span>
                    </div>
                    <div className="flex items-center text-xs text-gray-600">
                      <svg className="w-3 h-3 mr-2 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>거리: {locationService.formatDistance(hospital.distance)}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {hospital.specialties.map((specialty, index) => (
                      <span
                        key={`${hospital.id}-${specialty}-${index}`}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        setSelectedHospital(hospital);
                        setShowMap(true);
                      }}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      지도 보기
                    </button>
                    <button className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors">
                      상담 신청
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
      </div>

      {/* Map Modal */}
      {showMap && selectedHospital && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {selectedHospital.name} 위치
              </h3>
              <button
                onClick={() => setShowMap(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-4">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  <strong>주소:</strong> {selectedHospital.address}
                </p>
                <p className="text-sm text-gray-600 mb-2">
                  <strong>전화:</strong> {selectedHospital.phone}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>거리:</strong> {locationService.formatDistance(selectedHospital.distance)}
                </p>
              </div>
              
              {/* 지도 영역: 좌표가 있을 때만 임베드. 없으면 버튼만 제공 */}
              <div className="w-full h-96 bg-gray-100 rounded-lg overflow-hidden">
                {selectedHospital.latitude !== undefined && selectedHospital.longitude !== undefined && isValidKoreanCoord(selectedHospital.latitude, selectedHospital.longitude) ? (
                  <iframe
                    title="map"
                    className="w-full h-full border-0"
                    src={`https://www.google.com/maps?q=${selectedHospital.latitude},${selectedHospital.longitude}&z=16&output=embed`}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-center">
                    <div>
                      <p className="text-gray-600 mb-4">지도를 표시하려면 아래 버튼을 눌러 외부 지도로 이동하세요</p>
                      <a
                        href={`https://map.naver.com/v5/search/${encodeURIComponent(selectedHospital.address || selectedHospital.name)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                      >
                        큰 지도 보기
                      </a>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StoreFinder;