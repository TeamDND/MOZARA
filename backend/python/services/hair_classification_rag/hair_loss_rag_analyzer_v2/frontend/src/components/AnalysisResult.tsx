import React from 'react';
import { AnalysisResult as AnalysisResultData } from '../services/api';

interface AnalysisResultProps {
  result: AnalysisResultData | null;
}

// Helper to extract level number from keys like 'stage_1'
const getLevelFromKey = (key: string): number => {
  const match = key.match(/_(\d+)/);
  return match ? parseInt(match[1], 10) : 0;
};

const getSinclairDescription = (level: number | undefined): string => {
  if (level === undefined) return 'N/A';
  if (level === 1) return "1단계(초기 단계)";
  if (level === 2) return "2단계(중기 단계)";
  if (level === 3) return "3단계(심화 단계)";
  if (level === 4 || level === 5) return "4단계(최심화 단계)";
  return "1단계(초기 단계)";
};

const AnalysisResult: React.FC<AnalysisResultProps> = ({ result }) => {
  if (!result) {
    return null;
  }

  if (!result.success) {
    return (
      <div className="w-full max-w-2xl mx-auto mt-8 p-6 bg-red-100 border border-red-400 text-red-700 rounded-lg">
        <h2 className="text-xl font-bold mb-2">분석 오류</h2>
        <p>{result.error}</p>
      </div>
    );
  }

  const probabilities = result.stage_probabilities ? 
    Object.entries(result.stage_probabilities)
      .map(([key, value]) => ({ level: getLevelFromKey(key), prob: value }))
      .sort((a, b) => a.level - b.level) 
    : [];

  const llmReasoning = result.detailed_explanation || result.llm_analysis || "LLM 추론 정보가 없습니다.";
  const sinclairDescription = getSinclairDescription(result.predicted_stage);

  return (
    <div className="w-full max-w-2xl mx-auto mt-8 p-6 bg-white shadow-md rounded-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">분석 결과</h2>
      <div className="text-center bg-blue-50 p-4 rounded-lg mb-6">
        <div className="mb-4 pb-4 border-b border-blue-200">
            <p className="text-md text-gray-600">탈모 단계 스케일</p>
            <p className="text-2xl font-bold text-blue-800">{sinclairDescription}</p>
        </div>

        <p className="text-lg text-gray-600">예측 레벨</p>
        <p className="text-5xl font-extrabold text-blue-600">{result.predicted_stage || 'N/A'}</p>
      </div>
      
      <div className="mb-6">
        <h3 className="text-xl font-semibold text-gray-700 mb-2">상세 추론 (LLM)</h3>
        <p className="text-gray-600 bg-gray-50 p-4 rounded-md whitespace-pre-wrap">{llmReasoning}</p>
      </div>

      <div>
        <h3 className="text-xl font-semibold text-gray-700 mb-3">레벨별 확률</h3>
        <div className="space-y-3">
          {probabilities.length > 0 ? (
            probabilities.map(({ level, prob }) => (
              <div key={level} className="flex items-center gap-4">
                <span className="w-20 text-sm font-medium text-gray-600">Level {level}</span>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-blue-500 h-2.5 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${prob * 100}%` }}
                  ></div>
                </div>
                <span className="w-16 text-right text-sm font-medium text-gray-600">{(prob * 100).toFixed(1)}%</span>
              </div>
            ))
          ) : (
            <p className="text-gray-500">확률 정보가 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalysisResult;
