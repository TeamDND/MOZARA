import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState } from '../../utils/store';
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
              const response = await apiClient.get(`/ai/weather?lat=${latitude}&lon=${longitude}`);
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

  // 페이지 진입 시 스크롤 맨 위로
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
          <div className="flex flex-col gap-4">
        {/* 타이틀 카드 - 그라데이션 배경 */}
        <div
          className="rounded-2xl shadow-lg px-5 py-3"
          style={{ background: 'linear-gradient(135deg, rgba(139, 58, 58, 0.8) 0%, rgba(90, 26, 26, 0.8) 50%, rgba(58, 10, 10, 0.8) 100%)' }}
        >
          <div className="flex items-center gap-4">
            <img
              src="/assets/images/main/clean/hair_question_white_2.png"
              alt="AI 진단"
              style={{ height: '85px', width: 'auto' }}
              className="object-contain"
            />
            <div className="text-left">
              <p className="text-white font-bold text-base leading-tight mb-2">AI 탈모 맞춤 서비스</p>
              <p className="text-white text-opacity-90 text-sm">Hair Fit은 AI를 사용하여 <br/> 맞춤형 탈모 서비스를 제공합니다.</p>
            </div>
          </div>
        </div>

        {/* 카드 섹션 - 2x2 그리드 */}
        <div className="grid grid-cols-2 gap-4">
          {/* AI 분석 */}
          <div
            className="rounded-xl shadow-lg flex flex-col items-center justify-center p-5 cursor-pointer hover:shadow-xl transition-all"
            style={{ backgroundColor: 'rgba(139, 58, 58, 0.05)' }}
            onClick={() => navigate('/integrated-diagnosis')}
          >
            <img
              src="/assets/images/main/clean/analysis_2.png"
              alt="AI 분석"
              className="w-16 h-16 object-contain mb-3"
            />
            <p className="font-bold text-base mb-1" style={{ color: '#1f0101' }}>AI 분석</p>
            <p className="text-xs text-center" style={{ color: '#4a0505' }}>AI로 탈모 단계 분석</p>
          </div>

          {/* 데일리 케어 */}
          <div
            className="rounded-xl shadow-lg flex flex-col items-center justify-center p-5 cursor-pointer hover:shadow-xl transition-all"
            style={{ backgroundColor: 'rgba(139, 58, 58, 0.05)' }}
            onClick={() => navigate('/daily-care')}
          >
            <img
              src="/assets/images/main/clean/daily_care_2.png"
              alt="데일리 케어"
              className="w-16 h-16 object-contain mb-3"
            />
            <p className="font-bold text-base mb-1" style={{ color: '#1f0101' }}>데일리 케어</p>
            <p className="text-xs text-center" style={{ color: '#4a0505' }}>매일 관리하는 두피 건강</p>
          </div>

          {/* 케어 스트릭 표시 - 오늘의 케어 팁 위 */}
          {streakDays > 0 && (
            <div className="col-span-2 flex justify-center">
              <div
                className="px-2.5 py-1 rounded-full inline-flex items-center gap-1 shadow-md cursor-default"
                style={{ background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)' }}
                title="스트릭 케어: 연속 미션일 수"
              >
                <span className="text-sm cursor-default text-white" title="스트릭 케어: 연속 미션일 수">🔥</span>
                <span className="text-xs font-bold cursor-default text-white" title="스트릭 케어: 연속 미션일 수">PT 연속 참여일: {streakDays}일</span>
              </div>
            </div>
          )}

          {/* 오늘의 케어 팁 */}
          <div className="col-span-2 rounded-xl shadow-lg overflow-hidden flex flex-col items-center" style={{ backgroundColor: 'rgba(139, 58, 58, 0.05)' }}>
            <div className="pt-2 pb-0">
              <img src="/assets/images/main/clean/care_tip_2.png" alt="케어 팁" className="w-14 h-14 object-contain" />
            </div>
            <div className="px-4 pb-3 w-full flex flex-col items-center">
              <p className="font-bold text-base mb-2" style={{ color: '#1f0101' }}>오늘의 케어 팁</p>
            {loadingWeather ? (
              <p className="text-sm leading-tight mb-2 text-center" style={{ color: '#4a0505' }}>날씨 정보 로딩 중...</p>
            ) : (() => {
              const weatherMsg = getWeatherMessage();
              return (
                <>
                  <div className="text-sm leading-tight mb-2 text-center" style={{ color: '#4a0505' }}>
                    <span>{weatherMsg.message}</span>
                  </div>
                  <div className="flex gap-3 text-xs items-center justify-center flex-wrap mb-2">
                    <span className="flex items-center gap-1 whitespace-nowrap" style={{ color: '#5a1a1a' }}>
                      <Droplets className="w-3.5 h-3.5" />
                      {environmentInfo.humidity}%
                    </span>
                    <span className="flex items-center gap-1 whitespace-nowrap" style={{ color: '#5a1a1a' }}>
                      <Sun className="w-3.5 h-3.5" />
                      {environmentInfo.uvLevel}
                    </span>
                    <span className="flex items-center gap-1 whitespace-nowrap" style={{ color: '#5a1a1a' }}>
                      <Wind className="w-3.5 h-3.5" />
                      {environmentInfo.airQualityLevel}
                    </span>
                  </div>
                </>
              );
            })()}
            <p className="text-sm font-bold leading-tight mb-3 text-center" style={{ color: '#4a0505' }}>
              관리를 위해 탈모 PT를 시작해 보세요.
            </p>
            <button
              className="px-6 py-2 rounded-lg font-bold bg-[#1f0101] hover:bg-[#2a0202] text-white shadow-md hover:shadow-lg transition-all text-sm"
              onClick={() => navigate('/daily-care')}
            >
              시작하기
            </button>
            </div>
          </div>
        </div>

        {/* 나의 케어 현황 - 가운데 배치, 아이콘 추가, 보더 제거, 무드톤 글씨 */}
        <div className="rounded-xl shadow-lg p-5" style={{ backgroundColor: 'rgba(139, 58, 58, 0.05)' }}>
          <div className="flex items-center justify-center gap-2 mb-3">
            <Lightbulb className="w-5 h-5" style={{ color: '#8b3a3a' }} />
            <p className="font-bold text-lg" style={{ color: '#1f0101' }}>나의 케어 현황</p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center justify-center py-3 px-2">
              <p className="text-2xl font-bold" style={{ color: '#8b3a3a' }}>{userStats.totalAnalysisCount}</p>
              <p className="text-xs mt-2 text-center leading-tight whitespace-nowrap" style={{ color: '#5a1a1a' }}>총 분석 수</p>
            </div>
            <div className="flex flex-col items-center justify-center py-3 px-2">
              <p className="text-2xl font-bold" style={{ color: '#8b3a3a' }}>
                {userStats.recentScalpScore !== null ? userStats.recentScalpScore : '-'}
              </p>
              <p className="text-xs mt-2 text-center leading-tight whitespace-nowrap" style={{ color: '#5a1a1a' }}>최근 두피 점수</p>
            </div>
            <div className="flex flex-col items-center justify-center py-3 px-2">
              {userStats.densityChange ? (
                <>
                  <div className="flex items-center gap-0.5 whitespace-nowrap">
                    {userStats.densityChange.trend === 'improving' ? (
                      <TrendingUp className="w-4 h-4 flex-shrink-0" style={{ color: '#8b3a3a' }} />
                    ) : userStats.densityChange.trend === 'declining' ? (
                      <TrendingDown className="w-4 h-4 flex-shrink-0" style={{ color: '#d14343' }} />
                    ) : (
                      <Minus className="w-4 h-4 flex-shrink-0" style={{ color: '#5a1a1a' }} />
                    )}
                    <p className="text-xl font-bold" style={{
                      color: userStats.densityChange.trend === 'improving' ? '#8b3a3a' :
                             userStats.densityChange.trend === 'declining' ? '#d14343' :
                             '#5a1a1a'
                    }}>
                      {userStats.densityChange.change_percentage > 0 ? '+' : ''}
                      {userStats.densityChange.change_percentage.toFixed(1)}%
                    </p>
                  </div>
                  <p className="text-xs mt-2 text-center leading-tight whitespace-nowrap" style={{ color: '#5a1a1a' }}>모발 밀도 (6개월)</p>
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold" style={{ color: '#8b3a3a' }}>-</p>
                  <p className="text-xs mt-2 text-center leading-tight whitespace-nowrap" style={{ color: '#5a1a1a' }}>모발 밀도 (6개월)</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* 하단 추가 섹션 */}
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex flex-col gap-2">
            <p className="font-bold text-sm" style={{ color: '#1f0101' }}>당신의 HairFit 여정, 지금부터 함께 합니다.</p>
            <p className="text-xs" style={{ color: '#5a1a1a' }}>
              처음이시라면 분석을, 기록이 있으시다면 <br/>데일리 케어를 이용하세요
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