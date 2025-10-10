import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
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
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { getWeatherData } from '../../services/weatherService';
import type { WeatherData } from '../../services/weatherService';
import { 
  getPersonalizedRecommendations, 
  getDefaultScalpCondition,
  type RecommendedProduct,
  type HealthTip,
  type ScalpCondition 
} from '../../services/recommendationService';

const D_care: React.FC = () => {
  const navigate = useNavigate();
  const [checklist, setChecklist] = useState([
    { id: 1, text: '아침 샴푸 완료', subtext: '미온수로 깨끗하게', points: 10, completed: true },
    { id: 2, text: '두피 마사지 5분', subtext: '혈액순환 개선', points: 15, completed: true },
    { id: 3, text: '물 2L 섭취', subtext: '충분한 수분 공급', points: 10, completed: false },
    { id: 4, text: '영양제 복용', subtext: '비오틴, 아연', points: 5, completed: false }
  ]);

  const [streakDays, setStreakDays] = useState(7);
  const [challengeProgress, setChallengeProgress] = useState(43);
  
  // 날씨 데이터 상태
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);
  
  // 추천 시스템 상태
  const [recommendedProducts, setRecommendedProducts] = useState<RecommendedProduct[]>([]);
  const [dailyTips, setDailyTips] = useState<HealthTip[]>([]);
  const [scalpCondition, setScalpCondition] = useState<ScalpCondition>(getDefaultScalpCondition());

  // 출석 체크(스트릭) 상태
  const [attendance, setAttendance] = useState<Array<{ date: string; checked: boolean }>>([]);
  const todayStr = new Date().toISOString().slice(0, 10);

  // 최근 10일 출석 데이터 생성 및 로드
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('DCARE_ATTENDANCE') : null;
    const savedMap: Record<string, boolean> = saved ? JSON.parse(saved) : {};

    const days: Array<{ date: string; checked: boolean }> = [];
    for (let i = 9; i >= 0; i -= 1) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      days.push({ date: dateStr, checked: !!savedMap[dateStr] });
    }
    setAttendance(days);

    // 연속 출석 계산
    const consecutive = getConsecutiveCount(days);
    setStreakDays(consecutive);
  }, []);

  const getConsecutiveCount = (days: Array<{ date: string; checked: boolean }>) => {
    let count = 0;
    for (let i = days.length - 1; i >= 0; i -= 1) {
      if (days[i].checked) count += 1;
      else break;
    }
    return count;
  };

  // 날씨 기반 추천 정보 생성
  const getWeatherRecommendations = (weather: WeatherData) => {
    const recommendations = [];

    // 자외선 지수에 따른 추천
    if (weather.uvIndex >= 6) {
      recommendations.push({
        type: 'warning',
        message: '자외선이 매우 강합니다. 모자나 선크림을 사용하세요.',
        icon: '☀️'
      });
    } else if (weather.uvIndex >= 3) {
      recommendations.push({
        type: 'caution',
        message: '자외선이 보통입니다. 실외 활동 시 주의하세요.',
        icon: '🌤️'
      });
    }

    // 습도에 따른 추천
    if (weather.humidity < 30) {
      recommendations.push({
        type: 'info',
        message: '습도가 낮습니다. 두피 보습에 신경 쓰세요.',
        icon: '💧'
      });
    } else if (weather.humidity > 70) {
      recommendations.push({
        type: 'info',
        message: '습도가 높습니다. 두피 통풍에 주의하세요.',
        icon: '🌧️'
      });
    }

    // 미세먼지에 따른 추천
    if (weather.fineDust > 50) {
      recommendations.push({
        type: 'warning',
        message: '미세먼지가 나쁩니다. 외출 후 머리 감기를 권장합니다.',
        icon: '🌫️'
      });
    }

    return recommendations;
  };

  const handleCheckInToday = () => {
    setAttendance((prev) => {
      const next = prev.map((d) => (d.date === todayStr ? { ...d, checked: true } : d));
      // 저장
      const map: Record<string, boolean> = {};
      next.forEach((d) => {
        map[d.date] = d.checked;
      });
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('DCARE_ATTENDANCE', JSON.stringify(map));
      }
      setStreakDays(getConsecutiveCount(next));
      return next;
    });
  };

  // 날씨 데이터 가져오기
  const fetchWeatherData = async () => {
    setWeatherLoading(true);
    setWeatherError(null);
    
    try {
      // 실제 기상청 API 호출
      const data = await getWeatherData();
      setWeatherData(data);
      console.log('D_care에서 날씨 데이터 가져옴:', data);
      
      // 날씨 데이터가 있으면 개인화된 추천 생성
      if (data) {
        const recommendations = getPersonalizedRecommendations(data, scalpCondition);
        setRecommendedProducts(recommendations.products);
        setDailyTips(recommendations.tips);
      }
    } catch (error) {
      console.error('날씨 데이터 가져오기 실패:', error);
      setWeatherError('날씨 정보를 가져올 수 없습니다.');
    } finally {
      setWeatherLoading(false);
    }
  };

  // 컴포넌트 마운트시 날씨 데이터 가져오기
  useEffect(() => {
    fetchWeatherData();
  }, []);

  const handleCheckboxChange = (id: number) => {
    setChecklist(prev => prev.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const completedCount = checklist.filter(item => item.completed).length;
  const totalCount = checklist.length;
  const completionRate = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-md mx-auto bg-white min-h-screen pb-20">
        {/* Header */}
        <div className="bg-white px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-50">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="p-2"
          >
            <ArrowLeft className="h-5 w-5 text-[#1f0101]" />
          </Button>
          <h1 className="text-lg font-semibold text-[#1f0101]">D_care</h1>
          <Button 
            variant="ghost" 
            size="sm"
            className="p-2"
          >
            <Calendar className="h-5 w-5 text-[#1f0101]" />
          </Button>
        </div>

        {/* Main Title Section */}
        <div className="px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-[#1f0101] mb-2">모발 건강 관리</h1>
          <p className="text-gray-600 text-sm">개인 맞춤형 두피 케어와 건강 추적을 시작해보세요</p>
        </div>

        {/* Graph Section */}
        <Card className="mx-4 mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-[#1f0101]">
              <BarChart3 className="h-5 w-5 text-[#1f0101]" />
              모발 건강 점수 변화
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-36 flex items-end justify-around px-2">
              {[
                { day: '월', height: 55 },
                { day: '화', height: 62 },
                { day: '수', height: 20 },
                { day: '목', height: 18 },
                { day: '금', height: 65 },
                { day: '토', height: 75 },
                { day: '일', height: 18 }
              ].map((item, index) => (
                <div key={index} className="flex flex-col items-center flex-1 max-w-10">
                  <div 
                    className="w-full rounded-sm relative mb-2"
                    style={{ height: `${item.height}px`, backgroundColor: '#1f0101', opacity: 0.1 }}
                  >
                    <div className="absolute -top-5 left-1/2 transform -translate-x-1/2 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#1f0101' }}></div>
                  </div>
                  <span className="text-xs text-gray-600">{item.day}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 mx-4 mt-4">
          <Card className="border-0" style={{ backgroundColor: '#1f0101' }}>
            <CardContent className="p-5 text-white">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4" />
                <span className="text-sm opacity-90">평균 점수</span>
              </div>
              <div className="text-3xl font-bold mb-1">82.5</div>
              <div className="text-sm opacity-90 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +5.2%
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0" style={{ backgroundColor: '#1f0101', opacity: 0.8 }}>
            <CardContent className="p-5 text-white">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4" />
                <span className="text-sm opacity-90">진단 횟수</span>
              </div>
              <div className="text-3xl font-bold mb-1">7회</div>
              <div className="text-sm opacity-90">이번 주</div>
            </CardContent>
          </Card>
        </div>

        {/* AI Coach Message */}
        <Card className="mx-4 mt-4 border-0" style={{ backgroundColor: '#1f0101', opacity: 0.9 }}>
          <CardContent className="p-4 text-white">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <span className="text-xl">🤖</span>
              </div>
              <div className="flex-1">
                <h4 className="text-base font-semibold mb-1">AI 케어 코치</h4>
                <p className="text-sm opacity-90">
                  "최근 3일간 점수가 상승 중이에요! 오늘은 특히 두피 마사지에 집중해보세요."
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily Care Checklist */}
        <Card className="mx-4 mt-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2 text-[#1f0101]">
                <CheckCircle className="h-5 w-5" style={{ color: '#1f0101' }} />
                오늘의 케어 미션
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {checklist.map((item) => (
              <div 
                key={item.id}
                className="flex items-center p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
                onClick={() => handleCheckboxChange(item.id)}
              >
                {item.completed ? (
                  <CheckCircle className="h-5 w-5 mr-3 flex-shrink-0" style={{ color: '#1f0101' }} />
                ) : (
                  <Circle className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
                )}
                <div className="flex-1">
                  <div className="text-sm font-medium">{item.text}</div>
                  <div className="text-xs text-gray-600">{item.subtext}</div>
                </div>
                <Badge variant="secondary" style={{ backgroundColor: '#1f0101', color: 'white', opacity: 0.1 }}>
                  +{item.points}P
                </Badge>
              </div>
            ))}
            
            <div className="pt-3 border-t border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">완료율</span>
                <span className="text-sm font-semibold" style={{ color: '#1f0101' }}>
                  {completedCount}/{totalCount} ({completionRate}%)
                </span>
              </div>
              <Progress value={completionRate} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* Care Streak - 출석 체크 스타일 */}
        <Card className="mx-4 mt-4">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg flex items-center gap-2 text-[#1f0101]">
                <Award className="h-5 w-5" style={{ color: '#1f0101' }} />
                케어 스트릭
              </CardTitle>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold" style={{ color: '#1f0101' }}>{streakDays}일</span>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleCheckInToday}
                  className="h-8 px-3"
                >
                  오늘 출석하기
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* 최근 10일 출석 도장 */}
            <div className="grid grid-cols-5 gap-2 mb-3">
              {attendance.map((d) => {
                const date = new Date(d.date);
                const day = date.getDate();
                const isToday = d.date === todayStr;
                const checked = d.checked;
                return (
                  <div 
                    key={d.date}
                    className={`h-9 rounded-lg flex items-center justify-center text-xs font-semibold border ${checked ? 'text-white' : 'text-gray-400'}`}
                    style={checked ? { backgroundColor: '#1f0101', borderColor: '#1f0101' } : { borderColor: '#e5e7eb' }}
                  >
                    {isToday ? '오늘' : day}
                  </div>
                );
              })}
            </div>

            {/* 출석 안내 및 목표 진행도 */}
            <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
              <Gift className="h-4 w-4" />
              <span>10일 연속 달성시 보너스 포인트 100P!</span>
            </div>
            <Progress value={Math.min(100, (streakDays / 10) * 100)} className="h-2" />
          </CardContent>
        </Card>

        {/* Environment Info */}
        <div className="mx-4 mt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold" style={{ color: '#1f0101' }}>실시간 환경 정보</h3>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={fetchWeatherData}
              disabled={weatherLoading}
              className="p-2"
            >
              <RefreshCw className={`h-4 w-4 ${weatherLoading ? 'animate-spin' : ''}`} style={{ color: '#1f0101' }} />
            </Button>
          </div>
          
          {weatherError ? (
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-4 text-center">
                <p className="text-sm text-red-600">{weatherError}</p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchWeatherData}
                  className="mt-2"
                >
                  다시 시도
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {/* UV 지수 카드 */}
              <Card className="bg-gray-50 border-gray-200">
                <CardContent className="p-3 text-center">
                  <Sun className="h-6 w-6 mx-auto mb-2" style={{ color: '#1f0101' }} />
                  {weatherLoading ? (
                    <div className="animate-pulse">
                      <div className="h-3 bg-gray-300 rounded mb-1"></div>
                      <div className="h-3 bg-gray-300 rounded"></div>
                    </div>
                  ) : weatherData ? (
                    <>
                      <p className="text-xs font-medium" style={{ color: '#1f0101' }}>
                        {weatherData.uvIndex >= 8 ? '자외선 매우 강함' :
                         weatherData.uvIndex >= 6 ? '자외선 강함' :
                         weatherData.uvIndex >= 3 ? '자외선 보통' : '자외선 약함'}
                      </p>
                      <p className="text-xs text-gray-600">
                        {getWeatherRecommendations(weatherData).find(r => r.type === 'warning' || r.type === 'caution')?.message || '모자 착용'}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-medium" style={{ color: '#1f0101' }}>자외선 강함</p>
                      <p className="text-xs text-gray-600">모자 착용</p>
                    </>
                  )}
                </CardContent>
              </Card>
              
              {/* 습도 카드 */}
              <Card className="bg-gray-50 border-gray-200">
                <CardContent className="p-3 text-center">
                  <Droplets className="h-6 w-6 mx-auto mb-2" style={{ color: '#1f0101' }} />
                  {weatherLoading ? (
                    <div className="animate-pulse">
                      <div className="h-3 bg-gray-300 rounded mb-1"></div>
                      <div className="h-3 bg-gray-300 rounded"></div>
                    </div>
                  ) : weatherData ? (
                    <>
                      <p className="text-xs font-medium" style={{ color: '#1f0101' }}>
                        습도 {weatherData.humidity}%
                      </p>
                      <p className="text-xs text-gray-600">
                        {getWeatherRecommendations(weatherData).find(r => r.type === 'info')?.message || '보습 필요'}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-medium" style={{ color: '#1f0101' }}>습도 30%</p>
                      <p className="text-xs text-gray-600">보습 필요</p>
                    </>
                  )}
                </CardContent>
              </Card>
              
              {/* 미세먼지 카드 */}
              <Card className="bg-gray-50 border-gray-200">
                <CardContent className="p-3 text-center">
                  <Wind className="h-6 w-6 mx-auto mb-2" style={{ color: '#1f0101' }} />
                  {weatherLoading ? (
                    <div className="animate-pulse">
                      <div className="h-3 bg-gray-300 rounded mb-1"></div>
                      <div className="h-3 bg-gray-300 rounded"></div>
                    </div>
                  ) : weatherData ? (
                    <>
                      <p className="text-xs font-medium" style={{ color: '#1f0101' }}>
                        미세먼지 {weatherData.fineDust >= 76 ? '나쁨' :
                                  weatherData.fineDust >= 36 ? '보통' : '좋음'}
                      </p>
                      <p className="text-xs text-gray-600">
                        {getWeatherRecommendations(weatherData).find(r => r.type === 'warning')?.message || '외출 후 머리 감기'}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-medium" style={{ color: '#1f0101' }}>미세먼지</p>
                      <p className="text-xs text-gray-600">나쁨</p>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* 위치 정보 */}
          {weatherData && (
            <div className="mt-3 text-center">
              <p className="text-xs text-gray-500">
                📍 {weatherData.location} • {new Date(weatherData.lastUpdated).toLocaleTimeString('ko-KR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })} 업데이트
              </p>
            </div>
          )}
        </div>

        {/* Photo Comparison */}
        <Card className="mx-4 mt-4">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2 text-[#1f0101]">
                <Camera className="h-5 w-5" style={{ color: '#1f0101' }} />
                변화 추적
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div className="text-center">
                <div className="aspect-square bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl mb-2 flex items-center justify-center">
                  <Camera className="h-8 w-8 text-gray-500" />
                </div>
                <p className="text-xs text-gray-600">30일 전</p>
              </div>
              <div className="text-center">
                <div className="aspect-square bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl mb-2 flex items-center justify-center border-2" style={{ borderColor: '#1f0101' }}>
                  <Camera className="h-8 w-8" style={{ color: '#1f0101' }} />
                </div>
                <p className="text-xs" style={{ color: '#1f0101' }}>오늘</p>
              </div>
            </div>
            
            <Button variant="outline" className="w-full">
              새 사진 추가
            </Button>
          </CardContent>
        </Card>

        {/* Community Challenge */}
        <Card className="mx-4 mt-4 border-0" style={{ backgroundColor: '#1f0101', opacity: 0.8 }}>
          <CardContent className="p-4 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Users className="h-5 w-5" />
              <h3 className="text-base font-semibold">이번 주 챌린지</h3>
            </div>
            <p className="text-sm mb-3">매일 두피 마사지 5분</p>
            
            <div className="bg-white bg-opacity-20 p-3 rounded-xl">
              <div className="flex justify-between text-xs mb-2">
                <span>234명 참여중</span>
                <span>3/7일 완료</span>
              </div>
              <Progress 
                value={challengeProgress} 
                className="h-2 bg-white bg-opacity-30"
              />
            </div>
          </CardContent>
        </Card>

        {/* Product Recommendation */}
        <Card className="mx-4 mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-[#1f0101]">
              <Droplets className="h-5 w-5" style={{ color: '#1f0101' }} />
              오늘의 추천 제품
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {weatherLoading ? (
              <div className="animate-pulse">
                <div className="h-16 bg-gray-200 rounded-xl"></div>
              </div>
            ) : recommendedProducts.length > 0 ? (
              recommendedProducts.map((product, index) => (
                <div key={product.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#1f0101' }}>
                    <Droplets className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{product.name}</p>
                    <p className="text-xs text-gray-600">{product.description}</p>
                    <p className="text-xs text-blue-600 mt-1">💡 {product.reason}</p>
                    <Badge variant="secondary" className="mt-1" style={{ backgroundColor: '#1f0101', color: 'white', opacity: 0.1 }}>
                      우선순위 {product.priority}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#1f0101' }}>
                  <Droplets className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">수분 에센스</p>
                  <p className="text-xs text-gray-600">건조한 두피에 효과적</p>
                  <Badge variant="secondary" className="mt-1" style={{ backgroundColor: '#1f0101', color: 'white', opacity: 0.1 }}>
                    15% 할인중
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* History Section */}
        <Card className="mx-4 mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2 text-[#1f0101]">
              <BarChart3 className="h-5 w-5" style={{ color: '#1f0101' }} />
              진단 히스토리
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-4 border border-gray-200 rounded-xl">
              <div className="flex items-center mb-1">
                <div className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: '#1f0101' }}></div>
                <span className="text-xs" style={{ color: '#1f0101' }}>9월 26일 (오늘)</span>
              </div>
              <div className="text-sm font-medium">모발 건강도 85점</div>
              <div className="text-xs text-gray-600">전반적으로 양호한 상태입니다</div>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-xl">
              <div className="flex items-center mb-1">
                <div className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: '#1f0101', opacity: 0.8 }}></div>
                <span className="text-xs" style={{ color: '#1f0101', opacity: 0.8 }}>9월 23일</span>
              </div>
              <div className="text-sm font-medium">모발 건강도 80점</div>
              <div className="text-xs text-gray-600">수분 보충이 필요합니다</div>
            </div>
            
            <div className="p-4 border border-gray-200 rounded-xl">
              <div className="flex items-center mb-1">
                <div className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: '#1f0101', opacity: 0.6 }}></div>
                <span className="text-xs" style={{ color: '#1f0101', opacity: 0.6 }}>9월 20일</span>
              </div>
              <div className="text-sm font-medium">모발 건강도 75점</div>
              <div className="text-xs text-gray-600">관리가 필요한 시점입니다</div>
            </div>
            
            <Button 
              onClick={() => navigate('/hair-diagnosis')}
              className="w-full mt-3"
            >
              새로운 진단하기
            </Button>
          </CardContent>
        </Card>

        {/* Daily Tip */}
        <Card className="mx-4 mt-4 bg-gray-50 border-gray-200">
          <CardContent className="p-4">
            {weatherLoading ? (
              <div className="animate-pulse">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </div>
            ) : dailyTips.length > 0 ? (
              dailyTips.map((tip, index) => (
                <div key={tip.id} className={`flex items-start gap-3 ${index > 0 ? 'mt-4' : ''}`}>
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Lightbulb className="h-4 w-4" style={{ color: '#1f0101' }} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-semibold" style={{ color: '#1f0101' }}>
                        {tip.title}
                      </h4>
                      <Badge variant="secondary" className="text-xs" style={{ backgroundColor: '#1f0101', color: 'white', opacity: 0.1 }}>
                        {tip.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-700">
                      {tip.content}
                    </p>
                    {tip.weatherCondition && (
                      <p className="text-xs text-blue-600 mt-1">
                        🌤️ {tip.weatherCondition} 기반 추천
                      </p>
                    )}
                    {tip.scalpCondition && (
                      <p className="text-xs text-green-600 mt-1">
                        🧠 {tip.scalpCondition} 상태 기반 추천
                      </p>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="h-4 w-4" style={{ color: '#1f0101' }} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-semibold" style={{ color: '#1f0101' }}>오늘의 건강 팁</h4>
                  </div>
                  <p className="text-xs text-gray-700">
                    "샴푸 전 빗질을 하면 노폐물 제거와 혈액순환에 도움이 됩니다. 
                    두피부터 모발 끝까지 부드럽게 빗어주세요."
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center py-2 pb-5 z-50">
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
    </div>
  );
};

export default D_care;