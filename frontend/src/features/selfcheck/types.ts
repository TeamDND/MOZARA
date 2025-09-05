export type HairlineType = 'A' | 'M' | 'C' | 'U';
export type VertexLevel = 0 | 1 | 2 | 3;   // V0~V3
export type DensityLevel = 0 | 1 | 2 | 3;  // 0~3

export interface LifestyleAnswers {
  shedding6m: boolean;              // 6개월간 탈락모 증가 느낌
  familyHistory: boolean;           // 가족력
  sleepHours: 'lt4' | '5to7' | 'ge8';
  smoking: boolean;
  alcohol: 'none' | 'light' | 'heavy';
}

export interface SelfCheckAnswers {
  hairline: HairlineType | null;
  vertex: VertexLevel | null;
  density: DensityLevel | null;
  lifestyle: LifestyleAnswers;
}

export interface BaselineResult {
  baspBasic: HairlineType;          // A/M/C/U
  baspSpecific: `V${VertexLevel}`;  // V0~V3
  stageLabel: '정상' | '초기' | '중등도' | '진행성';
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
