import { SelfCheckAnswers, BaselineResult } from './types';
import { generateBaspCode, getBaspResult } from './baspData';

// 헤어라인 설명 생성
export function getHairlineDescription(hairline: string): string {
  switch (hairline) {
    case 'L': return '앞머리선 변화 없음';
    case 'M': return '측두부 후퇴';
    case 'C': return '중앙부 후퇴';
    case 'U': return '말굽형 전반 후퇴';
    default: return '알 수 없는 패턴';
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
  
  // M, C, U 패턴의 경우 서브타입이 필요
  if ((answers.hairline === 'M' || answers.hairline === 'C' || answers.hairline === 'U') && 
      answers.hairlineSubType === null) {
    throw new Error('헤어라인 세부 유형을 선택해주세요.');
  }
  
  const baspCode = generateBaspCode(
    answers.hairline, 
    answers.hairlineSubType, 
    answers.density, 
    answers.vertex
  );
  const baspResult = getBaspResult(baspCode);
  
  const recommendations = getRecommendations(baspResult.stageLabel, answers.lifestyle);
  
  const disclaimers = [
    '본 도구는 의료 진단이 아닌 참고용입니다.',
    '증상이 지속·악화되면 피부과 전문의 상담을 권장합니다.'
  ];
  
  return {
    baspCode: `${answers.hairline}${baspCode.replace(answers.hairline, '')}`, // baspBasic + baspSpecific 조합
    baspBasic: answers.hairline,
    baspSpecific: baspCode.replace(answers.hairline, ''), // BA 부분 제거한 SP 부분만
    stageNumber: baspResult.stageNumber,
    stageLabel: baspResult.stageLabel,
    summaryText: baspResult.summaryText,
    recommendations,
    disclaimers
  };
}
