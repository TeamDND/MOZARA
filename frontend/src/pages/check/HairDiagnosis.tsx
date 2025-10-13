import React, { useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../utils/store';
import apiClient from '../../services/apiClient';

interface AnalysisResult {
  stage: number;
  title: string;
  description: string;
  advice: string[];
}

interface Recommendation {
  type: 'youtube' | 'salon' | 'tattoo' | 'wig' | 'hospital' | 'product';
  title: string;
  description: string;
  url?: string;
  location?: string;
  price?: string;
}

interface StageRecommendations {
  youtube: Recommendation[];
  services: Recommendation[];
  products: Recommendation[];
}

const HairDiagnosis: React.FC = () => {
  const [topImage, setTopImage] = useState<File | null>(null);
  const [sideImage, setSideImage] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [topImagePreview, setTopImagePreview] = useState<string | null>(null);
  const [sideImagePreview, setSideImagePreview] = useState<string | null>(null);
  const topFileInputRef = useRef<HTMLInputElement>(null);
  const sideFileInputRef = useRef<HTMLInputElement>(null);
  
  // Redux에서 사용자 정보 가져오기
  const { userId } = useSelector((state: RootState) => state.user);

  // API 호출 재시도 로직
  const fetchWithRetry = async (url: string, options: RequestInit, retries = 3, delay = 1000): Promise<Response> => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        if (response.ok || (response.status >= 400 && response.status < 500)) {
          return response;
        }
        if (response.status >= 500) {
          throw new Error(`Server error: ${response.status}`);
        }
      } catch (error) {
        console.warn(`API 호출 실패 (시도 ${i + 1}/${retries}). ${delay / 1000}초 후 재시도합니다.`);
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
      }
    }
    throw new Error('API 호출 실패');
  };

  const toBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = error => reject(error);
    });
  };

  // Spring Boot 프록시를 통해 Python 분석 호출 (multipart/form-data) - apiClient 사용
  const analyzeImageWithSwin = async (topFile: File, sideFile: File): Promise<AnalysisResult> => {
    const formData = new FormData();
    formData.append('top_image', topFile);
    formData.append('side_image', sideFile);
    
    // 로그인한 사용자의 user_id 추가
    if (userId) {
      formData.append('user_id', userId.toString());
    }

    const { data: result } = await apiClient.post('/ai/swin-check/analyze', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });

    // Spring → Python 표준 응답 {analysis: {stage, title, description, advice}, save_result: {...}}
    const analysisData = result.analysis || result; // 하위 호환성을 위해 fallback
    const stage = analysisData.stage as number;

    const defaultAdviceForStage = (stage: number) => {
      switch (stage) {
        case 0:
          return [
            "현재 두피 상태가 양호합니다.",
            "정기적인 두피 케어를 유지하세요.",
            "건강한 생활습관을 계속 유지하세요."
          ];
        case 1:
          return [
            "초기 탈모 단계입니다.",
            "두피 마사지를 꾸준히 하세요.",
            "탈모 방지 샴푸 사용을 권장합니다."
          ];
        case 2:
          return [
            "중등도 탈모 단계입니다.",
            "전문적인 두피 치료를 고려하세요.",
            "두피 문신이나 가발을 검토해보세요."
          ];
        case 3:
          return [
            "심각한 탈모 단계입니다.",
            "탈모 전문 병원 상담을 권장합니다.",
            "가발이나 두피 문신을 고려하세요."
          ];
        default:
          return [
            "정기적인 두피 관리가 필요합니다.",
            "전문의 상담을 권장합니다.",
            "건강한 생활습관을 유지하세요."
          ];
      }
    };

    return {
      stage: stage,
      title: String(analysisData.title || ''),
      description: String(analysisData.description || ''),
      advice: (Array.isArray(analysisData.advice) && analysisData.advice.length > 0) ? analysisData.advice : defaultAdviceForStage(stage)
    };
  };

  const handleTopImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setTopImage(file);
      setAnalysisResult(null);

      // 이미지 미리보기 생성
      const reader = new FileReader();
      reader.onload = (e) => {
        setTopImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSideImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSideImage(file);
      setAnalysisResult(null);

      // 이미지 미리보기 생성
      const reader = new FileReader();
      reader.onload = (e) => {
        setSideImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartAnalysis = async () => {
    if (!topImage || !sideImage) {
      alert('두피 상단과 측면 사진을 모두 선택해주세요.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const result = await analyzeImageWithSwin(topImage, sideImage);
      setAnalysisResult(result);
    } catch (error) {
      console.error('Swin 분석 중 오류 발생:', error);
      alert(`분석에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getStageColor = (stage: number) => {
    if (stage === 0) return 'bg-green-500';
    if (stage === 1) return 'bg-blue-500';
    if (stage === 2) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStageTextColor = (stage: number) => {
    if (stage === 0) return 'text-green-600';
    if (stage === 1) return 'text-blue-600';
    if (stage === 2) return 'text-yellow-600';
    return 'text-red-600';
  };

  // 진행 단계에 따른 추천 데이터 생성
  const getStageRecommendations = (stage: number): StageRecommendations => {
    const baseRecommendations = {
      youtube: [
        {
          type: 'youtube' as const,
          title: '두피 마사지 방법',
          description: '두피 혈액순환을 개선하는 마사지 기법',
          url: 'https://youtube.com/watch?v=example1'
        },
        {
          type: 'youtube' as const,
          title: '탈모 예방 생활습관',
          description: '일상에서 실천할 수 있는 탈모 예방법',
          url: 'https://youtube.com/watch?v=example2'
        }
      ],
      services: [],
      products: []
    };

    switch (stage) {
      case 0:
        return {
          ...baseRecommendations,
          services: [
            {
              type: 'salon' as const,
              title: '두피 케어 전문 미용실',
              description: '예방적 두피 관리 서비스',
              location: '강남구, 서초구',
              price: '5만원~'
            }
          ],
          products: [
            {
              type: 'product' as const,
              title: '두피 건강 샴푸',
              description: '두피 환경을 개선하는 샴푸',
              price: '2만원~'
            }
          ]
        };
      case 1:
        return {
          ...baseRecommendations,
          services: [
            {
              type: 'salon' as const,
              title: '두피 진단 및 케어',
              description: '전문적인 두피 상태 진단과 관리',
              location: '강남구, 서초구, 송파구',
              price: '8만원~'
            }
          ],
          products: [
            {
              type: 'product' as const,
              title: '탈모 방지 샴푸',
              description: '초기 탈모 예방에 효과적인 샴푸',
              price: '3만원~'
            },
            {
              type: 'product' as const,
              title: '두피 토닉',
              description: '두피 혈액순환 개선 토닉',
              price: '4만원~'
            }
          ]
        };
      case 2:
        return {
          ...baseRecommendations,
          services: [
            {
              type: 'salon' as const,
              title: '두피 전문 치료',
              description: '중등도 탈모 치료 서비스',
              location: '강남구, 서초구, 송파구, 마포구',
              price: '15만원~'
            },
            {
              type: 'tattoo' as const,
              title: '두피 문신',
              description: '자연스러운 헤어라인 복원',
              location: '강남구, 서초구',
              price: '50만원~'
            }
          ],
          products: [
            {
              type: 'product' as const,
              title: '탈모 치료 샴푸',
              description: '중등도 탈모에 효과적인 치료 샴푸',
              price: '5만원~'
            },
            {
              type: 'product' as const,
              title: '두피 세럼',
              description: '모발 성장 촉진 세럼',
              price: '8만원~'
            }
          ]
        };
      case 3:
        return {
          ...baseRecommendations,
          services: [
            {
              type: 'hospital' as const,
              title: '탈모 전문 병원',
              description: '의료진이 진료하는 전문 탈모 클리닉',
              location: '강남구, 서초구, 송파구, 마포구, 영등포구',
              price: '상담비 5만원~'
            },
            {
              type: 'tattoo' as const,
              title: '두피 문신',
              description: '고급스러운 헤어라인 복원',
              location: '강남구, 서초구, 송파구',
              price: '80만원~'
            },
            {
              type: 'wig' as const,
              title: '가발 전문점',
              description: '자연스러운 가발 제작 및 관리',
              location: '강남구, 서초구, 송파구, 마포구',
              price: '30만원~'
            }
          ],
          products: [
            {
              type: 'product' as const,
              title: '강력 탈모 치료제',
              description: '고급 탈모 치료를 위한 전문 제품',
              price: '10만원~'
            },
            {
              type: 'product' as const,
              title: '두피 관리 세트',
              description: '종합적인 두피 관리 제품 세트',
              price: '15만원~'
            }
          ]
        };
      default:
        return baseRecommendations;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-md mx-auto bg-white min-h-screen pb-20">
        {/* Header */}
        <div className="bg-white px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-50">
          <h1 className="text-lg font-semibold text-[#1f0101]">AI 두피 사진 분석</h1>
        </div>

        <div className="px-4 py-6">
          <div className="bg-white rounded-xl shadow-md p-6">
          
            {/* 파일 업로드 섹션 */}
            <div className="space-y-4 mb-6">
              {/* Top View 업로드 */}
              <div className="text-center border-2 border-dashed border-gray-300 rounded-xl p-4">
                <h3 className="text-base font-semibold text-[#1f0101] mb-3">📸 Top View - 머리 상단</h3>
                <p className="text-gray-600 mb-3 text-xs">머리 정수리 부분이 잘 보이도록 위에서 찍은 사진</p>
                <input
                  ref={topFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleTopImageSelect}
                  className="hidden"
                />
                <button
                  onClick={() => topFileInputRef.current?.click()}
                  className="text-white px-4 py-2 rounded-xl font-semibold hover:opacity-90 transition-colors mb-3"
                  style={{ backgroundColor: "#1f0101" }}
                >
                  Top View 선택
                </button>
                {topImage && (
                  <p className="text-gray-600 text-xs">{topImage.name}</p>
                )}
                {topImagePreview && (
                  <img src={topImagePreview} alt="Top View 미리보기" className="mt-3 w-full max-w-32 mx-auto rounded-xl border" />
                )}
              </div>

              {/* Side View 업로드 */}
              <div className="text-center border-2 border-dashed border-gray-300 rounded-xl p-4">
                <h3 className="text-base font-semibold text-[#1f0101] mb-3">📸 Side View - 머리 측면</h3>
                <p className="text-gray-600 mb-3 text-xs">헤어라인과 측면이 잘 보이도록 옆에서 찍은 사진</p>
                <input
                  ref={sideFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleSideImageSelect}
                  className="hidden"
                />
                <button
                  onClick={() => sideFileInputRef.current?.click()}
                  className="text-white px-4 py-2 rounded-xl font-semibold hover:opacity-90 transition-colors mb-3"
                  style={{ backgroundColor: "#1f0101" }}
                >
                  Side View 선택
                </button>
                {sideImage && (
                  <p className="text-gray-600 text-xs">{sideImage.name}</p>
                )}
                {sideImagePreview && (
                  <img src={sideImagePreview} alt="Side View 미리보기" className="mt-3 w-full max-w-32 mx-auto rounded-xl border" />
                )}
              </div>
            </div>

            {/* 분석 시작 버튼 */}
            <div className="text-center mb-6">
              <button
                onClick={handleStartAnalysis}
                disabled={!topImage || !sideImage || isAnalyzing}
                className="text-white px-6 py-3 rounded-xl font-semibold text-base hover:opacity-90 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                style={{ backgroundColor: "#1f0101" }}
              >
                {isAnalyzing ? 'Swin 모델로 분석 중...' : 'AI 분석 시작 (Swin Transformer)'}
              </button>
            </div>

            {/* 로딩 스피너 */}
            {isAnalyzing && (
              <div className="text-center py-6">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto mb-3" style={{ borderColor: "#1f0101" }}></div>
                <p className="text-gray-600 text-sm">Swin Transformer 모델이 두 장의 사진을 정밀하게 분석하고 있습니다...</p>
              </div>
            )}

            {/* 분석 결과 */}
            {analysisResult && (
              <div className="space-y-4">
                {/* 이미지와 결과 */}
                <div className="space-y-4">
                  {/* Top View 이미지 */}
                  <div>
                    <h4 className="text-sm font-semibold text-[#1f0101] mb-2 text-center">Top View</h4>
                    {topImagePreview && (
                      <img
                        src={topImagePreview}
                        alt="Top View 사진"
                        className="w-full rounded-xl border border-gray-300"
                      />
                    )}
                  </div>

                  {/* Side View 이미지 */}
                  <div>
                    <h4 className="text-sm font-semibold text-[#1f0101] mb-2 text-center">Side View</h4>
                    {sideImagePreview && (
                      <img
                        src={sideImagePreview}
                        alt="Side View 사진"
                        className="w-full rounded-xl border border-gray-300"
                      />
                    )}
                  </div>

                  {/* 분석 결과 텍스트 */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="text-lg font-bold text-[#1f0101] mb-3">AI 분석 결과</h3>
                    
                    <div className={`inline-block px-3 py-2 rounded-full text-white font-bold mb-3 text-sm ${getStageColor(analysisResult.stage)}`}>
                      진행 단계: {analysisResult.stage}단계 ({analysisResult.title})
                    </div>
                    
                    <p className="text-gray-700 mb-4 leading-relaxed text-sm">
                      {analysisResult.description}
                    </p>
                    
                    <h4 className="text-sm font-semibold text-[#1f0101] mb-2">생활 습관 가이드</h4>
                    <ul className="space-y-1">
                      {analysisResult.advice.map((item, index) => (
                        <li key={index} className="flex items-start">
                          <span className="mr-2" style={{ color: "#1f0101" }}>•</span>
                          <span className="text-gray-700 text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 추천 섹션 */}
                <div className="border-t pt-4">
                  <h3 className="text-lg font-bold text-[#1f0101] mb-4">나의 진행 단계 맞춤 추천</h3>
                
                  {(() => {
                    const recommendations = getStageRecommendations(analysisResult.stage);
                    return (
                      <div className="space-y-4">
                        {/* 유튜브 추천 */}
                        <div>
                          <h4 className="text-sm font-semibold text-[#1f0101] mb-3 flex items-center">
                            <span className="mr-2">📺</span>
                            유튜브 추천
                          </h4>
                          <div className="space-y-3">
                            {recommendations.youtube.map((video, index) => (
                              <div key={index} className="bg-gray-50 p-3 rounded-xl border">
                                <h5 className="font-semibold text-[#1f0101] mb-1 text-sm">{video.title}</h5>
                                <p className="text-gray-600 text-xs mb-2">{video.description}</p>
                                <a 
                                  href="/youtube-videos" 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-[#1f0101] hover:opacity-80 font-medium text-xs"
                                >
                                  영상 보기 →
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 서비스 추천 */}
                        <div>
                          <h4 className="text-sm font-semibold text-[#1f0101] mb-3 flex items-center">
                            <span className="mr-2">🏥</span>
                            위치 기반 서비스 추천
                          </h4>
                          <div className="space-y-3">
                            {recommendations.services.map((service, index) => (
                              <div key={index} className="bg-gray-50 p-3 rounded-xl border">
                                <div className="flex items-center mb-1">
                                  <span className="text-sm mr-2">
                                    {service.type === 'salon' && '💇‍♀️'}
                                    {service.type === 'hospital' && '🏥'}
                                    {service.type === 'tattoo' && '🎨'}
                                    {service.type === 'wig' && '👑'}
                                  </span>
                                  <h5 className="font-semibold text-[#1f0101] text-sm">{service.title}</h5>
                                </div>
                                <p className="text-gray-600 text-xs mb-1">{service.description}</p>
                                {service.location && (
                                  <p className="text-[#1f0101] text-xs mb-1">📍 {service.location}</p>
                                )}
                                {service.price && (
                                  <p className="text-gray-700 font-medium text-xs">💰 {service.price}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* 제품 추천 */}
                        <div>
                          <h4 className="text-sm font-semibold text-[#1f0101] mb-3 flex items-center">
                            <span className="mr-2">🛍️</span>
                            제품 추천
                          </h4>
                          <div className="space-y-3">
                            {recommendations.products.map((product, index) => (
                              <div key={index} className="bg-gray-50 p-3 rounded-xl border">
                                <div className="flex items-center mb-1">
                                  <span className="text-sm mr-2">🧴</span>
                                  <h5 className="font-semibold text-[#1f0101] text-sm">{product.title}</h5>
                                </div>
                                <p className="text-gray-600 text-xs mb-1">{product.description}</p>
                                {product.price && (
                                  <p className="text-[#1f0101] font-medium text-xs">💰 {product.price}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                    </div>
                  );
                })()}
              </div>

                {/* 다른 서비스 연결 버튼 */}
                <div className="border-t pt-4 mt-4">
                  <h3 className="text-base font-bold text-[#1f0101] mb-4">다른 서비스 이용하기</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <a
                      href="/hair-pt"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white p-4 rounded-xl shadow-md hover:opacity-90 transition-all duration-300 transform hover:scale-105 text-center"
                      style={{ backgroundColor: "#1f0101" }}
                    >
                      <div className="text-2xl mb-2">💪</div>
                      <h4 className="font-bold text-sm mb-1">헤어 PT</h4>
                      <p className="text-xs opacity-90">두피 운동 및 관리</p>
                    </a>

                    <a
                      href="/hair-encyclopedia"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white p-4 rounded-xl shadow-md hover:opacity-90 transition-all duration-300 transform hover:scale-105 text-center"
                      style={{ backgroundColor: "#1f0101", opacity: 0.8 }}
                    >
                      <div className="text-2xl mb-2">📚</div>
                      <h4 className="font-bold text-sm mb-1">헤어 백과</h4>
                      <p className="text-xs opacity-90">모발 관련 지식</p>
                    </a>

                    <a
                      href="/hair-change"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white p-4 rounded-xl shadow-md hover:opacity-90 transition-all duration-300 transform hover:scale-105 text-center"
                      style={{ backgroundColor: "#1f0101", opacity: 0.6 }}
                    >
                      <div className="text-2xl mb-2">✨</div>
                      <h4 className="font-bold text-sm mb-1">헤어 체인지</h4>
                      <p className="text-xs opacity-90">헤어스타일 변화</p>
                    </a>

                    <a
                      href="/hair-quiz"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white p-4 rounded-xl shadow-md hover:opacity-90 transition-all duration-300 transform hover:scale-105 text-center"
                      style={{ backgroundColor: "#1f0101", opacity: 0.4 }}
                    >
                      <div className="text-2xl mb-2">🧩</div>
                      <h4 className="font-bold text-sm mb-1">헤어 퀴즈</h4>
                      <p className="text-xs opacity-90">모발 지식 테스트</p>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HairDiagnosis;
