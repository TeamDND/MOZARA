import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { CheckCircle, HelpCircle, X } from 'lucide-react';
import { SwinAnalysisResult, getStageDescription, getStageColor } from '../../services/swinAnalysisService';
import { useState } from 'react';

interface AnalysisResultStepProps {
  analysisResult: SwinAnalysisResult | null;
  onComplete: () => void;
}

const AnalysisResultStep: React.FC<AnalysisResultStepProps> = ({ analysisResult, onComplete }) => {
  const [showStageInfo, setShowStageInfo] = useState(false);

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
            🧠 Swin Transformer AI 분석 결과
          </h3>
          {analysisResult ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">분석 단계</span>
                  <button
                    onClick={() => setShowStageInfo(true)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="단계 기준 보기"
                  >
                    <HelpCircle className="w-4 h-4" />
                  </button>
                </div>
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
                  {analysisResult.advice.split('\n').map((advice, index) => (
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

      {/* 단계 기준 설명 모달 */}
      {showStageInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center rounded-t-2xl">
              <h3 className="text-lg font-bold text-gray-800">탈모 단계 분석 기준</h3>
              <button
                onClick={() => setShowStageInfo(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-xs text-blue-800 mb-2">
                  🤖 AI 분석은 다음 요소들을 종합적으로 고려합니다:
                </p>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• 이미지 분석 (정수리, 측면)</li>
                  <li>• 나이 및 성별</li>
                  <li>• 가족력 유무</li>
                  <li>• 최근 탈모 증상</li>
                  <li>• 스트레스 수준</li>
                </ul>
              </div>

              {/* 0단계 */}
              <div className="border-l-4 border-green-500 pl-3 py-2">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-green-100 text-green-800 border-green-300">
                    0단계 - 정상
                  </Badge>
                </div>
                <p className="text-xs text-gray-700 mb-2">
                  탈모 징후가 관찰되지 않는 건강한 모발 상태
                </p>
                <div className="bg-gray-50 p-2 rounded text-xs text-gray-600">
                  <p className="font-semibold mb-1">분석 기준:</p>
                  <ul className="space-y-1">
                    <li>• 모발 밀도 정상 범위</li>
                    <li>• 탈모 증상 없음</li>
                    <li>• 두피 건강 상태 양호</li>
                  </ul>
                </div>
              </div>

              {/* 1단계 */}
              <div className="border-l-4 border-yellow-500 pl-3 py-2">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                    1단계 - 초기
                  </Badge>
                </div>
                <p className="text-xs text-gray-700 mb-2">
                  초기 단계의 모발 변화가 감지되는 상태
                </p>
                <div className="bg-gray-50 p-2 rounded text-xs text-gray-600">
                  <p className="font-semibold mb-1">분석 기준:</p>
                  <ul className="space-y-1">
                    <li>• 경미한 모발 밀도 감소</li>
                    <li>• 최근 탈모 증상 시작</li>
                    <li>• 가족력이 있는 경우 주의</li>
                    <li>• 예방 관리로 진행 지연 가능</li>
                  </ul>
                </div>
              </div>

              {/* 2단계 */}
              <div className="border-l-4 border-orange-500 pl-3 py-2">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-orange-100 text-orange-800 border-orange-300">
                    2단계 - 중등도
                  </Badge>
                </div>
                <p className="text-xs text-gray-700 mb-2">
                  중등도의 탈모가 진행되고 있는 상태
                </p>
                <div className="bg-gray-50 p-2 rounded text-xs text-gray-600">
                  <p className="font-semibold mb-1">분석 기준:</p>
                  <ul className="space-y-1">
                    <li>• 뚜렷한 모발 밀도 감소</li>
                    <li>• 탈모 진행 속도 증가</li>
                    <li>• 전문적 치료 필요</li>
                    <li>• 미녹시딜 등 치료제 고려</li>
                  </ul>
                </div>
              </div>

              {/* 3단계 */}
              <div className="border-l-4 border-red-500 pl-3 py-2">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-red-100 text-red-800 border-red-300">
                    3단계 - 심각
                  </Badge>
                </div>
                <p className="text-xs text-gray-700 mb-2">
                  상당히 진행된 탈모 상태
                </p>
                <div className="bg-gray-50 p-2 rounded text-xs text-gray-600">
                  <p className="font-semibold mb-1">분석 기준:</p>
                  <ul className="space-y-1">
                    <li>• 현저한 모발 손실</li>
                    <li>• 두피 노출 부위 확대</li>
                    <li>• 즉시 전문의 진료 필요</li>
                    <li>• 모발이식 등 적극적 치료 고려</li>
                  </ul>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-600">
                  ⚠️ 이 결과는 AI 분석에 기반한 참고용이며, 정확한 진단을 위해서는 반드시 전문의 상담이 필요합니다.
                </p>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 rounded-b-2xl">
              <Button
                onClick={() => setShowStageInfo(false)}
                className="w-full h-10 bg-[#222222] hover:bg-[#333333] text-white rounded-lg"
              >
                확인
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisResultStep;
