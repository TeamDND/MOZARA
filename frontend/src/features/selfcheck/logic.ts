import { SelfCheckAnswers, BaselineResult, HairlineType, VertexLevel, DensityLevel } from './types';

// BASP 결과 데이터 (CSV 기반)
interface BaspResultData {
  baspCode: string;
  stageNumber: number;
  stageLabel: '정상' | '초기' | '중기' | '심화';
  summaryText: string;
  recommendation: string;
}

// BASP 코드 생성 함수
export function generateBaspCode(hairline: HairlineType, density: DensityLevel, vertex: VertexLevel): string {
  const densityCode = density === 0 ? '' : `F${density}`;
  const vertexCode = vertex === 0 ? '' : `V${vertex}`;
  return `${hairline}${densityCode}${vertexCode}`;
}

// BASP 결과 매핑 (CSV 데이터 기반)
export function getBaspResult(baspCode: string): BaspResultData {
  const resultMap: Record<string, BaspResultData> = {
    // L (앞머리선 변화 없음) 시리즈
    'L': { baspCode: 'L', stageNumber: 0, stageLabel: '정상', summaryText: '앞머리선 변화 없음 (L)', recommendation: '기준선 유지: 분기별 동일 각도 기록' },
    'LF1': { baspCode: 'LF1', stageNumber: 1, stageLabel: '초기', summaryText: '앞머리선 변화 없음 (L) + 상부 전반 확산 (F1)', recommendation: '초기 추세확인: 월 1회 표준 촬영 + 생활요인 점검' },
    'LF2': { baspCode: 'LF2', stageNumber: 2, stageLabel: '중기', summaryText: '앞머리선 변화 없음 (L) + 상부 전반 확산 (F2)', recommendation: '경과관리 강화: 2~4주 간격 기록 + 상담 검토(진단 아님)' },
    'LF3': { baspCode: 'LF3', stageNumber: 3, stageLabel: '심화', summaryText: '앞머리선 변화 없음 (L) + 상부 전반 확산 (F3)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
    'LV1': { baspCode: 'LV1', stageNumber: 1, stageLabel: '초기', summaryText: '앞머리선 변화 없음 (L) + 정수리 희박 (V1)', recommendation: '초기 추세확인: 월 1회 표준 촬영 + 생활요인 점검' },
    'LV2': { baspCode: 'LV2', stageNumber: 2, stageLabel: '중기', summaryText: '앞머리선 변화 없음 (L) + 정수리 희박 (V2)', recommendation: '경과관리 강화: 2~4주 간격 기록 + 상담 검토(진단 아님)' },
    'LV3': { baspCode: 'LV3', stageNumber: 3, stageLabel: '심화', summaryText: '앞머리선 변화 없음 (L) + 정수리 희박 (V3)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
    'LF1V1': { baspCode: 'LF1V1', stageNumber: 1, stageLabel: '초기', summaryText: '앞머리선 변화 없음 (L) + 상부 전반 확산 (F1) + 정수리 희박 (V1)', recommendation: '초기 추세확인: 월 1회 표준 촬영 + 생활요인 점검' },
    'LF1V2': { baspCode: 'LF1V2', stageNumber: 2, stageLabel: '중기', summaryText: '앞머리선 변화 없음 (L) + 상부 전반 확산 (F1) + 정수리 희박 (V2)', recommendation: '경과관리 강화: 2~4주 간격 기록 + 상담 검토(진단 아님)' },
    'LF1V3': { baspCode: 'LF1V3', stageNumber: 3, stageLabel: '심화', summaryText: '앞머리선 변화 없음 (L) + 상부 전반 확산 (F1) + 정수리 희박 (V3)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
    'LF2V1': { baspCode: 'LF2V1', stageNumber: 2, stageLabel: '중기', summaryText: '앞머리선 변화 없음 (L) + 상부 전반 확산 (F2) + 정수리 희박 (V1)', recommendation: '경과관리 강화: 2~4주 간격 기록 + 상담 검토(진단 아님)' },
    'LF2V2': { baspCode: 'LF2V2', stageNumber: 2, stageLabel: '중기', summaryText: '앞머리선 변화 없음 (L) + 상부 전반 확산 (F2) + 정수리 희박 (V2)', recommendation: '경과관리 강화: 2~4주 간격 기록 + 상담 검토(진단 아님)' },
    'LF2V3': { baspCode: 'LF2V3', stageNumber: 3, stageLabel: '심화', summaryText: '앞머리선 변화 없음 (L) + 상부 전반 확산 (F2) + 정수리 희박 (V3)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
    'LF3V1': { baspCode: 'LF3V1', stageNumber: 3, stageLabel: '심화', summaryText: '앞머리선 변화 없음 (L) + 상부 전반 확산 (F3) + 정수리 희박 (V1)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
    'LF3V2': { baspCode: 'LF3V2', stageNumber: 3, stageLabel: '심화', summaryText: '앞머리선 변화 없음 (L) + 상부 전반 확산 (F3) + 정수리 희박 (V2)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
    'LF3V3': { baspCode: 'LF3V3', stageNumber: 3, stageLabel: '심화', summaryText: '앞머리선 변화 없음 (L) + 상부 전반 확산 (F3) + 정수리 희박 (V3)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
    
    // M (측두부 후퇴) 시리즈 - 주요 몇 개만 예시
    'M0': { baspCode: 'M0', stageNumber: 0, stageLabel: '정상', summaryText: '측두부 후퇴 없음 (M0)', recommendation: '기준선 유지: 분기별 동일 각도 기록' },
    'M1': { baspCode: 'M1', stageNumber: 1, stageLabel: '초기', summaryText: '측두부 후퇴 (M1)', recommendation: '초기 추세확인: 월 1회 표준 촬영 + 생활요인 점검' },
    'M2': { baspCode: 'M2', stageNumber: 2, stageLabel: '중기', summaryText: '측두부 후퇴 (M2)', recommendation: '경과관리 강화: 2~4주 간격 기록 + 상담 검토(진단 아님)' },
    'M3': { baspCode: 'M3', stageNumber: 3, stageLabel: '심화', summaryText: '측두부 후퇴 (M3)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
    
    // C (중앙부 후퇴) 시리즈
    'C0': { baspCode: 'C0', stageNumber: 0, stageLabel: '정상', summaryText: '중앙부 후퇴 없음 (C0)', recommendation: '기준선 유지: 분기별 동일 각도 기록' },
    'C1': { baspCode: 'C1', stageNumber: 1, stageLabel: '초기', summaryText: '중앙부 후퇴 (C1)', recommendation: '초기 추세확인: 월 1회 표준 촬영 + 생활요인 점검' },
    'C2': { baspCode: 'C2', stageNumber: 2, stageLabel: '중기', summaryText: '중앙부 후퇴 (C2)', recommendation: '경과관리 강화: 2~4주 간격 기록 + 상담 검토(진단 아님)' },
    'C3': { baspCode: 'C3', stageNumber: 3, stageLabel: '심화', summaryText: '중앙부 후퇴 (C3)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
    
    // U (말굽형 전반 후퇴) 시리즈
    'U1': { baspCode: 'U1', stageNumber: 2, stageLabel: '중기', summaryText: '말굽형 전반 후퇴 (U1)', recommendation: '경과관리 강화: 2~4주 간격 기록 + 상담 검토(진단 아님)' },
    'U2': { baspCode: 'U2', stageNumber: 3, stageLabel: '심화', summaryText: '말굽형 전반 후퇴 (U2)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
    'U3': { baspCode: 'U3', stageNumber: 3, stageLabel: '심화', summaryText: '말굽형 전반 후퇴 (U3)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' }
  };
  
  return resultMap[baspCode] || {
    baspCode,
    stageNumber: 0,
    stageLabel: '정상',
    summaryText: '기본 상태',
    recommendation: '정기적인 모니터링을 권장합니다.'
  };
}

// 헤어라인 설명 생성
export function getHairlineDescription(hairline: HairlineType): string {
  switch (hairline) {
    case 'L': return '앞머리선 변화 없음';
    case 'M': return '측두부 후퇴';
    case 'C': return '중앙부 후퇴';
    case 'U': return '말굽형 전반 후퇴';
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
  
  const baspCode = generateBaspCode(answers.hairline, answers.density, answers.vertex);
  const baspResult = getBaspResult(baspCode);
  
  const recommendations = getRecommendations(baspResult.stageLabel, answers.lifestyle);
  
  const disclaimers = [
    '본 도구는 의료 진단이 아닌 참고용입니다.',
    '증상이 지속·악화되면 피부과 전문의 상담을 권장합니다.'
  ];
  
  return {
    baspCode: baspResult.baspCode,
    baspBasic: answers.hairline,
    baspSpecific: baspCode,
    stageNumber: baspResult.stageNumber,
    stageLabel: baspResult.stageLabel,
    summaryText: baspResult.summaryText,
    recommendations,
    disclaimers
  };
}
