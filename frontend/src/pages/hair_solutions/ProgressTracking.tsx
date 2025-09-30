import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { ArrowLeft, Camera, TrendingUp, Calendar, Zap } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ImageWithFallback } from '../../hooks/ImageWithFallback';
import { 
  ResponsiveContainer, 
  BarChart, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Bar 
} from 'recharts';

interface ProgressTrackingProps {
  setCurrentView?: (view: string) => void;
}

function ProgressTracking({ setCurrentView }: ProgressTrackingProps = {}) {
  const navigate = useNavigate();
  const [selectedComparison, setSelectedComparison] = useState('week4');

  // 모의 데이터
  const progressData = [
    { week: '1주차', hairDensity: 72, scalpHealth: 85, overall: 78 },
    { week: '2주차', hairDensity: 74, scalpHealth: 87, overall: 80 },
    { week: '3주차', hairDensity: 76, scalpHealth: 88, overall: 82 },
    { week: '4주차', hairDensity: 79, scalpHealth: 90, overall: 84 },
  ];

  const weeklyImprovements = [
    { category: '모발 밀도', improvement: '+7점', status: 'good' },
    { category: '두피 건강', improvement: '+5점', status: 'good' },
    { category: '모발 굵기', improvement: '+3점', status: 'good' },
    { category: '탈모 속도', improvement: '-15%', status: 'excellent' },
  ];

  const photos = [
    {
      week: '1주차',
      date: '2024-01-15',
      photo: 'https://images.unsplash.com/photo-1666622833860-562f3a5caa59?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYWlyJTIwbG9zcyUyMHNjYWxwJTIwdHJlYXRtZW50fGVufDF8fHx8MTc1ODA3NTYyOHww&ixlib=rb-4.1.0&q=80&w=1080'
    },
    {
      week: '4주차',
      date: '2024-02-15',
      photo: 'https://images.unsplash.com/photo-1666622833860-562f3a5caa59?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYWlyJTIwbG9zcyUyMHNjYWxwJTIwdHJlYXRtZW50fGVufDF8fHx8MTc1ODA3NTYyOHww&ixlib=rb-4.1.0&q=80&w=1080'
    }
  ];

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
            <h1>변화 추적</h1>
            <p className="text-sm text-muted-foreground">4주간의 개선 여정</p>
          </div>

          <Button>
            <Camera className="w-4 h-4 mr-2" />
            새 사진 추가
          </Button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto p-6">
        {/* 종합 개선 현황 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              종합 개선 현황
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {weeklyImprovements.map((item, index) => (
                <div key={index} className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">{item.category}</p>
                  <p className={`text-lg ${item.status === 'excellent' ? 'text-green-600' : 'text-blue-600'}`}>
                    {item.improvement}
                  </p>
                  <Badge variant={item.status === 'excellent' ? 'default' : 'secondary'}>
                    {item.status === 'excellent' ? '우수' : '양호'}
                  </Badge>
                </div>
              ))}
            </div>
            
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-center">
                🎉 <strong>축하합니다!</strong> 4주간 전체적으로 <strong>7.7% 개선</strong>되었어요!
              </p>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="comparison" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="comparison">사진 비교</TabsTrigger>
            <TabsTrigger value="charts">데이터 분석</TabsTrigger>
            <TabsTrigger value="timeline">주간 기록</TabsTrigger>
          </TabsList>

          <TabsContent value="comparison" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Before & After 비교</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {photos.map((photo, index) => (
                    <div key={index} className="space-y-3">
                      <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                        <ImageWithFallback 
                          src={photo.photo}
                          alt={`${photo.week} 사진`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="text-center">
                        <h3>{photo.week}</h3>
                        <p className="text-sm text-muted-foreground">{photo.date}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="mb-3">🔍 AI 분석 결과</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">모발 밀도</p>
                      <p>72% → 79% (+7%)</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">헤어라인</p>
                      <p>약간 개선됨</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">정수리 부분</p>
                      <p>뚜렷한 개선</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="charts" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>주간 변화 추이</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80 flex items-center justify-center">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">차트를 불러오는 중...</p>
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      {progressData.map((item, index) => (
                        <div key={index} className="text-center">
                          <p className="font-medium">{item.week}</p>
                          <p className="text-blue-600">{item.hairDensity}%</p>
                          <p className="text-green-600">{item.scalpHealth}%</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>주차별 개선량</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={progressData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="week" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="hairDensity" fill="#8884d8" name="모발 밀도" />
                      <Bar dataKey="scalpHealth" fill="#82ca9d" name="두피 건강" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-6">
            <div className="space-y-4">
              {[
                {
                  week: '4주차',
                  date: '2024-02-15',
                  achievements: ['주간 챌린지 완료', '정수리 밀도 2% 향상', '+25 새싹 포인트 획득'],
                  photo: true
                },
                {
                  week: '3주차',
                  date: '2024-02-08',
                  achievements: ['두피 마사지 7일 연속', '스트레스 관리 루틴 시작', '+20 새싹 포인트 획득'],
                  photo: true
                },
                {
                  week: '2주차',
                  date: '2024-02-01',
                  achievements: ['영양제 복용 시작', '수면 패턴 개선', '+15 새싹 포인트 획득'],
                  photo: true
                },
                {
                  week: '1주차',
                  date: '2024-01-25',
                  achievements: ['첫 진단 완료', '개선 계획 수립', '+10 새싹 포인트 획득'],
                  photo: true
                }
              ].map((week, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          {week.photo ? <Camera className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
                        </div>
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3>{week.week}</h3>
                          <span className="text-sm text-muted-foreground">{week.date}</span>
                        </div>
                        
                        <div className="space-y-1">
                          {week.achievements.map((achievement, achievementIndex) => (
                            <div key={achievementIndex} className="flex items-center gap-2 text-sm">
                              <Zap className="w-4 h-4 text-yellow-500" />
                              <span>{achievement}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* 다음 단계 안내 */}
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <h3>🚀 다음 목표</h3>
              <p className="text-muted-foreground">
                현재 진행 상황이 우수합니다! 계속해서 루틴을 유지하면 
                <br />2개월 후 추가 10% 개선이 예상됩니다.
              </p>
              <div className="flex justify-center gap-3">
                <Button onClick={() => setCurrentView?.('challenges')}>
                  이번 주 챌린지
                </Button>
                <Button variant="outline" onClick={() => setCurrentView?.('virtual')}>
                  미래 모습 보기
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default ProgressTracking;
export { ProgressTracking };