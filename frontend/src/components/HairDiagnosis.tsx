import React, { useState, useRef } from 'react';
import './HairComponents.css';

interface AnalysisResult {
  stage: number;
  title: string;
  description: string;
  advice: string[];
}

const HairDiagnosis: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_API_KEY;

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

  const analyzeImageWithGemini = async (imageBase64: string): Promise<AnalysisResult> => {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${GOOGLE_API_KEY}`;
    const prompt = `당신은 두피 및 탈모 분석 전문가입니다. 주어진 이미지를 분석하여 탈모 진행 단계를 1~7단계로 진단하고, 결과를 반드시 다음 JSON 형식으로만 응답해주세요: {"stage": <1-7>, "title": "<진단명>", "description": "<상세 설명>", "advice": ["<가이드 1>", "<가이드 2>"]}`;
    const payload = { 
      contents: [{ 
        parts: [{ text: prompt }, { inlineData: { mimeType: "image/jpeg", data: imageBase64 } }] 
      }] 
    };
    
    const response = await fetchWithRetry(apiUrl, { 
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify(payload) 
    });
    
    if (!response.ok) {
      const errorBody = await response.json();
      throw new Error(`API 요청 실패: ${errorBody.error.message}`);
    }

    const result = await response.json();
    const jsonText = result.candidates[0].content.parts[0].text;
    const cleanedJsonText = jsonText.match(/\{[\s\S]*\}/)?.[0];
    if (!cleanedJsonText) throw new Error('JSON 파싱 실패');
    
    return JSON.parse(cleanedJsonText);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setAnalysisResult(null);
      
      // 이미지 미리보기 생성
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartAnalysis = async () => {
    if (!selectedFile) {
      alert('먼저 사진 파일을 선택해주세요.');
      return;
    }

    if (!GOOGLE_API_KEY) {
      alert('API 키가 설정되지 않았습니다. 환경변수를 확인해주세요.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      const imageBase64 = await toBase64(selectedFile);
      const result = await analyzeImageWithGemini(imageBase64);
      setAnalysisResult(result);
    } catch (error) {
      console.error('Gemini 분석 중 오류 발생:', error);
      alert(`분석에 실패했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getStageColor = (stage: number) => {
    if (stage <= 2) return 'bg-green-500';
    if (stage <= 4) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getStageTextColor = (stage: number) => {
    if (stage <= 2) return 'text-green-600';
    if (stage <= 4) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">AI 두피 사진 분석</h2>
          
          {/* 파일 업로드 섹션 */}
          <div className="text-center border-2 border-dashed border-gray-300 rounded-lg p-8 mb-8">
            <p className="text-gray-600 mb-4">두피가 잘 보이도록 선명하게 찍은 사진을 업로드해주세요.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              파일 선택
            </button>
            {selectedFile && (
              <p className="mt-3 text-gray-600">{selectedFile.name}</p>
            )}
          </div>

          {/* 분석 시작 버튼 */}
          <div className="text-center mb-8">
            <button
              onClick={handleStartAnalysis}
              disabled={!selectedFile || isAnalyzing}
              className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? '분석 중...' : '분석 시작'}
            </button>
          </div>

          {/* 로딩 스피너 */}
          {isAnalyzing && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">AI가 사진을 정밀하게 분석하고 있습니다...</p>
            </div>
          )}

          {/* 분석 결과 */}
          {analysisResult && (
            <div className="grid md:grid-cols-2 gap-8">
              {/* 이미지 */}
              <div>
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="업로드된 두피 사진"
                    className="w-full rounded-lg border border-gray-300"
                  />
                )}
              </div>

              {/* 분석 결과 텍스트 */}
              <div>
                <h3 className="text-2xl font-bold text-blue-600 mb-4">AI 분석 결과</h3>
                
                <div className={`inline-block px-4 py-2 rounded-full text-white font-bold mb-4 ${getStageColor(analysisResult.stage)}`}>
                  진행 단계: {analysisResult.stage}단계 ({analysisResult.title})
                </div>
                
                <p className="text-gray-700 mb-6 leading-relaxed">
                  {analysisResult.description}
                </p>
                
                <h4 className="text-lg font-semibold text-gray-900 mb-3">생활 습관 가이드</h4>
                <ul className="space-y-2">
                  {analysisResult.advice.map((item, index) => (
                    <li key={index} className="flex items-start">
                      <span className="text-blue-600 mr-2">•</span>
                      <span className="text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HairDiagnosis;
