import React from 'react';

// 탈모 단계 정보 (0-3단계)
const HAIR_LOSS_STAGES = [
  {
    stage: 0,
    title: '0단계',
    description: '예방 단계',
    subtitle: '예방용 샴푸, 두피 클렌저, 생활습관 가이드',
    color: 'bg-gray-100 border-gray-300 text-gray-800',
    hoverColor: 'hover:bg-gray-200',
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
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-800 mb-2 text-center">
          탈모 단계를 선택해주세요
        </h3>
        <p className="text-xs text-gray-600 text-center">
          현재 탈모 상태에 맞는 제품을 추천해드립니다
        </p>
      </div>

      {/* 목록 형태로 변경 - MainContent 배너 스타일 */}
      <div className="space-y-3">
        {HAIR_LOSS_STAGES.map((stageInfo) => {
          const isSelected = selectedStage === stageInfo.stage;
          
          return (
            <div key={stageInfo.stage} className="relative">
              {isSelected && (
                <div className="absolute top-2 right-2 z-10">
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-white bg-[#1F0101] rounded-full">
                    ✓ 선택됨
                  </span>
                </div>
              )}
              <button
                onClick={() => !disabled && onStageSelect(stageInfo.stage)}
                disabled={disabled}
                className={`
                  w-full bg-white rounded-xl border transition-all
                  ${isSelected 
                    ? 'border-[#1F0101] ring-2 ring-[#1F0101]/10 shadow-md' 
                    : 'border-gray-100 hover:shadow-md'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-[0.98]'}
                `}
              >
                <div className="flex items-center p-4">
                  {/* 아이콘 영역 */}
                  <div className={`w-16 h-16 rounded-lg flex-shrink-0 mr-4 flex items-center justify-center text-3xl ${stageInfo.color}`}>
                    {stageInfo.icon}
                  </div>
                  
                  {/* 텍스트 영역 */}
                  <div className="flex-1 text-left">
                    <h3 className="text-base font-semibold text-gray-900 mb-1">
                      {stageInfo.title} - {stageInfo.description}
                    </h3>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {stageInfo.subtitle}
                    </p>
                  </div>
                  
                  {/* 화살표 */}
                  <div className="flex-shrink-0 ml-2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StageSelector;
