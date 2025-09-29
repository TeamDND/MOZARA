import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { GeminiAnalysisResult, getStageDescription, getStageColor } from '../../services/geminiAnalysisService';

interface AnalysisProgressStepProps {
  analysisComplete: boolean;
  analysisProgress: number;
  analysisSteps: string[];
  analysisResult: GeminiAnalysisResult | null;
  analysisError: string | null;
  isAnalyzing: boolean;
  onRetry: () => void;
  onGoBack: () => void;
}

const AnalysisProgressStep: React.FC<AnalysisProgressStepProps> = ({
  analysisComplete,
  analysisProgress,
  analysisSteps,
  analysisResult,
  analysisError,
  isAnalyzing,
  onRetry,
  onGoBack
}) => {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        {!analysisError ? (
          <>
            <div className="animate-spin w-12 h-12 border-4 border-[#222222] border-t-transparent rounded-full mx-auto"></div>
            <h2 className="text-xl font-bold text-gray-800">AI 탈모 분석 중...</h2>
            <p className="text-sm text-gray-600">
              설문 응답과 사진을 종합하여 탈모 상태를 분석하고 있어요
            </p>
          </>
        ) : (
          <>
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
            <h2 className="text-xl font-bold text-red-800">분석 오류</h2>
            <p className="text-sm text-red-600">
              {analysisError}
            </p>
          </>
        )}
      </div>

      {!analysisComplete && !analysisError && (
        <div className="space-y-6">
          <Progress value={analysisProgress} className="h-3" />

          <div className="space-y-4">
            {analysisSteps.map((step, index) => (
              <div key={index} className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm">{step}</span>
              </div>
            ))}

            {isAnalyzing && (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-[#222222] border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm">Gemini AI로 이미지 분석 중...</span>
              </div>
            )}
          </div>

          <div className="bg-gray-50 p-4 rounded-xl">
            <p className="text-sm text-gray-800">
              🧠 <strong>실제 AI 분석 진행 중!</strong> Google Gemini가 귀하의 두피 상태를 분석하고 있습니다.
              잠시만 기다려주세요.
            </p>
          </div>
        </div>
      )}

      {analysisComplete && !analysisError && (
        <div className="text-center space-y-4">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
          <h3 className="text-lg font-semibold text-gray-800">분석이 완료되었습니다!</h3>
          <p className="text-sm text-gray-600">
            상세한 결과를 확인해보세요
          </p>
          {analysisResult && (
            <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getStageColor(analysisResult.stage)}`}>
              {getStageDescription(analysisResult.stage)} (단계 {analysisResult.stage})
            </div>
          )}
        </div>
      )}

      {analysisError && (
        <div className="space-y-4">
          <div className="bg-red-50 p-4 rounded-xl">
            <p className="text-sm text-red-700">
              ❌ <strong>분석 실패</strong><br/>
              {analysisError}
            </p>
          </div>
          <Button
            onClick={onRetry}
            className="w-full h-12 bg-[#222222] hover:bg-[#333333] text-white rounded-xl"
          >
            다시 시도하기
          </Button>
        </div>
      )}
    </div>
  );
};

export default AnalysisProgressStep;
