import { 
  preventionArticles, 
  scalpHealthArticles, 
  mythsArticles,
  overviewArticles,
  typesArticles,
  causesArticles,
  diagnosisArticles,
  treatmentArticles,
  researchArticles,
  recommendationsArticles
} from './final-articles';

// Type definitions
export interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  subcategories: string[];
}

export interface Article {
  id: string;
  title: string;
  content: string;
  summary: string;
  category: Category;
  subcategory: string;
  tags: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  readTime: number;
  author?: string;
  lastUpdated: string;
  relatedArticles?: string[];
  source?: string;
  sourceUrl?: string;
}

// 카테고리 직접 정의 (순환 import 방지)
const categories: Category[] = [
  {
    id: 'overview',
    name: '탈모 개요',
    description: '탈모의 정의, 유병률, 진행 단계에 대한 기본 정보',
    icon: '📊',
    color: 'bg-blue-500',
    subcategories: ['정의', '유병률', 'BASP 분류', '루드위히 분류']
  },
  {
    id: 'types',
    name: '탈모 유형',
    description: '다양한 탈모 유형별 특징과 원인',
    icon: '🧬',
    color: 'bg-green-500',
    subcategories: ['남성형 탈모(AGA)', '여성형 탈모(FPHL)', '원형 탈모', '휴지기 탈모', '흉터성 탈모']
  },
  {
    id: 'causes',
    name: '원인 & 위험 요인',
    description: '탈모를 유발하는 다양한 원인과 위험 요소들',
    icon: '⚠️',
    color: 'bg-orange-500',
    subcategories: ['유전', '호르몬(DHT)', '스트레스', '영양', '질환', '환경적 요인']
  },
  {
    id: 'diagnosis',
    name: '진단 방법',
    description: '탈모 진단을 위한 검사 방법과 절차',
    icon: '🔬',
    color: 'bg-purple-500',
    subcategories: ['병원 진단', '두피 현미경', '혈액검사', '자가 체크리스트']
  },
  {
    id: 'treatment',
    name: '치료 방법',
    description: '의약품부터 수술까지 다양한 탈모 치료 옵션',
    icon: '💊',
    color: 'bg-red-500',
    subcategories: ['의약품', '비수술적 치료', '모발이식', '생활습관 개선']
  },
  {
    id: 'prevention',
    name: '예방법 & 관리법',
    description: '탈모 예방과 일상적인 모발 관리 방법',
    icon: '🛡️',
    color: 'bg-teal-500',
    subcategories: ['두피 청결', '영양소', '스트레스 관리', '생활습관']
  },
  {
    id: 'scalp-health',
    name: '두피 건강',
    description: '탈모와 직결되는 두피 문제와 관리법',
    icon: '🌿',
    color: 'bg-lime-500',
    subcategories: ['지루성 피부염', '모낭염', '건선', '두피 타입', '올바른 샴푸법']
  },
  {
    id: 'myths',
    name: '잘못된 상식 & FAQ',
    description: '탈모에 대한 흔한 오해와 자주 묻는 질문들',
    icon: '❌',
    color: 'bg-pink-500',
    subcategories: ['모자 착용', '세발 빈도', '유전 요소', '민간요법']
  },
  {
    id: 'recommendations',
    name: '추천 제품 & 음식',
    description: '모발 건강에 도움되는 음식과 샴푸, 제품 추천',
    icon: '⭐',
    color: 'bg-amber-500',
    subcategories: ['추천 음식', '추천 샴푸', '영양제', '헤어케어 제품', '생활용품']
  },
  {
    id: 'research',
    name: '최신 연구 & 뉴스',
    description: '탈모 치료 분야의 최신 연구 동향과 뉴스',
    icon: '🔬',
    color: 'bg-indigo-500',
    subcategories: ['신약 임상시험', '줄기세포 연구', '유전자 치료', '기술 혁신']
  },
  {
    id: 'thesis-search',
    name: '논문 검색',
    description: '탈모 관련 논문을 검색하고 요약 정보를 확인하세요.',
    icon: '📚',
    color: 'bg-purple-700',
    subcategories: ['논문 검색', 'AI 요약', '최신 연구']
  }
];

// 카테고리 찾기 헬퍼 함수
const findCategory = (categoryId: string) => 
  categories.find(c => c.id === categoryId) || categories[0];

// 변환 헬퍼 함수
const transformArticle = (rawArticle: any, categoryId: string): Article => {
  const category = findCategory(categoryId);
  
  return {
    id: rawArticle.id,
    title: rawArticle.title,
    content: rawArticle.content,
    category,
    subcategory: rawArticle.subcategory || category.subcategories[0] || '일반',
    summary: rawArticle.summary || rawArticle.content.substring(0, 200) + '...',
    difficulty: rawArticle.difficulty || 'beginner' as const,
    readTime: rawArticle.readTime || Math.max(1, Math.floor(rawArticle.content.length / 500)),
    author: rawArticle.author || '관리자',
    lastUpdated: rawArticle.lastUpdated || '2024-01-01',
    tags: rawArticle.tags || [category.name],
    relatedArticles: rawArticle.relatedArticles || [],
    source: rawArticle.source,
    sourceUrl: rawArticle.sourceUrl,
  };
};

// 변환된 아티클들
export const transformedArticles: Article[] = [
  // 탈모 개요
  ...overviewArticles.map(article => transformArticle(article, 'overview')),
  // 탈모 유형
  ...typesArticles.map(article => transformArticle(article, 'types')),
  // 원인 & 위험 요인
  ...causesArticles.map(article => transformArticle(article, 'causes')),
  // 진단 방법
  ...diagnosisArticles.map(article => transformArticle(article, 'diagnosis')),
  // 치료 방법
  ...treatmentArticles.map(article => transformArticle(article, 'treatment')),
  // 예방법 & 관리법
  ...preventionArticles.map(article => transformArticle(article, 'prevention')),
  // 두피 건강
  ...scalpHealthArticles.map(article => transformArticle(article, 'scalp-health')),
  // 잘못된 상식 & FAQ
  ...mythsArticles.map(article => transformArticle(article, 'myths')),
  // 추천 제품 & 음식
  ...recommendationsArticles.map(article => transformArticle(article, 'recommendations')),
  // 최신 연구 & 뉴스
  ...researchArticles.map(article => transformArticle(article, 'research')),
];

export { transformedArticles as articles, categories };
