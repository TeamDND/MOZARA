import React, { useState } from 'react';
import { hairDamageService, HairAnalysisRequest, HairAnalysisResponse } from '../service/hairDamageService';

export default function HairDamageAnalysis() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [textQuery, setTextQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<HairAnalysisResponse | null>(null);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
    }
  };

  const handleAnalysis = async () => {
    if (!selectedImage && !textQuery.trim()) {
      alert('이미지를 업로드하거나 텍스트를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    try {
      const request: HairAnalysisRequest = {
        image: selectedImage || undefined,
        textQuery: textQuery.trim() || undefined,
      };

      const result = await hairDamageService.analyzeHairDamage(request);
      setAnalysisResult(result);
    } catch (error) {
      console.error('분석 오류:', error);
      alert('분석 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100';
      case 'error': return 'text-red-600 bg-red-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStageDescription = (stage: number) => {
    switch (stage) {
      case 1: return '모발 손상 없음';
      case 2: return '모발 끝부분 손상, 건조함';
      case 3: return '모발 중간 부분 손상, 갈라짐';
      case 4: return '모발 뿌리 부분 손상, 탈락 위험';
      default: return '알 수 없음';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">모발 손상 분석</h1>
          <p className="text-gray-600">AI를 통해 모발 상태를 분석하고 유사 사례를 확인해보세요</p>
        </div>

        {/* Input Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="space-y-6">
            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                모발 이미지 업로드
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

            {/* Text Query */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                질문 또는 설명 (선택 사항)
              </label>
              <textarea
                value={textQuery}
                onChange={(e) => setTextQuery(e.target.value)}
                placeholder="모발 상태에 대해 궁금한 점을 입력하세요..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleAnalysis}
                disabled={isLoading}
                className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? '분석 중...' : '🔍 모발 분석하기'}
              </button>
            </div>
          </div>
        </div>

        {/* Results Section */}
        {isLoading && (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">AI가 분석하고 있습니다...</p>
          </div>
        )}

        {/* Analysis Results */}
        {analysisResult && !isLoading && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">🔍 분석 결과</h3>
            
            {/* AI Summary Section */}
            {analysisResult.summary && (
              <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-800 p-4 mb-6 rounded-r-lg">
                <h4 className="font-bold mb-2">🤖 AI 종합 분석</h4>
                <p>{analysisResult.summary}</p>
              </div>
            )}

            {analysisResult.results.length > 0 ? (
              <div className="space-y-4">
                {analysisResult.results.map((result, index) => {
                  const damageStatus = hairDamageService.determineHairDamageStatus(result.properties.diagnosis);
                  const isCurrentImage = result.uuid === "current_image_analysis";
                  
                  return (
                    <div key={result.uuid} className={`border rounded-lg p-4 ${isCurrentImage ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-800">
                          {isCurrentImage ? '📸 현재 이미지 분석 결과' : `유사 사례 #${index}`}
                        </h4>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(damageStatus.color)}`}>
                          {damageStatus.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">상태:</span>
                          <span className="ml-2 font-medium">{result.properties.diagnosis}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">성별:</span>
                          <span className="ml-2 font-medium">{result.properties.gender}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">단계:</span>
                          <span className="ml-2 font-medium">
                            {result.properties.stage}단계
                            <span className="text-xs text-gray-500 ml-1">
                              ({getStageDescription(result.properties.stage)})
                            </span>
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-600">{isCurrentImage ? '신뢰도:' : '유사도:'}</span>
                          <span className="ml-2 font-medium">{(result.properties.confidence * 100).toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-600">관련된 검색 결과를 찾을 수 없습니다.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
