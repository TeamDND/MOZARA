import React, { useState, useEffect } from 'react';
import { hairChangeService, HairChangeRequest, HairChangeResponse, Hairstyle } from '../../services/hairChangeService';

export default function HairChange() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedHairstyle, setSelectedHairstyle] = useState<string>('-');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<HairChangeResponse | null>(null);
  const [mode, setMode] = useState<'wig' | 'fill_bald'>('wig');
  const [hairstyles, setHairstyles] = useState<Hairstyle>({
    "short": "짧은 가발 스타일",
    "medium": "중간 길이 가발 스타일",
    "long": "긴 가발 스타일",
    "undercut": "울프컷 가발 스타일",
    "pompadour": "포마드 가발 스타일",
    "quiff": "퀴프 가발 스타일",
    "slick_back": "슬릭백 가발 스타일",
    "textured": "텍스처드 가발 스타일",
    "buzz_cut": "버즈컷 가발 스타일",
    "fade": "페이드 가발 스타일",
    "curtain": "커튼 가발 스타일",
    "mullet": "멀렛 가발 스타일",
    "fill_bald": "빈머리 매꾸기"
  });
  const [error, setError] = useState<string>('');

  useEffect(() => {
    loadHairstyles();
  }, []);

  const loadHairstyles = async () => {
    try {
      console.log('헤어스타일 목록 로드 시작...');
      const styles = await hairChangeService.getHairstyles();
      console.log('헤어스타일 목록 로드 성공:', styles);
      setHairstyles(styles);
    } catch (error) {
      console.error('헤어스타일 목록 로드 실패:', error);
      setError('헤어스타일 목록을 불러오는데 실패했습니다.');
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      setError('');
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
        customPrompt: customPrompt.trim() || undefined,
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
    setSelectedHairstyle('');
    setCustomPrompt('');
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
      {/* 모바일 헤더 */}
      <div className="bg-white px-4 py-6 shadow-sm border-b border-gray-200 mb-6">
        <h1 className="text-2xl font-bold text-gray-800 text-center ">가발 & 빈머리 매꾸기</h1>
        <p className="text-gray-600 mt-2 text-sm text-center">AI로 원하는 가발 스타일로 바꾸거나 빈머리를 자연스럽게 매꿔보세요</p>
      </div>

      {/* 모바일 우선 컨테이너 */}
      <div className="max-w-md mx-auto px-4 pb-6">
        
        {/* 입력 섹션 */}
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <div className="space-y-6">
            
            {/* 서비스 선택 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">서비스 선택</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setMode('wig');
                    setSelectedHairstyle('');
                  }}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    mode === 'wig' 
                      ? 'border-[#222222] bg-[#222222] text-white' 
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">🎨</div>
                    <div className="font-medium text-sm">가발 스타일 변경</div>
                  </div>
                </button>
                
                <button
                  onClick={() => {
                    setMode('fill_bald');
                    setSelectedHairstyle('');
                  }}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    mode === 'fill_bald' 
                      ? 'border-[#222222] bg-[#222222] text-white' 
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl mb-2">🔧</div>
                    <div className="font-medium text-sm">빈머리 매꾸기</div>
                  </div>
                </button>
              </div>
            </div>

            {/* 이미지 업로드 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">사진 업로드</h3>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                  selectedImage 
                    ? 'border-green-400 bg-green-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}>
                  {selectedImage ? (
                    <div className="space-y-2">
                      <div className="text-green-600 text-2xl">✓</div>
                      <div className="text-green-700 font-medium text-sm">{selectedImage.name}</div>
                      <div className="text-green-600 text-xs">클릭하여 변경</div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-gray-400 text-3xl">📷</div>
                      <div className="text-gray-600 font-medium">사진을 선택하세요</div>
                      <div className="text-gray-400 text-xs">클릭하여 업로드</div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* 헤어스타일 선택 (가발 모드만) */}
            {mode === 'wig' && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">원하는 가발 스타일</h3>
                <select
                  value={selectedHairstyle}
                  onChange={(e) => setSelectedHairstyle(e.target.value)}
                  className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#222222] focus:border-transparent bg-white text-gray-700 font-medium"
                >
                  <option value="">가발 스타일을 선택하세요</option>
                  {Object.entries(hairstyles)
                    .filter(([key]) => key !== 'fill_bald')
                    .map(([key, value]) => (
                      <option key={key} value={key}>
                        {value}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {/* 빈머리 매꾸기 모드 안내 */}
            {mode === 'fill_bald' && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="text-gray-500 text-xl">ℹ️</div>
                  <div>
                    <h4 className="font-medium text-gray-800 mb-1">빈머리 매꾸기</h4>
                    <p className="text-sm text-gray-600">현재 헤어스타일을 분석하여 빈머리 부분을 자연스럽게 채워드립니다.</p>
                    <p className="text-sm text-gray-600 mt-1">기존 머리카락의 색상, 질감, 길이를 유지합니다.</p>
                  </div>
                </div>
              </div>
            )}

            {/* 추가 요청사항 */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3">추가 요청사항 (선택사항)</h3>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="특별한 요청사항이 있다면 입력하세요..."
                className="w-full px-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#222222] focus:border-transparent resize-none text-gray-700"
                rows={3}
              />
            </div>

            {/* 액션 버튼들 */}
            <div className="space-y-3">
              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full bg-[#222222] text-white py-4 px-6 rounded-xl font-semibold hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-lg"
              >
                {isLoading 
                  ? (mode === 'fill_bald' ? '🔄 빈머리 매꾸는 중...' : '🔄 변경 중...') 
                  : (mode === 'fill_bald' ? '🔧 빈머리 매꾸기' : '🎨 가발 스타일 변경하기')
                }
              </button>
              <button
                onClick={handleReset}
                className="w-full border-2 border-gray-300 text-gray-700 py-3 px-6 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                초기화
              </button>
            </div>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl mb-6">
            <div className="flex items-start gap-2">
              <span className="text-red-500 text-xl">⚠️</span>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* 로딩 상태 */}
        {isLoading && (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#222222] border-t-transparent mx-auto mb-6"></div>
            <p className="text-gray-700 font-medium mb-2">
              {mode === 'fill_bald' 
                ? 'AI가 빈다를 자연스럽게 매꾸고 있습니다...' 
                : 'AI가 가발 스타일을 변경하고 있습니다...'
              }
            </p>
            <p className="text-sm text-gray-500">이 과정은 1-2분 정도 소요될 수 있습니다.</p>
          </div>
        )}

        {/* 결과 표시 */}
        {result && !isLoading && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">✨ 변경 결과</h3>
              <p className="text-[#222222] font-medium">{result.message}</p>
            </div>

            {result.images && result.images.length > 0 && (
              <div className="space-y-6">
                {result.images.map((image, index) => (
                  <div key={index} className="space-y-4">
                    <div className="text-center">
                      <h4 className="text-lg font-semibold text-gray-700 mb-3">
                        {mode === 'fill_bald' ? '빈머리 매꾸기 결과' : '변경된 가발 스타일'} {index + 1}
                      </h4>
                    </div>
                    
                    <div className="rounded-xl overflow-hidden border border-gray-200">
                      <img
                        src={image.data}
                        alt={mode === 'fill_bald' ? `빈머리 매꾸기 결과 ${index + 1}` : `변경된 가발 스타일 ${index + 1}`}
                        className="w-full h-auto"
                      />
                    </div>
                    
                    <button
                      onClick={() => handleDownloadImage(image.data, index)}
                      className="w-full inline-flex items-center justify-center gap-2 bg-[#222222] text-white px-6 py-3 rounded-xl font-medium hover:bg-gray-800 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3" />
                      </svg>
                      이미지 다운로드
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}