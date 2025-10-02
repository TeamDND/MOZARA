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
  BarChart3
} from 'lucide-react';

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

        {/* Care Streak */}
        <Card className="mx-4 mt-4">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg flex items-center gap-2 text-[#1f0101]">
                <Award className="h-5 w-5" style={{ color: '#1f0101' }} />
                케어 스트릭
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold" style={{ color: '#1f0101' }}>{streakDays}일</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex gap-1 mb-3">
              {Array.from({ length: 7 }, (_, i) => (
                <div 
                  key={i}
                  className={`flex-1 h-8 rounded-md flex items-center justify-center text-xs text-white ${
                    i < streakDays ? '' : 'bg-gray-300'
                  }`}
                  style={i < streakDays ? { backgroundColor: '#1f0101' } : {}}
                >
                  {i + 1}
                </div>
              ))}
            </div>
            
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Gift className="h-4 w-4" />
              <span>10일 연속 달성시 보너스 포인트 100P!</span>
            </div>
          </CardContent>
        </Card>

        {/* Environment Info */}
        <div className="grid grid-cols-3 gap-3 mx-4 mt-4">
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-3 text-center">
              <Sun className="h-6 w-6 mx-auto mb-2" style={{ color: '#1f0101' }} />
              <p className="text-xs font-medium" style={{ color: '#1f0101' }}>자외선 강함</p>
              <p className="text-xs text-gray-600">모자 착용</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-3 text-center">
              <Droplets className="h-6 w-6 mx-auto mb-2" style={{ color: '#1f0101' }} />
              <p className="text-xs font-medium" style={{ color: '#1f0101' }}>습도 30%</p>
              <p className="text-xs text-gray-600">보습 필요</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-3 text-center">
              <Wind className="h-6 w-6 mx-auto mb-2" style={{ color: '#1f0101' }} />
              <p className="text-xs font-medium" style={{ color: '#1f0101' }}>미세먼지</p>
              <p className="text-xs text-gray-600">나쁨</p>
            </CardContent>
          </Card>
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
          <CardContent>
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