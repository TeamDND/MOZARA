// 탈모 단계별 솔루션 데이터
export interface HairLossStage {
  stage: number;
  name: string;
  description: string;
  characteristics: string;
  psychologicalState: string;
  primarySolution: string;
  secondarySolution: string;
  solutionCategory: string;
  priorityCategories: string[];
  secondaryCategories: string[];
}

export const HAIR_LOSS_STAGES: HairLossStage[] = [
  {
    stage: 0,
    name: "예방/초기 증상",
    description: "탈모가 아직 명확하지 않거나 초기 미묘한 증상(가려움, 가는 털)을 느끼며 불안감이 높은 상태",
    characteristics: "탈모가 아직 명확하지 않거나 초기 미묘한 증상(가려움, 가는 털)을 느끼며 불안감이 높은 상태",
    psychologicalState: "불안감이 높은 상태",
    primarySolution: "미용실 정보",
    secondarySolution: "두피케어/생활습관 개선",
    solutionCategory: "예방 & 셀프케어",
    priorityCategories: ["탈모미용실", "두피케어"],
    secondaryCategories: ["탈모제품", "두피관리"]
  },
  {
    stage: 1,
    name: "경미한 탈모",
    description: "M자형이나 정수리 부위의 모발 밀도가 약간 감소한 상태",
    characteristics: "M자형이나 정수리 부위의 모발 밀도가 약간 감소한 상태",
    psychologicalState: "자기 해결에 대한 기대감과 관심이 높은 상태",
    primarySolution: "탈모 전문병원, 두피케어클리닉",
    secondarySolution: "두피케어 클리닉 (동시 전문 관리)",
    solutionCategory: "의학적 진단 & 조기 치료",
    priorityCategories: ["탈모병원", "두피클리닉"],
    secondaryCategories: ["탈모미용실", "두피케어"]
  },
  {
    stage: 2,
    name: "중등도 탈모",
    description: "탈모 진행이 육안으로 명확하게 보이는 상태",
    characteristics: "탈모 진행이 육안으로 명확하게 보이는 상태 (탈모 영역 확대)",
    psychologicalState: "심리적 고통이 크며 효과적인 치료법을 찾기 시작하는 상태",
    primarySolution: "탈모치료전문병원, 모발이식",
    secondarySolution: "가발/두피문신정보(비의학적 대안)",
    solutionCategory: "적극적 치료 & 외모 개선",
    priorityCategories: ["탈모병원", "모발이식"],
    secondaryCategories: ["가발전문점", "두피문신"]
  },
  {
    stage: 3,
    name: "심한 탈모",
    description: "광범위한 탈모로 인한 사회생활의 어려움을 경험하는 상태",
    characteristics: "광범위한 탈모로 인한 사회생활의 어려움을 경험하는 상태",
    psychologicalState: "가장 확실한 해결책을 원하는 상태",
    primarySolution: "모발이식 수술이나 고급 가발",
    secondarySolution: "고급 맞춤형 가발 또는 두피문신 전문점",
    solutionCategory: "수술적 해결 & 확실한 개선",
    priorityCategories: ["모발이식", "탈모병원"],
    secondaryCategories: ["가발전문점", "두피문신"]
  }
];

// 단계별 솔루션 카테고리 매핑
export const STAGE_SOLUTION_MAPPING = {
  0: {
    primary: ["탈모미용실", "두피케어", "두피관리", "미용실", "헤어살롱", "헤어샵", "미용샵", "미용센터", "미용스튜디오", "헤어케어", "두피케어", "모발케어", "모발관리", "두피관리", "탈모케어", "탈모관리", "헤어스타일링", "헤어디자인", "두피스파", "헤드스파", "두피마사지", "모발진단", "두피진단", "모발분석", "두피분석", "모발치료", "두피치료", "모발상담", "두피상담", "헤어라인", "맨즈헤어", "남성미용실", "여성미용실", "탈모전용"],
    secondary: ["탈모제품", "두피관리"],
    keywords: ["미용실", "두피케어", "생활습관", "예방", "초기", "가려움", "헤어", "살롱", "미용", "두피", "모발", "케어", "관리", "스타일링", "디자인", "스파", "마사지", "진단", "분석", "치료", "상담", "라인", "맨즈", "남성", "여성", "전용"]
  },
  1: {
    primary: ["탈모병원", "두피클리닉", "피부과"],
    secondary: ["탈모미용실", "두피케어"],
    keywords: ["탈모전문병원", "두피케어클리닉", "진단", "약물", "처방", "조기", "경미"]
  },
  2: {
    primary: ["탈모병원", "모발이식", "성형외과"],
    secondary: ["가발전문점", "두피문신", "SMP"],
    keywords: ["탈모치료전문병원", "모발이식", "가발", "두피문신", "비의학적대안", "중등도", "적극적"]
  },
  3: {
    primary: ["모발이식", "탈모병원", "성형외과"],
    secondary: ["가발전문점", "두피문신", "SMP"],
    keywords: ["모발이식수술", "고급가발", "수술", "모발이식", "최종", "심한", "확실한"]
  }
};

// 카테고리별 우선순위 점수
export const CATEGORY_PRIORITY_SCORES = {
  "탈모병원": 100,
  "모발이식": 95,
  "성형외과": 90,
  "두피클리닉": 85,
  "피부과": 80,
  "탈모미용실": 70,
  "두피케어": 65,
  "가발전문점": 60,
  "두피문신": 55,
  "SMP": 50,
  "탈모제품": 40,
  "두피관리": 35,
  // 미용실 관련 카테고리들 (0단계에서 높은 우선순위)
  "미용실": 75,
  "헤어살롱": 75,
  "헤어샵": 75,
  "미용샵": 75,
  "미용센터": 75,
  "미용스튜디오": 75,
  "헤어케어": 70,
  "모발케어": 70,
  "모발관리": 70,
  "탈모케어": 70,
  "탈모관리": 70,
  "헤어스타일링": 70,
  "헤어디자인": 70,
  "두피스파": 70,
  "헤드스파": 70,
  "두피마사지": 70,
  "모발진단": 70,
  "두피진단": 70,
  "모발분석": 70,
  "두피분석": 70,
  "모발치료": 70,
  "두피치료": 70,
  "모발상담": 70,
  "두피상담": 70,
  "헤어라인": 70,
  "맨즈헤어": 70,
  "남성미용실": 70,
  "여성미용실": 70,
  "탈모전용": 70
};

// 단계별 추천 메시지
export const STAGE_RECOMMENDATIONS = {
  0: {
    title: "미용실 정보로 예방하세요",
    message: "아직 초기 단계이므로 미용실에서 두피케어와 생활습관 개선으로 충분히 예방할 수 있습니다.",
    urgency: "낮음",
    color: "green"
  },
  1: {
    title: "탈모 전문병원과 두피케어클리닉을 찾아보세요",
    message: "전문의의 정확한 진단을 받고 두피케어클리닉에서 동시 관리하세요.",
    urgency: "보통",
    color: "blue"
  },
  2: {
    title: "탈모치료전문병원과 모발이식을 고려하세요",
    message: "약물치료와 함께 모발이식 상담을 받고, 가발/두피문신 정보도 확인해보세요.",
    urgency: "높음",
    color: "orange"
  },
  3: {
    title: "모발이식 수술이나 고급 가발을 고려하세요",
    message: "모발이식 수술이나 고급 가발을 통해 확실한 개선을 추구하세요.",
    urgency: "매우 높음",
    color: "red"
  }
};
