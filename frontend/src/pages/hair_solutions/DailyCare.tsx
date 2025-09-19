import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { hairDamageService, HairAnalysisResponse } from '../../services/hairDamageService';
import { hairProductApi, HairProduct } from '../../services/hairProductApi';

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
  const [oilLabel, setOilLabel] = useState<string>('정상');
  const [oilSub, setOilSub] = useState<string>('유지중');
  const [flakeLabel, setFlakeLabel] = useState<string>('양호');
  const [flakeSub, setFlakeSub] = useState<string>('개선됨');
  const [poreLabel, setPoreLabel] = useState<string>('깨끗');
  const [poreSub, setPoreSub] = useState<string>('좋아짐');

  const updateDashboardFromAnalysis = (res: HairAnalysisResponse) => {
    const first = res.results[0]?.properties;
    if (!first) return;
    const stageRaw = typeof first.stage === 'number' ? first.stage : 1; // 1~4 가정
    const stage01to03 = Math.min(3, Math.max(0, stageRaw - 1)); // 0~3
    const conf = typeof first.confidence === 'number' ? first.confidence : 0.7; // 0~1

    // 간단한 스코어 산식: 85 - stage*15 + confidence*10 (0~100 범위 보정)
    const score = Math.max(0, Math.min(100, Math.round(85 - stage01to03 * 15 + conf * 10)));
    setScalpScore(score);

    // 유분/각질 상태 추정: 진단 키워드와 단계 기반
    const dx = (first.diagnosis || '').toLowerCase();
    if (dx.includes('지성') || stage01to03 >= 2) {
      setOilLabel('높음');
      setOilSub('관리 필요');
    } else if (dx.includes('건성')) {
      setOilLabel('낮음');
      setOilSub('보습 필요');
    } else {
      setOilLabel('정상');
      setOilSub('유지중');
    }

    if (dx.includes('각질') || stage01to03 >= 2) {
      setFlakeLabel('주의');
      setFlakeSub('개선 필요');
    } else if (stage01to03 === 1) {
      setFlakeLabel('보통');
      setFlakeSub('관찰중');
    } else {
      setFlakeLabel('양호');
      setFlakeSub('개선됨');
    }

    if (dx.includes('염증') || dx.includes('모공막힘') || stage01to03 >= 2) {
      setPoreLabel('막힘');
      setPoreSub('케어 필요');
    } else {
      setPoreLabel('깨끗');
      setPoreSub('좋아짐');
    }

    // 상태 기반 데일리 솔루션 생성
    const buildSolutions = (
      score: number,
      oil: string,
      flake: string,
      pore: string
    ): string[] => {
      const s: string[] = [];
      if (score >= 85) {
        s.push('현재 상태 좋아요! 기존 루틴을 유지하고 수분 케어를 꾸준히 해주세요.');
      } else if (score >= 70) {
        s.push('저자극 보습 샴푸와 두피 보습 토닉으로 컨디션을 끌어올리세요.');
      } else if (score >= 50) {
        s.push('단백질/보습 케어를 병행하고, 열기구 사용을 줄여주세요.');
      } else {
        s.push('전문가 상담을 권장해요. 당분간 저자극 샴푸와 진정 토닉을 사용하세요.');
      }
      if (oil === '높음') {
        s.push('지성용 샴푸를 사용하고 주 1회 딥클렌징을 해주세요.');
      } else if (oil === '낮음') {
        s.push('보습 샴푸와 오일/수분 에센스로 건조함을 완화하세요.');
      }
      if (flake === '주의') {
        s.push('각질이 신경 쓰인다면 항비듬 성분(피리티온아연 등) 샴푸를 주 2-3회 사용하세요.');
      }
      if (pore === '막힘') {
        s.push('모공 클렌징 스크럽을 주 1회 사용해 노폐물을 제거하세요.');
      }
      s.push('샴푸 전후 3분 두피 마사지로 혈행을 개선해보세요.');
      return s.slice(0, 6);
    };

    setTips(buildSolutions(score, oilLabel, flakeLabel, poreLabel));
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
                  const result = await hairDamageService.analyzeHairDamage({ image: selectedImage });
                  setAnalysis(result);
                  updateDashboardFromAnalysis(result);
                  const first = result.results[0]?.properties;
                  const rawStage = typeof first?.stage === 'number' ? first.stage : 1;
                  const stage = Math.min(3, Math.max(0, rawStage - 1));
                  const prodRes = await hairProductApi.getProductsByStage(stage);
                  setProducts(prodRes.products.slice(0, 6));
                  const stageTips: Record<number, string[]> = {
                    0: ['미지근한 물로 부드럽게 샴푸하기', '드라이 전 열 보호제 사용', '주 1-2회 두피 마사지'],
                    1: ['수분 에센스 사용', '단백질 팩 주 1회', '카페인/비오틴 성분 샴푸 사용'],
                    2: ['두피 진정 토닉', '열기구 사용 최소화', '단백질/보습 병행 케어'],
                    3: ['전문가 상담 권장', '저자극 샴푸로 전환', '영양제/스칼프 세럼 병행']
                  };
                  setTips(stageTips[stage]);
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

          {/* 통계 카드 (요청에 따라 복원 + 모공 상태 추가) */}
          <div className="grid md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-sm text-gray-500">두피 점수</p>
              <div className="mt-2 text-3xl font-bold text-gray-800">{scalpScore}</div>
              <p className="mt-1 text-xs text-green-600">AI 분석 기반</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-sm text-gray-500">유분 상태</p>
              <div className="mt-2 text-2xl font-bold text-gray-800">{oilLabel}</div>
              <p className="mt-1 text-xs text-emerald-600">{oilSub}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-sm text-gray-500">각질 상태</p>
              <div className="mt-2 text-2xl font-bold text-gray-800">{flakeLabel}</div>
              <p className="mt-1 text-xs text-teal-600">{flakeSub}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <p className="text-sm text-gray-500">모공 상태</p>
              <div className="mt-2 text-2xl font-bold text-gray-800">{poreLabel}</div>
              <p className="mt-1 text-xs text-green-600">{poreSub}</p>
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

          {/* 분석 결과/추천/팁 */}
          {(analysis || products || tips.length > 0) && (
            <div className="mt-10 grid gap-6">
              {analysis && (
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">AI 분석 요약</h3>
                  <p className="text-gray-700 text-sm">{analysis.summary || '업로드한 사진을 기반으로 상태를 분석했습니다.'}</p>
                </div>
              )}
              {products && (
                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">추천 제품</h3>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {products.map(p => (
                      <a key={p.productId} href={p.productUrl} target="_blank" rel="noreferrer" className="block border rounded-lg p-4 hover:shadow">
                        <div className="text-sm font-medium text-gray-800 mb-1">{p.productName}</div>
                        <div className="text-xs text-gray-500">{p.brand} · {p.mallName}</div>
                        <div className="text-indigo-600 font-semibold mt-2">{p.productPrice.toLocaleString()}원</div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
              {/* 케어 팁은 위로 이동 */}
            </div>
          )}
        </div>
    </div>
  );
};

export default DailyCare;
