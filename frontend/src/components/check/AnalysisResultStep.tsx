import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { CheckCircle } from 'lucide-react';
import { GeminiAnalysisResult, getStageDescription, getStageColor } from '../../services/geminiAnalysisService';

interface AnalysisResultStepProps {
  analysisResult: GeminiAnalysisResult | null;
  onComplete: () => void;
}

const AnalysisResultStep: React.FC<AnalysisResultStepProps> = ({ analysisResult, onComplete }) => {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
        <h2 className="text-xl font-bold text-gray-800">통합 분석 결과</h2>
        <p className="text-sm text-gray-600">
          AI가 분석한 종합적인 두피 상태입니다
        </p>
      </div>

      <div className="space-y-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            🧠 Gemini AI 분석 결과
          </h3>
          {analysisResult ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">분석 단계</span>
                <Badge
                  className={`px-2 py-1 ${getStageColor(analysisResult.stage)}`}
                >
                  {getStageDescription(analysisResult.stage)} (단계 {analysisResult.stage})
                </Badge>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">분석명</p>
                <p className="text-sm font-medium text-gray-800">{analysisResult.title}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">상세 설명</p>
                <p className="text-sm text-gray-700">{analysisResult.description}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">AI 추천 가이드</p>
                <div className="space-y-1">
                  {analysisResult.advice.map((advice, index) => (
                    <p key={index} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                      • {advice}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">모발 밀도</span>
                <Badge variant="outline" className="px-2 py-1">분석 중...</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">두피 건강도</span>
                <Badge variant="secondary" className="px-2 py-1">분석 중...</Badge>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <Button 
          onClick={onComplete} 
          variant="outline" 
          className="w-full h-12 bg-[#222222] hover:bg-[#333333] text-white rounded-xl active:scale-[0.98]"
        >
          맞춤 솔루션 및 컨텐츠 확인하기
        </Button>
      </div>
    </div>
  );
};

export default AnalysisResultStep;
