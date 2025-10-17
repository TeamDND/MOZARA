import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { CheckCircle, AlertCircle, Clock, Lightbulb } from 'lucide-react';
import { SwinAnalysisResult, getStageDescription, getStageColor } from '../../services/swinAnalysisService';
import { getShuffledTips } from '../../utils/data/analysis-tips';

interface AnalysisProgressStepProps {
  analysisComplete: boolean;
  analysisProgress: number;
  analysisSteps: string[];
  analysisResult: SwinAnalysisResult | null;
  analysisError: string | null;
  isAnalyzing: boolean;
  onRetry: () => void;
  onGoBack: () => void;
  gender?: string;  // 성별 추가
  estimatedTimeRemaining?: number;  // 경과 시간 (초)
}

const AnalysisProgressStep: React.FC<AnalysisProgressStepProps> = ({
  analysisComplete,
  analysisProgress,
  analysisSteps,
  analysisResult,
  analysisError,
  isAnalyzing,
  onRetry,
  onGoBack,
  gender,
  estimatedTimeRemaining = 0
}) => {
  const isMale = gender === 'male' || gender === '남';
  const [elapsedTime, setElapsedTime] = useState(estimatedTimeRemaining);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [tips] = useState(() => getShuffledTips());

  // 실시간 경과 시간 업데이트
  useEffect(() => {
    setElapsedTime(estimatedTimeRemaining);
  }, [estimatedTimeRemaining]);

  // 팁 자동 전환 (4초마다)
  useEffect(() => {
    if (!analysisComplete && !analysisError) {
      const interval = setInterval(() => {
        setCurrentTipIndex((prev) => (prev + 1) % tips.length);
      }, 4000);

      return () => clearInterval(interval);
    }
  }, [analysisComplete, analysisError, tips.length]);

  // 예상 시간 범위 (남성: 20-25초, 여성: 12-16초)
  const getExpectedTimeRange = () => {
    return isMale ? '20-25초' : '12-16초';
  };

  const currentTip = tips[currentTipIndex];

  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        {!analysisError ? (
          <>
            <div className="animate-spin w-12 h-12 border-4 border-[#1f0101] border-t-transparent rounded-full mx-auto"></div>
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
          <div className="space-y-2">
            <Progress value={analysisProgress} className="h-3" />
            <div className="flex flex-col items-center gap-1 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>분석 중... (약 {getExpectedTimeRange()} 소요)</span>
              </div>
              {elapsedTime > 0 && (
                <span className="text-xs text-gray-500">현재: {elapsedTime}초 경과</span>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {analysisSteps.map((step, index) => (
              <div key={index} className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm">{step}</span>
              </div>
            ))}

            {isAnalyzing && (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm">
                  AI로 이미지 분석 중...
                </span>
              </div>
            )}
          </div>

          {/* 탈모 관리 팁 슬라이드 */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-5 rounded-xl border border-blue-100 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="text-2xl flex-shrink-0 mt-1">
                {currentTip.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <h4 className="text-sm font-semibold text-blue-900">
                    {currentTip.title}
                  </h4>
                </div>
                <p className="text-sm text-blue-800 leading-relaxed">
                  {currentTip.content}
                </p>
              </div>
            </div>

            {/* 진행 표시 점들 */}
            <div className="flex justify-center gap-1.5 mt-4">
              {tips.slice(0, 5).map((_, index) => (
                <div
                  key={index}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    index === currentTipIndex % 5
                      ? 'w-6 bg-blue-600'
                      : 'w-1.5 bg-blue-300'
                  }`}
                />
              ))}
            </div>
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
            className="w-full h-12 bg-[#1f0101] hover:bg-[#333333] text-white rounded-xl"
          >
            다시 시도하기
          </Button>
        </div>
      )}
    </div>
  );
};

export default AnalysisProgressStep;
