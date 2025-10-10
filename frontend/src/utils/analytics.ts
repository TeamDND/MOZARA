import ReactGA from 'react-ga4';

// Google Analytics 초기화
export const initGA = () => {
  const measurementId = process.env.REACT_APP_GA_MEASUREMENT_ID;

  if (measurementId) {
    ReactGA.initialize(measurementId);
    console.log('Google Analytics initialized');
  } else {
    console.warn('GA Measurement ID not found in environment variables');
  }
};

// 페이지뷰 트래킹
export const logPageView = () => {
  ReactGA.send({ hitType: 'pageview', page: window.location.pathname + window.location.search });
};

// 커스텀 이벤트 트래킹
export const logEvent = (category: string, action: string, label?: string) => {
  ReactGA.event({
    category,
    action,
    label,
  });
};

// 두피 진단 완료 이벤트
export const logScalpAnalysis = (scalpType: string, scalpScore: number, sensitivity: string) => {
  ReactGA.event({
    category: 'Scalp Analysis',
    action: 'Analysis Complete',
    label: `${scalpType} - Score: ${scalpScore} - Sensitivity: ${sensitivity}`,
  });
};

// 제품 클릭 이벤트
export const logProductClick = (productCategory: string, recommendedBy: string, userScalpType: string) => {
  ReactGA.event({
    category: 'Product',
    action: 'Product Click',
    label: `${productCategory} - Recommended by: ${recommendedBy} - Scalp: ${userScalpType}`,
  });
};

// 케어 미션 완료 이벤트
export const logCareMissionComplete = (missionType: string, streakCount: number) => {
  ReactGA.event({
    category: 'Care Mission',
    action: 'Mission Complete',
    label: `${missionType} - Streak: ${streakCount}`,
  });
};

// RAG 검색 이벤트
export const logRAGSearch = (query: string, resultCount: number, clickedResult: boolean) => {
  ReactGA.event({
    category: 'RAG Search',
    action: 'Search Query',
    label: `${query} - Results: ${resultCount} - Clicked: ${clickedResult}`,
  });
};
