import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { hairProductApi, HairProduct } from '../../services/hairProductApi';
import apiClient from '../../services/apiClient';

// 분석 결과 타입 정의
interface HairAnalysisResponse {
  success: boolean;
  analysis?: {
    primary_category: string;
    primary_severity: string;
    average_confidence: number;
    category_distribution: Record<string, number>;
    severity_distribution: Record<string, number>;
    diagnosis_scores: Record<string, number>;
    recommendations: string[];
  };
  similar_cases: Array<{
    id: string;
    score: number;
    metadata: {
      image_id: string;
      image_file_name: string;
      category: string;
      severity: string;
    };
  }>;
  total_similar_cases: number;
  model_info: Record<string, any>;
  preprocessing_used?: boolean;
  preprocessing_info?: {
    enabled: boolean;
    description: string;
  };
  error?: string;
}

// TypeScript: DailyCare 페이지 컴포넌트
const DailyCare: React.FC = () => {
  const navigate = useNavigate();
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<HairAnalysisResponse | null>(null);
  const [products, setProducts] = useState<HairProduct[] | null>(null);
  const [tips, setTips] = useState<string[]>([]);

  // 대시보드 카드 상태 (분석 결과 연동)
  const [scalpScore, setScalpScore] = useState<number>(78);
  const [dandruffLabel, setDandruffLabel] = useState<string>('양호');
  const [dandruffSub, setDandruffSub] = useState<string>('깨끗함');
  const [flakeLabel, setFlakeLabel] = useState<string>('양호');
  const [flakeSub, setFlakeSub] = useState<string>('개선됨');
  const [rednessLabel, setRednessLabel] = useState<string>('양호');
  const [rednessSub, setRednessSub] = useState<string>('정상');

  const updateDashboardFromAnalysis = (res: HairAnalysisResponse) => {
    // LLM 기반 종합 두피 점수 계산
    if (!res.analysis) return;
    
    const primaryCategory = res.analysis.primary_category;
    const primarySeverity = res.analysis.primary_severity;
    const avgConfidence = res.analysis.average_confidence;
    const diagnosisScores = res.analysis.diagnosis_scores;

    // 심각도에 따른 단계 계산 (0.양호=0, 1.경증=1, 2.중등도=2, 3.중증=3)
    const severityLevel = parseInt(primarySeverity.split('.')[0]) || 0;
    const stage01to03 = Math.min(3, Math.max(0, severityLevel)); // 0~3
    const conf = typeof avgConfidence === 'number' ? avgConfidence : 0.7; // 0~1

    // LLM 기반 종합 점수 계산 (더 정교한 알고리즘)
    let baseScore = 100; // 기본 점수
    
    // 심각도에 따른 감점
    baseScore -= stage01to03 * 20; // 심각도별 20점씩 감점
    
    // 진단 점수 기반 조정
    if (diagnosisScores) {
      const avgDiagnosisScore = Object.values(diagnosisScores).reduce((sum, score) => sum + score, 0) / Object.keys(diagnosisScores).length;
      baseScore -= (avgDiagnosisScore - 0.5) * 30; // 진단 점수 기반 조정
    }
    
    // 신뢰도 기반 보정
    baseScore += (conf - 0.5) * 20; // 신뢰도 기반 보정
    
    // 카테고리별 특별 감점
    const category = primaryCategory.toLowerCase();
    if (category.includes('비듬') || category.includes('탈모')) {
      baseScore -= 15; // 비듬/탈모는 추가 감점
    }
    if (category.includes('홍반') || category.includes('농포')) {
      baseScore -= 10; // 염증 관련 추가 감점
    }
    
    const finalScore = Math.max(0, Math.min(100, Math.round(baseScore)));
    setScalpScore(finalScore);

    // 카테고리와 심각도에 따른 상태 추정 (새로운 카테고리)
    
    // 비듬 상태 판정
    if (category.includes('비듬') || stage01to03 >= 2) {
      setDandruffLabel('주의');
      setDandruffSub('관리 필요');
    } else if (stage01to03 === 1) {
      setDandruffLabel('보통');
      setDandruffSub('관찰중');
    } else {
      setDandruffLabel('양호');
      setDandruffSub('깨끗함');
    }

    // 각질 상태 판정
    if (category.includes('미세각질') || stage01to03 >= 2) {
      setFlakeLabel('주의');
      setFlakeSub('개선 필요');
    } else if (stage01to03 === 1) {
      setFlakeLabel('보통');
      setFlakeSub('관찰중');
    } else {
      setFlakeLabel('양호');
      setFlakeSub('개선됨');
    }

    // 홍반 상태 판정
    if (category.includes('홍반') || category.includes('농포') || stage01to03 >= 2) {
      setRednessLabel('주의');
      setRednessSub('케어 필요');
    } else if (stage01to03 === 1) {
      setRednessLabel('보통');
      setRednessSub('관찰중');
    } else {
      setRednessLabel('양호');
      setRednessSub('정상');
    }

    // 분석 결과 기반 맞춤형 케어 팁 생성
    const buildSolutions = (
      score: number,
      dandruff: string,
      flake: string,
      redness: string
    ): string[] => {
      const s: string[] = [];
      
      // 두피 점수 기반 기본 케어
      if (score >= 85) {
        s.push('🎉 두피 상태가 매우 좋습니다! 현재 케어 루틴을 유지하세요.');
        s.push('💧 수분 케어를 꾸준히 하여 건강한 상태를 지속하세요.');
      } else if (score >= 70) {
        s.push('👍 두피 상태가 양호합니다. 저자극 보습 샴푸로 컨디션을 끌어올리세요.');
        s.push('🌿 두피 보습 토닉을 사용하여 수분 밸런스를 맞춰보세요.');
      } else if (score >= 50) {
        s.push('⚠️ 두피 관리가 필요합니다. 단백질과 보습 케어를 병행하세요.');
        s.push('🔥 열기구 사용을 줄이고 저온으로 스타일링하세요.');
      } else {
        s.push('🚨 전문가 상담을 권장합니다. 저자극 샴푸와 진정 토닉을 사용하세요.');
        s.push('🏥 피부과 전문의와 상담하여 정확한 진단을 받아보세요.');
      }
      
      // 비듬 상태별 맞춤 케어
      if (dandruff === '주의') {
        s.push('🧴 항비듬 성분(피리티온아연, 셀레늄) 샴푸를 주 2-3회 사용하세요.');
        s.push('🚿 샴푸 시 두피를 부드럽게 마사지하며 충분히 헹구세요.');
      } else if (dandruff === '보통') {
        s.push('🧽 두피 클렌징을 강화하고 비듬 예방 샴푸를 주 1-2회 사용하세요.');
      }
      
      // 각질 상태별 맞춤 케어
      if (flake === '주의') {
        s.push('✨ 각질 제거를 위해 두피 스크럽을 주 1회 사용하세요.');
        s.push('💆‍♀️ 보습에 신경 쓰고 각질이 생기지 않도록 관리하세요.');
      }
      
      // 홍반 상태별 맞춤 케어
      if (redness === '주의') {
        s.push('🌿 두피 진정 토닉과 저자극 샴푸로 염증을 완화하세요.');
        s.push('❄️ 차가운 물로 마무리 헹굼을 하여 두피를 진정시키세요.');
      }
      
      // 공통 케어 팁
      s.push('💆‍♀️ 샴푸 전후 3분 두피 마사지로 혈행을 개선하세요.');
      s.push('🌙 충분한 수면과 스트레스 관리로 두피 건강을 지켜주세요.');
      
      return s.slice(0, 6);
    };

    setTips(buildSolutions(finalScore, dandruffLabel, flakeLabel, rednessLabel));
  };
  const todayStr = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
  const [streak, setStreak] = useState<number>(1);

  // 연속 케어 일수 계산 (로컬 스토리지 기반)
  React.useEffect(() => {
    const key = 'dailyCareStreak';
    const stored = localStorage.getItem(key);
    const today = new Date();
    const yyyyMmDd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

    let count = 1;
    let lastDateStr = yyyyMmDd(today);

    if (stored) {
      try {
        const parsed = JSON.parse(stored) as { count: number; lastDate: string };
        const last = new Date(parsed.lastDate);
        const diffMs = today.setHours(0,0,0,0) - new Date(last.setHours(0,0,0,0)).getTime();
        const diffDays = Math.floor(diffMs / (1000*60*60*24));

        if (diffDays === 0) {
          count = parsed.count; // 같은 날 재방문
        } else if (diffDays === 1) {
          count = parsed.count + 1; // 어제 이후 연속
        } else {
          count = 1; // 연속 끊김
        }
      } catch {
        count = 1;
      }
    }

    setStreak(count);
    localStorage.setItem(key, JSON.stringify({ count, lastDate: lastDateStr }));
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 그라데이션 배너 */}
      <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">{todayStr}</p>
              <h1 className="text-2xl md:text-3xl font-bold mt-1">좋은 하루예요! 데일리 케어를 시작해볼까요?</h1>
              <p className="mt-1 text-white/90">{streak}일 연속 케어 중 ✨</p>
            </div>
            {/* 오른쪽 액션 버튼 제거 */}
          </div>
        </div>
        {/* 상단 탭 영역 삭제 */}
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* 메인 카드: 두피 촬영하기 */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex flex-col md:flex-row items-center md:items-start md:justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">두피 촬영하기</h2>
              <p className="text-gray-600 mt-1">오늘의 두피 상태를 확인해보세요</p>
            </div>
            {/* 우측 액션 버튼 영역 제거 요청으로 삭제 */}
          </div>
          {/* 사진 업로드 + 분석 */}
          <div className="mt-6 grid md:grid-cols-[1fr_auto] gap-4 items-center">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setSelectedImage(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 hover:file:bg-gray-200"
            />
            <button
              onClick={async () => {
                if (!selectedImage) return alert('두피 사진을 업로드해주세요.');
                setIsAnalyzing(true);
                setProducts(null);
                try {
                  // 스프링부트 API 호출
                  const formData = new FormData();
                  formData.append('image', selectedImage);
                  formData.append('top_k', '10');
                  formData.append('use_preprocessing', 'true');
                  
                  const response = await apiClient.post('/ai/hair-loss-daily/analyze', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                  });
                  
                  const result: HairAnalysisResponse = response.data;
                  setAnalysis(result);
                  updateDashboardFromAnalysis(result);
                  
                  // 심각도에 따른 제품 추천
                  const severityLevel = result.analysis ? parseInt(result.analysis.primary_severity.split('.')[0]) || 0 : 0;
                  const stage = Math.min(3, Math.max(0, severityLevel));
                  const prodRes = await hairProductApi.getProductsByStage(stage);
                  setProducts(prodRes.products.slice(0, 6));
                  
                  // 케어 팁은 updateDashboardFromAnalysis에서 설정됨
                } catch (e) {
                  console.error(e);
                  alert('분석 또는 추천 호출 중 오류가 발생했습니다.');
                } finally {
                  setIsAnalyzing(false);
                }
              }}
              disabled={isAnalyzing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isAnalyzing ? '분석 중...' : '사진으로 AI 분석'}
            </button>
          </div>
        </div>

          {/* 통계 카드 (LLM 기반 종합 분석) */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-sm text-gray-500">두피 점수</p>
              <div className="mt-2 text-3xl font-bold text-gray-800">{scalpScore}</div>
              <p className="mt-1 text-xs text-green-600">LLM 종합 분석</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-sm text-gray-500">비듬 상태</p>
              <div className="mt-2 text-2xl font-bold text-gray-800">{dandruffLabel}</div>
              <p className="mt-1 text-xs text-emerald-600">{dandruffSub}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-sm text-gray-500">각질 상태</p>
              <div className="mt-2 text-2xl font-bold text-gray-800">{flakeLabel}</div>
              <p className="mt-1 text-xs text-teal-600">{flakeSub}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-sm text-gray-500">홍반 상태</p>
              <div className="mt-2 text-2xl font-bold text-gray-800">{rednessLabel}</div>
              <p className="mt-1 text-xs text-green-600">{rednessSub}</p>
            </div>
          </div>

          {/* 오늘의 케어 팁 - 두피 점수(통계 카드) 바로 아래 */}
          {tips.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">오늘의 케어 팁</h3>
              <ol className="list-decimal ml-5 text-gray-700 space-y-1">
                {tips.map((t, i) => <li key={i}>{t}</li>)}
              </ol>
            </div>
          )}

          {/* 케어 가이드 섹션 */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="bg-green-50 p-6 rounded-lg border border-green-200">
              <h3 className="text-xl font-semibold text-green-800 mb-3">🌱 모발 건강 습관</h3>
              <ul className="space-y-2 text-green-700">
                <li>• 정기적인 샴푸와 컨디셔너 사용</li>
                <li>• 두피 마사지로 혈액순환 개선</li>
                <li>• 충분한 수면과 스트레스 관리</li>
                <li>• 영양가 있는 식단 섭취</li>
              </ul>
            </div>

            <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
              <h3 className="text-xl font-semibold text-blue-800 mb-3">💪 건강한 라이프스타일</h3>
              <ul className="space-y-2 text-blue-700">
                <li>• 규칙적인 운동과 신체 활동</li>
                <li>• 충분한 수분 섭취</li>
                <li>• 금연과 금주</li>
                <li>• 정기적인 건강 검진</li>
              </ul>
            </div>
          </div>

          {/* 추천 습관 카드들 */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">오늘의 추천 습관</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { icon: "🧴", title: "샴푸하기", desc: "머리를 깨끗하게 씻어주세요" },
                { icon: "💧", title: "수분 섭취", desc: "하루 8잔 이상 물 마시기" },
                { icon: "😴", title: "충분한 수면", desc: "7-8시간의 휴식" },
                { icon: "🏃", title: "운동하기", desc: "30분 이상 신체 활동" },
                { icon: "🥗", title: "건강한 식단", desc: "신선한 채소와 과일" },
                { icon: "🧘", title: "스트레스 관리", desc: "명상이나 휴식 시간" }
              ].map((habit, index) => (
                <div key={index} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="text-center">
                    <div className="text-3xl mb-2">{habit.icon}</div>
                    <h3 className="font-semibold text-gray-800 mb-1">{habit.title}</h3>
                    <p className="text-sm text-gray-600">{habit.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 진행률 표시 */}
          <div className="bg-gray-50 p-6 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">오늘의 진행률</h3>
            <div className="flex items-center">
              <div className="flex-grow bg-gray-200 rounded-full h-3 mr-4">
                <div className="bg-green-500 h-3 rounded-full transition-all duration-300" style={{width: '60%'}}></div>
              </div>
              <span className="text-sm font-medium text-gray-700">6 / 10 완료</span>
            </div>
            <p className="text-sm text-gray-600 mt-2">훌륭해요! 오늘도 건강한 하루를 보내고 계시네요! 🌟</p>
          </div>

          {/* 액션 버튼들 */}
          <div className="flex justify-center gap-4 mt-8">
            <button onClick={() => navigate('/hair-pt')} className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium">
              탈모 PT로 이동
            </button>
            <button className="px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors font-medium">
              오늘의 케어 기록
            </button>
          </div>

        </div>
    </div>
  );
};

export default DailyCare;
