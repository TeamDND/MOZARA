import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { hairChangeService, HairChangeRequest, HairChangeResponse, Hairstyle } from '../../services/hairChangeService';

export default function HairChange() {
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedHairstyle, setSelectedHairstyle] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<HairChangeResponse | null>(null);
  const [mode, setMode] = useState<'wig' | 'fill_bald'>('wig');
  const hairstyles: Hairstyle = {
    "short": "짧은 가발",
    "medium": "중간 길이 가발",
    "long": "긴 가발",
    "undercut": "울프컷 가발",
    "pompadour": "포마드 가발",
    "quiff": "퀴프 가발",
    "slick_back": "슬릭백 가발",
    "textured": "텍스처드 가발",
    "buzz_cut": "버즈컷 가발",
    "fade": "페이드 가발",
    "curtain": "커튼 가발",
    "mullet": "멀렛 가발"
  };
  const [error, setError] = useState<string>('');

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setError('');
      
      // 이미지 미리보기 생성
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!selectedImage) {
      setError('이미지를 선택해주세요.');
      return;
    }

    if (mode === 'wig' && !selectedHairstyle) {
      setError('가발 스타일을 선택해주세요.');
      return;
    }

    setIsLoading(true);
    setError('');
    setResult(null);

    try {
      const request: HairChangeRequest = {
        image: selectedImage,
        hairstyle: mode === 'fill_bald' ? 'fill_bald' : selectedHairstyle,
      };

      const response = await hairChangeService.generateHairstyle(request);
      setResult(response);
    } catch (error: any) {
      console.error('머리스타일 변경 오류:', error);
      setError(error.response?.data?.error || '머리스타일 변경 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setImagePreview(null);
    setSelectedHairstyle('');
    setResult(null);
    setError('');
    setMode('wig');
  };

  const handleDownloadImage = (imageData: string, index: number) => {
    try {
      // base64 데이터에서 실제 이미지 데이터 추출
      const base64Data = imageData.replace(/^data:image\/[a-z]+;base64,/, '');
      
      // Blob 생성
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });
      
      // 다운로드 링크 생성
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = mode === 'fill_bald' ? `bald_fill_${index + 1}.png` : `wig_style_${index + 1}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('이미지 다운로드 오류:', error);
      setError('이미지 다운로드 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-First Container - PC에서도 모바일 레이아웃 중앙 정렬 */}
      <div className="max-w-md mx-auto min-h-screen bg-white">
        {/* Main Content */}
        <main className="px-4 py-6">
          {/* 페이지 헤더 */}
          <div className="text-center mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-2">가발 & 빈머리 매꾸기</h2>
            <p className="text-sm text-gray-600">AI로 원하는 가발 스타일로 바꾸거나 <br /> 빈머리를 자연스럽게 매꿔보세요</p>
          </div>

          {/* 서비스 선택 */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">서비스 선택</h3>
            <div className="space-y-2">
              <div 
                className={`bg-white rounded-xl border hover:shadow-md transition-all cursor-pointer active:scale-[0.98] touch-manipulation overflow-hidden ${
                  mode === 'wig' ? 'border-[#1f0101] ring-2 ring-[#1f0101] ring-opacity-20' : 'border-gray-100'
                }`}
                onClick={() => {
                  setMode('wig');
                  setSelectedHairstyle('');
                }}
              >
                <div className="flex items-center p-4">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 mr-4 flex items-center justify-center text-2xl">
                    🎨
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900">가발 스타일 변경</h3>
                    <p className="text-sm text-gray-600">다양한 가발 스타일 시뮬레이션</p>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    {mode === 'wig' ? (
                      <div className="w-6 h-6 rounded-full bg-[#1f0101] flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-gray-300"></div>
                    )}
                  </div>
                </div>
              </div>
              
              <div 
                className={`bg-white rounded-xl border hover:shadow-md transition-all cursor-pointer active:scale-[0.98] touch-manipulation overflow-hidden ${
                  mode === 'fill_bald' ? 'border-[#1f0101] ring-2 ring-[#1f0101] ring-opacity-20' : 'border-gray-100'
                }`}
                onClick={() => {
                  setMode('fill_bald');
                  setSelectedHairstyle('');
                }}
              >
                <div className="flex items-center p-4">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 mr-4 flex items-center justify-center text-2xl">
                    🔧
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900">빈머리 매꾸기</h3>
                    <p className="text-sm text-gray-600">자연스러운 빈머리 복원</p>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    {mode === 'fill_bald' ? (
                      <div className="w-6 h-6 rounded-full bg-[#1f0101] flex items-center justify-center">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    ) : (
                      <div className="w-6 h-6 rounded-full border-2 border-gray-300"></div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 이미지 업로드 */}
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">사진 업로드</h3>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className={`bg-white rounded-xl border p-6 text-center transition-all cursor-pointer ${
                selectedImage 
                  ? 'border-green-400 bg-green-50' 
                  : 'border-gray-100 hover:border-gray-300'
              }`}>
                {imagePreview ? (
                  <div className="space-y-2">
                    <div className="rounded-lg overflow-hidden mx-auto max-w-xs">
                      <img src={imagePreview} alt="미리보기" className="w-full h-auto" />
                    </div>
                    <div className="text-green-700 font-semibold text-sm">{selectedImage?.name}</div>
                    <div className="text-green-600 text-xs">다른 사진으로 변경하려면 클릭</div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="text-gray-400 text-3xl">📷</div>
                    <div className="text-gray-700 font-medium">사진을 선택하세요</div>
                    <div className="text-gray-500 text-xs">클릭하여 업로드</div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 헤어스타일 선택 (가발 모드만) */}
          {mode === 'wig' && (
            <div className="mb-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">원하는 가발 스타일</h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(hairstyles).map(([key, value]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedHairstyle(key)}
                    className={`px-4 py-3 rounded-xl font-medium transition-all text-sm ${
                      selectedHairstyle === key
                        ? 'bg-[#1f0101] text-white border-2 border-[#1f0101]'
                        : 'bg-white text-gray-700 border-2 border-gray-100 hover:border-gray-300'
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 빈머리 매꾸기 모드 안내 */}
          {mode === 'fill_bald' && (
            <div className="mb-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="text-blue-500 text-xl flex-shrink-0">ℹ️</div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1 text-sm">빈머리 매꾸기</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">현재 헤어스타일을 분석하여 빈머리 부분을 자연스럽게 채워드립니다. 기존 머리카락의 색상, 질감, 길이를 유지합니다.</p>
                </div>
              </div>
            </div>
          )}

          {/* 액션 버튼들 */}
          <div className="space-y-2 mb-4">
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="w-full bg-[#1f0101] text-white py-3.5 px-6 rounded-xl font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
            >
              {isLoading 
                ? (mode === 'fill_bald' ? '🔄 빈머리 매꾸는 중...' : '🔄 변경 중...') 
                : (mode === 'fill_bald' ? '🔧 빈머리 매꾸기' : '🎨 가발 스타일 변경하기')
              }
            </button>
            <button
              onClick={handleReset}
              className="w-full border border-gray-200 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-50 transition-all active:scale-[0.98]"
            >
              초기화
            </button>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
              <div className="flex items-start gap-2">
                <span className="text-red-500 text-xl flex-shrink-0">⚠️</span>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* 로딩 상태 */}
          {isLoading && (
            <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-8 text-center">
              <div className="animate-spin rounded-full h-14 w-14 border-4 border-[#1f0101] border-t-transparent mx-auto mb-4"></div>
              <p className="text-gray-900 font-semibold mb-2 text-sm">
                {mode === 'fill_bald' 
                  ? 'AI가 빈머리를 자연스럽게 매꾸고 있습니다...' 
                  : 'AI가 가발 스타일을 변경하고 있습니다...'
                }
              </p>
              <p className="text-xs text-gray-500">이 과정은 1-2분 정도 소요될 수 있습니다.</p>
            </div>
          )}

          {/* 결과 표시 */}
          {result && !isLoading && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-4 py-2 mb-2">
                  <span className="text-green-600">✨</span>
                  <span className="text-sm font-semibold text-green-700">변경 완료</span>
                </div>
                <p className="text-sm text-gray-600">{result.message}</p>
              </div>

              {result.images && result.images.length > 0 && (
                <div className="space-y-4">
                  {result.images.map((image, index) => (
                    <div key={index} className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                      <div className="p-3 bg-gray-50 border-b border-gray-100">
                        <h4 className="text-sm font-semibold text-gray-900 text-center">
                          {mode === 'fill_bald' ? '빈머리 매꾸기 결과' : '변경된 가발 스타일'} {index + 1}
                        </h4>
                      </div>
                      
                      <div className="p-3">
                        <div className="rounded-lg overflow-hidden">
                          <img
                            src={image.data}
                            alt={mode === 'fill_bald' ? `빈머리 매꾸기 결과 ${index + 1}` : `변경된 가발 스타일 ${index + 1}`}
                            className="w-full h-auto"
                          />
                        </div>
                      </div>
                      
                      <div className="p-3 pt-0">
                        <button
                          onClick={() => handleDownloadImage(image.data, index)}
                          className="w-full inline-flex items-center justify-center gap-2 bg-[#1f0101] text-white px-4 py-3 rounded-xl font-medium hover:bg-gray-800 transition-all active:scale-[0.98]"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m4-6v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h4" />
                          </svg>
                          이미지 다운로드
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* 매장 찾기 버튼 - 모드에 따라 다른 버튼 표시 */}
                  <div className="pt-2">
                    {mode === 'wig' ? (
                      <button
                        onClick={() => navigate('/store-finder?category=가발전문점')}
                        className="w-full bg-white rounded-xl border border-gray-100 hover:shadow-md transition-all active:scale-[0.98] overflow-hidden"
                      >
                        <div className="flex items-center p-4">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 mr-4 flex items-center justify-center text-2xl">
                            🎩
                          </div>
                          <div className="flex-1 text-left">
                            <h3 className="text-base font-semibold text-gray-900">내 주변 가발 매장 찾기</h3>
                            <p className="text-sm text-gray-600">위치 기반 매장 검색</p>
                          </div>
                          <div className="flex-shrink-0 ml-2">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate('/store-finder?category=두피문신')}
                        className="w-full bg-white rounded-xl border border-gray-100 hover:shadow-md transition-all active:scale-[0.98] overflow-hidden"
                      >
                        <div className="flex items-center p-4">
                          <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0 mr-4 flex items-center justify-center text-2xl">
                            🎨
                          </div>
                          <div className="flex-1 text-left">
                            <h3 className="text-base font-semibold text-gray-900">내 주변 두피문신 매장 찾기</h3>
                            <p className="text-sm text-gray-600">위치 기반 매장 검색</p>
                          </div>
                          <div className="flex-shrink-0 ml-2">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </div>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom Spacing for Mobile Navigation */}
          <div className="h-20"></div>
        </main>
      </div>
    </div>
  );
}