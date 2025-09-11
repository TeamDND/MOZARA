import React, { useState } from 'react';
import { SelfCheckAnswers, BaselineResult } from './types';
import { computeResult } from './logic';
import { baspApi } from '../../api/baspApi';
import HairlineSelector from './components/HairlineSelector';
import HairlineSubTypeSelector from './components/HairlineSubTypeSelector';
import VertexSelector from './components/VertexSelector';
import DensitySelector from './components/DensitySelector';
import LifestyleForm from './components/LifestyleForm';
import Header from '../../page/Header';
import Footer from '../../page/Footer';

const BaspSelfCheck: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<SelfCheckAnswers>({
    hairline: null,
    hairlineSubType: null,
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
      title: '헤어라인 패턴 선택',
      question: '당신의 앞이마 헤어라인은 어떤 패턴인가요?',
      component: (
        <HairlineSelector
          value={answers.hairline}
          onChange={(value) => setAnswers({ ...answers, hairline: value, hairlineSubType: null })}
        />
      )
    },
    ...(answers.hairline && ['M', 'C', 'U'].includes(answers.hairline) ? [{
      title: '헤어라인 세부 정도',
      question: `${answers.hairline === 'M' ? '측두부' : answers.hairline === 'C' ? '중앙부' : '말굽형'} 후퇴 정도는?`,
      component: (
        <HairlineSubTypeSelector
          value={answers.hairlineSubType}
          onChange={(value) => setAnswers({ ...answers, hairlineSubType: value })}
          hairlineType={answers.hairline as 'M' | 'C' | 'U'}
        />
      )
    }] : []),
    {
      title: '상부 전반 확산',
      question: '상부 전반적인 모발 밀도는 어떤가요?',
      component: (
        <DensitySelector
          value={answers.density}
          onChange={(value) => setAnswers({ ...answers, density: value })}
        />
      )
    },
    {
      title: '정수리 희박',
      question: '정수리 부위의 모발 밀도는 어떤가요?',
      component: (
        <VertexSelector
          value={answers.vertex}
          onChange={(value) => setAnswers({ ...answers, vertex: value })}
        />
      )
    },
    {
      title: '생활 습관',
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
    const dynamicSteps = steps.length;
    let currentStepIndex = 0;

    // 헤어라인 패턴 선택
    if (stepIndex === currentStepIndex++) {
      return answers.hairline !== null;
    }

    // 헤어라인 세부 정도 (M, C, U인 경우만)
    if (answers.hairline && ['M', 'C', 'U'].includes(answers.hairline)) {
      if (stepIndex === currentStepIndex++) {
        return answers.hairlineSubType !== null;
      }
    }

    // 상부 전반 확산
    if (stepIndex === currentStepIndex++) {
      return answers.density !== null;
    }

    // 정수리 희박
    if (stepIndex === currentStepIndex++) {
      return answers.vertex !== null;
    }

    // 생활습관
    if (stepIndex === currentStepIndex++) {
      return true; // 기본값이 있음
    }

    return false;
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
          console.log('API 결과:', apiResult);
          console.log('RAG 가이드:', apiResult?.ragGuide);
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
      hairlineSubType: null,
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
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-6xl mx-auto px-4 py-8 pt-20">
          {/* 레포트 헤더 */}
          <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold text-gray-800 mb-2">BASP 기준표 기반 탈모 추정 레포트</h1>
              <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 mb-4">
                <p className="text-yellow-800 font-semibold">
                  ⚠️ 어디까지나 추정 결과입니다. 정확한 진단은 전문의 상담이 필요합니다.
                </p>
              </div>
              <div className="mt-4 text-sm text-gray-500">
                진단일: {new Date().toLocaleDateString('ko-KR')} | 레포트 번호: BASP-{Date.now().toString().slice(-6)}
              </div>
            </div>

            {/* 회원정보 (더미) */}
            <div className="bg-gray-50 rounded-xl p-6 mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">회원 정보</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <span className="text-sm text-gray-600">이름:</span>
                  <span className="ml-2 font-semibold">김모자</span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">나이:</span>
                  <span className="ml-2 font-semibold">32세</span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">성별:</span>
                  <span className="ml-2 font-semibold">남성</span>
                </div>
                <div>
                  <span className="text-sm text-gray-600">회원번호:</span>
                  <span className="ml-2 font-semibold">MZ-2024-001</span>
                </div>
              </div>
            </div>

            {/* BASP 진단 결과 */}
            <div className="bg-blue-50 rounded-xl p-6 mb-8">
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">BASP 기준표 진단 결과</h2>
                <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3 mb-4">
                  <p className="text-yellow-800 font-semibold text-sm">
                    ⚠️ 어디까지나 추정 결과입니다. 정확한 진단은 전문의 상담이 필요합니다.
                  </p>
                </div>
              </div>

              {/* BASP 기준표 결과 */}
              <div className="bg-white rounded-lg p-6 mb-6 border-2 border-blue-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-6 text-center">BASP 분류 결과</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-blue-600 mb-3">{result.baspCode}</div>
                    <div className="text-lg text-gray-600 font-medium">BASP 코드</div>
                    <span className="font-semibold text-blue-600 text-lg">
                      {result.baspBasic} {result.baspSpecific}
                    </span>
                    <div className="text-sm text-gray-500 mt-1">정확한 분류 코드</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-5xl font-bold mb-3 ${result.stageLabel === '정상' ? 'text-green-600' :
                        result.stageLabel === '초기' ? 'text-yellow-600' :
                          result.stageLabel === '중기' ? 'text-orange-600' : 'text-red-600'
                      }`}>
                      {result.stageLabel}
                    </div>
                    <div className="text-lg text-gray-600 font-medium">4단계 분류</div>
                    <div className="text-sm text-gray-500 mt-1">정상/초기/중기/심화</div>
                  </div>
                </div>

                {/* 설문 응답 기반 BASP 코드 결정 요소 */}
                <div className="bg-blue-50 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-gray-800 mb-3">설문 응답 기반 BASP 코드 결정 요소</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <span className="text-sm text-gray-600">BASP 코드:</span>
                        <span className="font-semibold text-blue-600 text-lg">
                          "{result.baspBasic} / {result.baspSpecific}"
                          ({answers.hairline === 'L' ? '정상 이마선' :
                            answers.hairline === 'M' ? '측두부 후퇴' :
                              answers.hairline === 'C' ? '중앙부 후퇴' :
                                answers.hairline === 'U' ? '말굽형 후퇴' : ''} / {answers.density === 0 && answers.vertex === 0 ? '정상' :
                                  answers.density === 0 && (answers.vertex ?? 0) > 0 ? '정수리 희박' :
                                    (answers.density ?? 0) > 0 && answers.vertex === 0 ? '상부 전반 확산' :
                                      (answers.density ?? 0) > 0 && (answers.vertex ?? 0) > 0 ? '상부 전반 확산 + 정수리 희박' : '정상'})
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    <div className="space-y-2">
                      <div className="text-sm text-gray-600">
                        <strong>헤어라인 패턴:</strong> {answers.hairline === 'L' ? '정상에 가까운 직선형' :
                          answers.hairline === 'M' ? '양측이 파고든 M자형' :
                            answers.hairline === 'C' ? '곡선형(C자) 후퇴' :
                              answers.hairline === 'U' ? '전체적으로 크게 U자형 후퇴' : ''}
                      </div>
                      <div className="text-sm text-gray-600">
                        <strong>후퇴 정도:</strong> {answers.hairline === 'L' ? '해당 없음' :
                          answers.hairlineSubType === 0 ? '경도 (손가락 1개 이하 깊이)' :
                            answers.hairlineSubType === 1 ? '경도 (손가락 1개 이하 깊이)' :
                              answers.hairlineSubType === 2 ? '중등도 (손가락 1~2개 깊이)' :
                                answers.hairlineSubType === 3 ? '중증 (손가락 2개 이상, 두드러진 후퇴)' : ''}
                      </div>
                      <div className="text-sm text-gray-600">
                        <strong>상부 전반 확산:</strong> {(answers.density ?? 0) === 0 ? '정상' :
                          (answers.density ?? 0) === 1 ? '확대 시 보이는 분산 탈모' :
                            (answers.density ?? 0) === 2 ? '가르마·윗머리 밀도 저하가 명확' :
                              (answers.density ?? 0) === 3 ? '윗머리 전반 두피 노출이 뚜렷' : ''}
                      </div>
                      <div className="text-sm text-gray-600">
                        <strong>정수리 희박:</strong> {(answers.vertex ?? 0) === 0 ? '정상' :
                          (answers.vertex ?? 0) === 1 ? '가까이 봐야 보이는 미약한 탈모' :
                            (answers.vertex ?? 0) === 2 ? '일반 거리에서도 보이는 뚜렷한 탈모' :
                              (answers.vertex ?? 0) === 3 ? '정수리 두피가 넓게 노출된 심한 탈모' : ''}
                      </div>
                    </div>
                  </div>
                </div>

                {/* BASP 기준표 설명 */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="font-semibold text-gray-800 mb-2">BASP 기준표 설명</h4>
                  <div className="text-sm text-gray-700 space-y-1">
                    <p><strong>L:</strong> 앞머리선 변화 없음 | <strong>M:</strong> 측두부 후퇴 | <strong>C:</strong> 중앙부 후퇴 | <strong>U:</strong> 말굽형 전반 후퇴</p>
                    <p><strong>F1-F3:</strong> 상부 전반 확산 정도 | <strong>V1-V3:</strong> 정수리 희박 정도</p>
                    <p><strong>0단계:</strong> 정상 | <strong>1단계:</strong> 초기 | <strong>2단계:</strong> 중기 | <strong>3단계:</strong> 심화</p>
                  </div>
                </div>
              </div>

              {/* 진행률 바 */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">추정 탈모 진행률</span>
                  <span className="text-sm font-semibold">{result.stageNumber * 25}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all duration-500 ${result.stageLabel === '정상' ? 'bg-green-500' :
                        result.stageLabel === '초기' ? 'bg-yellow-500' :
                          result.stageLabel === '중기' ? 'bg-orange-500' : 'bg-red-500'
                      }`}
                    style={{ width: `${result.stageNumber * 25}%` }}
                  />
                </div>
                <div className="text-center mt-2">
                  <span className="text-xs text-gray-500">※ 추정치이며, 실제와 다를 수 있습니다</span>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4">
                <h4 className="font-semibold text-gray-800 mb-2">진단 요약</h4>
                <p className="text-gray-700">{result.summaryText}</p>
              </div>
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
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 mb-8">
              <h4 className="font-bold text-red-800 mb-3 text-lg">⚠️ 중요 안내사항</h4>
              <div className="space-y-2">
                <div className="bg-white rounded-lg p-3 border border-red-200">
                  <p className="text-red-700 font-semibold text-sm">
                    🚨 본 진단은 어디까지나 추정 결과입니다
                  </p>
                  <p className="text-red-600 text-sm mt-1">
                    • 의료진의 실제 진단을 대체할 수 없습니다<br />
                    • 정확한 진단은 피부과 전문의 상담이 필수입니다<br />
                    • 결과에 따라 불안감을 느끼지 마시고 전문의와 상담하세요
                  </p>
                </div>
                <div className="bg-white rounded-lg p-3 border border-red-200">
                  <p className="text-red-700 font-semibold text-sm">
                    📋 BASP 기준표란?
                  </p>
                  <p className="text-red-600 text-sm mt-1">
                    • Basic and Specific Classification System의 약자<br />
                    • 탈모의 진행 정도를 체계적으로 분류하는 국제 기준<br />
                    • 총 192가지 세부 분류로 정확한 상태 파악 가능
                  </p>
                </div>
              </div>
            </div>

            {/* 맞춤 서비스 영역 */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-8 mb-8">
              <h3 className="text-2xl font-bold text-gray-800 mb-8 text-center">맞춤 서비스</h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* 지도 정보 */}
                <div className="bg-white rounded-xl p-8 shadow-lg border border-blue-200">
                  <div className="flex items-start gap-6">
                    <div className="w-20 h-20 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 text-3xl">📍</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xl font-bold text-gray-800 mb-3">근처 병원 찾기</h4>
                      <p className="text-gray-600 mb-4 leading-relaxed">
                        가까운 탈모 전문의와 피부과를 찾아보세요.
                        거리, 리뷰, 진료시간을 확인할 수 있습니다.
                      </p>
                      <div className="space-y-2 mb-6">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          <span>거리순 정렬</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          <span>전문의 정보</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                          <span>예약 가능 여부</span>
                        </div>
                      </div>
                      <button className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors">
                        지도에서 병원 찾기
                      </button>
                    </div>
                  </div>
                </div>

                {/* 유튜브 콘텐츠 */}
                <div className="bg-white rounded-xl p-8 shadow-lg border border-red-200">
                  <div className="flex items-start gap-6">
                    <div className="w-20 h-20 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-red-600 text-3xl">📺</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xl font-bold text-gray-800 mb-3">교육 콘텐츠</h4>
                      <p className="text-gray-600 mb-4 leading-relaxed">
                        전문의가 직접 제작한 탈모 관리 영상과
                        두피 건강 가이드를 확인하세요.
                      </p>
                      <div className="space-y-2 mb-6">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                          <span>두피 마사지 방법</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                          <span>올바른 샴푸법</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                          <span>생활습관 개선법</span>
                        </div>
                      </div>
                      <button className="w-full px-6 py-3 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors">
                        영상 콘텐츠 보기
                      </button>
                    </div>
                  </div>
                </div>

                {/* 탈모 PT */}
                <div className="bg-white rounded-xl p-8 shadow-lg border border-green-200">
                  <div className="flex items-start gap-6">
                    <div className="w-20 h-20 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-green-600 text-3xl">💪</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xl font-bold text-gray-800 mb-3">탈모 PT 프로그램</h4>
                      <p className="text-gray-600 mb-4 leading-relaxed">
                        개인 맞춤형 두피 마사지와 운동 가이드로
                        두피 건강을 개선해보세요.
                      </p>
                      <div className="space-y-2 mb-6">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          <span>두피 마사지 가이드</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          <span>목/어깨 스트레칭</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          <span>진행률 추적</span>
                        </div>
                      </div>
                      <button className="w-full px-6 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors">
                        PT 프로그램 시작
                      </button>
                    </div>
                  </div>
                </div>

                {/* 제품 추천 */}
                <div className="bg-white rounded-xl p-8 shadow-lg border border-purple-200">
                  <div className="flex items-start gap-6">
                    <div className="w-20 h-20 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-purple-600 text-3xl">🛍️</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xl font-bold text-gray-800 mb-3">맞춤 제품 추천</h4>
                      <p className="text-gray-600 mb-4 leading-relaxed">
                        진단 결과에 따른 개인 맞춤형 두피 케어 제품을
                        추천해드립니다.
                      </p>
                      <div className="space-y-2 mb-6">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                          <span>두피 타입별 샴푸</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                          <span>두피 토너/세럼</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                          <span>영양제 추천</span>
                        </div>
                      </div>
                      <button className="w-full px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors">
                        추천 제품 보기
                      </button>
                    </div>
                  </div>
                </div>
              </div>
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
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-8 pt-20">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* 진행바 */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm text-gray-600">단계 {currentStep + 1} / {steps.length}</span>
              <span className="text-sm text-gray-600">{Math.round(((currentStep + 1) / steps.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
            <div className="mt-2 text-center">
              <span className="text-xs text-gray-500">192가지 결과 중 정확한 진단을 위해 단계별로 답변해주세요</span>
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
              className={`px-6 py-3 rounded-lg transition-colors ${currentStep === 0 || isLoading
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
            >
              이전
            </button>
            <button
              onClick={handleNext}
              disabled={!isStepComplete(currentStep) || isLoading}
              className={`px-6 py-3 rounded-lg transition-colors ${isStepComplete(currentStep) && !isLoading
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
      <Footer />
    </div>
  );
};

export default BaspSelfCheck;
