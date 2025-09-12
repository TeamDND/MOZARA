import { SelfCheckAnswers, BaselineResult } from '../features/selfcheck/types';

const API_BASE_URL = 'http://localhost:8080/api/basp';

export interface BaspApiRequest {
  hairline: string;
  vertex: number;
  density: number;
  lifestyle: {
    shedding6m: boolean;
    familyHistory: boolean;
    sleepHours: string;
    smoking: boolean;
    alcohol: string;
  };
}

export interface BaspApiResponse {
  baspCode: string;
  baspBasic: string;
  baspSpecific: string;
  stageNumber: number;
  stageLabel: string;
  summaryText: string;
  recommendations: string[];
  disclaimers: string[];
  rawScore: number;
  lifestyleRisk: number;
}

export const baspApi = {
  async evaluate(answers: SelfCheckAnswers): Promise<BaselineResult> {
    if (!answers.hairline || answers.vertex === null || answers.density === null) {
      throw new Error('필수 항목이 선택되지 않았습니다.');
    }

    const request: BaspApiRequest = {
      hairline: answers.hairline,
      vertex: answers.vertex,
      density: answers.density,
      lifestyle: {
        shedding6m: answers.lifestyle.shedding6m,
        familyHistory: answers.lifestyle.familyHistory,
        sleepHours: answers.lifestyle.sleepHours,
        smoking: answers.lifestyle.smoking,
        alcohol: answers.lifestyle.alcohol
      }
    };

    try {
      const response = await fetch(`${API_BASE_URL}/evaluate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`API 호출 실패: ${response.status}`);
      }

      const data: BaspApiResponse = await response.json();
      console.log('API 응답 데이터:', data);
      
      return {
        baspCode: data.baspCode,
        baspBasic: data.baspBasic as any,
        baspSpecific: data.baspSpecific,
        stageNumber: data.stageNumber,
        stageLabel: data.stageLabel as any,
        summaryText: data.summaryText,
        recommendations: data.recommendations,
        disclaimers: data.disclaimers,
      };
    } catch (error) {
      console.error('BASP API 호출 중 오류:', error);
      throw error;
    }
  },

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return response.ok;
    } catch (error) {
      console.error('Health check 실패:', error);
      return false;
    }
  }
};
