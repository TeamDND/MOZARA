import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Checkbox } from '../../components/ui/checkbox';
import { ArrowLeft, Award, Target, Clock, Flame, CheckCircle, Star } from 'lucide-react';
import { ImageWithFallback } from '../../hooks/ImageWithFallback';

interface WeeklyChallengesProps {
  setCurrentView?: (view: string) => void;
}

function WeeklyChallenges({ setCurrentView }: WeeklyChallengesProps = {}) {
  const [completedTasks, setCompletedTasks] = useState<string[]>(['daily1', 'daily2']);

  const currentWeek = {
    title: "두피열 완화 위크",
    description: "진단 결과 두피열이 높게 나왔어요. 이번 주는 두피 온도를 낮추는 데 집중해봐요!",
    reward: 150,
    progress: 60,
    daysLeft: 4
  };

  const dailyChallenges = [
    {
      id: 'daily1',
      title: '하루 10분 족욕하기',
      description: '따뜻한 물에 발을 담그고 혈액 순환을 개선해요',
      points: 15,
      completed: true,
      category: '생활습관'
    },
    {
      id: 'daily2',
      title: '두피 마사지 5분',
      description: '부드럽게 두피를 마사지하여 혈류를 개선해요',
      points: 20,
      completed: true,
      category: '케어'
    },
    {
      id: 'daily3',
      title: '미지근한 물로 머리 감기',
      description: '뜨거운 물 대신 미지근한 물로 두피 자극을 줄여요',
      points: 10,
      completed: false,
      category: '케어'
    },
    {
      id: 'daily4',
      title: '스트레스 해소 활동',
      description: '산책, 명상, 독서 등으로 스트레스를 관리해요',
      points: 25,
      completed: false,
      category: '멘탈케어'
    }
  ];

  const weeklyBonus = [
    {
      id: 'bonus1',
      title: '족욕 7일 연속 완료',
      description: '일주일 내내 족욕 챌린지를 완료하면 보너스!',
      points: 50,
      progress: 2,
      total: 7,
      completed: false
    },
    {
      id: 'bonus2',
      title: '완벽한 루틴 달성',
      description: '모든 일일 챌린지를 3일 이상 완료하기',
      points: 100,
      progress: 0,
      total: 3,
      completed: false
    }
  ];

  const achievements = [
    { title: '새싹 마스터', description: '첫 100포인트 달성', unlocked: true },
    { title: '꾸준함의 힘', description: '7일 연속 챌린지 완료', unlocked: true },
    { title: '케어 전문가', description: '모든 케어 챌린지 완료', unlocked: false },
    { title: '라이프스타일 개선왕', description: '생활습관 챌린지 30개 완료', unlocked: false }
  ];

  const handleTaskComplete = (taskId: string) => {
    setCompletedTasks(prev => 
      prev.includes(taskId) 
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const getCompletedCount = () => completedTasks.length;
  const getTotalPoints = () => {
    return dailyChallenges.reduce((total, challenge) => 
      completedTasks.includes(challenge.id) ? total + challenge.points : total, 0
    );
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <div className="sticky top-0 bg-background border-b p-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setCurrentView?.('dashboard')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            뒤로
          </Button>
          
          <div className="text-center">
            <h1>주간 챌린지</h1>
            <p className="text-sm text-muted-foreground">{currentWeek.daysLeft}일 남음</p>
          </div>

          <Badge variant="secondary" className="px-3 py-1">
            {getTotalPoints()}포인트 획득
          </Badge>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto p-6 space-y-6">
        {/* 이번 주 챌린지 개요 */}
        <Card className="bg-gradient-to-r from-blue-50 to-green-50">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="space-y-2">
                <h2 className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  {currentWeek.title}
                </h2>
                <p className="text-muted-foreground">{currentWeek.description}</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center mb-2">
                  <Award className="w-8 h-8" />
                </div>
                <p className="text-sm">보상</p>
                <p className="font-medium">{currentWeek.reward}pt</p>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>주간 진행률</span>
                <span>{currentWeek.progress}%</span>
              </div>
              <Progress value={currentWeek.progress} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* 일일 챌린지 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>오늘의 챌린지</span>
              <Badge variant="outline">
                {getCompletedCount()}/{dailyChallenges.length} 완료
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {dailyChallenges.map((challenge) => (
              <div 
                key={challenge.id} 
                className={`p-4 rounded-lg border ${
                  completedTasks.includes(challenge.id) ? 'bg-green-50 border-green-200' : 'bg-card'
                }`}
              >
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={completedTasks.includes(challenge.id)}
                    onCheckedChange={() => handleTaskComplete(challenge.id)}
                    className="mt-1"
                  />
                  
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className={completedTasks.includes(challenge.id) ? 'line-through text-muted-foreground' : ''}>
                        {challenge.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {challenge.category}
                        </Badge>
                        <Badge variant="secondary">
                          +{challenge.points}pt
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {challenge.description}
                    </p>
                  </div>
                </div>

                {completedTasks.includes(challenge.id) && (
                  <div className="mt-3 pt-3 border-t border-green-200 flex items-center gap-2 text-green-600 text-sm">
                    <CheckCircle className="w-4 h-4" />
                    완료! +{challenge.points} 새싹 포인트를 획득했어요
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 주간 보너스 챌린지 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-500" />
              주간 보너스 챌린지
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {weeklyBonus.map((bonus) => (
              <div key={bonus.id} className="p-4 rounded-lg border bg-card">
                <div className="flex items-center justify-between mb-3">
                  <h3>{bonus.title}</h3>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-700">
                    +{bonus.points}pt
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-3">
                  {bonus.description}
                </p>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>진행률</span>
                    <span>{bonus.progress}/{bonus.total}</span>
                  </div>
                  <Progress value={(bonus.progress / bonus.total) * 100} className="h-2" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 성취 배지 */}
        <Card>
          <CardHeader>
            <CardTitle>성취 배지</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {achievements.map((achievement, index) => (
                <div 
                  key={index} 
                  className={`p-4 rounded-lg border text-center ${
                    achievement.unlocked ? 'bg-yellow-50 border-yellow-200' : 'bg-muted border-border opacity-60'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center ${
                    achievement.unlocked ? 'bg-yellow-500 text-white' : 'bg-muted-foreground text-muted'
                  }`}>
                    <Award className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm mb-1">{achievement.title}</h4>
                  <p className="text-xs text-muted-foreground">{achievement.description}</p>
                  {achievement.unlocked && (
                    <Badge variant="outline" className="text-xs mt-2">
                      달성 완료
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 다음 주 미리보기 */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="mb-1">다음 주 챌린지 미리보기</h3>
                <p className="text-muted-foreground">
                  "영양 공급 위크" - 모발에 필요한 영양소 공급에 집중해요
                </p>
              </div>
              <div className="text-center">
                <Flame className="w-8 h-8 text-orange-500 mx-auto mb-1" />
                <p className="text-sm text-muted-foreground">곧 시작</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default WeeklyChallenges;
export { WeeklyChallenges };