import React from 'react';
import { HAIR_LOSS_STAGES, STAGE_RECOMMENDATIONS, HairLossStage } from '../../utils/hairLossStages';

interface HairLossStageSelectorProps {
  selectedStage: number | null;
  onStageSelect: (stage: number) => void;
  className?: string;
}

const HairLossStageSelector: React.FC<HairLossStageSelectorProps> = ({
  selectedStage,
  onStageSelect,
  className = ""
}) => {
  const getStageColor = (stage: number) => {
    const colors = {
      0: "bg-green-100 border-green-300 text-green-800 hover:bg-green-200",
      1: "bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200",
      2: "bg-orange-100 border-orange-300 text-orange-800 hover:bg-orange-200",
      3: "bg-red-100 border-red-300 text-red-800 hover:bg-red-200"
    };
    return colors[stage as keyof typeof colors] || "bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-200";
  };

  const getSelectedStageColor = (stage: number) => {
    const colors = {
      0: "bg-green-500 border-green-600 text-white",
      1: "bg-blue-500 border-blue-600 text-white",
      2: "bg-orange-500 border-orange-600 text-white",
      3: "bg-red-500 border-red-600 text-white"
    };
    return colors[stage as keyof typeof colors] || "bg-gray-500 border-gray-600 text-white";
  };

  const getUrgencyIcon = (stage: number) => {
    const icons = {
      0: "🟢", // 낮음
      1: "🔵", // 보통
      2: "🟠", // 높음
      3: "🔴"  // 매우 높음
    };
    return icons[stage as keyof typeof icons] || "⚪";
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 헤더 */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">탈모 단계를 선택해주세요</h2>
        <p className="text-gray-600">단계에 따라 맞춤형 솔루션을 추천해드립니다</p>
      </div>

      {/* 단계 선택 버튼들 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {HAIR_LOSS_STAGES.map((stage) => (
          <button
            key={stage.stage}
            onClick={() => onStageSelect(stage.stage)}
            className={`
              relative p-4 rounded-lg border-2 transition-all duration-200 transform hover:scale-105
              ${selectedStage === stage.stage 
                ? getSelectedStageColor(stage.stage) 
                : getStageColor(stage.stage)
              }
            `}
          >
            {/* 단계 번호와 아이콘 */}
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg font-bold">
                {stage.stage}단계
              </span>
              <span className="text-lg">
                {getUrgencyIcon(stage.stage)}
              </span>
            </div>

            {/* 단계 이름 */}
            <h3 className="font-semibold text-sm mb-2">
              {stage.name}
            </h3>

            {/* 간단한 설명 */}
            <p className="text-xs opacity-90 line-clamp-2">
              {stage.description.length > 50 
                ? `${stage.description.substring(0, 50)}...` 
                : stage.description
              }
            </p>

            {/* 선택 표시 */}
            {selectedStage === stage.stage && (
              <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center">
                <span className="text-green-500 text-sm">✓</span>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* 선택된 단계 상세 정보 */}
      {selectedStage !== null && (
        <div className="mt-6 p-6 bg-white rounded-lg shadow-lg border">
          {(() => {
            const stage = HAIR_LOSS_STAGES[selectedStage];
            const recommendation = STAGE_RECOMMENDATIONS[selectedStage as keyof typeof STAGE_RECOMMENDATIONS];
            
            return (
              <div className="space-y-4">
                {/* 단계 정보 헤더 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-800">
                      {selectedStage}단계: {stage.name}
                    </h3>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium whitespace-nowrap ${
                      recommendation.color === 'green' ? 'bg-green-100 text-green-800' :
                      recommendation.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                      recommendation.color === 'orange' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {recommendation.urgency} 우선순위
                    </div>
                  </div>
                  <p className="text-gray-600">{stage.description}</p>
                </div>

                {/* 추천 메시지 */}
                <div className={`p-4 rounded-lg ${
                  recommendation.color === 'green' ? 'bg-green-50 border border-green-200' :
                  recommendation.color === 'blue' ? 'bg-blue-50 border border-blue-200' :
                  recommendation.color === 'orange' ? 'bg-orange-50 border border-orange-200' :
                  'bg-red-50 border border-red-200'
                }`}>
                  <h4 className="font-semibold mb-2">{recommendation.title}</h4>
                  <p className="text-sm">{recommendation.message}</p>
                </div>

                {/* 솔루션 정보 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">1순위 솔루션</h4>
                    <p className="text-sm text-gray-600">{stage.primarySolution}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold text-gray-800 mb-2">2순위 솔루션</h4>
                    <p className="text-sm text-gray-600">{stage.secondarySolution}</p>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default HairLossStageSelector;
