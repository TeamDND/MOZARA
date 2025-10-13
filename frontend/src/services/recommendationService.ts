import { WeatherData } from './weatherService';

// 두피 상태 타입
export interface ScalpCondition {
  stage: number; // 0-6단계
  moisture: 'dry' | 'normal' | 'oily'; // 수분 상태
  sensitivity: 'low' | 'medium' | 'high'; // 민감도
  dandruff: boolean; // 비듬 여부
  inflammation: boolean; // 염증 여부
}

// 추천 제품 타입
export interface RecommendedProduct {
  id: string;
  name: string;
  category: 'shampoo' | 'conditioner' | 'treatment' | 'serum' | 'mask' | 'supplement';
  description: string;
  reason: string;
  price?: number;
  imageUrl?: string;
  priority: number; // 우선순위 (1-5)
}

// 건강 팁 타입
export interface HealthTip {
  id: string;
  title: string;
  content: string;
  category: 'daily' | 'weather' | 'scalp' | 'seasonal';
  priority: number;
  weatherCondition?: string;
  scalpCondition?: string;
}

// 날씨 상태 분석
const analyzeWeatherCondition = (weather: WeatherData) => {
  const conditions = [];
  
  // UV 지수 분석
  if (weather.uvIndex >= 8) {
    conditions.push('high_uv');
  } else if (weather.uvIndex >= 6) {
    conditions.push('medium_uv');
  } else {
    conditions.push('low_uv');
  }
  
  // 습도 분석
  if (weather.humidity >= 70) {
    conditions.push('high_humidity');
  } else if (weather.humidity <= 30) {
    conditions.push('low_humidity');
  } else {
    conditions.push('normal_humidity');
  }
  
  // 미세먼지 분석
  if (weather.fineDust >= 76) {
    conditions.push('high_dust');
  } else if (weather.fineDust >= 36) {
    conditions.push('medium_dust');
  } else {
    conditions.push('low_dust');
  }
  
  // 온도 분석
  if (weather.temperature >= 30) {
    conditions.push('hot');
  } else if (weather.temperature <= 5) {
    conditions.push('cold');
  } else {
    conditions.push('mild');
  }
  
  return conditions;
};

// 두피 상태에 따른 제품 추천
const getScalpBasedProducts = (scalp: ScalpCondition): RecommendedProduct[] => {
  const products: RecommendedProduct[] = [];
  
  // 탈모 단계별 기본 추천
  if (scalp.stage === 0) {
    products.push({
      id: 'preventive_shampoo',
      name: '예방 샴푸',
      category: 'shampoo',
      description: '탈모 예방을 위한 두피 케어 샴푸',
      reason: '0단계 탈모 예방에 효과적',
      priority: 5
    });
  } else if (scalp.stage >= 1 && scalp.stage <= 3) {
    products.push({
      id: 'anti_hairloss_shampoo',
      name: '탈모 방지 샴푸',
      category: 'shampoo',
      description: '초기 탈모 단계에 맞는 전문 샴푸',
      reason: '1-3단계 탈모 진행 억제',
      priority: 5
    });
  } else if (scalp.stage >= 4) {
    products.push({
      id: 'intensive_treatment',
      name: '집중 케어 트리트먼트',
      category: 'treatment',
      description: '심각한 탈모 단계를 위한 집중 케어',
      reason: '4단계 이상 고강도 케어 필요',
      priority: 5
    });
  }
  
  // 수분 상태별 추천
  if (scalp.moisture === 'dry') {
    products.push({
      id: 'moisturizing_serum',
      name: '수분 보충 세럼',
      category: 'serum',
      description: '건조한 두피를 위한 수분 공급 세럼',
      reason: '두피 건조 개선',
      priority: 4
    });
  } else if (scalp.moisture === 'oily') {
    products.push({
      id: 'oil_control_shampoo',
      name: '유분 조절 샴푸',
      category: 'shampoo',
      description: '지성 두피를 위한 유분 조절 샴푸',
      reason: '과도한 유분 제거',
      priority: 4
    });
  }
  
  // 민감도별 추천
  if (scalp.sensitivity === 'high') {
    products.push({
      id: 'sensitive_scalp_shampoo',
      name: '민감 두피 전용 샴푸',
      category: 'shampoo',
      description: '민감한 두피를 위한 순한 성분 샴푸',
      reason: '두피 자극 최소화',
      priority: 4
    });
  }
  
  // 비듬/염증별 추천
  if (scalp.dandruff) {
    products.push({
      id: 'anti_dandruff_shampoo',
      name: '비듬 방지 샴푸',
      category: 'shampoo',
      description: '비듬 제거 및 예방 샴푸',
      reason: '비듬 문제 해결',
      priority: 3
    });
  }
  
  if (scalp.inflammation) {
    products.push({
      id: 'soothing_mask',
      name: '진정 마스크',
      category: 'mask',
      description: '염증 완화를 위한 진정 마스크',
      reason: '두피 염증 진정',
      priority: 3
    });
  }
  
  return products.sort((a, b) => b.priority - a.priority);
};

// 날씨별 제품 추천
const getWeatherBasedProducts = (weather: WeatherData): RecommendedProduct[] => {
  const products: RecommendedProduct[] = [];
  const conditions = analyzeWeatherCondition(weather);
  
  // 고온/고습도
  if (conditions.includes('hot') && conditions.includes('high_humidity')) {
    products.push({
      id: 'cooling_serum',
      name: '쿨링 세럼',
      category: 'serum',
      description: '뜨거운 날씨에 두피를 시원하게 해주는 세럼',
      reason: '고온 다습 환경에서 두피 쿨링',
      priority: 4
    });
  }
  
  // 고UV
  if (conditions.includes('high_uv')) {
    products.push({
      id: 'uv_protection_spray',
      name: '자외선 차단 스프레이',
      category: 'serum',
      description: '두피 자외선 차단 스프레이',
      reason: '강한 자외선으로부터 두피 보호',
      priority: 5
    });
  }
  
  // 저습도
  if (conditions.includes('low_humidity')) {
    products.push({
      id: 'intensive_moisturizer',
      name: '집중 보습제',
      category: 'treatment',
      description: '건조한 환경에서 두피 수분 공급',
      reason: '저습도 환경에서 수분 보충',
      priority: 4
    });
  }
  
  // 고미세먼지
  if (conditions.includes('high_dust')) {
    products.push({
      id: 'deep_cleansing_shampoo',
      name: '딥 클렌징 샴푸',
      category: 'shampoo',
      description: '미세먼지와 오염물질을 깊이 제거하는 샴푸',
      reason: '높은 미세먼지 농도에서 두피 정화',
      priority: 4
    });
  }
  
  // 저온
  if (conditions.includes('cold')) {
    products.push({
      id: 'warming_treatment',
      name: '워밍 트리트먼트',
      category: 'treatment',
      description: '추운 날씨에 두피 혈액순환을 돕는 트리트먼트',
      reason: '저온 환경에서 혈액순환 개선',
      priority: 3
    });
  }
  
  return products.sort((a, b) => b.priority - a.priority);
};

// 날씨별 건강 팁
const getWeatherBasedTips = (weather: WeatherData): HealthTip[] => {
  const tips: HealthTip[] = [];
  const conditions = analyzeWeatherCondition(weather);
  
  // 고UV 팁
  if (conditions.includes('high_uv')) {
    tips.push({
      id: 'uv_protection_tip',
      title: '강한 자외선 대비법',
      content: '오늘 자외선이 매우 강합니다. 외출 시 모자나 양산을 착용하고, 두피 자외선 차단제를 사용하세요. 특히 정수리 부분을 보호하는 것이 중요합니다.',
      category: 'weather',
      priority: 5,
      weatherCondition: 'high_uv'
    });
  }
  
  // 저습도 팁
  if (conditions.includes('low_humidity')) {
    tips.push({
      id: 'dry_weather_tip',
      title: '건조한 날씨 두피 케어',
      content: '습도가 낮아 두피가 건조해지기 쉽습니다. 샴푸 후 충분한 보습제를 사용하고, 실내 가습기를 켜두세요. 물을 충분히 마시는 것도 중요합니다.',
      category: 'weather',
      priority: 4,
      weatherCondition: 'low_humidity'
    });
  }
  
  // 고습도 팁
  if (conditions.includes('high_humidity')) {
    tips.push({
      id: 'humid_weather_tip',
      title: '습한 날씨 두피 관리',
      content: '습도가 높아 두피가 무거워지기 쉽습니다. 가벼운 샴푸로 자주 세정하고, 통풍이 잘 되는 곳에서 머리를 말리세요.',
      category: 'weather',
      priority: 3,
      weatherCondition: 'high_humidity'
    });
  }
  
  // 고미세먼지 팁
  if (conditions.includes('high_dust')) {
    tips.push({
      id: 'dust_protection_tip',
      title: '미세먼지 많은 날 주의사항',
      content: '미세먼지 농도가 높습니다. 외출 후에는 반드시 머리를 씻고, 딥 클렌징 샴푸를 사용해 오염물질을 제거하세요.',
      category: 'weather',
      priority: 4,
      weatherCondition: 'high_dust'
    });
  }
  
  // 고온 팁
  if (conditions.includes('hot')) {
    tips.push({
      id: 'hot_weather_tip',
      title: '뜨거운 날씨 두피 케어',
      content: '고온으로 인해 두피에 열이 쌓이기 쉽습니다. 시원한 물로 샴푸하고, 쿨링 세럼을 사용해 두피 온도를 낮춰보세요.',
      category: 'weather',
      priority: 3,
      weatherCondition: 'hot'
    });
  }
  
  return tips.sort((a, b) => b.priority - a.priority);
};

// 두피 상태별 건강 팁
const getScalpBasedTips = (scalp: ScalpCondition): HealthTip[] => {
  const tips: HealthTip[] = [];
  
  // 탈모 단계별 팁
  if (scalp.stage === 0) {
    tips.push({
      id: 'prevention_tip',
      title: '탈모 예방 관리법',
      content: '현재 건강한 상태입니다. 규칙적인 두피 마사지와 적절한 샴푸로 예방 관리에 집중하세요. 스트레스 관리도 중요합니다.',
      category: 'scalp',
      priority: 4,
      scalpCondition: 'stage_0'
    });
  } else if (scalp.stage >= 1 && scalp.stage <= 3) {
    tips.push({
      id: 'early_stage_tip',
      title: '초기 탈모 단계 관리',
      content: '탈모가 시작된 단계입니다. 전문적인 탈모 방지 제품을 사용하고, 두피 마사지를 통해 혈액순환을 개선하세요.',
      category: 'scalp',
      priority: 5,
      scalpCondition: `stage_${scalp.stage}`
    });
  } else if (scalp.stage >= 4) {
    tips.push({
      id: 'advanced_stage_tip',
      title: '진행된 탈모 단계 관리',
      content: '탈모가 상당히 진행된 상태입니다. 전문의 상담을 받고, 집중적인 케어 제품을 사용하세요. 조기 치료가 중요합니다.',
      category: 'scalp',
      priority: 5,
      scalpCondition: `stage_${scalp.stage}`
    });
  }
  
  // 수분 상태별 팁
  if (scalp.moisture === 'dry') {
    tips.push({
      id: 'dry_scalp_tip',
      title: '건조한 두피 케어',
      content: '두피가 건조한 상태입니다. 보습 성분이 풍부한 샴푸와 세럼을 사용하고, 과도한 세정은 피하세요.',
      category: 'scalp',
      priority: 4,
      scalpCondition: 'dry'
    });
  } else if (scalp.moisture === 'oily') {
    tips.push({
      id: 'oily_scalp_tip',
      title: '지성 두피 관리',
      content: '두피가 기름진 상태입니다. 유분 조절 샴푸를 사용하고, 하루에 한 번만 샴푸하세요. 과도한 세정은 오히려 유분을 증가시킵니다.',
      category: 'scalp',
      priority: 4,
      scalpCondition: 'oily'
    });
  }
  
  // 민감도별 팁
  if (scalp.sensitivity === 'high') {
    tips.push({
      id: 'sensitive_scalp_tip',
      title: '민감한 두피 주의사항',
      content: '두피가 민감한 상태입니다. 순한 성분의 제품을 사용하고, 뜨거운 물로 샴푸하지 마세요. 자극을 주는 성분은 피하세요.',
      category: 'scalp',
      priority: 4,
      scalpCondition: 'high_sensitivity'
    });
  }
  
  return tips.sort((a, b) => b.priority - a.priority);
};

// 통합 추천 시스템
export const getPersonalizedRecommendations = (
  weather: WeatherData,
  scalp: ScalpCondition
): {
  products: RecommendedProduct[];
  tips: HealthTip[];
} => {
  // 두피 상태 기반 제품 추천
  const scalpProducts = getScalpBasedProducts(scalp);
  
  // 날씨 기반 제품 추천
  const weatherProducts = getWeatherBasedProducts(weather);
  
  // 중복 제거 및 우선순위 정렬
  const allProducts = [...scalpProducts, ...weatherProducts];
  const uniqueProducts = allProducts.reduce((acc, product) => {
    const existing = acc.find(p => p.id === product.id);
    if (!existing) {
      acc.push(product);
    } else if (product.priority > existing.priority) {
      acc[acc.indexOf(existing)] = product;
    }
    return acc;
  }, [] as RecommendedProduct[]);
  
  // 상위 3개 제품만 반환
  const topProducts = uniqueProducts
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 3);
  
  // 건강 팁 생성
  const weatherTips = getWeatherBasedTips(weather);
  const scalpTips = getScalpBasedTips(scalp);
  
  // 상위 2개 팁만 반환
  const allTips = [...weatherTips, ...scalpTips];
  const topTips = allTips
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 2);
  
  return {
    products: topProducts,
    tips: topTips
  };
};

// 기본 두피 상태 (실제로는 진단 결과에서 가져와야 함)
export const getDefaultScalpCondition = (): ScalpCondition => {
  return {
    stage: 1,
    moisture: 'normal',
    sensitivity: 'medium',
    dandruff: false,
    inflammation: false
  };
};

export default {
  getPersonalizedRecommendations,
  getDefaultScalpCondition,
  analyzeWeatherCondition
};
