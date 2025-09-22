import React, { useState } from 'react';
import { hairDamageService, HairAnalysisRequest, HairAnalysisResponse, RAGAnalysis, AIAnalysis, SimilarCase } from '../service/hairDamageService';

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

  const getSeverityDescription = (severity: string) => {
    switch (severity) {
      case '0.양호': return '양호한 상태';
      case '1.경증': return '경미한 증상';
      case '2.중등도': return '중등도 증상';
      case '3.중증': return '심각한 증상';
      default: return severity;
    }
  };

  const getCategoryName = (category: string) => {
    const categoryMap: Record<string, string> = {
      '1.미세각질': '미세각질',
      '2.피지과다': '피지과다',
      '3.모낭사이홍반': '모낭사이홍반',
      '4.모낭홍반농포': '모낭홍반농포',
      '5.비듬': '비듬',
      '6.탈모': '탈모'
    };
    return categoryMap[category] || category;
  };

  return (
    <div className="max-w-4xl mx-auto">
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
          <div className="space-y-6">
            {/* Medical Disclaimer */}
            <div className="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-r-lg">
              <h4 className="font-bold mb-2">⚠️ 중요 안내</h4>
              <p className="text-sm">
                이 분석 결과는 AI가 측정한 참고용 데이터입니다. 정확한 진단과 치료를 위해서는 반드시 전문의와 상담하시기 바랍니다.
              </p>
            </div>

            {/* AI Analysis Section */}
            {analysisResult.ai_analysis && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">🤖 AI 종합 분석</h3>
                
                <div className="space-y-4">
                  <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-800 p-4 rounded-r-lg">
                    <h4 className="font-bold mb-2">진단 결과</h4>
                    <p>{analysisResult.ai_analysis.diagnosis}</p>
                  </div>

                  {analysisResult.ai_analysis.main_issues.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">주요 문제점</h4>
                      <ul className="list-disc list-inside space-y-1 text-gray-600">
                        {analysisResult.ai_analysis.main_issues.map((issue, index) => (
                          <li key={index}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysisResult.ai_analysis.management_plan.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-gray-700 mb-2">관리 방법</h4>
                      <ul className="list-disc list-inside space-y-1 text-gray-600">
                        {analysisResult.ai_analysis.management_plan.map((plan, index) => (
                          <li key={index}>{plan}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {analysisResult.ai_analysis.medical_consultation && (
                    <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-4 rounded-r-lg">
                      <h4 className="font-bold mb-2">🏥 의료진 상담 권장</h4>
                      <p className="text-sm">현재 상태로는 전문의 상담을 받으시는 것을 권장합니다.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* RAG Analysis Section */}
            {analysisResult.analysis && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">📊 데이터 기반 분석</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3">주요 진단</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-600">카테고리:</span>
                        <span className="font-medium">{getCategoryName(analysisResult.analysis.primary_category)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">심각도:</span>
                        <span className="font-medium">{getSeverityDescription(analysisResult.analysis.primary_severity)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">평균 신뢰도:</span>
                        <span className="font-medium">{(analysisResult.analysis.average_confidence * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-gray-700 mb-3">진단 점수</h4>
                    <div className="space-y-2">
                      {Object.entries(analysisResult.analysis.diagnosis_scores).map(([category, score]) => (
                        <div key={category} className="flex justify-between">
                          <span className="text-gray-600">{category}:</span>
                          <span className="font-medium">{score.toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {analysisResult.analysis.recommendations.length > 0 && (
                  <div className="mt-6">
                    <h4 className="font-semibold text-gray-700 mb-3">추천사항</h4>
                    <ul className="list-disc list-inside space-y-1 text-gray-600">
                      {analysisResult.analysis.recommendations.map((recommendation, index) => (
                        <li key={index}>{recommendation}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Similar Cases Section */}
            {analysisResult.similar_cases && analysisResult.similar_cases.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">
                  🔍 유사 케이스 ({analysisResult.total_similar_cases}개)
                </h3>
                
                <div className="space-y-4">
                  {analysisResult.similar_cases.map((case_, index) => (
                    <div key={case_.id} className="border rounded-lg p-4 border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-800">유사 케이스 #{index + 1}</h4>
                        <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          유사도: {(case_.score * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">카테고리:</span>
                          <span className="ml-2 font-medium">{getCategoryName(case_.metadata.category)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">심각도:</span>
                          <span className="ml-2 font-medium">{getSeverityDescription(case_.metadata.severity)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">이미지 ID:</span>
                          <span className="ml-2 font-medium text-xs">{case_.metadata.image_id}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">파일명:</span>
                          <span className="ml-2 font-medium text-xs">{case_.metadata.image_file_name}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Message */}
            {analysisResult.error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-4 rounded-r-lg">
                <h4 className="font-bold mb-2">❌ 오류 발생</h4>
                <p>{analysisResult.error}</p>
              </div>
            )}
          </div>
        )}
    </div>
  );
}

