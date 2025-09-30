import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../utils/store';
import { fetchSeedlingInfo, updateSeedlingNickname, setSeedling } from '../../utils/seedlingSlice';
import { hairProductApi, HairProduct } from '../../services/hairProductApi';
import apiClient from '../../services/apiClient';
import { Button } from '../../components/ui/button';
import { Target, Camera, Award, Sprout, MapPin, Video, HelpCircle } from 'lucide-react';
import { locationService, Location } from '../../services/locationService';
import MapPreview from '../../components/ui/MapPreview';

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
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { seedlingId, seedlingName, currentPoint, loading: seedlingLoading, error: seedlingError } = useSelector((state: RootState) => state.seedling);
  const { username, userId } = useSelector((state: RootState) => state.user);
  
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<HairAnalysisResponse | null>(null);
  const [products, setProducts] = useState<HairProduct[] | null>(null);
  const [tips, setTips] = useState<string[]>([]);
  const [seedlingPoints, setSeedlingPoints] = useState(0);
  const [seedlingLevel, setSeedlingLevel] = useState(1);
  const [plantTitle, setPlantTitle] = useState<string>('새싹 키우기');
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // 새싹 단계 정의
  const plantStages = {
    1: { emoji: '🌱', name: '새싹' },
    2: { emoji: '🌿', name: '어린 나무' },
    3: { emoji: '🌳', name: '나무' },
    4: { emoji: '🍎', name: '열매 나무' }
  };

  // 포인트에 따른 새싹 레벨 계산
  const calculateSeedlingLevel = (points: number): number => {
    if (points >= 200) return 4; // 열매 나무
    if (points >= 100) return 3; // 나무
    if (points >= 50) return 2;  // 어린 나무
    return 1; // 새싹
  };

  // 새싹 정보 로드 (HairPT.tsx에서 가져옴)
  const loadSeedlingInfo = useCallback(async () => {
    if (!userId) {
      console.log('사용자 ID가 없습니다.');
      return;
    }

    try {
      console.log('새싹 정보 로드 시도:', userId);
      
      const result = await dispatch(fetchSeedlingInfo(userId)).unwrap();
      console.log('Redux 새싹 정보:', result);
      
      if (result) {
        // 새싹 포인트 설정
        if (result.currentPoint) {
          setSeedlingPoints(result.currentPoint);
          setSeedlingLevel(calculateSeedlingLevel(result.currentPoint));
        }
        // 새싹 이름 설정 (백엔드에서 가져온 이름이 있으면 사용, 없으면 로컬 스토리지 사용)
        if (result.seedlingName) {
          setPlantTitle(result.seedlingName);
        } else {
          const savedTitle = localStorage.getItem('plantTitle');
          if (savedTitle) setPlantTitle(savedTitle);
        }
      }
    } catch (error: any) {
      console.error('새싹 정보 로드 실패:', error);
      console.error('에러 상세:', error.response?.data);
      console.error('에러 상태:', error.response?.status);
      
      // 에러 시 로컬 스토리지에서 제목 로드
      const savedTitle = localStorage.getItem('plantTitle');
      if (savedTitle) setPlantTitle(savedTitle);
    }
  }, [dispatch, userId]);

  // 다음 액션 결정 함수 (Dashboard에서 가져옴)
  const getNextAction = () => {
    if (!progress.lastPhotoDate) {
      return {
        title: "AI 탈모 분석",
        description: "AI 분석과 설문을 통한 종합적인 두피 상태 파악",
        action: "diagnosis",
        buttonText: "분석하기",
        urgent: true
      };
    }
    
    const daysSincePhoto = progress.lastPhotoDate 
      ? Math.floor((Date.now() - new Date(progress.lastPhotoDate).getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    
    if (daysSincePhoto >= 7) {
      return {
        title: "주간 변화 기록하기",
        description: "지난주와 비교하여 개선 상황을 확인해보세요",
        action: "tracking",
        buttonText: "변화 기록",
        urgent: false
      };
    }
    
    return {
      title: "이번 주 챌린지 완료하기",
      description: "새싹 포인트를 얻고 레벨업 하세요",
      action: "challenges",
      buttonText: "챌린지 보기",
      urgent: false
    };
  };

  // 사용자 진행 상황 상태 (Dashboard에서 가져옴)
  const [userProgress, setUserProgress] = useState({
    weeksSinceStart: 4,
    currentPoints: 240,
    overallImprovement: 15,
    lastPhotoDate: null as string | null,
    completedChallenges: 8,
    level: 'bronze',
    hasCompletedInitialAnalysis: false // 최초 탈모분석 완료 여부
  });

  const progress = userProgress;
  const nextAction = getNextAction();

  // 대시보드 카드 상태 (분석 결과 연동)
  const [scalpScore, setScalpScore] = useState<number>(78);
  const [oilinessLabel, setOilinessLabel] = useState<string>('양호');
  const [oilinessSub, setOilinessSub] = useState<string>('균형');
  const [flakeLabel, setFlakeLabel] = useState<string>('양호');
  const [flakeSub, setFlakeSub] = useState<string>('개선됨');
  const [rednessLabel, setRednessLabel] = useState<string>('양호');
  const [rednessSub, setRednessSub] = useState<string>('정상');
  const [dandruffLabel, setDandruffLabel] = useState<string>('양호');
  const [dandruffSub, setDandruffSub] = useState<string>('정상');

  const updateDashboardFromAnalysis = (res: HairAnalysisResponse) => {
    // LLM 기반 종합 두피 점수 계산
    if (!res.analysis) return;
    
    const primaryCategory = res.analysis.primary_category;
    const primarySeverity = res.analysis.primary_severity;
    const avgConfidence = res.analysis.average_confidence;
    const diagnosisScores = res.analysis.diagnosis_scores;
    
    // 비듬과 탈모 관련 내용 필터링
    const category = primaryCategory.toLowerCase();
    if (category.includes('비듬') || category.includes('탈모')) {
      // 비듬이나 탈모가 주요 카테고리인 경우 "양호"로 처리
      const filteredCategory = "0.양호";
      const filteredSeverity = "0.양호";
      
      // 필터링된 데이터로 계속 처리
      const filteredAnalysis = {
        ...res.analysis,
        primary_category: filteredCategory,
        primary_severity: filteredSeverity,
        diagnosis_scores: Object.fromEntries(
          Object.entries(diagnosisScores).filter(([key]) => 
            !key.includes('비듬') && !key.includes('탈모')
          )
        )
      };
      
      // 필터링된 분석으로 대시보드 업데이트
      updateDashboardWithFilteredData(filteredAnalysis);
      return;
    }
    
    // 비듬/탈모가 아닌 경우 정상 처리
    updateDashboardWithFilteredData(res.analysis);
  };
  
  const updateDashboardWithFilteredData = (analysis: any) => {
    const primaryCategory = analysis.primary_category;
    const primarySeverity = analysis.primary_severity;
    const avgConfidence = analysis.average_confidence;
    const diagnosisScores = analysis.diagnosis_scores;

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
      const scores = Object.values(diagnosisScores) as number[];
      const avgDiagnosisScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      baseScore -= (avgDiagnosisScore - 0.5) * 30; // 진단 점수 기반 조정
    }
    
    // 신뢰도 기반 보정
    baseScore += (conf - 0.5) * 20; // 신뢰도 기반 보정
    
    // 카테고리별 특별 감점 (비듬/탈모는 이미 필터링됨)
    const category = primaryCategory.toLowerCase();
    if (category.includes('홍반') || category.includes('농포')) {
      baseScore -= 10; // 염증 관련 추가 감점
    }
    if (category.includes('피지과다')) {
      baseScore -= 8; // 피지과다는 추가 감점
    }
    if (category.includes('미세각질')) {
      baseScore -= 6; // 미세각질은 추가 감점
    }
    
    const finalScore = Math.max(0, Math.min(100, Math.round(baseScore)));
    setScalpScore(finalScore);

    // 카테고리와 심각도에 따른 상태 추정 (새로운 카테고리)
    
    // 피지 상태 판정
    if (category.includes('피지과다') || stage01to03 >= 2) {
      setOilinessLabel('주의');
      setOilinessSub('관리 필요');
    } else if (stage01to03 === 1) {
      setOilinessLabel('보통');
      setOilinessSub('관찰중');
    } else {
      setOilinessLabel('양호');
      setOilinessSub('균형');
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

    // 비듬 상태 판정
    if (category.includes('비듬') || stage01to03 >= 2) {
      setDandruffLabel('주의');
      setDandruffSub('관리 필요');
    } else if (stage01to03 === 1) {
      setDandruffLabel('보통');
      setDandruffSub('관찰중');
    } else {
      setDandruffLabel('양호');
      setDandruffSub('정상');
    }

    // 분석 결과 기반 맞춤형 케어 팁 생성
    const buildSolutions = (
      score: number,
      oiliness: string,
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
      
      // 피지 상태별 맞춤 케어
      if (oiliness === '주의') {
        s.push('🧴 지성 두피 전용 샴푸로 깊은 클렌징을 하세요.');
        s.push('🚿 샴푸 시 두피를 부드럽게 마사지하며 충분히 헹구세요.');
      } else if (oiliness === '보통') {
        s.push('🧽 두피 클렌징을 강화하고 피지 조절 샴푸를 주 1-2회 사용하세요.');
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

    setTips(buildSolutions(finalScore, oilinessLabel, flakeLabel, rednessLabel));
  };
  const todayStr = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
  const [streak, setStreak] = useState<number>(1);

  // 위치 정보 가져오기
  React.useEffect(() => {
    const initializeLocation = async () => {
      try {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const location = {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              };
              setCurrentLocation(location);
              setLocationError(null);
            },
            (error) => {
              console.error('위치 정보를 가져올 수 없습니다:', error);
              setLocationError('위치 정보를 가져올 수 없습니다.');
            }
          );
        } else {
          setLocationError('이 브라우저는 위치 정보를 지원하지 않습니다.');
        }
      } catch (error) {
        console.error('위치 초기화 오류:', error);
        setLocationError('위치 정보 초기화에 실패했습니다.');
      }
    };

    initializeLocation();
  }, []);

  // 연속 케어 일수 계산 및 최초 분석 상태 확인 (로컬 스토리지 기반)
  React.useEffect(() => {
    const streakKey = 'dailyCareStreak';
    const analysisKey = 'hasCompletedInitialAnalysis';
    
    // 연속 케어 일수 계산
    const stored = localStorage.getItem(streakKey);
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
    localStorage.setItem(streakKey, JSON.stringify({ count, lastDate: lastDateStr }));

    // 최초 분석 완료 상태 확인
    const hasCompletedAnalysis = localStorage.getItem(analysisKey) === 'true';
    setUserProgress(prev => ({
      ...prev,
      hasCompletedInitialAnalysis: hasCompletedAnalysis
    }));

    // 새싹 정보 로드
    loadSeedlingInfo();
  }, [loadSeedlingInfo]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-First 컨테이너 */}
      <div className="max-w-full md:max-w-md mx-auto min-h-screen bg-white flex flex-col">
        
        {/* 상단 그라데이션 배너 (Mobile-First) */}
        <div className="bg-gradient-to-r from-[#1F0101] to-[#2A0202] text-white p-4">
          <div className="text-center">
            <p className="text-sm opacity-90">{todayStr}</p>
            <h1 className="text-xl font-bold mt-1">좋은 하루예요! 데일리 케어를 시작해볼까요?</h1>
            <p className="mt-1 text-white/90">{streak}일 연속 케어 중 ✨</p>
          </div>
        </div>

        {/* 메인 컨텐츠 */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {/* 0. 탈모분석 (최초 기준이고 한번이라도 분석하면 안보임) */}
          {!userProgress.hasCompletedInitialAnalysis && (
            <div className="bg-gradient-to-r from-red-50 to-orange-50 p-4 rounded-xl border-2 border-red-200">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-red-600" />
                  <h3 className="text-lg font-semibold text-red-800">최초 탈모 분석</h3>
                </div>
                <p className="text-sm text-red-700">AI 분석과 설문을 통한 종합적인 두피 상태 파악을 시작해보세요</p>
                <Button 
                  onClick={() => {
                    // 최초 분석 완료 상태 저장
                    localStorage.setItem('hasCompletedInitialAnalysis', 'true');
                    setUserProgress(prev => ({
                      ...prev,
                      hasCompletedInitialAnalysis: true
                    }));
                    navigate('/integrated-diagnosis');
                  }}
                  className="w-full h-12 bg-[#1F0101] hover:bg-[#2A0202] text-white rounded-xl font-semibold active:scale-[0.98] transition-all"
                >
                  지금 분석하기
                </Button>
              </div>
            </div>
          )}

          {/* 1. 두피 분석 (오늘의 두피분석) */}
          <div className="bg-white p-4 rounded-xl shadow-md">
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">오늘의 두피 분석</h2>
                <p className="text-sm text-gray-600 mt-1">오늘의 두피 상태를 확인해보세요</p>
              </div>
              
              {/* 사진 업로드 + 분석 */}
              <div className="space-y-3">
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
                      
                      // 사진 분석 완료 후 lastPhotoDate 업데이트
                      setUserProgress(prev => ({
                        ...prev,
                        lastPhotoDate: new Date().toISOString()
                      }));
                      
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
                  className="w-full h-12 px-4 bg-[#1F0101] text-white rounded-xl hover:bg-[#2A0202] disabled:opacity-50 font-semibold active:scale-[0.98] transition-all"
                >
                  {isAnalyzing ? '분석 중...' : '사진으로 AI 분석'}
                </button>
              </div>
            </div>
          </div>

          {/* 2. 탈모 PT (오늘의 미션) - 새싹 키우기 UI */}
          <div className="bg-[#1F0101] text-white p-4 rounded-xl">
            <div className="space-y-4">
              {/* 헤더: 새싹 아이콘과 제목 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{plantStages[seedlingLevel as keyof typeof plantStages].emoji}</span>
                  <h3 className="text-lg font-semibold">{seedlingName || plantTitle || '새싹 키우기'}</h3>
                </div>
                <button className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors">
                  <i className="fas fa-pen text-sm"></i>
                </button>
              </div>
              
              {/* 새싹 이미지 */}
              <div className="text-center">
                <div className="text-6xl mb-3">{plantStages[seedlingLevel as keyof typeof plantStages].emoji}</div>
              </div>
              
              {/* 동기부여 메시지 */}
              <div className="bg-white/20 rounded-xl p-3 text-center">
                <p className="text-sm text-white/90">오늘의 건강한 습관을 실천하고 새싹을 키워보세요!</p>
              </div>
              
              {/* 진행률 바 */}
              <div className="flex items-center bg-white/20 rounded-2xl p-3">
                <span className="bg-white text-[#1F0101] px-3 py-1 rounded-full text-sm font-bold">
                  Lv.{seedlingLevel}
                </span>
                <div className="flex-1 h-2 bg-white/30 rounded-full mx-3 overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${((currentPoint || seedlingPoints) % 50) * 2}%` }}
                  />
                </div>
                <span className="text-xs text-white/90">{(currentPoint || seedlingPoints) % 50}/50</span>
              </div>
              
              {/* PT 시작 버튼 */}
              <Button 
                onClick={() => navigate('/hair-pt')}
                className="w-full h-12 bg-white text-[#1F0101] hover:bg-gray-100 rounded-xl font-semibold active:scale-[0.98] transition-all"
              >
                PT 시작하기
              </Button>
            </div>
          </div>

          {/* 3. 탈모 맵 (내 위치기반 지도 화면) */}
          <div className="bg-white p-4 rounded-xl shadow-md">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#1F0101]" />
                <h3 className="text-lg font-semibold text-gray-800">탈모 맵</h3>
              </div>
              <p className="text-sm text-gray-600">내 위치 기반 근처 탈모 관련 장소들을 찾아보세요</p>
              
              {/* 지도 영역 */}
              {currentLocation ? (
                <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                  <MapPreview
                    latitude={currentLocation.latitude}
                    longitude={currentLocation.longitude}
                    hospitals={[]}
                    userLocation={currentLocation}
                    zoom={13}
                    className="h-48"
                  />
                </div>
              ) : locationError ? (
                <div className="relative bg-gray-100 rounded-lg h-48 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{locationError}</p>
                  </div>
                </div>
              ) : (
                <div className="relative bg-gray-100 rounded-lg h-48 flex items-center justify-center">
                  <div className="text-center text-gray-500">
                    <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">위치 정보를 가져오는 중...</p>
                  </div>
                </div>
              )}
              
              <Button 
                variant="outline"
                className="w-full h-12 border-2 border-[#1F0101] hover:border-[#2A0202] text-[#1F0101] rounded-xl font-semibold active:scale-[0.98] transition-all"
                onClick={() => navigate('/store-finder')}
              >
                더 알아보기
              </Button>
            </div>
          </div>

          {/* 분석 결과 통계 카드 */}
          {analysis && (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-4 rounded-xl shadow-md">
                <p className="text-xs text-gray-500">두피 점수</p>
                <div className="mt-1 text-2xl font-bold text-gray-800">{scalpScore}</div>
                <p className="mt-1 text-xs text-green-600">LLM 종합 분석</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-md">
                <p className="text-xs text-gray-500">비듬 상태</p>
                <div className="mt-1 text-xl font-bold text-gray-800">{dandruffLabel}</div>
                <p className="mt-1 text-xs text-emerald-600">{dandruffSub}</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-md">
                <p className="text-xs text-gray-500">각질 상태</p>
                <div className="mt-1 text-xl font-bold text-gray-800">{flakeLabel}</div>
                <p className="mt-1 text-xs text-teal-600">{flakeSub}</p>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-md">
                <p className="text-xs text-gray-500">홍반 상태</p>
                <div className="mt-1 text-xl font-bold text-gray-800">{rednessLabel}</div>
                <p className="mt-1 text-xs text-green-600">{rednessSub}</p>
              </div>
            </div>
          )}

          {/* 4. 탈모 OX (오늘의 퀴즈) */}
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <HelpCircle className="w-5 h-5 text-[#1F0101]" />
              <h3 className="text-lg font-semibold text-gray-800">오늘의 탈모 OX 퀴즈</h3>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg mb-3">
              <p className="text-sm font-medium text-gray-800 mb-4">
                탈모를 예방하기 위해 매일 샴푸를 하는 것이 좋다.
              </p>
              <div className="flex gap-2">
                <button className="flex-1 h-12 px-4 bg-[#1F0101] text-white rounded-xl hover:bg-[#2A0202] font-semibold active:scale-[0.98] transition-all">
                  O
                </button>
                <button className="flex-1 h-12 px-4 bg-[#1F0101] text-white rounded-xl hover:bg-[#2A0202] font-semibold active:scale-[0.98] transition-all">
                  X
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-500">정답 해설을 보려면 버튼을 눌러보세요!</p>
          </div>

          {/* 5. 탈모 영상 (오늘의 영상) */}
          <div className="bg-white p-4 rounded-xl border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
              <Video className="w-5 h-5 text-[#1F0101]" />
              <h3 className="text-lg font-semibold text-gray-800">오늘의 탈모 영상</h3>
            </div>
            <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video mb-3">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="text-4xl mb-2">▶️</div>
                  <p className="text-sm font-medium">두피 마사지 방법 알아보기</p>
                  <p className="text-xs opacity-75 mt-1">2분 30초</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 h-12 px-4 bg-[#1F0101] text-white rounded-xl hover:bg-[#2A0202] font-semibold active:scale-[0.98] transition-all">
                영상 보기
              </button>
              <button className="flex-1 h-12 px-4 bg-[#1F0101] text-white rounded-xl hover:bg-[#2A0202] font-semibold active:scale-[0.98] transition-all">
                다음 영상
              </button>
            </div>
          </div>

          {/* 6. 헤어스타일 바꾸기 */}
          <div className="bg-white p-4 rounded-xl shadow-md">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="text-2xl">💇‍♀️</div>
                <h3 className="text-lg font-semibold text-gray-800">헤어스타일 바꾸기</h3>
              </div>
              <p className="text-sm text-gray-600">새로운 헤어스타일을 시도해보세요</p>
              
              {/* 물음표 그림 영역 */}
              <div className="relative bg-gray-100 rounded-lg h-48 flex items-center justify-center">
                <div className="text-center text-gray-500">
                  <div className="text-6xl mb-2">❓</div>
                  <p className="text-sm">새로운 스타일을 찾아보세요</p>
                </div>
              </div>
              
              <Button 
                onClick={() => navigate('/hair-change')}
                className="w-full h-12 bg-[#1F0101] hover:bg-[#2A0202] text-white rounded-xl font-semibold active:scale-[0.98] transition-all"
              >
                페이지 이동하기
              </Button>
            </div>
          </div>

          {/* 오늘의 케어 팁 */}
          {tips.length > 0 && (
            <div className="bg-white p-4 rounded-xl shadow-md">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">오늘의 케어 팁</h3>
              <ol className="list-decimal ml-5 text-sm text-gray-700 space-y-2">
                {tips.map((t, i) => <li key={i}>{t}</li>)}
              </ol>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default DailyCare;
