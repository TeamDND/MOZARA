import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '../../utils/store';
import pythonClient from '../../services/pythonClient';
import apiClient from '../../services/apiClient';
import { Droplets, Sun, Wind, TrendingUp, TrendingDown, Minus, Lightbulb } from 'lucide-react';

export default function Main() {
  const { userId } = useSelector((state: RootState) => state.user);
  const navigate = useNavigate();

  // 사용자 통계 상태
  const [userStats, setUserStats] = useState({
    totalAnalysisCount: 0,
    recentScalpScore: null as number | null,
    densityChange: null as { change_percentage: number; trend: string } | null
  });

  // 케어 스트릭 상태
  const [streakDays, setStreakDays] = useState<number>(0);

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

  const [loadingWeather, setLoadingWeather] = useState(true);

  // 날씨 정보 가져오기
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        if (!navigator.geolocation) {
          console.error('Geolocation not supported');
          setLoadingWeather(false);
          return;
        }

        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;

            try {
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
              }
              setLoadingWeather(false);
            } catch (error) {
              console.error('날씨 API 호출 실패:', error);
              setLoadingWeather(false);
            }
          },
          (error) => {
            console.error('위치 정보 가져오기 실패:', error);
            setLoadingWeather(false);
          }
        );
      } catch (error) {
        console.error('환경 정보 로드 실패:', error);
        setLoadingWeather(false);
      }
    };

    fetchWeather();
  }, []);

  // 사용자 통계 가져오기
  useEffect(() => {
    const fetchUserStats = async () => {
      if (!userId) return;

      try {
        // 1. 총 분석 개수 가져오기
        const countResponse = await apiClient.get(`/analysis-count/${userId}`);
        let totalCount = 0;
        if (typeof countResponse.data === 'string') {
          const parsed = JSON.parse(countResponse.data);
          totalCount = parsed.count || 0;
        } else {
          totalCount = countResponse.data.count || 0;
        }

        // 2. 최근 Daily 분석 결과에서 두피 점수 가져오기
        const dailyResultsResponse = await apiClient.get(`/analysis-results/${userId}/type/daily?sort=newest`);
        const dailyResults = dailyResultsResponse.data;

        let recentScore = null;
        if (dailyResults && dailyResults.length > 0) {
          const recentDailyResult = dailyResults[0];
          recentScore = recentDailyResult.grade || null;
        }

        // 3. 6개월 밀도 변화 가져오기
        let densityChange = null;
        try {
          const comparisonResponse = await apiClient.get(`/timeseries/daily-comparison/${userId}?period=6months`);
          if (comparisonResponse.data.success && comparisonResponse.data.comparison?.density) {
            densityChange = {
              change_percentage: comparisonResponse.data.comparison.density.change_percentage,
              trend: comparisonResponse.data.comparison.density.trend
            };
          }
        } catch (e) {
          console.error('밀도 변화 조회 실패:', e);
        }

        setUserStats({
          totalAnalysisCount: totalCount,
          recentScalpScore: recentScore,
          densityChange: densityChange
        });
      } catch (error) {
        console.error('사용자 통계 로드 실패:', error);
      }
    };

    fetchUserStats();
  }, [userId]);

  // 케어 스트릭 정보 로드
  useEffect(() => {
    const loadStreakInfo = async () => {
      if (!userId) return;

      try {
        const response = await apiClient.get(`/habit/streak/${userId}`);
        const days = response.data.currentStreak || response.data.days || response.data.streakDays || 0;

        if (days > 0) {
          setStreakDays(days);
        }
      } catch (error) {
        console.error('스트릭 정보 로드 실패:', error);
      }
    };

    loadStreakInfo();
  }, [userId]);

  // 아이콘 렌더링 함수
  const getIconComponent = (iconName: string) => {
    const iconProps = { className: "w-3 h-3 inline-block" };
    switch(iconName) {
      case 'sun': return <Sun {...iconProps} />;
      case 'droplets': return <Droplets {...iconProps} />;
      case 'wind': return <Wind {...iconProps} />;
      default: return null;
    }
  };

  // 날씨 정보 기반 메시지 생성
  const getWeatherMessage = () => {
    const { recommendations } = environmentInfo;

    // 위험/주의 단계 메시지 우선 표시
    if (recommendations.uv && (recommendations.uv.type === 'warning' || recommendations.uv.type === 'caution')) {
      return { icon: recommendations.uv.icon, message: recommendations.uv.message };
    }
    if (recommendations.humidity && (recommendations.humidity.type === 'warning' || recommendations.humidity.type === 'caution')) {
      return { icon: recommendations.humidity.icon, message: recommendations.humidity.message };
    }
    if (recommendations.air && (recommendations.air.type === 'warning' || recommendations.air.type === 'caution')) {
      return { icon: recommendations.air.icon, message: recommendations.air.message };
    }

    // 모두 양호하면 긍정 메시지
    return { icon: null, message: '자외선, 습도, 대기질 모두 양호합니다. 두피 건강에 좋은 날입니다!' };
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto bg-white min-h-screen pb-20">
        <div className="px-4 pt-6 pb-4">
          <div className="grid grid-cols-4 gap-3" style={{ gridTemplateRows: '140px 180px 120px 1fr 150px 100px' }}>
        {/* 타이틀 컴 이미지자린 - Top section spanning all 4 columns */}
        <div className="col-span-4 flex items-center justify-center cursor-pointer relative px-6 py-4">
          {/* 케어 스트릭 배지 - 우측 상단 */}
          {streakDays > 0 && (
            <div
              className="absolute top-3 right-3 bg-orange-500 text-white px-2.5 py-1 rounded-full flex items-center gap-1 shadow-md"
              title="연속 미션일 수"
            >
              <span className="text-sm">🔥</span>
              <span className="text-xs font-bold">{streakDays}일</span>
            </div>
          )}
          <div className="flex items-center gap-4">
            <img
              src="/assets/images/main/clean/hair_question.png"
              alt="AI 진단"
              style={{ height: '180px', width: 'auto' }}
              className="object-contain"
            />
            <div className="text-left">
              <p className="text-foreground font-bold text-base pt-6">AI 탈모 단계 진단 및 추천 서비스</p>
              <p className="text-foreground font-bold text-base"></p>
              <p className="text-foreground text-sm">Hair Fit은 AI를 사용하여 <br/> 맞춤형 탈모 서비스를 제공합니다.</p>
            </div>
          </div>
        </div>

        {/* 분석 - Left section spanning 2 columns and 2 rows */}
        <div className="col-span-2 row-span-2 rounded-lg flex flex-col items-center justify-center p-6 border-2" style={{ borderColor: '#1f0101' }}>
          <img
            src="/assets/images/main/clean/analysis_2.png"
            alt="분석"
            className="w-24 h-24 mb-4 object-contain"
          />
          <div
            className="cursor-pointer transition-all px-4 py-2 rounded-lg bg-[#1f0101]"
            onClick={() => navigate('/integrated-diagnosis')}
          >
            <p className="text-white font-bold text-lg mb-1">분석</p>
            <p className="text-white text-xs text-center">AI로 탈모 단계 분석</p>
          </div>
        </div>

        {/* 데일리 케어 - Right top spanning 2 columns */}
        <div className="col-span-2 row-span-1 rounded-lg flex items-center justify-between px-2 py-4 border-2" style={{ borderColor: '#1f0101' }}>
          <div
            className="flex flex-col cursor-pointer transition-all px-3 py-1.5 rounded-lg bg-[#1f0101]"
            onClick={() => navigate('/daily-care')}
          >
            <p className="text-white font-bold">데일리<br/> 케어</p>
            <p className="text-white text-xs" style={{ letterSpacing: '-0.1em' }}>매일 관리하는<br/> 두피 건강</p>
          </div>
          <img
            src="/assets/images/main/clean/daily_care_2.png"
            alt="데일리 케어"
            className="w-16 h-16 object-contain"
          />
        </div>

        {/* 탈모 ox - Right middle left */}
        {/* <div className="col-span-1 row-span-1 rounded-lg shadow-lg hover:shadow-xl flex flex-col items-center justify-center cursor-pointer transition-all p-2 overflow-hidden" style={{ backgroundColor: 'rgba(31, 1, 1, 0.05)' }}>
          <img
            src="/assets/images/main/hair_ox_2.png"
            alt="탈모 OX"
            className="w-8 h-8 object-contain mb-1"
          />
          <p className="text-foreground font-bold text-xs text-center leading-tight">탈모<br/>OX</p>
        </div> */}

        {/* 탈모 튜브 - Right middle right */}
        {/* <div className="col-span-1 row-span-1 rounded-lg shadow-lg hover:shadow-xl flex flex-col items-center justify-center cursor-pointer transition-all p-2 overflow-hidden" style={{ backgroundColor: 'rgba(31, 1, 1, 0.05)' }}>
          <img
            src="/assets/images/main/hair_tube_2.png"
            alt="탈모 튜브"
            className="w-8 h-8 object-contain mb-1"
          />
          <p className="text-foreground font-bold text-xs text-center leading-tight">탈모<br/>튜브</p>
        </div> */}

        {/* 날씨 정보 카드 - 탈모 OX와 탈모 튜브 자리 */}
        <div className="col-span-2 row-span-1 rounded-lg flex flex-col justify-center items-center cursor-pointer transition-all py-5 px-4 overflow-hidden border-2" style={{ borderColor: '#1f0101' }}>
          <div className="flex items-center gap-1.5 mb-1.5">
            <img src="/assets/images/main/clean/care_tip_2.png" alt="케어 팁" className="w-9 h-9 object-contain" />
            <p className="text-foreground font-bold text-xs text-center">오늘의 케어 팁</p>
          </div>
          {loadingWeather ? (
            <p className="text-muted-foreground text-xs leading-tight text-center">날씨 정보 로딩 중...</p>
          ) : (() => {
            const weatherMsg = getWeatherMessage();
            return (
              <>
                <div className="text-muted-foreground text-xs leading-tight text-center mb-1">
                  <span>{weatherMsg.message}</span>
                </div>
                <div className="flex gap-2 text-xs items-center justify-center">
                  <span className="flex items-center gap-0.5 text-muted-foreground">
                    <Droplets className="w-3 h-3" />
                    {environmentInfo.humidity}%
                  </span>
                  <span className="flex items-center gap-0.5 text-muted-foreground">
                    <Sun className="w-3 h-3" />
                    {environmentInfo.uvLevel}
                  </span>
                  <span className="flex items-center gap-0.5 text-muted-foreground">
                    <Wind className="w-3 h-3" />
                    {environmentInfo.airQualityLevel}
                  </span>
                </div>
              </>
            );
          })()}
        </div>

        {/* 헤어 체인지 - Bottom long section spanning 4 columns */}
        <div className="col-span-4 row-span-1 flex items-center gap-4 p-4">
          <img
            src="/assets/images/main/clean/hair_change_2.png"
            alt="헤어 체인지"
            className="w-24 h-24 object-contain"
          />
          <div
            className="flex flex-col cursor-pointer transition-all px-4 py-2 rounded-lg bg-[#1f0101]"
            onClick={() => navigate('/hair-change')}
          >
            <p className="text-white font-bold">헤어 체인지</p>
            <p className="text-white text-xs">가상 헤어스타일 변경 체험</p>
          </div>
        </div>

        {/* 데일리 통계 카드 - Daily stats section spanning all 4 columns */}
        <div className="col-span-4 rounded-lg cursor-pointer transition-all p-4 overflow-hidden border-2" style={{ borderColor: '#1f0101' }}>
          <div className="mb-2">
            <p className="text-foreground font-bold text-sm">나의 케어 현황</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {/* 총 분석 수 */}
            <div className="flex flex-col items-center justify-center rounded-lg py-4 px-2">
              <p className="text-xl font-bold text-foreground">{userStats.totalAnalysisCount}</p>
              <p className="text-xs text-muted-foreground mt-1.5 text-center leading-tight whitespace-nowrap">총 분석 수</p>
            </div>
            {/* 최근 두피 점수 */}
            <div className="flex flex-col items-center justify-center rounded-lg py-4 px-2">
              <p className="text-xl font-bold text-foreground">
                {userStats.recentScalpScore !== null ? userStats.recentScalpScore : '-'}
              </p>
              <p className="text-xs text-muted-foreground mt-1.5 text-center leading-tight whitespace-nowrap">최근 두피 점수</p>
            </div>
            {/* 밀도 변화 */}
            <div className="flex flex-col items-center justify-center rounded-lg py-4 px-2">
              {userStats.densityChange ? (
                <>
                  <div className="flex items-center gap-0.5 whitespace-nowrap">
                    {userStats.densityChange.trend === 'improving' ? (
                      <TrendingUp className="w-3 h-3 text-green-600 flex-shrink-0" />
                    ) : userStats.densityChange.trend === 'declining' ? (
                      <TrendingDown className="w-3 h-3 text-red-600 flex-shrink-0" />
                    ) : (
                      <Minus className="w-3 h-3 text-gray-600 flex-shrink-0" />
                    )}
                    <p className={`text-base font-bold ${
                      userStats.densityChange.trend === 'improving' ? 'text-green-600' :
                      userStats.densityChange.trend === 'declining' ? 'text-red-600' :
                      'text-gray-600'
                    }`}>
                      {userStats.densityChange.change_percentage > 0 ? '+' : ''}
                      {userStats.densityChange.change_percentage.toFixed(1)}%
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1.5 text-center leading-tight whitespace-nowrap">모발 밀도 (6개월)</p>
                </>
              ) : (
                <>
                  <p className="text-xl font-bold text-foreground">-</p>
                  <p className="text-xs text-muted-foreground mt-1.5 text-center leading-tight whitespace-nowrap">모발 밀도 (6개월)</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 하단 추가 섹션 - Bottom section spanning all 4 columns */}
        <div className="col-span-4 flex items-center justify-between cursor-pointer px-6 py-4">
          <div className="flex flex-col gap-2">
            <div>
              <p className="text-foreground font-bold text-sm">당신의 HairFit 여정, 지금부터 함께 합니다.</p>
              <p className="text-foreground font-bold text-base"></p>
            </div>
            <p className="text-muted-foreground text-xs">
              처음이시라면 진단을, 기록이 있으시다면 <br/>데일리 케어를 이용하세요
            </p>
          </div>
          <img
            src="/assets/images/main/clean/hair_mix.png"
            alt="모발 여정"
            className="w-20 h-20 object-contain flex-shrink-0"
          />
        </div>
          </div>
        </div>
      </div>
    </div>
  )
}
