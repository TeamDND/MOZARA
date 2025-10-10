import React from 'react';
import { Button } from '../../../components/ui/button';
import { Brain, ArrowRight, Calendar, Target, BookOpen } from 'lucide-react';

interface DailyCareTabProps {
  currentStage: number;
  onNavigateToDailyCare: () => void;
}

const DailyCareTab: React.FC<DailyCareTabProps> = ({ currentStage, onNavigateToDailyCare }) => {
  // 단계별 추천 설명
  const stageDescriptions: Record<number, string> = {
    0: '예방 중심의 두피 케어와 관리 프로그램을 시작하세요',
    1: '초기 탈모 관리를 위한 체계적인 케어 프로그램을 시작하세요',
    2: '약물 치료와 전문 관리를 위한 집중 케어 프로그램을 시작하세요',
    3: '모발이식과 가발 등 집중 치료를 위한 맞춤 케어 프로그램을 시작하세요',
  };

  // 단계별 케어 가이드
  const careGuides = [
    {
      icon: <Calendar className="w-5 h-5 text-blue-500" />,
      title: "데일리 케어 기록",
      description: "매일의 두피 상태와 케어 내용을 기록하여 체계적으로 관리하세요"
    },
    {
      icon: <Target className="w-5 h-5 text-blue-500" />,
      title: "맞춤형 PT 프로그램",
      description: "AI 분석 결과를 바탕으로 한 개인 맞춤형 탈모 관리 프로그램"
    },
    {
      icon: <BookOpen className="w-5 h-5 text-blue-500" />,
      title: "전문 가이드",
      description: "단계별 전문적인 탈모 관리 방법과 주의사항을 확인하세요"
    }
  ];

  return (
    <div className="space-y-4">
      {/* 메인 안내 카드 */}
      <div className="bg-gradient-to-r from-blue-50 to-blue-50 p-6 rounded-xl">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
            <Brain className="w-8 h-8 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">두피 분석을 통해 탈모PT와 데일리케어 기록으로 관리해보세요</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            AI 분석 결과를 바탕으로 개인 맞춤형 탈모 관리 프로그램을 시작하세요.<br/>
            데일리케어 기록과 PT 프로그램으로 체계적인 관리가 가능합니다.
          </p>
          <div className="space-y-3">
            <button
              onClick={onNavigateToDailyCare}
              className="w-full h-12 bg-[#1F0101] hover:bg-[#2A0202] text-white rounded-xl font-semibold transition-colors"
            >
              데일리케어 하러가기
              <ArrowRight className="w-5 h-5 ml-2 inline" />
            </button>
            <div className="text-xs text-gray-500">
              💡 {currentStage}단계에 맞는 맞춤형 관리 프로그램이 준비되어 있습니다
            </div>
          </div>
        </div>
      </div>

      {/* 단계별 추천 설명 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <p className="text-xs text-blue-800">
          💡 {stageDescriptions[currentStage]}
        </p>
      </div>

      {/* 케어 가이드 */}
      <div className="space-y-3">
        {careGuides.map((guide, index) => (
          <div key={index} className="bg-white p-4 rounded-xl border border-gray-100 hover:shadow-md transition-all">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                {guide.icon}
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-gray-800 mb-1">{guide.title}</h4>
                <p className="text-xs text-gray-600 leading-relaxed">{guide.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 추가 정보 */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
        <h4 className="text-xs font-semibold text-gray-800 mb-2">📋 데일리케어 프로그램 특징</h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• AI 분석 결과 기반 맞춤형 관리 계획</li>
          <li>• 일일 두피 상태 기록 및 추적</li>
          <li>• 단계별 전문 케어 가이드 제공</li>
          <li>• 진행 상황 모니터링 및 피드백</li>
        </ul>
      </div>
    </div>
  );
};

export default DailyCareTab;
