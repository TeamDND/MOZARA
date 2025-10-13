/**
 * 분석 대기 중 표시할 탈모 관련 팁
 * final-articles.ts의 내용을 참조하여 작성됨
 */

export interface AnalysisTip {
  emoji: string;
  title: string;
  content: string;
}

export const analysisTips: AnalysisTip[] = [
  // 기본 탈모 지식
  {
    emoji: "💡",
    title: "정상적인 모발 손실",
    content: "하루 50-100개의 모발이 빠지는 것은 정상입니다"
  },
  {
    emoji: "🔄",
    title: "모발 성장 주기",
    content: "모발은 성장기(2-6년) → 퇴행기(2-3주) → 휴지기(2-3개월)를 반복합니다"
  },
  {
    emoji: "📊",
    title: "탈모 유병률",
    content: "한국 남성의 경우 20대 17%, 30대 25%, 40대 35%가 탈모를 경험합니다"
  },

  // 생활 습관
  {
    emoji: "💧",
    title: "충분한 수분 섭취",
    content: "하루 2L 이상의 물을 마시면 두피 혈액순환이 개선됩니다"
  },
  {
    emoji: "🌙",
    title: "충분한 수면",
    content: "하루 7-8시간 수면은 모발 성장 호르몬 분비에 필수적입니다"
  },
  {
    emoji: "🚭",
    title: "금연의 중요성",
    content: "흡연은 두피 혈액순환을 방해하고 DHT 생성을 증가시킵니다"
  },
  {
    emoji: "🏃",
    title: "규칙적인 운동",
    content: "주 3회 이상 유산소 운동은 두피 혈액순환을 촉진합니다"
  },
  {
    emoji: "😌",
    title: "스트레스 관리",
    content: "만성 스트레스는 휴지기 탈모의 주요 원인 중 하나입니다"
  },

  // 영양 관리
  {
    emoji: "🥗",
    title: "단백질 섭취",
    content: "모발의 99%는 케라틴 단백질입니다. 달걀, 생선, 콩류를 충분히 섭취하세요"
  },
  {
    emoji: "🥬",
    title: "비타민 B군",
    content: "비오틴(비타민 B7)은 모발 성장에 필수적입니다. 시금치, 견과류에 풍부합니다"
  },
  {
    emoji: "🐟",
    title: "오메가-3 지방산",
    content: "연어, 고등어 등 등푸른 생선은 두피 염증을 감소시킵니다"
  },
  {
    emoji: "🥜",
    title: "아연 섭취",
    content: "아연은 모낭 건강에 중요합니다. 견과류, 해산물에 풍부합니다"
  },
  {
    emoji: "🥕",
    title: "비타민 A",
    content: "당근, 고구마 등은 두피 피지선 건강을 유지합니다"
  },

  // 두피 관리
  {
    emoji: "🧴",
    title: "올바른 샴푸 방법",
    content: "미지근한 물로 두피를 마사지하듯 부드럽게 씻어주세요"
  },
  {
    emoji: "🚿",
    title: "샴푸 후 헹굼",
    content: "샴푸 잔여물이 남지 않도록 충분히 헹구는 것이 중요합니다"
  },
  {
    emoji: "💆",
    title: "두피 마사지",
    content: "하루 5-10분 두피 마사지는 혈액순환을 개선하고 스트레스를 감소시킵니다"
  },
  {
    emoji: "🌡️",
    title: "적절한 수온",
    content: "뜨거운 물은 두피를 자극하고 건조하게 만듭니다. 미지근한 물을 사용하세요"
  },
  {
    emoji: "🧊",
    title: "찬물 마무리",
    content: "샴푸 후 마지막에 찬물로 헹구면 모공이 수축되고 모발이 윤기를 얻습니다"
  },

  // 탈모 치료
  {
    emoji: "💊",
    title: "조기 치료의 중요성",
    content: "탈모는 초기에 발견할수록 치료 효과가 좋습니다"
  },
  {
    emoji: "⏰",
    title: "꾸준한 관리",
    content: "탈모 치료는 최소 6개월 이상 꾸준히 지속해야 효과를 볼 수 있습니다"
  },
  {
    emoji: "🔬",
    title: "과학적 근거",
    content: "FDA 승인 치료제(미녹시딜, 피나스테리드)는 임상적으로 효과가 입증되었습니다"
  },

  // 잘못된 상식 바로잡기
  {
    emoji: "❌",
    title: "모자와 탈모",
    content: "모자 착용이 직접적인 탈모 원인은 아닙니다. 다만 청결하게 관리하세요"
  },
  {
    emoji: "✂️",
    title: "잦은 머리 자르기",
    content: "머리를 자주 자른다고 모발이 더 굵어지거나 많아지지 않습니다"
  },
  {
    emoji: "🧴",
    title: "샴푸와 탈모",
    content: "샴푸 자체가 탈모를 유발하지 않습니다. 두피 타입에 맞는 제품 선택이 중요합니다"
  },

  // 계절별 관리
  {
    emoji: "☀️",
    title: "자외선 차단",
    content: "여름철 강한 자외선은 두피를 손상시킬 수 있습니다. 모자나 양산을 사용하세요"
  },
  {
    emoji: "🍂",
    title: "가을철 탈모",
    content: "가을에 일시적으로 탈모가 증가하는 것은 정상적인 계절적 변화입니다"
  },
  {
    emoji: "❄️",
    title: "겨울철 두피 건조",
    content: "건조한 겨울에는 두피 보습에 더 신경 써야 합니다"
  },

  // AI 분석 관련
  {
    emoji: "🤖",
    title: "AI 분석의 정확도",
    content: "AI 모델은 10,000장 이상의 이미지로 학습되어 96.5%의 정확도를 보입니다"
  },
  {
    emoji: "📸",
    title: "정확한 사진 촬영",
    content: "자연광 아래에서 정수리와 측면을 명확하게 촬영하면 더 정확한 분석이 가능합니다"
  },
  {
    emoji: "📈",
    title: "경과 관리",
    content: "정기적인 사진 촬영으로 탈모 진행 상태를 객관적으로 추적할 수 있습니다"
  }
];

/**
 * 팁을 랜덤하게 섞어서 반환
 */
export const getShuffledTips = (): AnalysisTip[] => {
  return [...analysisTips].sort(() => Math.random() - 0.5);
};

/**
 * 지정된 개수만큼 랜덤 팁 반환
 */
export const getRandomTips = (count: number): AnalysisTip[] => {
  const shuffled = getShuffledTips();
  return shuffled.slice(0, Math.min(count, shuffled.length));
};
