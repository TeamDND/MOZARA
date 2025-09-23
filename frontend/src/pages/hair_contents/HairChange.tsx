import React, { useState, useEffect } from 'react';
import { hairChangeService, HairChangeRequest, HairChangeResponse, Hairstyle } from '../../services/hairChangeService';

export default function HairChange() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [selectedHairstyle, setSelectedHairstyle] = useState<string>('');
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
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">가발 & 빈머리 매꾸기</h1>
        <p className="text-gray-600">AI를 통해 원하는 가발 스타일로 바꾸거나 빈머리를 자연스럽게 매꿔보세요</p>
      </div>

      {/* Input Section */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <div className="space-y-6">
          {/* Mode Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              서비스 선택
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="mode"
                  value="wig"
                  checked={mode === 'wig'}
                  onChange={(e) => {
                    setMode(e.target.value as 'wig');
                    setSelectedHairstyle('');
                  }}
                  className="mr-2 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">가발 스타일 변경</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="mode"
                  value="fill_bald"
                  checked={mode === 'fill_bald'}
                  onChange={(e) => {
                    setMode(e.target.value as 'fill_bald');
                    setSelectedHairstyle('');
                  }}
                  className="mr-2 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-700">빈머리 매꾸기</span>
              </label>
            </div>
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              사진 업로드
            </label>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {selectedImage && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <span>✓</span>
                  <span>{selectedImage.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Hairstyle Selection - Only show for wig mode */}
          {mode === 'wig' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                원하는 가발 스타일
              </label>
              <select
                value={selectedHairstyle}
                onChange={(e) => setSelectedHairstyle(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

          {/* Fill Bald Mode Info */}
          {mode === 'fill_bald' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    빈머리 매꾸기
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <p>현재 헤어스타일을 분석하여 빈머리 부분을 자연스럽게 채워드립니다.</p>
                    <p className="mt-1">기존 머리카락의 색상, 질감, 길이를 유지하면서 자연스럽게 연결됩니다.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Custom Prompt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              추가 요청사항 (선택사항)
            </label>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="특별한 요청사항이 있다면 입력하세요..."
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleGenerate}
              disabled={isLoading}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading 
                ? (mode === 'fill_bald' ? '빈머리 매꾸는 중...' : '변경 중...') 
                : (mode === 'fill_bald' ? '🔧 빈머리 매꾸기' : '🎨 가발 스타일 변경하기')
              }
            </button>
            <button
              onClick={handleReset}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
            >
              초기화
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-4 mb-6 rounded-r-lg">
          <p>{error}</p>
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {mode === 'fill_bald' 
              ? 'AI가 빈머리를 자연스럽게 매꾸고 있습니다...' 
              : 'AI가 가발 스타일을 변경하고 있습니다...'
            }
          </p>
          <p className="text-sm text-gray-500 mt-2">이 과정은 1-2분 정도 소요될 수 있습니다.</p>
        </div>
      )}

      {/* Results */}
      {result && !isLoading && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="text-center mb-6">
            <h3 className="text-2xl font-bold text-gray-800 mb-2">✨ 변경 결과</h3>
            <p className="text-green-600 font-medium text-lg">{result.message}</p>
          </div>

          {result.images && result.images.length > 0 && (
            <div className="space-y-8">
              {result.images.map((image, index) => (
                <div key={index} className="text-center">
                  <div className="mb-4">
                    <h4 className="text-lg font-semibold text-gray-700 mb-2">
                      {mode === 'fill_bald' ? '빈머리 매꾸기 결과' : '변경된 가발 스타일'} {index + 1}
                    </h4>
                  </div>
                  
                  <div className="flex justify-center mb-4">
                    <img
                      src={image.data}
                      alt={mode === 'fill_bald' ? `빈머리 매꾸기 결과 ${index + 1}` : `변경된 가발 스타일 ${index + 1}`}
                      className="max-w-full h-auto rounded-xl shadow-lg border border-gray-200"
                      style={{ maxHeight: '500px' }}
                    />
                  </div>
                  
                  <button
                    onClick={() => handleDownloadImage(image.data, index)}
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-md"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
  );
}
