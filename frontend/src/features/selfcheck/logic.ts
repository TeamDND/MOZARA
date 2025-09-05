import { SelfCheckAnswers, BaselineResult, HairlineType, VertexLevel, DensityLevel } from './types';

// Lifestyle Risk 계산 (0~8)
export function calculateLifestyleRisk(lifestyle: SelfCheckAnswers['lifestyle']): number {
  let risk = 0;
  
  if (lifestyle.shedding6m) risk += 2;
  if (lifestyle.familyHistory) risk += 2;
  
  switch (lifestyle.sleepHours) {
    case 'lt4': risk += 2; break;
    case '5to7': risk += 1; break;
    case 'ge8': risk += 0; break;
  }
  
  if (lifestyle.smoking) risk += 1;
  if (lifestyle.alcohol === 'heavy') risk += 1;
  
  return Math.min(8, risk);
}

// Raw Score 계산
export function calculateRawScore(answers: SelfCheckAnswers): number {
  if (!answers.hairline || answers.vertex === null || answers.density === null) {
    throw new Error('필수 항목이 선택되지 않았습니다.');
  }
  
  const v = answers.vertex;
  const d = answers.density;
  const risk = calculateLifestyleRisk(answers.lifestyle);
  const riskBucket = Math.min(2, Math.floor(risk / 3));
  
  return v + d + riskBucket;
}

// 진행 정도 매핑
export function getStageLabel(rawScore: number): '정상' | '초기' | '중등도' | '진행성' {
  if (rawScore === 0) return '정상';
  if (rawScore <= 2) return '초기';
  if (rawScore <= 5) return '중등도';
  return '진행성';
}

// 헤어라인 설명 생성
export function getHairlineDescription(hairline: HairlineType): string {
  switch (hairline) {
    case 'A': return '이마 라인 안정적';
    case 'M': return '양측 이마 후퇴(M형 경향)';
    case 'C': return '곡선형 후퇴(C형 경향)';
    case 'U': return '넓은 이마 상승(U형 경향)';
  }
}

// 정수리 설명 생성
export function getVertexDescription(vertex: VertexLevel): string {
  switch (vertex) {
    case 0: return '정수리 정상';
    case 1: return '약간 감소';
    case 2: return '감소';
    case 3: return '넓은 감소';
  }
}

// 권장사항 생성
export function getRecommendations(stageLabel: string, lifestyle: SelfCheckAnswers['lifestyle']): string[] {
  const recommendations: string[] = [
    '본 도구는 의료 진단이 아닌 참고용입니다. 지속 시 전문의 상담 권장.'
  ];
  
  if (stageLabel === '정상' || stageLabel === '초기') {
    recommendations.push('순한 두피 전용 샴푸 사용');
    recommendations.push('수면 7~8시간 확보');
    recommendations.push('분기별 셀프 체크');
  } else {
    recommendations.push('전문의 상담/치료 옵션 안내');
    recommendations.push('주간 관찰 리포트');
    recommendations.push('두피 관리 전문 제품 사용');
  }
  
  if (lifestyle.familyHistory) {
    recommendations.push('가족력 있으므로 정기적 모니터링');
  }
  
  return recommendations;
}

// 메인 결과 계산 함수
export function computeResult(answers: SelfCheckAnswers): BaselineResult {
  if (!answers.hairline || answers.vertex === null || answers.density === null) {
    throw new Error('필수 항목이 선택되지 않았습니다.');
  }
  
  const rawScore = calculateRawScore(answers);
  const stageLabel = getStageLabel(rawScore);
  const lifestyleRisk = calculateLifestyleRisk(answers.lifestyle);
  
  const hairlineDesc = getHairlineDescription(answers.hairline);
  const vertexDesc = getVertexDescription(answers.vertex);
  
  const summaryText = `${hairlineDesc}, ${vertexDesc}. 생활습관 리스크 점수: ${lifestyleRisk}`;
  
  const recommendations = getRecommendations(stageLabel, answers.lifestyle);
  
  const disclaimers = [
    '본 도구는 의료 진단이 아닌 참고용입니다.',
    '증상이 지속·악화되면 피부과 전문의 상담을 권장합니다.'
  ];
  
  return {
    baspBasic: answers.hairline,
    baspSpecific: `V${answers.vertex}`,
    stageLabel,
    summaryText,
    recommendations,
    disclaimers
  };
}
