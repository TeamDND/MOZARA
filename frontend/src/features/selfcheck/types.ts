export type HairlineType = 'L' | 'M' | 'C' | 'U';  // 기본 패턴
export type HairlineSubType = 0 | 1 | 2 | 3;       // M0~M3, C0~C3, U1~U3
export type VertexLevel = 0 | 1 | 2 | 3;           // V0~V3
export type DensityLevel = 0 | 1 | 2 | 3;          // F0~F3

export interface LifestyleAnswers {
  shedding6m: boolean;              // 6개월간 탈락모 증가 느낌
  familyHistory: boolean;           // 가족력
  sleepHours: 'lt4' | '5to7' | 'ge8';
  smoking: boolean;
  alcohol: 'none' | 'light' | 'heavy';
}

export interface SelfCheckAnswers {
  hairline: HairlineType | null;
  hairlineSubType: HairlineSubType | null;  // M0~M3, C0~C3, U1~U3
  vertex: VertexLevel | null;
  density: DensityLevel | null;
  lifestyle: LifestyleAnswers;
}


export interface BaselineResult {
  baspCode: string;                 // 예: LF1V2, M0F3V1 등
  baspBasic: HairlineType;          // L/M/C/U
  baspSpecific: string;             // 예: LF1V2
  stageNumber: number;              // 0~3 단계
  stageLabel: '정상' | '초기' | '중기' | '심화';
  summaryText: string;
  recommendations: string[];
  disclaimers: string[];
}

export interface SelfCheckStep {
  step: number;
  title: string;
  question: string;
  options: Array<{
    value: string | number;
    label: string;
    description?: string;
  }>;
}
