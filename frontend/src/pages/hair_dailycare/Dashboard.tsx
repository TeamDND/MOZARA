import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Progress } from '../../components/ui/progress';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Sprout, TrendingUp, Camera, Target, Award, Calendar } from 'lucide-react';
import { PlantGrowth } from '../../components/PlantGrowth';

interface DashboardProps {
  currentView?: string;
  setCurrentView?: (view: string) => void;
  userProgress?: {
    weeksSinceStart: number;
    currentPoints: number;
    overallImprovement: number;
    lastPhotoDate: string | null;
    completedChallenges: number;
    level: string;
  };
}

function Dashboard({ currentView, setCurrentView, userProgress }: DashboardProps = {}) {
  const navigate = useNavigate();
  
  // 기본값 설정
  const defaultProgress = {
    weeksSinceStart: 4,
    currentPoints: 240,
    overallImprovement: 15,
    lastPhotoDate: null,
    completedChallenges: 8,
    level: 'bronze'
  };
  
  const progress = userProgress || defaultProgress;
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

  const nextAction = getNextAction();

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1>안녕하세요! 👋</h1>
          <p className="text-muted-foreground">
            {progress.weeksSinceStart}주째 개선 여정을 함께하고 있어요
          </p>
        </div>
        <Badge variant="secondary" className="px-3 py-1">
          {progress.level} 레벨
        </Badge>
      </div>

      {/* 다음 액션 카드 */}
      <Card className={`${nextAction.urgent ? 'ring-2 ring-primary/20 bg-primary/5' : ''}`}>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <h3 className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                {nextAction.title}
              </h3>
              <p className="text-muted-foreground">
                {nextAction.description}
              </p>
            </div>
            <Button 
              onClick={() => {
                if (nextAction.action === 'diagnosis') {
                  navigate('/integrated-diagnosis');
                } else {
                  setCurrentView?.(nextAction.action);
                }
              }}
              variant={nextAction.urgent ? "default" : "outline"}
            >
              {nextAction.buttonText}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 진행 상황 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground">새싹 포인트</p>
                <p className="text-2xl">{progress.currentPoints}</p>
              </div>
              <Sprout className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground">전체 개선도</p>
                <p className="text-2xl">{progress.overallImprovement}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground">완료한 챌린지</p>
                <p className="text-2xl">{progress.completedChallenges}</p>
              </div>
              <Award className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground">개선 여정</p>
                <p className="text-2xl">{progress.weeksSinceStart}주차</p>
              </div>
              <Calendar className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 식물 성장 시각화 */}
      <Card>
        <CardHeader>
          <CardTitle>나의 성장</CardTitle>
        </CardHeader>
        <CardContent>
          <PlantGrowth points={progress.currentPoints} level={progress.level} />
        </CardContent>
      </Card>

      {/* 전체 진행률 */}
      <Card>
        <CardHeader>
          <CardTitle>이번 주 진행률</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span>주간 목표 달성률</span>
              <span>75%</span>
            </div>
            <Progress value={75} className="h-2" />
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="space-y-1">
              <p className="text-muted-foreground">사진 촬영</p>
              <p className="text-sm">✅ 완료</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">챌린지</p>
              <p className="text-sm">⏳ 진행중</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">루틴 관리</p>
              <p className="text-sm">✅ 완료</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">AI 분석</p>
              <p className="text-sm">📅 예정</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 빠른 액션 버튼들 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Button 
          variant="outline" 
          className="h-20 flex flex-col items-center gap-2"
          onClick={() => navigate('/integrated-diagnosis')}
        >
          <Target className="w-6 h-6" />
          재진단
        </Button>
        <Button 
          variant="outline" 
          className="h-20 flex flex-col items-center gap-2"
          onClick={() => setCurrentView?.('tracking')}
        >
          <Camera className="w-6 h-6" />
          변화 기록
        </Button>
        <Button 
          variant="outline" 
          className="h-20 flex flex-col items-center gap-2"
          onClick={() => setCurrentView?.('challenges')}
        >
          <Award className="w-6 h-6" />
          챌린지
        </Button>
        <Button 
          variant="outline" 
          className="h-20 flex flex-col items-center gap-2"
          onClick={() => setCurrentView?.('virtual')}
        >
          <Sprout className="w-6 h-6" />
          미래 모습
        </Button>
      </div>
    </div>
  );
}

export default Dashboard;
export { Dashboard };