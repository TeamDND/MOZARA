import React, { useState } from 'react';
import ImageUpload from './components/ImageUpload';
import AnalysisResult from './components/AnalysisResult';
import { analyzeImage, AnalysisResult as AnalysisResultData } from './services/api';

function App() {
  const [primaryImage, setPrimaryImage] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResultData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyzeClick = async () => {
    if (!primaryImage) {
      setError('이미지를 업로드해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    const result = await analyzeImage(primaryImage);
    
    setAnalysisResult(result);
    if (!result.success) {
      setError(result.error || '분석 중 알 수 없는 오류가 발생했습니다.');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="bg-white shadow-sm">
        <div className="max-w-4xl mx-auto py-4 px-4">
          <h1 className="text-3xl font-bold text-gray-900">탈모 유형 분석기 (여성용 v2)</h1>
        </div>
      </header>
      <main className="max-w-4xl mx-auto py-8 px-4">
        <div className="text-center">
            <p className="mt-2 text-lg text-gray-600">정수리(Top-down) 사진을 업로드하여 탈모 단계를 분석합니다.</p>
        </div>
        
        <ImageUpload 
          onPrimaryImageSelect={setPrimaryImage}
        />

        <div className="text-center">
            <button 
              onClick={handleAnalyzeClick} 
              disabled={isLoading || !primaryImage}
              className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all duration-300"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span className="ml-3">분석 중...</span>
                </div>
              ) : '분석하기'}
            </button>
        </div>
        
        {error && (
            <div className="w-full max-w-2xl mx-auto mt-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-center">
                {error}
            </div>
        )}
        
        {analysisResult && <AnalysisResult result={analysisResult} />}

      </main>
    </div>
  );
}

export default App;
