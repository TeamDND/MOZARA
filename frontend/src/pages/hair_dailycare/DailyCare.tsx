import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../utils/store';
import { fetchSeedlingInfo, updateSeedlingNickname, setSeedling } from '../../utils/seedlingSlice';
import { hairProductApi, HairProduct } from '../../services/hairProductApi';
import { elevenStApi } from '../../services/elevenStApi';
import apiClient from '../../services/apiClient';
import pythonClient from '../../services/pythonClient';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../../components/ui/tabs';
import { Separator } from '../../components/ui/separator';
import { 
  CheckCircle, 
  Circle, 
  TrendingUp, 
  Calendar,
  Target,
  Award,
  Heart,
  Droplets,
  Sun,
  Wind,
  Camera,
  Users,
  Gift,
  Lightbulb,
  ArrowLeft,
  BarChart3
} from 'lucide-react';

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
    scalp_score?: number;  // 백엔드에서 계산된 두피 점수 (0-100)
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

const DailyCare: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { createdAt, username, userId } = useSelector((state: RootState) => state.user);
  const { seedlingId, seedlingName, currentPoint, loading: seedlingLoading, error: seedlingError } = useSelector((state: RootState) => state.seedling);


  // 케어 스트릭 상태 (통합)
  const [streakInfo, setStreakInfo] = useState({
    days: 0,
    achieved10Days: false,
    completed: false
  });

  // 케어 스트릭 정보 모달 상태
  const [showStreakInfoModal, setShowStreakInfoModal] = useState(false);

  // 환경 정보 상태 (날씨 API)
  const [environmentInfo, setEnvironmentInfo] = useState<{
    uvIndex: number;
    uvLevel: string;
    humidity: number;
    humidityAdvice: string;
    airQuality: number;
    airQualityLevel: string;
    recommendations: {
      uv: { type: string; message: string; icon: string } | null;
      humidity: { type: string; message: string; icon: string } | null;
      air: { type: string; message: string; icon: string } | null;
    };
  }>({
    uvIndex: 0,
    uvLevel: '정보 없음',
    humidity: 0,
    humidityAdvice: '정보 없음',
    airQuality: 0,
    airQualityLevel: '정보 없음',
    recommendations: {
      uv: null,
      humidity: null,
      air: null
    }
  });

  // 두피 분석 관련 상태
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<HairAnalysisResponse | null>(null);
  const [products, setProducts] = useState<HairProduct[] | null>(null);
  const [tips, setTips] = useState<string[]>([]);

  // 11번가 추천 제품 상태
  const [recommendedProducts, setRecommendedProducts] = useState<any[]>([]);

  // 오늘의 분석 결과 (DB에서 로드된 데이터)
  const [todayAnalysisData, setTodayAnalysisData] = useState<{
    date: string;
    imageUrl: string;
    grade: number;
    summary: string;
  } | null>(null);

  // 진단 히스토리 상태 (탈모분석/두피분석)
  const [hairlossHistory, setHairlossHistory] = useState<AnalysisResult[]>([]);
  const [dailyHistory, setDailyHistory] = useState<AnalysisResult[]>([]);

  // 진단 히스토리 타입 정의
  interface AnalysisResult {
    id: number;
    inspectionDate: string;
    analysisSummary: string;
    advice: string;
    grade: number;
    imageUrl?: string;
    analysisType?: string;
    improvement: string;
  }
  
  // 새싹 관련 상태
  const [seedlingPoints, setSeedlingPoints] = useState(0);
  const [seedlingLevel, setSeedlingLevel] = useState(1);
  const [plantTitle, setPlantTitle] = useState<string>('새싹 키우기');
  
  // 날짜와 연속 케어 일수 상태
  const todayStr = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
  const [streak, setStreak] = useState<number>(1);

  // 주간 분석 데이터 상태
  const [weeklyData, setWeeklyData] = useState<{ day: string; height: number; score: number | null }[]>([
    { day: '일', height: 18, score: null },
    { day: '월', height: 55, score: null },
    { day: '화', height: 62, score: null },
    { day: '수', height: 20, score: null },
    { day: '목', height: 18, score: null },
    { day: '금', height: 65, score: null },
    { day: '토', height: 75, score: null }
  ]);

  // 주간 통계 상태
  const [weeklyAverage, setWeeklyAverage] = useState<number>(0);
  const [weeklyCount, setWeeklyCount] = useState<number>(0);

  // 시계열 비교 모달 상태
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);
  const [comparisonData, setComparisonData] = useState<any>(null);
  const [isComparingImages, setIsComparingImages] = useState(false);
  const [comparisonError, setComparisonError] = useState<string | null>(null);
  const [comparisonPeriod, setComparisonPeriod] = useState<'latest' | '3months' | '6months'>('latest');

  // 밀도 변화 시각화 상태
  const [showDensityVisualization, setShowDensityVisualization] = useState(false);
  const [densityVisualizedImages, setDensityVisualizedImages] = useState<{
    previous: string | null;
    current: string | null;
  }>({ previous: null, current: null });
  const [isLoadingVisualization, setIsLoadingVisualization] = useState(false);

  // 재분석 상태
  const [isReanalyzing, setIsReanalyzing] = useState(false);

  // 최근 2개 Daily 이미지 상태
  const [latestDailyImages, setLatestDailyImages] = useState<{
    current: string | null;
    previous: string | null;
  }>({ current: null, previous: null });

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

  // 새싹 정보 로드
  const loadSeedlingInfo = useCallback(async () => {
    if (!userId) {
      return;
    }

    try {
      const result = await dispatch(fetchSeedlingInfo(userId)).unwrap();
      
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

  // 기간별 Daily 이미지 불러오기
  const loadDailyImagesByPeriod = useCallback(async (period: 'latest' | '3months' | '6months') => {
    if (!userId) return;

    try {

      // 모든 Daily 데이터 가져오기
      const allDailyResponse = await apiClient.get(`/analysis-results/${userId}/type/daily`);

      if (allDailyResponse.data && allDailyResponse.data.length > 0) {
        // 날짜 내림차순 정렬 (최신순)
        const sortedData = allDailyResponse.data.sort((a: any, b: any) =>
          new Date(b.inspectionDate).getTime() - new Date(a.inspectionDate).getTime()
        );

        const currentData = sortedData[0];
        const currentDate = new Date(currentData.inspectionDate);

        let previousData = null;

        if (period === 'latest') {
          // 최신 2건
          previousData = sortedData[1] || null;
        } else if (period === '3months') {
          // 3개월 이내에서 가장 오래된 데이터
          const threeMonthsAgo = new Date(currentDate);
          threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

          const filtered = sortedData
            .filter((item: any) => {
              const itemDate = new Date(item.inspectionDate);
              return itemDate >= threeMonthsAgo && item.id !== currentData.id;
            });

          // 필터링된 배열의 마지막 요소 (최신순 정렬이므로 마지막이 가장 오래된 것)
          previousData = filtered.length > 0 ? filtered[filtered.length - 1] : null;
        } else if (period === '6months') {
          // 6개월 이내에서 가장 오래된 데이터
          const sixMonthsAgo = new Date(currentDate);
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

          const filtered = sortedData
            .filter((item: any) => {
              const itemDate = new Date(item.inspectionDate);
              return itemDate >= sixMonthsAgo && item.id !== currentData.id;
            });

          // 필터링된 배열의 마지막 요소 (최신순 정렬이므로 마지막이 가장 오래된 것)
          previousData = filtered.length > 0 ? filtered[filtered.length - 1] : null;
        }

        setLatestDailyImages({
          current: currentData?.imageUrl || null,
          previous: previousData?.imageUrl || null
        });
      } else {
        setLatestDailyImages({ current: null, previous: null });
      }
    } catch (err) {
      console.error('❌ Daily 이미지 로드 실패:', err);
      setLatestDailyImages({ current: null, previous: null });
    }
  }, [userId]);

  // 최근 2개 Daily 이미지 불러오기 (기존 방식 - 빠른 로드)
  const loadLatestDailyImages = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await apiClient.get(`/timeseries/data/${userId}`);

      if (response.data.success && response.data.data) {
        const dailyData = response.data.data; // 서버에서 이미 daily 최신 2개만 반환

        if (dailyData.length >= 1) {
          setLatestDailyImages({
            current: dailyData[0]?.imageUrl || null,
            previous: dailyData[1]?.imageUrl || null
          });
        }
      }
    } catch (err) {
      console.error('❌ Daily 이미지 로드 실패:', err);
    }
  }, [userId]);

  // 주간 분석 데이터 불러오기
  const loadWeeklyAnalysis = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await apiClient.get(`/weekly-daily-analysis/${userId}`);

      if (response.data && response.data.weeklyData) {
        const data = response.data.weeklyData;

        // 요일별 데이터 업데이트
        const updatedWeeklyData = [
          { day: '일', score: data['일'], height: data['일'] ? Math.max(18, data['일'] * 0.75) : 18 },
          { day: '월', score: data['월'], height: data['월'] ? Math.max(18, data['월'] * 0.75) : 18 },
          { day: '화', score: data['화'], height: data['화'] ? Math.max(18, data['화'] * 0.75) : 18 },
          { day: '수', score: data['수'], height: data['수'] ? Math.max(18, data['수'] * 0.75) : 18 },
          { day: '목', score: data['목'], height: data['목'] ? Math.max(18, data['목'] * 0.75) : 18 },
          { day: '금', score: data['금'], height: data['금'] ? Math.max(18, data['금'] * 0.75) : 18 },
          { day: '토', score: data['토'], height: data['토'] ? Math.max(18, data['토'] * 0.75) : 18 }
        ];

        setWeeklyData(updatedWeeklyData);

        // 평균 점수 및 진단 횟수 계산
        const scores = updatedWeeklyData
          .map(item => item.score)
          .filter((score): score is number => score !== null);
        
        const count = scores.length;
        const average = count > 0 
          ? Math.round(scores.reduce((sum, score) => sum + score, 0) / count * 10) / 10
          : 0;

        setWeeklyCount(count);
        setWeeklyAverage(average);
      }
    } catch (err) {
      console.error('❌ 주간 분석 데이터 로드 실패:', err);
    }
  }, [userId]);

  // Daily 시계열 비교 분석
  const handleCompareImages = async () => {
    if (!userId) {
      alert('로그인이 필요합니다.');
      return;
    }

    setIsComparingImages(true);
    setComparisonError(null);
    setComparisonData(null);

    try {
      const response = await apiClient.get(`/timeseries/daily-comparison/${userId}?period=${comparisonPeriod}`);

      if (!response.data.success) {
        setComparisonError(response.data.message || '비교 데이터가 부족합니다.');
        return;
      }

      setComparisonData(response.data);
      setIsComparisonModalOpen(true);
    } catch (err: any) {
      console.error('❌ 시계열 비교 실패:', err);
      setComparisonError(err.response?.data?.message || '비교 중 오류가 발생했습니다.');
    } finally {
      setIsComparingImages(false);
    }
  };

  // comparisonData가 변경되면 밀도 시각화 리셋
  useEffect(() => {
    setDensityVisualizedImages({ previous: null, current: null });
    setShowDensityVisualization(false);
  }, [comparisonData]);

  // 밀도 변화 시각화 토글
  const toggleDensityVisualization = async () => {
    if (!comparisonData) return;

    // 이미 시각화된 이미지가 있으면 토글만
    if (densityVisualizedImages.previous) {
      setShowDensityVisualization(!showDensityVisualization);
      return;
    }

    // 처음 시각화를 요청하는 경우
    setIsLoadingVisualization(true);
    try {

      // 이전 이미지에만 밀도 변화 시각화 (이전 → 오늘 비교해서 변화된 영역 표시)
      const previousResponse = await apiClient.post(
        '/timeseries/visualize-change',
        {
          current_image_url: comparisonData.previous_image_url,
          past_image_urls: [comparisonData.current_image_url]
        },
        { responseType: 'blob' }
      );

      // Blob을 URL로 변환
      const previousBlobUrl = URL.createObjectURL(previousResponse.data);

      setDensityVisualizedImages({
        previous: previousBlobUrl,
        current: null
      });

      setShowDensityVisualization(true);
    } catch (err: any) {
      console.error('❌ 밀도 변화 시각화 실패:', err);
      alert('밀도 변화 시각화에 실패했습니다.');
    } finally {
      setIsLoadingVisualization(false);
    }
  };

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

  const updateDashboardFromAnalysis = (res: HairAnalysisResponse): number | null => {
    // 백엔드에서 계산된 분석 결과 사용 (비듬/탈모는 이미 백엔드에서 제외됨)
    if (!res.analysis) return null;
    
    // 백엔드에서 비듬/탈모를 이미 제외하고 분석했으므로 그대로 사용
    return updateDashboardWithFilteredData(res.analysis);
  };
  
  const updateDashboardWithFilteredData = (analysis: any): number => {
    // 카테고리 표시용 매핑 테이블
    const categoryDisplayMap: Record<string, string> = {
      "모낭사이홍반": "모낭사이변색",
      "3.모낭사이홍반": "3.모낭사이변색"
    };
    
    const primaryCategory = analysis.primary_category;
    const primarySeverity = analysis.primary_severity;
    
    // 백엔드에서 계산된 점수 사용미세각질 양호, 피지과다 경고, 모낭사이홍반 주의, 모낭홍반농포 양호
    const finalScore = analysis.scalp_score || 100;
    setScalpScore(finalScore);

    // 심각도에 따른 단계 계산 (UI 표시용)
    const severityLevel = parseInt(primarySeverity.split('.')[0]) || 0;
    const stage01to03 = Math.min(3, Math.max(0, severityLevel)); // 0~3
    
    // 카테고리 (UI 표시용 - 매핑 적용)
    const displayCategory = categoryDisplayMap[primaryCategory] || primaryCategory;
    const category = displayCategory.toLowerCase();

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

    // 모낭 상태 판정 (변색 포함)
    if (category.includes('홍반') || category.includes('변색') || category.includes('농포') || stage01to03 >= 2) {
      setRednessLabel('주의');
      setRednessSub('모낭 관리 필요');
    } else if (stage01to03 === 1) {
      setRednessLabel('보통');
      setRednessSub('모낭 관찰중');
    } else {
      setRednessLabel('양호');
      setRednessSub('모낭 정상');
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
  return finalScore;
  };

  // 오늘 날짜의 daily 분석결과 자동 로드
  const loadTodayDailyAnalysis = useCallback(async () => {
    if (!userId) {
      return;
    }

    try {
      const response = await apiClient.get(`/today-analysis/${userId}/daily`);

      if (response.data) {
        
        // AnalysisResultDTO 형식으로 받은 데이터 처리
        const dto = response.data;
        
        // 오늘의 분석 데이터 설정 (UI용)
        setTodayAnalysisData({
          date: dto.inspectionDate || new Date().toISOString().split('T')[0],
          imageUrl: dto.imageUrl || '',
          grade: dto.grade || 75,
          summary: dto.analysisSummary || ''
        });
        
        // 분석결과를 HairAnalysisResponse 형태로 변환
        const todayAnalysis: HairAnalysisResponse = {
          success: true,
          analysis: {
            primary_category: dto.analysisType || "0.양호",
            primary_severity: "0.양호",
            average_confidence: 0.8,
            category_distribution: {},
            severity_distribution: {},
            diagnosis_scores: {},
            recommendations: dto.advice ? [dto.advice] : []
          },
          similar_cases: [],
          total_similar_cases: 0,
          model_info: {},
          preprocessing_used: true,
          preprocessing_info: {
            enabled: true,
            description: "Daily 분석 결과"
          }
        };

        setAnalysis(todayAnalysis);
        
        // 분석결과의 이미지 URL을 latestDailyImages에 설정
        if (dto.imageUrl) {
          setLatestDailyImages(prev => ({
            ...prev,
            current: dto.imageUrl
          }));
        }
        
        // 두피 점수 계산 및 대시보드 업데이트 (DB에 저장된 grade 사용)
        const calculatedScore = dto.grade || 75;
        setScalpScore(calculatedScore);
        
        updateDashboardWithFilteredData({
          primary_category: todayAnalysis.analysis?.primary_category || "0.양호",
          primary_severity: "0.양호",
          average_confidence: 0.8,
          diagnosis_scores: {}
        });

        // 심각도에 따른 제품 추천
        const severityLevel = 0; // daily는 기본적으로 0 (양호)
        const stage = Math.min(3, Math.max(0, severityLevel));
        const prodRes = await hairProductApi.getProductsByStage(stage);
        setProducts(prodRes.products.slice(0, 6));
      }
    } catch (error: any) {
      // Daily 분석결과 없음
    }
  }, [userId, hairProductApi]);

  // 진단 히스토리 불러오기 (탈모분석/두피분석 각 3건씩)
  const loadDiagnosisHistory = useCallback(async () => {
    if (!userId) return;

    try {
      // 탈모분석 최근 3건 (hair_loss_male, hair_loss_female, hairloss 모두 조회)
      const [maleResponse, femaleResponse, hairlossResponse] = await Promise.all([
        apiClient.get(`/analysis-results/${userId}/type/hair_loss_male?sort=newest`).catch(() => ({ data: [] })),
        apiClient.get(`/analysis-results/${userId}/type/hair_loss_female?sort=newest`).catch(() => ({ data: [] })),
        apiClient.get(`/analysis-results/${userId}/type/hairloss?sort=newest`).catch(() => ({ data: [] }))
      ]);

      // 세 가지 타입의 결과를 모두 합치고 날짜순으로 정렬
      const allHairlossResults = [
        ...maleResponse.data,
        ...femaleResponse.data,
        ...hairlossResponse.data
      ].sort((a: any, b: any) => {
        const dateA = new Date(a.inspectionDate || 0).getTime();
        const dateB = new Date(b.inspectionDate || 0).getTime();
        return dateB - dateA; // 최신순 정렬
      });

      const hairlossTop3 = allHairlossResults.slice(0, 3).map((result: any) => ({
        id: result.id,
        inspectionDate: result.inspectionDate
          ? new Date(result.inspectionDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
          : '날짜 없음',
        analysisSummary: result.analysisSummary || '분석 결과 없음',
        advice: result.advice || '',
        grade: result.grade ?? 0,
        imageUrl: result.imageUrl,
        analysisType: result.analysisType || 'hairloss',
        improvement: result.improvement || ''
      }));
      setHairlossHistory(hairlossTop3);

      // 두피분석 최근 3건
      const dailyResponse = await apiClient.get(`/analysis-results/${userId}/type/daily?sort=newest`);
      const dailyTop3 = dailyResponse.data.slice(0, 3).map((result: any) => ({
        id: result.id,
        inspectionDate: result.inspectionDate
          ? new Date(result.inspectionDate).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
          : '날짜 없음',
        analysisSummary: result.analysisSummary || '분석 결과 없음',
        advice: result.advice || '',
        grade: result.grade ?? 0,
        imageUrl: result.imageUrl,
        analysisType: result.analysisType || 'daily',
        improvement: result.improvement || ''
      }));
      setDailyHistory(dailyTop3);
    } catch (error) {
      console.error('진단 히스토리 로드 실패:', error);
    }
  }, [userId]);

  // 환경 정보 불러오기 (Python 백엔드 API 사용)
  const loadEnvironmentInfo = useCallback(async () => {
    try {
      // 위치 정보 가져오기
      if (!navigator.geolocation) {
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;

          try {
            // Python 백엔드 날씨 API 호출 (pythonClient 사용)
            const response = await pythonClient.get(`/api/weather?lat=${latitude}&lon=${longitude}`);
            const result = response.data;

            if (result.success && result.data) {

              setEnvironmentInfo({
                uvIndex: result.data.uvIndex || 0,
                uvLevel: result.data.uvLevel || '정보 없음',
                humidity: result.data.humidity || 0,
                humidityAdvice: result.data.humidityAdvice || '정보 없음',
                airQuality: result.data.airQuality || 0,
                airQualityLevel: result.data.airQualityLevel || '정보 없음',
                recommendations: result.data.recommendations || {
                  uv: null,
                  humidity: null,
                  air: null
                }
              });
            } else {
              console.error('[DailyCare] 날씨 정보 로드 실패:', result.error);
            }
          } catch (error) {
            console.error('날씨 API 호출 실패:', error);
          }
        },
        (error) => {
          console.error('위치 정보 가져오기 실패:', error);
        }
      );
    } catch (error) {
      console.error('환경 정보 로드 실패:', error);
    }
  }, []);

  // 날씨 정보 기반 탈모 케어 조언 생성 (백엔드 우선)
  const getHairCareAdvice = () => {
    const { recommendations } = environmentInfo;

    // 백엔드 recommendations 사용, 없으면 기본 메시지
    return {
      uv: (recommendations.uv && recommendations.uv.message) || '날씨 정보를 불러오는 중...',
      humidity: (recommendations.humidity && recommendations.humidity.message) || '날씨 정보를 불러오는 중...',
      air: (recommendations.air && recommendations.air.message) || '날씨 정보를 불러오는 중...'
    };
  };

  // 날씨 기반 케어 팁 생성
  const getWeatherBasedTips = (): string[] => {
    const { humidity, uvIndex, airQuality } = environmentInfo;
    const weatherTips: string[] = [];

    // 습도 기반 팁
    if (humidity <= 40) {
      weatherTips.push('💧 건조한 날씨입니다. 두피 보습 토너를 사용하여 수분을 공급하세요.');
      weatherTips.push('🚿 샴푸 후 미온수로 마무리하여 두피 건조를 방지하세요.');
    } else if (humidity <= 70) {
      weatherTips.push('🌤️ 적절한 습도입니다. 균형잡힌 두피 관리를 유지하세요.');
      weatherTips.push('💆‍♀️ 두피 마사지로 혈액순환을 개선하면 좋습니다.');
    } else {
      weatherTips.push('💦 습한 날씨입니다. 피지 조절 샴푸로 두피를 깨끗이 관리하세요.');
      weatherTips.push('🌬️ 두피가 습하지 않도록 드라이어로 완전히 건조시키세요.');
    }

    // 자외선 기반 팁
    if (uvIndex >= 8) {
      weatherTips.push('☀️ 자외선이 매우 강합니다. 외출 시 모자를 착용하여 두피를 보호하세요.');
    } else if (uvIndex >= 5) {
      weatherTips.push('🌞 자외선이 높습니다. 장시간 야외활동 시 두피 보호에 신경 쓰세요.');
    } else if (uvIndex >= 3) {
      weatherTips.push('🌤️ 적당한 자외선 수준입니다. 기본적인 두피 보호를 유지하세요.');
    }

    // 미세먼지 기반 팁
    if (airQuality >= 76) {
      weatherTips.push('😷 미세먼지가 나쁩니다. 외출 후에는 꼼꼼하게 두피를 클렌징하세요.');
      weatherTips.push('🚪 실내 활동을 권장하며, 외출 시 모자로 두피를 보호하세요.');
    } else if (airQuality >= 36) {
      weatherTips.push('🌫️ 미세먼지가 보통입니다. 외출 후 샴푸로 두피의 먼지를 제거하세요.');
    }

    // 기본 팁 추가
    weatherTips.push('🧴 하루 1회 저자극 샴푸로 두피를 깨끗하게 관리하세요.');
    weatherTips.push('🌙 충분한 수면과 스트레스 관리로 두피 건강을 지켜주세요.');

    return weatherTips.slice(0, 5); // 최대 5개 팁 반환
  };

  // 습도 기반 11번가 제품 로드
  const loadHumidityBasedProducts = useCallback(async () => {
    const humidity = environmentInfo.humidity;
    let keyword = '';

    if (humidity <= 40) {
      keyword = '두피 수분 에센스';
    } else if (humidity <= 70) {
      keyword = '두피 밸런스 토너';
    } else {
      keyword = '피지 컨트롤 샴푸';
    }

    try {
      const response = await elevenStApi.searchProducts(keyword, 1, 1);
      
      if (response.products.length > 0) {
        setRecommendedProducts([response.products[0]]);
      }
    } catch (error) {
      console.error('11번가 제품 검색 실패:', error);
      setRecommendedProducts([]);
    }
  }, [environmentInfo.humidity]);

  // 연속 케어 일수 계산
  React.useEffect(() => {
    // createdAt 기반 연속 케어 일수 계산
    const calculateStreakFromCreatedAt = () => {
      if (!createdAt) {
        return 1; // createdAt이 없으면 기본값 1
      }

      const today = new Date();
      const joinDate = new Date(createdAt);

      // 가입일부터 오늘까지의 일수 계산
      const diffMs = today.setHours(0,0,0,0) - joinDate.setHours(0,0,0,0);
      const diffDays = Math.floor(diffMs / (1000*60*60*24));

      // 최소 1일, 최대 365일로 제한
      return Math.max(1, Math.min(365, diffDays + 1));
    };

    const streakCount = calculateStreakFromCreatedAt();
    setStreak(streakCount);

    // 새싹 정보 로드
    loadSeedlingInfo();

    // 최근 Daily 이미지 로드
    loadLatestDailyImages();

    // 주간 분석 데이터 로드
    loadWeeklyAnalysis();

    // 환경 정보 로드
    loadEnvironmentInfo();
  }, [createdAt, loadSeedlingInfo, loadLatestDailyImages, loadWeeklyAnalysis, loadEnvironmentInfo]);

  // 오늘 날짜의 daily 분석결과 자동 로드 (별도 useEffect)
  React.useEffect(() => {
    if (userId) {
      loadTodayDailyAnalysis();
      loadDiagnosisHistory(); // 진단 히스토리 로드
      loadStreakInfo(); // 케어 스트릭 로드
    }
  }, [userId, loadTodayDailyAnalysis, loadDiagnosisHistory]);

  // 습도 정보가 로드되면 제품 추천
  React.useEffect(() => {
    if (environmentInfo.humidity > 0) {
      loadHumidityBasedProducts();
    }
  }, [environmentInfo.humidity, loadHumidityBasedProducts]);

  // 비교 기간 변경 시 이미지 리렌더링 (최신 제외)
  React.useEffect(() => {
    if (userId && comparisonPeriod !== 'latest') {
      loadDailyImagesByPeriod(comparisonPeriod);
    }
  }, [comparisonPeriod, userId, loadDailyImagesByPeriod]);

  // 케어 스트릭 정보 로드
  const loadStreakInfo = async () => {
    if (!userId) return;

    try {
      const response = await apiClient.get(`/habit/streak/${userId}`);
      const { currentStreak, hasAchieved10Days: achieved, isCompleted } = response.data;

      // 상태 통합 업데이트
      setStreakInfo({
        days: achieved ? 10 : currentStreak,
        achieved10Days: achieved,
        completed: isCompleted
      });
    } catch (error) {
      console.error('스트릭 정보 로드 실패:', error);
    }
  };

  // 케어 스트릭 10일 달성 포인트 받기
  const handleStreakReward = async () => {
    if (!userId) return;

    try {
      // habitId 18번은 10일 연속 출석 보너스 미션
      await apiClient.post(`/habit/complete/${userId}/18`);

      alert('100포인트를 받았습니다! 🎉 10일 연속 출석 달성!');

      // 스트릭 정보 갱신
      setStreakInfo(prev => ({ ...prev, completed: true }));

      // 새싹 포인트 갱신
      dispatch(fetchSeedlingInfo(userId));
    } catch (error) {
      console.error('스트릭 보상 수령 실패:', error);
      alert('포인트 수령에 실패했습니다. 다시 시도해주세요.');
    }
  };


  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto bg-white min-h-screen pb-32">

        {/* Main Title Section */}
        <div className="px-4 py-6 text-center">
          <h2 className="text-lg font-bold text-[#1f0101] mb-2">데일리케어</h2>
          <p className="text-gray-600 text-sm">개인 맞춤형 두피 케어와 건강 추적을 시작해보세요</p>
        </div>

        {/* 상단 그라데이션 배너 (Mobile-First) */}
        <div className="text-white p-4 mx-4 rounded-xl" style={{ background: 'linear-gradient(135deg, rgba(139, 58, 58, 0.8) 0%, rgba(90, 26, 26, 0.8) 50%, rgba(58, 10, 10, 0.8) 100%)' }}>
          <div className="text-center">
            <p className="text-sm opacity-90">{todayStr}</p>
            <h1 className="text-xl font-bold mt-1">좋은 하루예요!</h1>
            <h1 className="text-xl font-bold mt-1">데일리 케어를 시작해볼까요?</h1>
            <p className="mt-1 text-white/90">
              {streakInfo.days === 0
                ? "오늘부터 케어를 시작해보세요! 💪"
                : `${streakInfo.days}일 연속 케어 중 ✨`}
            </p>
          </div>
        </div>

        {/* 오늘의 두피 분석 */}
        <Card className="mx-4 mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-[#1f0101]">오늘의 두피 분석</CardTitle>
            <p className="text-sm text-gray-600 mt-1">오늘의 두피 상태를 확인해보세요. (정수리 영역 사진) </p>
            <p className="text-xs text-green-600 mt-1">본 분석은 어디까지나 프로토타입으로 정확성이 떨어지면 정확한 진단은 병원에서 진행해주세요</p>
            
          </CardHeader>
          <CardContent className="space-y-3">
            {/* 오늘의 분석 결과가 있을 때 */}
            {todayAnalysisData && !isReanalyzing ? (
              <div className="space-y-4">
                {/* 날짜 및 점수 */}
                <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#1f0101] to-[#2A0202] rounded-xl text-white">
                  <div>
                    <p className="text-xs opacity-90">분석 날짜</p>
                    <p className="text-lg font-bold">
                      {new Date(todayAnalysisData.date).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs opacity-90">두피 점수</p>
                    <p className="text-2xl font-bold">{todayAnalysisData.grade}점</p>
                  </div>
                </div>

                {/* 분석 이미지 */}
                <div className="text-center">
                  <div className="w-full max-w-xs mx-auto rounded-xl overflow-hidden border-2 border-[#1f0101]">
                    <img
                      src={todayAnalysisData.imageUrl || '/default-scalp-image.jpg'}
                      alt="오늘의 두피 분석"
                      className="w-full aspect-square object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/default-scalp-image.jpg';
                      }}
                    />
                  </div>
                </div>

                {/* 분석 요약 카드들 */}
                {todayAnalysisData.summary && todayAnalysisData.summary.trim() !== '' && (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-[#1f0101]">📋 분석 요약</p>
                    <div className="grid grid-cols-2 gap-3">
                      {todayAnalysisData.summary.split(', ').filter(item => item.trim() !== '').map((item, index) => {
                        const trimmedItem = item.trim();
                        
                        // 텍스트 내용에 따라 배경색, 글자색, 테두리색, 이모티콘 결정
                        let bgColor = '#f0f9ff'; // 연한 파란색 배경
                        let textColor = '#1e40af'; // 진한 파란색 글자
                        let borderColor = '#3b82f6'; // 파란색 테두리
                        let emoji = '💡'; // 기본 전구 이모티콘
                        
                        if (trimmedItem.includes('양호')) {
                          bgColor = '#f0fdf4'; // 연한 초록색 배경
                          textColor = '#166534'; // 진한 초록색 글자
                          borderColor = '#22c55e'; // 초록색 테두리
                          emoji = '✅';
                        } else if (trimmedItem.includes('경고')) {
                          bgColor = '#fffbeb'; // 연한 노란색 배경
                          textColor = '#92400e'; // 진한 갈색 글자
                          borderColor = '#fbbf24'; // 노란색 테두리
                          emoji = '⚠️';
                        } else if (trimmedItem.includes('주의')) {
                          bgColor = '#fff7ed'; // 연한 주황색 배경
                          textColor = '#c2410c'; // 진한 주황색 글자
                          borderColor = '#f97316'; // 주황색 테두리
                          emoji = '🔶';
                        }
                        
                        return (
                          <Card 
                            key={index}
                            className="border-2 rounded-xl" 
                            style={{ 
                              backgroundColor: bgColor,
                              borderColor: borderColor
                            }}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <span className="text-lg flex-shrink-0">{emoji}</span>
                                <p className="text-sm leading-relaxed" style={{ color: textColor }}>
                                  {trimmedItem}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 재분석하기 버튼 */}
                <Button
                  onClick={() => {
                    setIsReanalyzing(true);
                    setSelectedImage(null);
                  }}
                  className="w-full h-12 bg-[#1f0101] text-white rounded-xl hover:bg-[#2A0202] font-semibold"
                >
                  재분석하기
                </Button>
              </div>
            ) : (
              /* 분석 결과가 없을 때 또는 재분석 모드 - 파일 업로드 UI */
              <>
                {isReanalyzing && (
                  <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">재분석 모드입니다. 새로운 사진을 업로드하세요.</p>
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setSelectedImage(e.target.files?.[0] || null)}
                  className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 hover:file:bg-gray-200"
                />
                {isReanalyzing && todayAnalysisData && (
                  <Button
                    onClick={() => {
                      setIsReanalyzing(false);
                      setSelectedImage(null);
                    }}
                    className="w-full h-10 bg-gray-400 text-white rounded-xl hover:bg-gray-500 font-semibold mb-2"
                  >
                    취소
                  </Button>
                )}
                <Button
                  onClick={async () => {
                if (!selectedImage) return alert('두피 사진을 업로드해주세요.');
                setIsAnalyzing(true);
                setProducts(null);
                try {
                  // 1단계: S3 업로드
                  let imageUrl: string | null = null;
                  if (username) {
                    try {
                      const uploadFormData = new FormData();
                      uploadFormData.append('image', selectedImage);
                      uploadFormData.append('username', username);

                      const uploadResponse = await apiClient.post('/images/upload/hair-damage', uploadFormData, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                      });

                      if (uploadResponse.data.success) {
                        imageUrl = uploadResponse.data.imageUrl;
                      }
                    } catch (uploadError) {
                      console.error('❌ S3 업로드 실패:', uploadError);
                      // S3 업로드 실패 시에도 분석은 진행 (imageUrl 없이)
                    }
                  }

                  // 2단계: 스프링부트 AI 분석 API 호출
                  const formData = new FormData();
                  formData.append('image', selectedImage);
                  formData.append('top_k', '10');
                  formData.append('use_preprocessing', 'true');

                  // 로그인한 사용자의 user_id 추가
                  if (userId) {
                    formData.append('user_id', userId.toString());
                  }

                  // S3 URL이 있으면 추가
                  if (imageUrl) {
                    formData.append('image_url', imageUrl);
                  }

                  const response = await apiClient.post('/ai/hair-loss-daily/analyze', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                  });

                          const result: HairAnalysisResponse = response.data;
                          setAnalysis(result);

                          // 두피 점수 계산 및 대시보드 업데이트
                          const calculatedScore = updateDashboardFromAnalysis(result);

                          // scalpScore를 포함하여 백엔드로 grade 저장 요청
                          if (userId && calculatedScore !== null) {
                            try {
                              // save_result에 grade 추가하여 재저장 API 호출
                              const savePayload = {
                                ...result,
                                user_id: userId,
                                grade: calculatedScore,
                                image_url: imageUrl || ''
                              };

                              const saveResponse = await apiClient.post('/ai/hair-loss-daily/save-result', savePayload);

                              // Daily 이미지 새로고침
                              loadLatestDailyImages();
                              
                              // 오늘의 분석결과 새로고침
                              loadTodayDailyAnalysis();

                              // 주간 분석 데이터 새로고침
                              loadWeeklyAnalysis();

                              // 재분석 모드 해제
                              setIsReanalyzing(false);
                            } catch (saveError) {
                              console.error('❌ 두피 점수 저장 실패:', saveError);
                            }
                          }


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
              className="w-full h-12 bg-[#1f0101] hover:bg-[#2a0202] text-white rounded-xl disabled:opacity-50 font-semibold shadow-md hover:shadow-lg transition-all"
            >
              {isAnalyzing ? '분석 중...' : '사진으로 AI 분석'}
            </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* 분석 결과 통계 카드
        {analysis && (
          <div className="grid grid-cols-2 gap-3 mx-4 mt-4">
            <Card className="border-0" style={{ backgroundColor: '#1f0101' }}>
              <CardContent className="p-4 text-white">
                <p className="text-xs opacity-90">두피 점수</p>
                <div className="mt-1 text-2xl font-bold">{scalpScore}</div>
                <p className="mt-1 text-xs opacity-90">LLM 종합 분석</p>
              </CardContent>
            </Card>
            <Card className="border-0" style={{ backgroundColor: '#1f0101', opacity: 0.8 }}>
              <CardContent className="p-4 text-white">
                <p className="text-xs opacity-90">비듬 상태</p>
                <div className="mt-1 text-xl font-bold">{dandruffLabel}</div>
                <p className="mt-1 text-xs opacity-90">{dandruffSub}</p>
              </CardContent>
            </Card>
            <Card className="border-0" style={{ backgroundColor: '#1f0101', opacity: 0.6 }}>
              <CardContent className="p-4 text-white">
                <p className="text-xs opacity-90">각질 상태</p>
                <div className="mt-1 text-xl font-bold">{flakeLabel}</div>
                <p className="mt-1 text-xs opacity-90">{flakeSub}</p>
              </CardContent>
            </Card>
            <Card className="border-0" style={{ backgroundColor: '#1f0101', opacity: 0.4 }}>
              <CardContent className="p-4 text-white">
                <p className="text-xs opacity-90">홍반 상태</p>
                <div className="mt-1 text-xl font-bold">{rednessLabel}</div>
                <p className="mt-1 text-xs opacity-90">{rednessSub}</p>
              </CardContent>
            </Card>
          </div>
        )} */}

        {/* 시계열 변화 분석 버튼
        {todayAnalysisData && (
          <div className="mx-4 mt-4">
            <Button
              onClick={() => navigate('/timeseries-analysis')}
              className="w-full bg-gradient-to-r from-[#1f0101] to-[#2A0202] text-white hover:opacity-90 flex items-center justify-center gap-2"
            >
              <BarChart3 className="h-5 w-5" />
              변화 추이 보기
            </Button>
          </div>
        )} */}

        {/* 새싹 키우기 UI */}
        <div className="mx-4 mt-4 rounded-xl p-1 shadow-lg" style={{ background: 'linear-gradient(135deg, rgba(139, 58, 58, 0.8) 0%, rgba(90, 26, 26, 0.8) 50%, rgba(58, 10, 10, 0.8) 100%)' }}>
          <div className="bg-white rounded-lg p-4">
            <div className="space-y-4">
              {/* 헤더: 새싹 아이콘과 제목 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{plantStages[seedlingLevel as keyof typeof plantStages].emoji}</span>
                  <h3 className="text-lg font-semibold text-gray-800">{seedlingName || plantTitle || '새싹 키우기'}</h3>
                </div>
                <button className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors">
                  <i className="fas fa-pen text-sm text-gray-600"></i>
                </button>
              </div>

              {/* 새싹 이미지 */}
              <div className="text-center">
                <div className="text-6xl mb-3">{plantStages[seedlingLevel as keyof typeof plantStages].emoji}</div>
              </div>

              {/* 동기부여 메시지 */}
              <div className="bg-gray-100 rounded-xl p-3 text-center">
                <p className="text-sm text-gray-700">오늘의 건강한 습관을 실천하고 새싹을 키워보세요!</p>
              </div>

              {/* 진행률 바 */}
              <div className="flex items-center bg-gray-100 rounded-2xl p-3">
                <span className="bg-[#8B3A3A] text-white px-3 py-1 rounded-full text-sm font-bold">
                  Lv.{seedlingLevel}
                </span>
                <div className="flex-1 h-2 bg-gray-200 rounded-full mx-3 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${((currentPoint || seedlingPoints) % 50) * 2}%`,
                      background: 'linear-gradient(90deg, rgba(139, 58, 58, 0.8) 0%, rgba(90, 26, 26, 0.8) 100%)'
                    }}
                  />
                </div>
                <span className="text-xs text-gray-700">{(currentPoint || seedlingPoints) % 50}/50</span>
              </div>

              {/* PT 시작 버튼 */}
              <Button
                onClick={() => navigate('/hair-pt')}
                className="w-full h-12 bg-[#1f0101] hover:bg-[#2a0202] text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all"
              >
                PT 시작하기
              </Button>
            </div>
          </div>
        </div>

        {/* Graph Section */}
        <Card className="mx-4 mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-[#1f0101]">
              <BarChart3 className="h-5 w-5 text-[#1f0101]" />
              주간 분석 로그
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-36 flex items-end justify-around px-2">
              {weeklyData.map((item, index) => (
                <div key={index} className="flex flex-col items-center flex-1 max-w-10">
                  <div 
                    className="w-full rounded-sm relative mb-2"
                    style={{ height: `${item.height}px`, backgroundColor: '#1f0101', opacity: item.score ? 0.8 : 0.1 }}
                  >
                    {item.score && (
                      <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#1f0101' }}></div>
                    )}
                  </div>
                  <span className="text-xs text-gray-600">{item.day}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 mx-4 mt-4">
          <Card className="border-0 shadow-lg" style={{ background: 'linear-gradient(135deg, rgba(139, 58, 58, 0.8) 0%, rgba(90, 26, 26, 0.8) 100%)' }}>
            <CardContent className="p-5 text-white">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm opacity-90">평균 점수</span>
              </div>
              <div className="text-3xl font-bold mb-1">
                {weeklyAverage > 0 ? weeklyAverage.toFixed(1) : '-'}
              </div>
              <div className="text-sm opacity-90">
                {weeklyCount > 0 ? '이번 주' : '데이터 없음'}
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg" style={{ background: 'linear-gradient(135deg, rgba(139, 58, 58, 0.8) 0%, rgba(90, 26, 26, 0.8) 100%)' }}>
            <CardContent className="p-5 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4" />
                <span className="text-sm opacity-90">진단 횟수</span>
              </div>
              <div className="text-3xl font-bold mb-1">{weeklyCount}회</div>
              <div className="text-sm opacity-90">이번 주</div>
            </CardContent>
          </Card>
        </div>


        {/* Care Streak */}
        <Card className="mx-4 mt-4">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg flex items-center gap-2 text-[#1f0101]">
                  <Award className="h-5 w-5" style={{ color: '#1f0101' }} />
                  케어 스트릭
                </CardTitle>
                <div
                  className="relative"
                  onMouseEnter={() => setShowStreakInfoModal(true)}
                  onMouseLeave={() => setShowStreakInfoModal(false)}
                >
                  <button
                    className="w-5 h-5 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center transition-colors"
                  >
                    <span className="text-gray-600 text-xs">?</span>
                  </button>
                  {showStreakInfoModal && (
                    <div className="absolute top-8 left-0 z-50 w-80">
                      <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-4">
                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <Award className="h-4 w-4 text-blue-500" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-800 mb-2">케어 스트릭이란?</h3>
                            <p className="text-sm text-gray-600 mb-3">
                              케어 스트릭은 이번달 헤어 PT의 한 항목이라도 수행한 날이 연속되었는지를 체크합니다.
                              매일 꾸준히 관리하여 건강한 모발을 유지하세요!
                            </p>
                            <div className="border-t border-gray-100 pt-3">
                              <h4 className="font-medium text-gray-800 mb-2">보너스 혜택</h4>
                              <p className="text-sm text-gray-600">
                                10일 연속 달성 시 100포인트를 획득할 수 있습니다.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold" style={{ color: '#1f0101' }}>
                  {streakInfo.achieved10Days ? '10+' : streakInfo.days}일
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-1 mb-3">
              {Array.from({ length: 10 }, (_, i) => (
                <div
                  key={i}
                  className={`flex-1 h-8 rounded-md flex items-center justify-center text-xs text-white ${
                    i < streakInfo.days ? '' : 'bg-gray-300'
                  }`}
                  style={i < streakInfo.days ? { backgroundColor: '#1f0101' } : {}}
                >
                  {i + 1}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
              <Gift className="h-4 w-4" />
              <span>10일 연속 달성시 보너스 포인트 100P!</span>
            </div>

            {/* 10일 달성 시 버튼 표시 */}
            {streakInfo.achieved10Days && (
              streakInfo.completed ? (
                <Button
                  disabled
                  className="w-full bg-gray-400 text-white font-bold py-3 rounded-xl shadow-lg opacity-60 cursor-not-allowed"
                >
                  ✓ 케어 스트릭 포인트 지급 완료
                </Button>
              ) : (
                <Button
                  onClick={handleStreakReward}
                  className="w-full bg-[#1f0101] hover:bg-[#2f0202] text-white font-bold py-3 rounded-xl shadow-lg opacity-80"
                >
                  🎉 이번달 케어 스트릭 달성 (+100P)
                </Button>
              )
            )}
          </CardContent>
        </Card>

        {/* Environment Info */}
        <div className="grid grid-cols-3 gap-3 mx-4 mt-4">
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-3 text-center">
              <Sun className="h-6 w-6 mx-auto mb-2" style={{ color: '#1f0101' }} />
              <p className="text-xs font-medium" style={{ color: '#1f0101' }}>
                자외선 {environmentInfo.uvLevel}
              </p>
              <p className="text-xs text-gray-600">
                {getHairCareAdvice().uv}
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-3 text-center">
              <Droplets className="h-6 w-6 mx-auto mb-2" style={{ color: '#1f0101' }} />
              <p className="text-xs font-medium" style={{ color: '#1f0101' }}>
                습도 {environmentInfo.humidity}%
              </p>
              <p className="text-xs text-gray-600">{getHairCareAdvice().humidity}</p>
            </CardContent>
          </Card>

          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-3 text-center">
              <Wind className="h-6 w-6 mx-auto mb-2" style={{ color: '#1f0101' }} />
              <p className="text-xs font-medium" style={{ color: '#1f0101' }}>미세먼지</p>
              <p className="text-xs text-gray-600">{getHairCareAdvice().air}</p>
            </CardContent>
          </Card>
        </div>

        {/* Photo Comparison */}
        <Card className="mx-4 mt-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2 text-[#1f0101]">
                <Camera className="h-5 w-5" style={{ color: '#1f0101' }} />
                두피 관리 변화 추적
              </CardTitle>
              {/* 비교 기간 선택 버튼 */}
              <div className="flex gap-1">
                <Button
                  variant={comparisonPeriod === 'latest' ? 'default' : 'outline'}
                  size="sm"
                  className="text-[10px] h-6 px-2"
                  onClick={() => {
                    setComparisonPeriod('latest');
                    loadLatestDailyImages(); // 기존 API로 최신 2건 로드
                  }}
                >
                  최신
                </Button>
                <Button
                  variant={comparisonPeriod === '3months' ? 'default' : 'outline'}
                  size="sm"
                  className="text-[10px] h-6 px-2"
                  onClick={() => setComparisonPeriod('3months')}
                >
                  3개월
                </Button>
                <Button
                  variant={comparisonPeriod === '6months' ? 'default' : 'outline'}
                  size="sm"
                  className="text-[10px] h-6 px-2"
                  onClick={() => setComparisonPeriod('6months')}
                >
                  6개월
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="text-center">
                {latestDailyImages.previous ? (
                  <img
                    src={latestDailyImages.previous}
                    alt="이전 레포트"
                    className="aspect-square object-cover rounded-xl mb-2 w-full border-2 border-gray-300"
                  />
                ) : (
                  <div className="aspect-square bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl mb-2 flex items-center justify-center">
                    <Camera className="h-8 w-8 text-gray-500" />
                  </div>
                )}
                <p className="text-xs text-gray-600">이전 레포트</p>
              </div>
              <div className="text-center">
                {latestDailyImages.current ? (
                  <img
                    src={latestDailyImages.current}
                    alt="최신 레포트"
                    className="aspect-square object-cover rounded-xl mb-2 w-full border-2 border-gray-300"
                    /* style={{ borderColor: '#1f0101' }} */
                  />
                ) : (
                  <div className="aspect-square bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl mb-2 flex items-center justify-center border-2" style={{ borderColor: '#1f0101' }}>
                    <Camera className="h-8 w-8" style={{ color: '#1f0101' }} />
                  </div>
                )}
                <p className="text-xs" style={{ color: '#1f0101' }}>최신 레포트</p>
              </div>
            </div>

            <Button
              className="w-full bg-[#1f0101] hover:bg-[#2a0202] text-white font-semibold shadow-md hover:shadow-lg transition-all"
              onClick={handleCompareImages}
              disabled={isComparingImages}
            >
              {isComparingImages ? '분석 중...' : '변화 분석하기'}
            </Button>
            {comparisonError && (
              <p className="text-xs text-red-600 mt-2 text-center">{comparisonError}</p>
            )}
          </CardContent>
        </Card>



        {/* Product Recommendation */}
        {recommendedProducts.length > 0 && (
          <Card className="mx-4 mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2 text-[#1f0101]">
                <Droplets className="h-5 w-5" style={{ color: '#1f0101' }} />
                오늘의 추천 제품
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#1f0101' }}>
                    <Droplets className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{recommendedProducts[0].productName}</p>
                    <p className="text-xs text-gray-600">
                      {environmentInfo.humidity <= 40 
                        ? '건조한 두피에 효과적' 
                        : environmentInfo.humidity <= 70
                        ? '균형잡힌 두피 관리'
                        : '과다 피지 조절에 효과적'}
                    </p>
                    <Badge variant="secondary" className="mt-1" style={{ backgroundColor: '#1f0101', color: 'white'}}>
                      {recommendedProducts[0].productPrice.toLocaleString()}원
                    </Badge>
                  </div>
                </div>
                <Button 
                  size="sm"
                  className="w-full h-8 text-xs"
                  style={{ backgroundColor: '#1f0101' }}
                  onClick={() => window.open(recommendedProducts[0].productUrl, '_blank')}
                >
                  구매하러 가기
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* History Section */}
        <Card className="mx-4 mt-4">
          <CardHeader >
            <CardTitle className="text-lg flex items-center gap-2 text-[#1f0101]">
              <BarChart3 className="h-5 w-5" style={{ color: '#1f0101' }} />
              진단 히스토리
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pt-2 pb-4">
            <Tabs defaultValue="hairloss" className="w-full">
              <TabsList className="flex overflow-x-auto space-x-2 pb-2 bg-transparent mb-4">
                <TabsTrigger
                  value="hairloss"
                  className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-gray-100 text-gray-600 data-[state=active]:!bg-[#1f0101] data-[state=active]:!text-white hover:bg-gray-200 transition-colors"
                >
                  탈모분석
                </TabsTrigger>
                <TabsTrigger
                  value="daily"
                  className="flex-1 px-4 py-2.5 text-sm font-medium rounded-lg bg-gray-100 text-gray-600 data-[state=active]:!bg-[#1f0101] data-[state=active]:!text-white hover:bg-gray-200 transition-colors"
                >
                  두피분석
                </TabsTrigger>
              </TabsList>

              {/* 탈모분석 탭 */}
              <TabsContent value="hairloss" className="mt-0">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  {hairlossHistory.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {hairlossHistory.map((result, index) => (
                        <div
                          key={result.id}
                          className="p-4 hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                          onClick={() => navigate('/my-report', { state: { analysisResult: result } })}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-3">
                                <h4 className="font-semibold text-gray-900 text-sm">
                                  AI 탈모 단계 검사 리포트 #{hairlossHistory.length - index}
                                </h4>
                                <Badge variant="outline" className="text-xs border-gray-200 text-gray-700">
                                  탈모 단계 검사
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 mb-2">
                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                  <Calendar className="h-3 w-3" />
                                  {result.inspectionDate}
                                </span>
                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                  <Target className="h-3 w-3" />
                                  {result.grade}단계
                                </span>
                              </div>
                            </div>
                            <ArrowLeft className="h-5 w-5 text-gray-400 flex-shrink-0 rotate-180" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      탈모분석 기록이 없습니다
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* 두피분석 탭 */}
              <TabsContent value="daily" className="mt-0">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  {dailyHistory.length > 0 ? (
                    <div className="divide-y divide-gray-100">
                      {dailyHistory.map((result, index) => (
                        <div
                          key={result.id}
                          className="p-4 hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                          onClick={() => navigate('/my-report', { state: { analysisResult: result } })}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-3">
                                <h4 className="font-semibold text-gray-900 text-sm">
                                  AI 두피 분석 리포트 #{dailyHistory.length - index}
                                </h4>
                                <Badge variant="outline" className="text-xs border-gray-200 text-gray-700">
                                  두피 분석
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 mb-2">
                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                  <Calendar className="h-3 w-3" />
                                  {result.inspectionDate}
                                </span>
                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                  <Target className="h-3 w-3" />
                                  {result.grade}점
                                </span>
                              </div>
                            </div>
                            <ArrowLeft className="h-5 w-5 text-gray-400 flex-shrink-0 rotate-180" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500 text-sm">
                      두피분석 기록이 없습니다
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <Button
              onClick={() => navigate('/integrated-diagnosis')}
              className="w-full mt-4 bg-[#1f0101] hover:bg-[#2a0202] text-white font-semibold shadow-md hover:shadow-lg transition-all"
            >
              새로운 진단하기
            </Button>
          </CardContent>
        </Card>

        {/* Daily Tip */}
        {environmentInfo.humidity > 0 && (
          <Card className="mx-4 mt-4 bg-gray-50 border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="h-4 w-4" style={{ color: '#1f0101' }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold" style={{ color: '#1f0101' }}>오늘의 건강 팁</h4>
                  </div>
                  <ol className="list-decimal ml-4 text-xs text-gray-700 space-y-1.5">
                    {getWeatherBasedTips().map((tip, i) => <li key={i}>{tip}</li>)}
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white flex justify-around items-center py-2 pb-5 z-50">
          <Button variant="ghost" className="flex flex-col items-center p-2 h-auto">
            <Heart className="h-5 w-5 mb-1" style={{ color: '#1f0101' }} />
            <span className="text-xs" style={{ color: '#1f0101' }}>홈</span>
          </Button>
          <Button variant="ghost" className="flex flex-col items-center p-2 h-auto">
            <Target className="h-5 w-5 mb-1" style={{ color: '#1f0101' }} />
            <span className="text-xs" style={{ color: '#1f0101' }}>AI진단</span>
          </Button>
          <Button variant="ghost" className="flex flex-col items-center p-2 h-auto" style={{ color: '#1f0101' }}>
            <BarChart3 className="h-5 w-5 mb-1" />
            <span className="text-xs">기록</span>
          </Button>
          <Button variant="ghost" className="flex flex-col items-center p-2 h-auto">
            <Award className="h-5 w-5 mb-1" style={{ color: '#1f0101' }} />
            <span className="text-xs" style={{ color: '#1f0101' }}>케어</span>
          </Button>
          <Button variant="ghost" className="flex flex-col items-center p-2 h-auto">
            <Users className="h-5 w-5 mb-1" style={{ color: '#1f0101' }} />
            <span className="text-xs" style={{ color: '#1f0101' }}>MY</span>
          </Button>
        </div>
      </div>

      {/* 시계열 비교 모달 */}
      {isComparisonModalOpen && comparisonData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* 헤더 */}
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-[#1f0101]">변화 분석 결과</h2>
                <button
                  onClick={toggleDensityVisualization}
                  disabled={isLoadingVisualization}
                  className={`px-3 py-1 text-xs rounded-full transition-colors ${
                    showDensityVisualization
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isLoadingVisualization ? '로딩 중...' : showDensityVisualization ? '밀도 표시 ON' : '밀도 표시 OFF'}
                </button>
              </div>
              <button
                onClick={() => setIsComparisonModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            {/* 날짜 정보 */}
            <div className="p-4 border-b bg-gray-50">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div>
                  <p className="text-xs text-gray-600 mb-1">이전 레포트</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {comparisonData.previous_date}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">오늘 레포트</p>
                  <p className="text-sm font-semibold text-[#1f0101]">
                    {comparisonData.current_date}
                  </p>
                </div>
              </div>
            </div>

            {/* 이미지 비교 */}
            <div className="p-4 border-b">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <img
                    src={
                      showDensityVisualization && densityVisualizedImages.previous
                        ? densityVisualizedImages.previous
                        : comparisonData.previous_image_url
                    }
                    alt="이전 사진"
                    className="w-full aspect-square object-cover rounded-lg border-2 border-gray-300"
                  />
                </div>
                <div>
                  <img
                    src={comparisonData.current_image_url}
                    alt="현재 사진"
                    className="w-full aspect-square object-cover rounded-lg border-2 border-[#1f0101]"
                  />
                </div>
              </div>
            </div>

            {/* 탭으로 구분된 상세 분석 */}
            <div className="p-4">
              <Tabs defaultValue="density" className="w-full">
                {/* <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="density">밀도</TabsTrigger>
                  <TabsTrigger value="distribution">분포</TabsTrigger>
                  <TabsTrigger value="ai">AI</TabsTrigger>
                </TabsList> */}

                {/* 밀도 탭 - 변화량만 표시 */}
                {comparisonData.current?.density && comparisonData.comparison?.density && (
                  <TabsContent value="density" className="space-y-3 mt-4">
                    {/* 전체 밀도는 거리/각도에 따라 부정확하므로 삭제 */}
                    {/* <div className="bg-blue-50 rounded-lg p-4 text-center">
                      <p className="text-xs text-blue-700 mb-1">현재 모발 밀도</p>
                      <p className="text-3xl font-bold text-blue-900">
                        {comparisonData.current.density.hair_density_percentage.toFixed(1)}%
                      </p>
                    </div>
                    <Separator /> */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-2">밀도 변화율</p>
                        <p className={`text-2xl font-bold ${
                          comparisonData.comparison.density.change_percentage > 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}>
                          {comparisonData.comparison.density.change_percentage > 0 ? '+' : ''}
                          {comparisonData.comparison.density.change_percentage.toFixed(1)}%
                        </p>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-2">추세</p>
                        <p className="text-2xl font-bold text-[#1f0101]">
                          {comparisonData.comparison.density.trend === 'improving' ? '✅ 개선' :
                           comparisonData.comparison.density.trend === 'declining' ? '⚠️ 악화' : '➡️ 유지'}
                        </p>
                      </div>
                    </div>
                  </TabsContent>
                )}

                {/* 분포 탭 */}
                {comparisonData.comparison?.distribution && (
                  <TabsContent value="distribution" className="space-y-3 mt-4">
                    <div className="bg-purple-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-purple-700 mb-2">이전과의 분포 유사도</p>
                      <p className="text-3xl font-bold text-purple-900">
                        {(comparisonData.comparison.distribution.similarity * 100).toFixed(1)}%
                      </p>
                      <Progress
                        value={comparisonData.comparison.distribution.similarity * 100}
                        className="mt-3"
                      />
                    </div>
                    <p className="text-xs text-center text-gray-600">
                      {comparisonData.comparison.distribution.similarity > 0.9
                        ? '✅ 분포가 안정적으로 유지되고 있습니다'
                        : '⚠️ 분포에 변화가 감지되었습니다'}
                    </p>
                  </TabsContent>
                )}

                {/* AI 탭 */}
                {comparisonData.comparison?.features && (
                  <TabsContent value="ai" className="space-y-3 mt-4">
                    <div className="bg-orange-50 rounded-lg p-4 text-center">
                      <p className="text-sm text-orange-700 mb-2">AI Feature 유사도</p>
                      <p className="text-3xl font-bold text-orange-900">
                        {(comparisonData.comparison.features.similarity * 100).toFixed(1)}%
                      </p>
                      <Progress
                        value={comparisonData.comparison.features.similarity * 100}
                        className="mt-3"
                      />
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">변화 점수</span>
                        <span className="font-bold text-[#1f0101]">
                          {comparisonData.comparison.features.change_score.toFixed(1)} / 100
                        </span>
                      </div>
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            </div>

            <Separator />

            {/* 종합 평가 */}
            {/* {comparisonData.summary && (
              <div className="p-4 space-y-3">
                <h3 className="text-base font-semibold text-[#1f0101]">종합 평가</h3>
                <div className="grid grid-cols-2 gap-2">
                  <Card className="border-0 bg-gray-50">
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-gray-600 mb-1">전체 트렌드</p>
                      <p className="text-lg font-bold">
                        {comparisonData.summary.overall_trend === 'improving' ? '✅ 개선' :
                         comparisonData.summary.overall_trend === 'declining' ? '⚠️ 악화' : '➖ 유지'}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="border-0 bg-gray-50">
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-gray-600 mb-1">위험도</p>
                      <Badge className={`${
                        comparisonData.summary.risk_level === 'high' ? 'bg-red-600' :
                        comparisonData.summary.risk_level === 'medium' ? 'bg-yellow-600' : 'bg-green-600'
                      }`}>
                        {comparisonData.summary.risk_level === 'high' ? '높음' :
                         comparisonData.summary.risk_level === 'medium' ? '보통' : '낮음'}
                      </Badge>
                    </CardContent>
                  </Card>
                </div>
                {comparisonData.summary.recommendations && comparisonData.summary.recommendations.length > 0 && (
                  <Card className="border-0 bg-blue-50">
                    <CardContent className="p-3">
                      <p className="text-xs font-semibold text-blue-800 mb-2">💡 권장 사항</p>
                      <div className="space-y-1">
                        {comparisonData.summary.recommendations.map((rec: string, idx: number) => (
                          <p key={idx} className="text-xs text-blue-700">• {rec}</p>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )} */}

            {/* 닫기 버튼 */}
            <div className="p-4 border-t">
              <Button
                onClick={() => setIsComparisonModalOpen(false)}
                className="w-full bg-[#1f0101] hover:bg-[#2A0202]"
              >
                닫기
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DailyCare;
