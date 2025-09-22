import React from 'react';

// 탈모 단계 정보 (0-3단계)
const HAIR_LOSS_STAGES = [
  {
    stage: 0,
    title: '0단계',
    description: '예방 단계',
    subtitle: '예방용 샴푸, 두피 클렌저, 생활습관 가이드',
    color: 'bg-blue-100 border-blue-300 text-blue-800',
    hoverColor: 'hover:bg-blue-200',
    icon: '🛡️'
  },
  {
    stage: 1,
    title: '1단계',
    description: '초기 탈모',
    subtitle: '탈모 방지 샴푸, 영양제, 두피 토닉',
    color: 'bg-green-100 border-green-300 text-green-800',
    hoverColor: 'hover:bg-green-200',
    icon: '🌱'
  },
  {
    stage: 2,
    title: '2단계',
    description: '진행 단계',
    subtitle: '두피 앰플, 기능성 치료제, 홈케어 기기',
    color: 'bg-yellow-100 border-yellow-300 text-yellow-800',
    hoverColor: 'hover:bg-yellow-200',
    icon: '🌿'
  },
  {
    stage: 3,
    title: '3단계',
    description: '전문 단계',
    subtitle: '전문 클리닉 연계, 고농축 앰플, 가발·헤어시스템',
    color: 'bg-orange-100 border-orange-300 text-orange-800',
    hoverColor: 'hover:bg-orange-200',
    icon: '🏥'
  }
];

interface StageSelectorProps {
  selectedStage: number | null;
  onStageSelect: (stage: number) => void;
  disabled?: boolean;
}

const StageSelector: React.FC<StageSelectorProps> = ({
  selectedStage,
  onStageSelect,
  disabled = false
}) => {
  return (
    <div className="w-full">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">
          탈모 단계를 선택해주세요
        </h3>
        <p className="text-sm text-gray-600">
          현재 탈모 상태에 맞는 제품을 추천해드립니다
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {HAIR_LOSS_STAGES.map((stageInfo) => {
          const isSelected = selectedStage === stageInfo.stage;
          
          return (
            <button
              key={stageInfo.stage}
              onClick={() => !disabled && onStageSelect(stageInfo.stage)}
              disabled={disabled}
              className={`
                relative p-4 rounded-2xl border-2 transition-all duration-200
                ${isSelected 
                  ? `${stageInfo.color} border-2 shadow-lg transform scale-105` 
                  : `bg-white/70 backdrop-blur border-gray-200 text-gray-700 ${stageInfo.hoverColor} hover:shadow-md`
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
              `}
            >
              {/* 선택 표시 */}
              {isSelected && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">✓</span>
                </div>
              )}

              {/* 아이콘 */}
              <div className="text-3xl mb-3 text-center">
                {stageInfo.icon}
              </div>

              {/* 단계 정보 */}
              <div className="text-center">
                <div className="font-bold text-lg mb-1">
                  {stageInfo.title}
                </div>
                <div className="text-sm font-medium mb-1">
                  {stageInfo.description}
                </div>
                <div className="text-xs opacity-75">
                  {stageInfo.subtitle}
                </div>
              </div>

              {/* 단계별 설명 */}
              <div className="mt-3 text-xs text-center opacity-75">
                {stageInfo.stage === 0 && '두피 건강 관리와 예방'}
                {stageInfo.stage === 1 && '모발 강화와 탈모 억제'}
                {stageInfo.stage === 2 && '탈모 진행 억제와 치료'}
                {stageInfo.stage === 3 && '전문가 처방 치료'}
              </div>
            </button>
          );
        })}
      </div>

      {/* 안내 메시지 */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="text-blue-600 text-lg">💡</div>
          <div>
            <h4 className="font-semibold text-blue-800 mb-1">단계 선택 안내</h4>
            <p className="text-sm text-blue-700">
              정확한 탈모 단계를 모르신다면 <strong>BASP 자가진단</strong>을 먼저 진행해보세요. 
              전문의 상담을 통해 정확한 진단을 받으시는 것을 권장합니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StageSelector;
