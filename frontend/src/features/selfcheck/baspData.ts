import { SelfCheckAnswers, BaselineResult, HairlineType, HairlineSubType, VertexLevel, DensityLevel } from './types';

// CSV 파일의 모든 BASP 조합 데이터 (192개)
export const BASP_DATA: Record<string, {
  baspCode: string;
  stageNumber: number;
  stageLabel: '정상' | '초기' | '중기' | '심화';
  summaryText: string;
  recommendation: string;
}> = {
  // L 시리즈 (앞머리선 변화 없음)
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

  // M0 시리즈 (측두부 후퇴 없음)
  'M0': { baspCode: 'M0', stageNumber: 0, stageLabel: '정상', summaryText: '측두부 후퇴 없음 (M0)', recommendation: '기준선 유지: 분기별 동일 각도 기록' },
  'M0F1': { baspCode: 'M0F1', stageNumber: 1, stageLabel: '초기', summaryText: '측두부 후퇴 없음 (M0) + 상부 전반 확산 (F1)', recommendation: '초기 추세확인: 월 1회 표준 촬영 + 생활요인 점검' },
  'M0F2': { baspCode: 'M0F2', stageNumber: 2, stageLabel: '중기', summaryText: '측두부 후퇴 없음 (M0) + 상부 전반 확산 (F2)', recommendation: '경과관리 강화: 2~4주 간격 기록 + 상담 검토(진단 아님)' },
  'M0F3': { baspCode: 'M0F3', stageNumber: 3, stageLabel: '심화', summaryText: '측두부 후퇴 없음 (M0) + 상부 전반 확산 (F3)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'M0V1': { baspCode: 'M0V1', stageNumber: 1, stageLabel: '초기', summaryText: '측두부 후퇴 없음 (M0) + 정수리 희박 (V1)', recommendation: '초기 추세확인: 월 1회 표준 촬영 + 생활요인 점검' },
  'M0V2': { baspCode: 'M0V2', stageNumber: 2, stageLabel: '중기', summaryText: '측두부 후퇴 없음 (M0) + 정수리 희박 (V2)', recommendation: '경과관리 강화: 2~4주 간격 기록 + 상담 검토(진단 아님)' },
  'M0V3': { baspCode: 'M0V3', stageNumber: 3, stageLabel: '심화', summaryText: '측두부 후퇴 없음 (M0) + 정수리 희박 (V3)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'M0F1V1': { baspCode: 'M0F1V1', stageNumber: 1, stageLabel: '초기', summaryText: '측두부 후퇴 없음 (M0) + 상부 전반 확산 (F1) + 정수리 희박 (V1)', recommendation: '초기 추세확인: 월 1회 표준 촬영 + 생활요인 점검' },
  'M0F1V2': { baspCode: 'M0F1V2', stageNumber: 2, stageLabel: '중기', summaryText: '측두부 후퇴 없음 (M0) + 상부 전반 확산 (F1) + 정수리 희박 (V2)', recommendation: '경과관리 강화: 2~4주 간격 기록 + 상담 검토(진단 아님)' },
  'M0F1V3': { baspCode: 'M0F1V3', stageNumber: 3, stageLabel: '심화', summaryText: '측두부 후퇴 없음 (M0) + 상부 전반 확산 (F1) + 정수리 희박 (V3)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'M0F2V1': { baspCode: 'M0F2V1', stageNumber: 2, stageLabel: '중기', summaryText: '측두부 후퇴 없음 (M0) + 상부 전반 확산 (F2) + 정수리 희박 (V1)', recommendation: '경과관리 강화: 2~4주 간격 기록 + 상담 검토(진단 아님)' },
  'M0F2V2': { baspCode: 'M0F2V2', stageNumber: 2, stageLabel: '중기', summaryText: '측두부 후퇴 없음 (M0) + 상부 전반 확산 (F2) + 정수리 희박 (V2)', recommendation: '경과관리 강화: 2~4주 간격 기록 + 상담 검토(진단 아님)' },
  'M0F2V3': { baspCode: 'M0F2V3', stageNumber: 3, stageLabel: '심화', summaryText: '측두부 후퇴 없음 (M0) + 상부 전반 확산 (F2) + 정수리 희박 (V3)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'M0F3V1': { baspCode: 'M0F3V1', stageNumber: 3, stageLabel: '심화', summaryText: '측두부 후퇴 없음 (M0) + 상부 전반 확산 (F3) + 정수리 희박 (V1)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'M0F3V2': { baspCode: 'M0F3V2', stageNumber: 3, stageLabel: '심화', summaryText: '측두부 후퇴 없음 (M0) + 상부 전반 확산 (F3) + 정수리 희박 (V2)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'M0F3V3': { baspCode: 'M0F3V3', stageNumber: 3, stageLabel: '심화', summaryText: '측두부 후퇴 없음 (M0) + 상부 전반 확산 (F3) + 정수리 희박 (V3)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },

  // M1 시리즈 (측두부 후퇴 M1)
  'M1': { baspCode: 'M1', stageNumber: 1, stageLabel: '초기', summaryText: '측두부 후퇴 (M1)', recommendation: '초기 추세확인: 월 1회 표준 촬영 + 생활요인 점검' },
  'M1F1': { baspCode: 'M1F1', stageNumber: 1, stageLabel: '초기', summaryText: '측두부 후퇴 (M1) + 상부 전반 확산 (F1)', recommendation: '초기 추세확인: 월 1회 표준 촬영 + 생활요인 점검' },
  'M1F2': { baspCode: 'M1F2', stageNumber: 2, stageLabel: '중기', summaryText: '측두부 후퇴 (M1) + 상부 전반 확산 (F2)', recommendation: '경과관리 강화: 2~4주 간격 기록 + 상담 검토(진단 아님)' },
  'M1F3': { baspCode: 'M1F3', stageNumber: 3, stageLabel: '심화', summaryText: '측두부 후퇴 (M1) + 상부 전반 확산 (F3)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'M1V1': { baspCode: 'M1V1', stageNumber: 1, stageLabel: '초기', summaryText: '측두부 후퇴 (M1) + 정수리 희박 (V1)', recommendation: '초기 추세확인: 월 1회 표준 촬영 + 생활요인 점검' },
  'M1V2': { baspCode: 'M1V2', stageNumber: 2, stageLabel: '중기', summaryText: '측두부 후퇴 (M1) + 정수리 희박 (V2)', recommendation: '경과관리 강화: 2~4주 간격 기록 + 상담 검토(진단 아님)' },
  'M1V3': { baspCode: 'M1V3', stageNumber: 3, stageLabel: '심화', summaryText: '측두부 후퇴 (M1) + 정수리 희박 (V3)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'M1F1V1': { baspCode: 'M1F1V1', stageNumber: 1, stageLabel: '초기', summaryText: '측두부 후퇴 (M1) + 상부 전반 확산 (F1) + 정수리 희박 (V1)', recommendation: '초기 추세확인: 월 1회 표준 촬영 + 생활요인 점검' },
  'M1F1V2': { baspCode: 'M1F1V2', stageNumber: 2, stageLabel: '중기', summaryText: '측두부 후퇴 (M1) + 상부 전반 확산 (F1) + 정수리 희박 (V2)', recommendation: '경과관리 강화: 2~4주 간격 기록 + 상담 검토(진단 아님)' },
  'M1F1V3': { baspCode: 'M1F1V3', stageNumber: 3, stageLabel: '심화', summaryText: '측두부 후퇴 (M1) + 상부 전반 확산 (F1) + 정수리 희박 (V3)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'M1F2V1': { baspCode: 'M1F2V1', stageNumber: 2, stageLabel: '중기', summaryText: '측두부 후퇴 (M1) + 상부 전반 확산 (F2) + 정수리 희박 (V1)', recommendation: '경과관리 강화: 2~4주 간격 기록 + 상담 검토(진단 아님)' },
  'M1F2V2': { baspCode: 'M1F2V2', stageNumber: 2, stageLabel: '중기', summaryText: '측두부 후퇴 (M1) + 상부 전반 확산 (F2) + 정수리 희박 (V2)', recommendation: '경과관리 강화: 2~4주 간격 기록 + 상담 검토(진단 아님)' },
  'M1F2V3': { baspCode: 'M1F2V3', stageNumber: 3, stageLabel: '심화', summaryText: '측두부 후퇴 (M1) + 상부 전반 확산 (F2) + 정수리 희박 (V3)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'M1F3V1': { baspCode: 'M1F3V1', stageNumber: 3, stageLabel: '심화', summaryText: '측두부 후퇴 (M1) + 상부 전반 확산 (F3) + 정수리 희박 (V1)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'M1F3V2': { baspCode: 'M1F3V2', stageNumber: 3, stageLabel: '심화', summaryText: '측두부 후퇴 (M1) + 상부 전반 확산 (F3) + 정수리 희박 (V2)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'M1F3V3': { baspCode: 'M1F3V3', stageNumber: 3, stageLabel: '심화', summaryText: '측두부 후퇴 (M1) + 상부 전반 확산 (F3) + 정수리 희박 (V3)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },

  // C0 시리즈 (중앙부 후퇴 없음)
  'C0': { baspCode: 'C0', stageNumber: 0, stageLabel: '정상', summaryText: '중앙부 후퇴 없음 (C0)', recommendation: '기준선 유지: 분기별 동일 각도 기록' },
  'C0F1': { baspCode: 'C0F1', stageNumber: 1, stageLabel: '초기', summaryText: '중앙부 후퇴 없음 (C0) + 상부 전반 확산 (F1)', recommendation: '초기 추세확인: 월 1회 표준 촬영 + 생활요인 점검' },
  'C0F2': { baspCode: 'C0F2', stageNumber: 2, stageLabel: '중기', summaryText: '중앙부 후퇴 없음 (C0) + 상부 전반 확산 (F2)', recommendation: '경과관리 강화: 2~4주 간격 기록 + 상담 검토(진단 아님)' },
  'C0F3': { baspCode: 'C0F3', stageNumber: 3, stageLabel: '심화', summaryText: '중앙부 후퇴 없음 (C0) + 상부 전반 확산 (F3)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'C0V1': { baspCode: 'C0V1', stageNumber: 1, stageLabel: '초기', summaryText: '중앙부 후퇴 없음 (C0) + 정수리 희박 (V1)', recommendation: '초기 추세확인: 월 1회 표준 촬영 + 생활요인 점검' },
  'C0V2': { baspCode: 'C0V2', stageNumber: 2, stageLabel: '중기', summaryText: '중앙부 후퇴 없음 (C0) + 정수리 희박 (V2)', recommendation: '경과관리 강화: 2~4주 간격 기록 + 상담 검토(진단 아님)' },
  'C0V3': { baspCode: 'C0V3', stageNumber: 3, stageLabel: '심화', summaryText: '중앙부 후퇴 없음 (C0) + 정수리 희박 (V3)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'C0F1V1': { baspCode: 'C0F1V1', stageNumber: 1, stageLabel: '초기', summaryText: '중앙부 후퇴 없음 (C0) + 상부 전반 확산 (F1) + 정수리 희박 (V1)', recommendation: '초기 추세확인: 월 1회 표준 촬영 + 생활요인 점검' },
  'C0F1V2': { baspCode: 'C0F1V2', stageNumber: 2, stageLabel: '중기', summaryText: '중앙부 후퇴 없음 (C0) + 상부 전반 확산 (F1) + 정수리 희박 (V2)', recommendation: '경과관리 강화: 2~4주 간격 기록 + 상담 검토(진단 아님)' },
  'C0F1V3': { baspCode: 'C0F1V3', stageNumber: 3, stageLabel: '심화', summaryText: '중앙부 후퇴 없음 (C0) + 상부 전반 확산 (F1) + 정수리 희박 (V3)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'C0F2V1': { baspCode: 'C0F2V1', stageNumber: 2, stageLabel: '중기', summaryText: '중앙부 후퇴 없음 (C0) + 상부 전반 확산 (F2) + 정수리 희박 (V1)', recommendation: '경과관리 강화: 2~4주 간격 기록 + 상담 검토(진단 아님)' },
  'C0F2V2': { baspCode: 'C0F2V2', stageNumber: 2, stageLabel: '중기', summaryText: '중앙부 후퇴 없음 (C0) + 상부 전반 확산 (F2) + 정수리 희박 (V2)', recommendation: '경과관리 강화: 2~4주 간격 기록 + 상담 검토(진단 아님)' },
  'C0F2V3': { baspCode: 'C0F2V3', stageNumber: 3, stageLabel: '심화', summaryText: '중앙부 후퇴 없음 (C0) + 상부 전반 확산 (F2) + 정수리 희박 (V3)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'C0F3V1': { baspCode: 'C0F3V1', stageNumber: 3, stageLabel: '심화', summaryText: '중앙부 후퇴 없음 (C0) + 상부 전반 확산 (F3) + 정수리 희박 (V1)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'C0F3V2': { baspCode: 'C0F3V2', stageNumber: 3, stageLabel: '심화', summaryText: '중앙부 후퇴 없음 (C0) + 상부 전반 확산 (F3) + 정수리 희박 (V2)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'C0F3V3': { baspCode: 'C0F3V3', stageNumber: 3, stageLabel: '심화', summaryText: '중앙부 후퇴 없음 (C0) + 상부 전반 확산 (F3) + 정수리 희박 (V3)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },

  // U1 시리즈 (말굽형 전반 후퇴 U1)
  'U1': { baspCode: 'U1', stageNumber: 2, stageLabel: '중기', summaryText: '말굽형 전반 후퇴 (U1)', recommendation: '경과관리 강화: 2~4주 간격 기록 + 상담 검토(진단 아님)' },
  'U1F1': { baspCode: 'U1F1', stageNumber: 2, stageLabel: '중기', summaryText: '말굽형 전반 후퇴 (U1) + 상부 전반 확산 (F1)', recommendation: '경과관리 강화: 2~4주 간격 기록 + 상담 검토(진단 아님)' },
  'U1F2': { baspCode: 'U1F2', stageNumber: 2, stageLabel: '중기', summaryText: '말굽형 전반 후퇴 (U1) + 상부 전반 확산 (F2)', recommendation: '경과관리 강화: 2~4주 간격 기록 + 상담 검토(진단 아님)' },
  'U1F3': { baspCode: 'U1F3', stageNumber: 3, stageLabel: '심화', summaryText: '말굽형 전반 후퇴 (U1) + 상부 전반 확산 (F3)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'U1V1': { baspCode: 'U1V1', stageNumber: 2, stageLabel: '중기', summaryText: '말굽형 전반 후퇴 (U1) + 정수리 희박 (V1)', recommendation: '경과관리 강화: 2~4주 간격 기록 + 상담 검토(진단 아님)' },
  'U1V2': { baspCode: 'U1V2', stageNumber: 2, stageLabel: '중기', summaryText: '말굽형 전반 후퇴 (U1) + 정수리 희박 (V2)', recommendation: '경과관리 강화: 2~4주 간격 기록 + 상담 검토(진단 아님)' },
  'U1V3': { baspCode: 'U1V3', stageNumber: 3, stageLabel: '심화', summaryText: '말굽형 전반 후퇴 (U1) + 정수리 희박 (V3)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'U1F1V1': { baspCode: 'U1F1V1', stageNumber: 2, stageLabel: '중기', summaryText: '말굽형 전반 후퇴 (U1) + 상부 전반 확산 (F1) + 정수리 희박 (V1)', recommendation: '경과관리 강화: 2~4주 간격 기록 + 상담 검토(진단 아님)' },
  'U1F1V2': { baspCode: 'U1F1V2', stageNumber: 2, stageLabel: '중기', summaryText: '말굽형 전반 후퇴 (U1) + 상부 전반 확산 (F1) + 정수리 희박 (V2)', recommendation: '경과관리 강화: 2~4주 간격 기록 + 상담 검토(진단 아님)' },
  'U1F1V3': { baspCode: 'U1F1V3', stageNumber: 3, stageLabel: '심화', summaryText: '말굽형 전반 후퇴 (U1) + 상부 전반 확산 (F1) + 정수리 희박 (V3)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'U1F2V1': { baspCode: 'U1F2V1', stageNumber: 2, stageLabel: '중기', summaryText: '말굽형 전반 후퇴 (U1) + 상부 전반 확산 (F2) + 정수리 희박 (V1)', recommendation: '경과관리 강화: 2~4주 간격 기록 + 상담 검토(진단 아님)' },
  'U1F2V2': { baspCode: 'U1F2V2', stageNumber: 2, stageLabel: '중기', summaryText: '말굽형 전반 후퇴 (U1) + 상부 전반 확산 (F2) + 정수리 희박 (V2)', recommendation: '경과관리 강화: 2~4주 간격 기록 + 상담 검토(진단 아님)' },
  'U1F2V3': { baspCode: 'U1F2V3', stageNumber: 3, stageLabel: '심화', summaryText: '말굽형 전반 후퇴 (U1) + 상부 전반 확산 (F2) + 정수리 희박 (V3)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'U1F3V1': { baspCode: 'U1F3V1', stageNumber: 3, stageLabel: '심화', summaryText: '말굽형 전반 후퇴 (U1) + 상부 전반 확산 (F3) + 정수리 희박 (V1)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'U1F3V2': { baspCode: 'U1F3V2', stageNumber: 3, stageLabel: '심화', summaryText: '말굽형 전반 후퇴 (U1) + 상부 전반 확산 (F3) + 정수리 희박 (V2)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'U1F3V3': { baspCode: 'U1F3V3', stageNumber: 3, stageLabel: '심화', summaryText: '말굽형 전반 후퇴 (U1) + 상부 전반 확산 (F3) + 정수리 희박 (V3)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },

  // U2 시리즈 (말굽형 전반 후퇴 U2)
  'U2': { baspCode: 'U2', stageNumber: 3, stageLabel: '심화', summaryText: '말굽형 전반 후퇴 (U2)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'U2F1': { baspCode: 'U2F1', stageNumber: 3, stageLabel: '심화', summaryText: '말굽형 전반 후퇴 (U2) + 상부 전반 확산 (F1)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'U2F2': { baspCode: 'U2F2', stageNumber: 3, stageLabel: '심화', summaryText: '말굽형 전반 후퇴 (U2) + 상부 전반 확산 (F2)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'U2F3': { baspCode: 'U2F3', stageNumber: 3, stageLabel: '심화', summaryText: '말굽형 전반 후퇴 (U2) + 상부 전반 확산 (F3)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'U2V1': { baspCode: 'U2V1', stageNumber: 3, stageLabel: '심화', summaryText: '말굽형 전반 후퇴 (U2) + 정수리 희박 (V1)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'U2V2': { baspCode: 'U2V2', stageNumber: 3, stageLabel: '심화', summaryText: '말굽형 전반 후퇴 (U2) + 정수리 희박 (V2)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'U2V3': { baspCode: 'U2V3', stageNumber: 3, stageLabel: '심화', summaryText: '말굽형 전반 후퇴 (U2) + 정수리 희박 (V3)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'U2F1V1': { baspCode: 'U2F1V1', stageNumber: 3, stageLabel: '심화', summaryText: '말굽형 전반 후퇴 (U2) + 상부 전반 확산 (F1) + 정수리 희박 (V1)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'U2F1V2': { baspCode: 'U2F1V2', stageNumber: 3, stageLabel: '심화', summaryText: '말굽형 전반 후퇴 (U2) + 상부 전반 확산 (F1) + 정수리 희박 (V2)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'U2F1V3': { baspCode: 'U2F1V3', stageNumber: 3, stageLabel: '심화', summaryText: '말굽형 전반 후퇴 (U2) + 상부 전반 확산 (F1) + 정수리 희박 (V3)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'U2F2V1': { baspCode: 'U2F2V1', stageNumber: 3, stageLabel: '심화', summaryText: '말굽형 전반 후퇴 (U2) + 상부 전반 확산 (F2) + 정수리 희박 (V1)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'U2F2V2': { baspCode: 'U2F2V2', stageNumber: 3, stageLabel: '심화', summaryText: '말굽형 전반 후퇴 (U2) + 상부 전반 확산 (F2) + 정수리 희박 (V2)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'U2F2V3': { baspCode: 'U2F2V3', stageNumber: 3, stageLabel: '심화', summaryText: '말굽형 전반 후퇴 (U2) + 상부 전반 확산 (F2) + 정수리 희박 (V3)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'U2F3V1': { baspCode: 'U2F3V1', stageNumber: 3, stageLabel: '심화', summaryText: '말굽형 전반 후퇴 (U2) + 상부 전반 확산 (F3) + 정수리 희박 (V1)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'U2F3V2': { baspCode: 'U2F3V2', stageNumber: 3, stageLabel: '심화', summaryText: '말굽형 전반 후퇴 (U2) + 상부 전반 확산 (F3) + 정수리 희박 (V2)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'U2F3V3': { baspCode: 'U2F3V3', stageNumber: 3, stageLabel: '심화', summaryText: '말굽형 전반 후퇴 (U2) + 상부 전반 확산 (F3) + 정수리 희박 (V3)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },

  // U3 시리즈 (말굽형 전반 후퇴 U3)
  'U3': { baspCode: 'U3', stageNumber: 3, stageLabel: '심화', summaryText: '말굽형 전반 후퇴 (U3)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'U3F1': { baspCode: 'U3F1', stageNumber: 3, stageLabel: '심화', summaryText: '말굽형 전반 후퇴 (U3) + 상부 전반 확산 (F1)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'U3F2': { baspCode: 'U3F2', stageNumber: 3, stageLabel: '심화', summaryText: '말굽형 전반 후퇴 (U3) + 상부 전반 확산 (F2)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'U3F3': { baspCode: 'U3F3', stageNumber: 3, stageLabel: '심화', summaryText: '말굽형 전반 후퇴 (U3) + 상부 전반 확산 (F3)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'U3V1': { baspCode: 'U3V1', stageNumber: 3, stageLabel: '심화', summaryText: '말굽형 전반 후퇴 (U3) + 정수리 희박 (V1)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'U3V2': { baspCode: 'U3V2', stageNumber: 3, stageLabel: '심화', summaryText: '말굽형 전반 후퇴 (U3) + 정수리 희박 (V2)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'U3V3': { baspCode: 'U3V3', stageNumber: 3, stageLabel: '심화', summaryText: '말굽형 전반 후퇴 (U3) + 정수리 희박 (V3)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'U3F1V1': { baspCode: 'U3F1V1', stageNumber: 3, stageLabel: '심화', summaryText: '말굽형 전반 후퇴 (U3) + 상부 전반 확산 (F1) + 정수리 희박 (V1)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'U3F1V2': { baspCode: 'U3F1V2', stageNumber: 3, stageLabel: '심화', summaryText: '말굽형 전반 후퇴 (U3) + 상부 전반 확산 (F1) + 정수리 희박 (V2)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'U3F1V3': { baspCode: 'U3F1V3', stageNumber: 3, stageLabel: '심화', summaryText: '말굽형 전반 후퇴 (U3) + 상부 전반 확산 (F1) + 정수리 희박 (V3)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'U3F2V1': { baspCode: 'U3F2V1', stageNumber: 3, stageLabel: '심화', summaryText: '말굽형 전반 후퇴 (U3) + 상부 전반 확산 (F2) + 정수리 희박 (V1)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'U3F2V2': { baspCode: 'U3F2V2', stageNumber: 3, stageLabel: '심화', summaryText: '말굽형 전반 후퇴 (U3) + 상부 전반 확산 (F2) + 정수리 희박 (V2)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'U3F2V3': { baspCode: 'U3F2V3', stageNumber: 3, stageLabel: '심화', summaryText: '말굽형 전반 후퇴 (U3) + 상부 전반 확산 (F2) + 정수리 희박 (V3)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'U3F3V1': { baspCode: 'U3F3V1', stageNumber: 3, stageLabel: '심화', summaryText: '말굽형 전반 후퇴 (U3) + 상부 전반 확산 (F3) + 정수리 희박 (V1)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'U3F3V2': { baspCode: 'U3F3V2', stageNumber: 3, stageLabel: '심화', summaryText: '말굽형 전반 후퇴 (U3) + 상부 전반 확산 (F3) + 정수리 희박 (V2)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' },
  'U3F3V3': { baspCode: 'U3F3V3', stageNumber: 3, stageLabel: '심화', summaryText: '말굽형 전반 후퇴 (U3) + 상부 전반 확산 (F3) + 정수리 희박 (V3)', recommendation: '집중 관리: 2주 이하 간격 기록 + 전문가 상담 권유(진단 아님)' }
};

// BASP 코드 생성 함수 (basp_new.md 규칙에 따라)
export function generateBaspCode(
  hairline: HairlineType, 
  hairlineSubType: HairlineSubType | null,
  density: DensityLevel, 
  vertex: VertexLevel
): string {
  let baseCode = '';
  
  // BA 코드 생성 (Basic Type)
  if (hairline === 'L') {
    baseCode = 'L'; // L형은 단계 없음
  } else if (hairline === 'M') {
    baseCode = `M${hairlineSubType || 0}`; // M0~M3
  } else if (hairline === 'C') {
    baseCode = `C${hairlineSubType || 0}`; // C0~C3
  } else if (hairline === 'U') {
    // U 타입은 반드시 숫자가 필요 (U1, U2, U3)
    const uSubType = hairlineSubType !== null ? hairlineSubType : 1;
    baseCode = `U${uSubType}`;
  }
  
  // SP 코드 생성 (Specific Type) - V와 F는 1~3단계만 존재 (0단계는 코드에 포함되지 않음)
  const densityCode = density === 0 ? '' : `F${density}`;
  const vertexCode = vertex === 0 ? '' : `V${vertex}`;
  
  return `${baseCode}${densityCode}${vertexCode}`;
}

// BASP 결과 조회 함수
export function getBaspResult(baspCode: string) {
  const data = BASP_DATA[baspCode];
  if (data) {
    return data;
  }
  
  // 기본값 반환 (baspCode가 존재하지 않는 경우)
  return {
    baspCode: baspCode,
    stageNumber: 0,
    stageLabel: '정상' as const,
    summaryText: '기본 상태',
    recommendation: '정기적인 모니터링을 권장합니다.'
  };
}
