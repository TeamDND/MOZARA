import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { RootState, AppDispatch } from '../../utils/store';
import { fetchSeedlingInfo, updateSeedlingNickname, setSeedling } from '../../utils/seedlingSlice';
import { hairProductApi, HairProduct } from '../../services/hairProductApi';
import apiClient from '../../services/apiClient';
import { Button } from '../../components/ui/button';
import { Target, Camera, Award, Sprout, MapPin, Video, HelpCircle, Calendar, CheckCircle } from 'lucide-react';

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

// daily_habits 테이블 데이터 기반 미션 정보
interface DailyHabit {
  habitId: number;
  description: string;
  habitName: string;
  rewardPoints: number;
  category: string;
}

interface MissionInfo {
  id: number;
  name: string;
  description: string;
  category: 'routine' | 'nutrient' | 'cleanliness';
  rewardPoints: number;
  key: string;
  completed?: boolean;
}

interface Counters {
  water: number;
  effector: number;
}

interface MissionState {
  morningBooster: boolean;
  nightBooster: boolean;
  water: boolean;
  effector: boolean;
  massage: boolean;
  omega3: boolean;
  vitaminD: boolean;
  vitaminE: boolean;
  protein: boolean;
  iron: boolean;
  biotin: boolean;
  zinc: boolean;
  nightWash: boolean;
  dryHair: boolean;
  brushHair: boolean;
  scalpScrub: boolean;
  earlySleep: boolean;
  scalpPack: boolean;
}

const DailyCareDetail: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { seedlingId, seedlingName, currentPoint, loading: seedlingLoading, error: seedlingError } = useSelector((state: RootState) => state.seedling);
  const { username, userId, createdAt } = useSelector((state: RootState) => state.user);
  
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<HairAnalysisResponse | null>(null);
  const [products, setProducts] = useState<HairProduct[] | null>(null);
  const [tips, setTips] = useState<string[]>([]);
  const [seedlingPoints, setSeedlingPoints] = useState(0);
  const [seedlingLevel, setSeedlingLevel] = useState(1);
  const [plantTitle, setPlantTitle] = useState<string>('새싹 키우기');
  const [currentLocation, setCurrentLocation] = useState<any>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [dailyHabits, setDailyHabits] = useState<DailyHabit[]>([]);
  const [missionData, setMissionData] = useState<MissionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [counters, setCounters] = useState<Counters>({ water: 0, effector: 0 });
  const [missionState, setMissionState] = useState<MissionState>({
    morningBooster: false,
    nightBooster: false,
    water: false,
    effector: false,
    massage: false,
    omega3: false,
    vitaminD: false,
    vitaminE: false,
    protein: false,
    iron: false,
    biotin: false,
    zinc: false,
    nightWash: false,
    dryHair: false,
    brushHair: false,
    scalpScrub: false,
    earlySleep: false,
    scalpPack: false
  });

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

  // 주간 캘린더 데이터 생성
  const generateWeekCalendar = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // 일요일부터 시작

    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      
      weekDays.push({
        date: date,
        dayName: date.toLocaleDateString('ko-KR', { weekday: 'short' }),
        dayNumber: date.getDate(),
        isToday: date.toDateString() === today.toDateString(),
        isPast: date < today,
        isFuture: date > today
      });
    }
    return weekDays;
  };

  const weekCalendar = generateWeekCalendar();

  // daily_habits 데이터 로드
  const loadDailyHabits = async () => {
    if (!userId) {
      console.log('사용자 ID가 없어서 습관 데이터를 로드할 수 없습니다.');
      return;
    }

    try {
      setLoading(true);
      
      // 모든 습관 데이터 가져오기
      const response = await apiClient.get('/habit/daily-habits');
      setDailyHabits(response.data);
      
      // 오늘 완료된 습관들 가져오기
      const completedResponse = await apiClient.get(`/habit/completed/${userId}`);
      const completedHabits = completedResponse.data || [];
      
      // DailyHabit을 MissionInfo로 변환하면서 완료 상태도 설정
      const convertedMissions: MissionInfo[] = response.data.map((habit: DailyHabit) => {
        const isCompleted = completedHabits.some((completed: any) => completed.habitId === habit.habitId);
        return {
          id: habit.habitId,
          name: habit.habitName,
          description: habit.description,
          category: habit.category.trim() as 'routine' | 'nutrient' | 'cleanliness',
          rewardPoints: habit.rewardPoints,
          key: getMissionKey(habit.habitName),
          completed: isCompleted
        };
      });
      setMissionData(convertedMissions);

      // 카운터 방식 미션들의 완료 상태에 따라 카운터 설정
      const waterMission = convertedMissions.find(m => m.name === '물 마시기');
      const effectorMission = convertedMissions.find(m => m.name === '이펙터 사용');
      
      if (waterMission?.completed) {
        setCounters(prev => ({ ...prev, water: 7 }));
      } else {
        setCounters(prev => ({ ...prev, water: 0 }));
      }
      
      if (effectorMission?.completed) {
        setCounters(prev => ({ ...prev, effector: 4 }));
      } else {
        setCounters(prev => ({ ...prev, effector: 0 }));
      }
    } catch (error) {
      console.error('습관 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 습관 이름을 기반으로 미션 키 매핑
  const getMissionKey = (habitName: string): string => {
    const keyMap: { [key: string]: string } = {
      '물 마시기': 'water',
      '이펙터 사용': 'effector',
      '아침 부스터 사용': 'morningBooster',
      '밤 부스터 사용': 'nightBooster',
      '백회혈/사신총혈 마사지': 'massage',
      '오메가-3 섭취': 'omega3',
      '비타민 D 섭취': 'vitaminD',
      '비타민 E 섭취': 'vitaminE',
      '단백질 섭취': 'protein',
      '철분 섭취': 'iron',
      '비오틴 섭취': 'biotin',
      '아연 섭취': 'zinc',
      '밤에 머리 감기': 'nightWash',
      '머리 바싹 말리기': 'dryHair',
      '샴푸 전 머리 빗질': 'brushHair',
      '두피 영양팩하기': 'scalpPack'
    };
    return keyMap[habitName] || 'morningBooster';
  };

  // 새싹 정보 로드
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
        if (result.currentPoint) {
          setSeedlingPoints(result.currentPoint);
          setSeedlingLevel(calculateSeedlingLevel(result.currentPoint));
        }
        if (result.seedlingName) {
          setPlantTitle(result.seedlingName);
        } else {
          const savedTitle = localStorage.getItem('plantTitle');
          if (savedTitle) setPlantTitle(savedTitle);
        }
      }
    } catch (error: any) {
      console.error('새싹 정보 로드 실패:', error);
      const savedTitle = localStorage.getItem('plantTitle');
      if (savedTitle) setPlantTitle(savedTitle);
    }
  }, [dispatch, userId]);

  // 대시보드 카드 상태
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
    if (!res.analysis) return;
    
    const primaryCategory = res.analysis.primary_category;
    const primarySeverity = res.analysis.primary_severity;
    const avgConfidence = res.analysis.average_confidence;
    const diagnosisScores = res.analysis.diagnosis_scores;
    
    const category = primaryCategory.toLowerCase();
    if (category.includes('비듬') || category.includes('탈모')) {
      const filteredCategory = "0.양호";
      const filteredSeverity = "0.양호";
      
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
      
      updateDashboardWithFilteredData(filteredAnalysis);
      return;
    }
    
    updateDashboardWithFilteredData(res.analysis);
  };
  
  const updateDashboardWithFilteredData = (analysis: any) => {
    const primaryCategory = analysis.primary_category;
    const primarySeverity = analysis.primary_severity;
    const avgConfidence = analysis.average_confidence;
    const diagnosisScores = analysis.diagnosis_scores;

    const severityLevel = parseInt(primarySeverity.split('.')[0]) || 0;
    const stage01to03 = Math.min(3, Math.max(0, severityLevel));
    const conf = typeof avgConfidence === 'number' ? avgConfidence : 0.7;

    let baseScore = 100;
    baseScore -= stage01to03 * 20;
    
    if (diagnosisScores) {
      const scores = Object.values(diagnosisScores) as number[];
      const avgDiagnosisScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      baseScore -= (avgDiagnosisScore - 0.5) * 30;
    }
    
    baseScore += (conf - 0.5) * 20;
    
    const category = primaryCategory.toLowerCase();
    if (category.includes('홍반') || category.includes('농포')) {
      baseScore -= 10;
    }
    if (category.includes('피지과다')) {
      baseScore -= 8;
    }
    if (category.includes('미세각질')) {
      baseScore -= 6;
    }
    
    const finalScore = Math.max(0, Math.min(100, Math.round(baseScore)));
    setScalpScore(finalScore);

    // 카테고리와 심각도에 따른 상태 추정
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
      
      if (oiliness === '주의') {
        s.push('🧴 지성 두피 전용 샴푸로 깊은 클렌징을 하세요.');
        s.push('🚿 샴푸 시 두피를 부드럽게 마사지하며 충분히 헹구세요.');
      } else if (oiliness === '보통') {
        s.push('🧽 두피 클렌징을 강화하고 피지 조절 샴푸를 주 1-2회 사용하세요.');
      }
      
      if (flake === '주의') {
        s.push('✨ 각질 제거를 위해 두피 스크럽을 주 1회 사용하세요.');
        s.push('💆‍♀️ 보습에 신경 쓰고 각질이 생기지 않도록 관리하세요.');
      }
      
      if (redness === '주의') {
        s.push('🌿 두피 진정 토닉과 저자극 샴푸로 염증을 완화하세요.');
        s.push('❄️ 차가운 물로 마무리 헹굼을 하여 두피를 진정시키세요.');
      }
      
      s.push('💆‍♀️ 샴푸 전후 3분 두피 마사지로 혈행을 개선하세요.');
      s.push('🌙 충분한 수면과 스트레스 관리로 두피 건강을 지켜주세요.');
      
      return s.slice(0, 6);
    };

    setTips(buildSolutions(finalScore, oilinessLabel, flakeLabel, rednessLabel));
  };

  // 미션별 아이콘과 색상 반환 함수
  const getMissionIcon = (missionName: string) => {
    const iconMap: { [key: string]: { icon: string; bgColor: string; textColor: string } } = {
      '물 마시기': { icon: 'fas fa-tint', bgColor: 'bg-gray-100', textColor: 'text-gray-500' },
      '이펙터 사용': { icon: 'fas fa-wand-magic-sparkles', bgColor: 'bg-purple-100', textColor: 'text-purple-500' },
      '아침 부스터 사용': { icon: 'fas fa-sun', bgColor: 'bg-yellow-100', textColor: 'text-yellow-500' },
      '밤 부스터 사용': { icon: 'fas fa-moon', bgColor: 'bg-indigo-100', textColor: 'text-indigo-500' },
      '백회혈/사신총혈 마사지': { icon: 'fas fa-hand-holding-medical', bgColor: 'bg-pink-100', textColor: 'text-pink-500' },
      '오메가-3 섭취': { icon: 'fas fa-fish', bgColor: 'bg-blue-100', textColor: 'text-blue-500' },
      '비타민 D 섭취': { icon: 'fas fa-sun', bgColor: 'bg-yellow-100', textColor: 'text-yellow-500' },
      '비타민 E 섭취': { icon: 'fas fa-leaf', bgColor: 'bg-green-100', textColor: 'text-green-500' },
      '단백질 섭취': { icon: 'fas fa-drumstick-bite', bgColor: 'bg-red-100', textColor: 'text-red-500' },
      '철분 섭취': { icon: 'fas fa-apple-alt', bgColor: 'bg-red-100', textColor: 'text-red-500' },
      '비오틴 섭취': { icon: 'fas fa-pills', bgColor: 'bg-purple-100', textColor: 'text-purple-500' },
      '아연 섭취': { icon: 'fas fa-capsules', bgColor: 'bg-orange-100', textColor: 'text-orange-500' },
      '밤에 머리 감기': { icon: 'fas fa-shower', bgColor: 'bg-sky-100', textColor: 'text-sky-500' },
      '머리 바싹 말리기': { icon: 'fas fa-wind', bgColor: 'bg-sky-100', textColor: 'text-sky-500' },
      '샴푸 전 머리 빗질': { icon: 'fas fa-broom', bgColor: 'bg-yellow-100', textColor: 'text-yellow-500' },
      '두피 영양팩하기': { icon: 'fas fa-spa', bgColor: 'bg-green-100', textColor: 'text-green-500' }
    };
    return iconMap[missionName] || { icon: 'fas fa-check', bgColor: 'bg-blue-100', textColor: 'text-blue-500' };
  };

  // 미션 카드 렌더링 함수
  const renderMissionCard = (mission: MissionInfo) => {
    const isCompleted = mission.completed !== undefined ? mission.completed : missionState[mission.key as keyof MissionState];
    const missionIcon = getMissionIcon(mission.name);
    
    // 물마시기와 이펙터 사용은 카운터 방식으로 처리
    if (mission.key === 'water' || mission.key === 'effector') {
      const currentCount = counters[mission.key as keyof Counters];
      const targetCount = mission.key === 'water' ? 7 : 4;
      const isCounterCompleted = currentCount >= targetCount;
      
      return (
        <div key={mission.id} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 flex items-center justify-center ${missionIcon.bgColor} rounded-lg`}>
              <i className={`${missionIcon.icon} ${missionIcon.textColor} text-sm`}></i>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold">{mission.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-500">{currentCount}/{targetCount}</span>
                <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
                  +{mission.rewardPoints}
                </span>
              </div>
            </div>
            {isCounterCompleted && (
              <CheckCircle className="w-5 h-5 text-green-500" />
            )}
          </div>
        </div>
      );
    }
    
    // 일반 미션들
    return (
      <div key={mission.id} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 flex items-center justify-center ${missionIcon.bgColor} rounded-lg`}>
            <i className={`${missionIcon.icon} ${missionIcon.textColor} text-sm`}></i>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold">{mission.name}</h3>
            <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
              +{mission.rewardPoints} 포인트
            </span>
          </div>
          {isCompleted && (
            <CheckCircle className="w-5 h-5 text-green-500" />
          )}
        </div>
      </div>
    );
  };

  // 진행률 계산 함수
  const calculateProgress = () => {
    if (missionData.length === 0) return 0;
    
    let completedMissions = 0;
    const totalMissions = missionData.length;

    missionData.forEach(mission => {
      if (mission.completed !== undefined) {
        if (mission.completed) {
          completedMissions++;
        }
      } else {
        if (missionState[mission.key as keyof MissionState]) {
          completedMissions++;
        }
      }
    });

    return Math.round((completedMissions / totalMissions) * 100);
  };

  const progressPercentage = calculateProgress();

  useEffect(() => {
    loadDailyHabits();
    loadSeedlingInfo();
  }, [loadSeedlingInfo, userId]);

  const todayStr = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-First 컨테이너 */}
      <div className="max-w-full md:max-w-md mx-auto min-h-screen bg-white flex flex-col">
        
        {/* 상단 그라데이션 배너 */}
        <div className="bg-gradient-to-r from-[#1F0101] to-[#2A0202] text-white p-4">
          <div className="text-center">
            <p className="text-sm opacity-90">{todayStr}</p>
            <h1 className="text-xl font-bold mt-1">데일리 케어 상세</h1>
            <p className="mt-1 text-white/90">오늘의 케어 현황을 확인해보세요</p>
          </div>
        </div>

        {/* 메인 컨텐츠 */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          
          {/* 1. 주간 캘린더 */}
          <div className="bg-white p-4 rounded-xl shadow-md">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-[#1F0101]" />
                <h3 className="text-lg font-semibold text-gray-800">주간 캘린더</h3>
              </div>
              <p className="text-sm text-gray-600">이번 주 데일리 케어 현황을 확인해보세요</p>
              
              {/* 주간 캘린더 그리드 */}
              <div className="grid grid-cols-7 gap-2">
                {weekCalendar.map((day, index) => (
                  <div 
                    key={index}
                    className={`text-center p-2 rounded-lg ${
                      day.isToday 
                        ? 'bg-[#1F0101] text-white' 
                        : day.isPast 
                          ? 'bg-green-50 border border-green-200' 
                          : 'bg-gray-50 border border-gray-200'
                    }`}
                  >
                    <div className="text-xs text-gray-500 mb-1">{day.dayName}</div>
                    <div className="text-sm font-semibold">{day.dayNumber}</div>
                    {day.isPast && (
                      <div className="mt-1">
                        <CheckCircle className="w-3 h-3 text-green-500 mx-auto" />
                      </div>
                    )}
                    {day.isToday && (
                      <div className="mt-1">
                        <div className="w-2 h-2 bg-white rounded-full mx-auto"></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 2. 오늘의 탈모PT 미션 */}
          <div className="bg-white p-4 rounded-xl shadow-md">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Sprout className="w-5 h-5 text-[#1F0101]" />
                <h3 className="text-lg font-semibold text-gray-800">오늘의 탈모PT 미션</h3>
              </div>
              <p className="text-sm text-gray-600">새싹을 키우며 건강한 습관을 만들어보세요</p>
              
              {/* 새싹 정보 */}
              <div className="bg-gradient-to-r from-[#1F0101] to-[#2A0202] text-white p-4 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{plantStages[seedlingLevel as keyof typeof plantStages].emoji}</span>
                    <h4 className="font-semibold">{seedlingName || plantTitle || '새싹 키우기'}</h4>
                  </div>
                  <span className="bg-white text-[#1F0101] px-2 py-1 rounded-full text-xs font-bold">
                    Lv.{seedlingLevel}
                  </span>
                </div>
                
                <div className="flex items-center bg-white/20 rounded-full p-2">
                  <span className="text-xs text-white">{(currentPoint || seedlingPoints) % 50}/50</span>
                  <div className="flex-1 h-2 bg-white/30 rounded-full mx-2">
                    <div 
                      className="h-full bg-green-500 rounded-full transition-all duration-500"
                      style={{ width: `${((currentPoint || seedlingPoints) % 50) * 2}%` }}
                    />
                  </div>
                  <span className="text-xs text-white">{progressPercentage}%</span>
                </div>
              </div>

              {/* 미션 목록 */}
              {loading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#1F0101]"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {missionData.slice(0, 6).map(mission => renderMissionCard(mission))}
                </div>
              )}
              
              <Button 
                onClick={() => navigate('/hair-pt')}
                className="w-full h-12 bg-[#1F0101] hover:bg-[#2A0202] text-white rounded-xl font-semibold active:scale-[0.98] transition-all"
              >
                전체 미션 보기
              </Button>
            </div>
          </div>

          {/* 3. 오늘의 두피분석 */}
          <div className="bg-white p-4 rounded-xl shadow-md">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-[#1F0101]" />
                <h3 className="text-lg font-semibold text-gray-800">오늘의 두피분석을 시작하세요</h3>
              </div>
              <p className="text-sm text-gray-600">AI 분석으로 두피 상태를 확인해보세요</p>
              
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
                      const formData = new FormData();
                      formData.append('image', selectedImage);
                      formData.append('top_k', '10');
                      formData.append('use_preprocessing', 'true');
                      
                      if (userId) {
                        formData.append('user_id', userId.toString());
                      }
                      
                      const response = await apiClient.post('/ai/hair-loss-daily/analyze', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                      });
                      
                      const result: HairAnalysisResponse = response.data;
                      setAnalysis(result);
                      updateDashboardFromAnalysis(result);
                      
                      const severityLevel = result.analysis ? parseInt(result.analysis.primary_severity.split('.')[0]) || 0 : 0;
                      const stage = Math.min(3, Math.max(0, severityLevel));
                      const prodRes = await hairProductApi.getProductsByStage(stage);
                      setProducts(prodRes.products.slice(0, 6));
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

export default DailyCareDetail;
