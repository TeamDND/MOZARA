import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface Hospital {
  id: number;
  name: string;
  address: string;
  phone: string;
  specialties: string[];
  rating: number;
  distance: string;
  description: string;
  imageUrl?: string;
}

const StoreFinder: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [filteredHospitals, setFilteredHospitals] = useState<Hospital[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 샘플 병원 데이터
  const sampleHospitals: Hospital[] = [
    {
      id: 1,
      name: "모자라 탈모 전문 클리닉",
      address: "서울특별시 강남구 테헤란로 123",
      phone: "02-1234-5678",
      specialties: ["탈모치료", "모발이식", "두피관리"],
      rating: 4.8,
      distance: "500m",
      description: "20년 경력의 전문의가 직접 진료하는 탈모 전문 클리닉입니다.",
      imageUrl: "https://via.placeholder.com/300x200?text=모자라+탈모+클리닉"
    },
    {
      id: 2,
      name: "헤어라인 복원센터",
      address: "서울특별시 서초구 강남대로 456",
      phone: "02-2345-6789",
      specialties: ["모발이식", "헤어라인복원", "두피진단"],
      rating: 4.6,
      distance: "1.2km",
      description: "최신 기술을 활용한 모발이식과 헤어라인 복원 전문 병원입니다.",
      imageUrl: "https://via.placeholder.com/300x200?text=헤어라인+복원센터"
    },
    {
      id: 3,
      name: "두피케어 병원",
      address: "서울특별시 송파구 올림픽로 789",
      phone: "02-3456-7890",
      specialties: ["두피관리", "탈모예방", "모발진단"],
      rating: 4.7,
      distance: "800m",
      description: "두피 건강과 모발 관리에 특화된 전문 의료기관입니다.",
      imageUrl: "https://via.placeholder.com/300x200?text=두피케어+병원"
    },
    {
      id: 4,
      name: "프리미엄 모발이식원",
      address: "서울특별시 마포구 홍대입구역 101",
      phone: "02-4567-8901",
      specialties: ["모발이식", "FUE", "두피진단"],
      rating: 4.9,
      distance: "1.5km",
      description: "FUE 기술을 활용한 고품질 모발이식 전문 병원입니다.",
      imageUrl: "https://via.placeholder.com/300x200?text=프리미엄+모발이식원"
    },
    {
      id: 5,
      name: "스마트 헤어 클리닉",
      address: "서울특별시 영등포구 여의도동 202",
      phone: "02-5678-9012",
      specialties: ["탈모치료", "두피관리", "모발진단"],
      rating: 4.5,
      distance: "2.1km",
      description: "AI 진단 시스템을 도입한 스마트 헤어 관리 클리닉입니다.",
      imageUrl: "https://via.placeholder.com/300x200?text=스마트+헤어+클리닉"
    }
  ];

  const specialties = ["전체", "탈모치료", "모발이식", "두피관리", "헤어라인복원", "두피진단", "FUE"];

  useEffect(() => {
    // 실제 API 호출 대신 샘플 데이터 사용
    setTimeout(() => {
      setHospitals(sampleHospitals);
      setFilteredHospitals(sampleHospitals);
      setIsLoading(false);
    }, 1000);
  }, []);

  useEffect(() => {
    let filtered = hospitals;

    // 검색어 필터링
    if (searchTerm) {
      filtered = filtered.filter(hospital =>
        hospital.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hospital.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hospital.specialties.some(specialty => 
          specialty.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // 전문과목 필터링
    if (selectedSpecialty && selectedSpecialty !== "전체") {
      filtered = filtered.filter(hospital =>
        hospital.specialties.includes(selectedSpecialty)
      );
    }

    setFilteredHospitals(filtered);
  }, [searchTerm, selectedSpecialty, hospitals]);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">병원 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

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
              <h1 className="text-2xl font-bold text-gray-900">상가찾기</h1>
            </div>
            <div className="text-sm text-gray-500">
              탈모 전문 병원 {filteredHospitals.length}개
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Search and Filter Section */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                병원명 또는 주소 검색
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="병원명, 주소, 전문과목으로 검색..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Specialty Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                전문과목
              </label>
              <select
                value={selectedSpecialty}
                onChange={(e) => setSelectedSpecialty(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {specialties.map((specialty) => (
                  <option key={specialty} value={specialty}>
                    {specialty}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Results */}
        {filteredHospitals.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">검색 결과가 없습니다</h3>
            <p className="mt-1 text-sm text-gray-500">다른 검색어로 다시 시도해보세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredHospitals.map((hospital) => (
              <div key={hospital.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-lg transition-shadow">
                {/* Hospital Image */}
                <div className="relative">
                  <img
                    src={hospital.imageUrl}
                    alt={hospital.name}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-3 right-3">
                    <div className="flex items-center space-x-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full">
                      <span className="text-yellow-400">{renderStars(hospital.rating)}</span>
                      <span className="text-xs text-gray-600">({hospital.rating})</span>
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
                      <span>거리: {hospital.distance}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-4">
                    {hospital.specialties.map((specialty) => (
                      <span
                        key={specialty}
                        className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full"
                      >
                        {specialty}
                      </span>
                    ))}
                  </div>

                  <button className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                    상담 신청
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreFinder;
