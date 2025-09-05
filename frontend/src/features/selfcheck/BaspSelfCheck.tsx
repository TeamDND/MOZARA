import React, { useState } from 'react';
import { SelfCheckAnswers, BaselineResult } from './types';
import { computeResult } from './logic';
import { baspApi } from '../../api/baspApi';
import HairlineSelector from './components/HairlineSelector';
import VertexSelector from './components/VertexSelector';
import DensitySelector from './components/DensitySelector';
import LifestyleForm from './components/LifestyleForm';

const BaspSelfCheck: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<SelfCheckAnswers>({
    hairline: null,
    vertex: null,
    density: null,
    lifestyle: {
      shedding6m: false,
      familyHistory: false,
      sleepHours: '5to7',
      smoking: false,
      alcohol: 'none'
    }
  });
  const [result, setResult] = useState<BaselineResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const steps = [
    {
      title: '헤어라인(앞이마) 선택',
      question: '당신의 앞이마 헤어라인은 어떤가요?',
      component: (
        <HairlineSelector
          value={answers.hairline}
          onChange={(value) => setAnswers({ ...answers, hairline: value })}
        />
      )
    },
    {
      title: '정수리(Vertex) 상태',
      question: '정수리 부위의 두피 노출 정도를 선택해 주세요.',
      component: (
        <VertexSelector
          value={answers.vertex}
          onChange={(value) => setAnswers({ ...answers, vertex: value })}
        />
      )
    },
    {
      title: '전체 밀도(Density)',
      question: '전체적으로 모발 밀도는 어떤가요?',
      component: (
        <DensitySelector
          value={answers.density}
          onChange={(value) => setAnswers({ ...answers, density: value })}
        />
      )
    },
    {
      title: '생활 습관(Lifestyle)',
      question: '다음 질문들에 답해주세요.',
      component: (
        <LifestyleForm
          value={answers.lifestyle}
          onChange={(value) => setAnswers({ ...answers, lifestyle: value })}
        />
      )
    }
  ];

  const isStepComplete = (stepIndex: number): boolean => {
    switch (stepIndex) {
      case 0: return answers.hairline !== null;
      case 1: return answers.vertex !== null;
      case 2: return answers.density !== null;
      case 3: return true; // 생활습관은 기본값이 있음
      default: return false;
    }
  };

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // 마지막 단계에서 결과 계산
      setIsLoading(true);
      setError(null);
      
      try {
        // 먼저 API를 시도하고, 실패하면 로컬 계산으로 폴백
        try {
          const apiResult = await baspApi.evaluate(answers);
          setResult(apiResult);
        } catch (apiError) {
          console.warn('API 호출 실패, 로컬 계산으로 폴백:', apiError);
          const localResult = computeResult(answers);
          setResult(localResult);
        }
      } catch (error) {
        console.error('결과 계산 중 오류:', error);
        setError('진단 중 오류가 발생했습니다. 다시 시도해주세요.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setResult(null);
    setError(null);
    setIsLoading(false);
    setAnswers({
      hairline: null,
      vertex: null,
      density: null,
      lifestyle: {
        shedding6m: false,
        familyHistory: false,
        sleepHours: '5to7',
        smoking: false,
        alcohol: 'none'
      }
    });
  };

  if (result) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">BASP 탈모 진단 결과</h1>
            <p className="text-gray-600">의료 진단이 아닌 참고용입니다</p>
          </div>

          {/* 결과 요약 */}
          <div className="bg-blue-50 rounded-xl p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">진단 결과</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <span className="text-sm text-gray-600">BASP 기본형:</span>
                <span className="ml-2 font-semibold">{result.baspBasic}</span>
              </div>
              <div>
                <span className="text-sm text-gray-600">정수리 특이:</span>
                <span className="ml-2 font-semibold">{result.baspSpecific}</span>
              </div>
            </div>
            <div className="mb-4">
              <span className="text-sm text-gray-600">진행 정도:</span>
              <span className={`ml-2 font-bold text-lg ${
                result.stageLabel === '정상' ? 'text-green-600' :
                result.stageLabel === '초기' ? 'text-yellow-600' :
                result.stageLabel === '중등도' ? 'text-orange-600' : 'text-red-600'
              }`}>
                {result.stageLabel}
              </span>
            </div>
            <p className="text-gray-700">{result.summaryText}</p>
          </div>

          {/* 권장사항 */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">권장사항</h3>
            <ul className="space-y-2">
              {result.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span className="text-gray-700">{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 디스클레이머 */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8">
            <h4 className="font-semibold text-yellow-800 mb-2">중요 안내</h4>
            <ul className="space-y-1">
              {result.disclaimers.map((disclaimer, index) => (
                <li key={index} className="text-yellow-700 text-sm">
                  {disclaimer}
                </li>
              ))}
            </ul>
          </div>

          {/* 액션 버튼 */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleRestart}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              다시 진단하기
            </button>
            <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              전문의 상담
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        {/* 진행바 */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <span className="text-sm text-gray-600">단계 {currentStep + 1} / {steps.length}</span>
            <span className="text-sm text-gray-600">{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* 질문 */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">{steps[currentStep].title}</h1>
          <p className="text-gray-600">{steps[currentStep].question}</p>
        </div>

        {/* 컴포넌트 */}
        <div className="mb-8">
          {steps[currentStep].component}
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* 네비게이션 */}
        <div className="flex justify-between">
          <button
            onClick={handlePrev}
            disabled={currentStep === 0 || isLoading}
            className={`px-6 py-3 rounded-lg transition-colors ${
              currentStep === 0 || isLoading
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            이전
          </button>
          <button
            onClick={handleNext}
            disabled={!isStepComplete(currentStep) || isLoading}
            className={`px-6 py-3 rounded-lg transition-colors ${
              isStepComplete(currentStep) && !isLoading
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            {isLoading ? '처리 중...' : currentStep === steps.length - 1 ? '결과 보기' : '다음'}
          </button>
        </div>

        {/* 디스클레이머 */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            본 도구는 의료 진단이 아닌 참고용입니다. 증상이 지속·악화되면 전문의 상담을 권장합니다.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BaspSelfCheck;
