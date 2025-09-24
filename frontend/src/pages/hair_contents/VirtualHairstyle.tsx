import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { ArrowLeft, Sparkles, Target, Calendar, Wand2, Camera, Download } from 'lucide-react';
import { ImageWithFallback } from '../../hooks/ImageWithFallback';

interface VirtualHairstyleProps {
  setCurrentView?: (view: string) => void;
}

function VirtualHairstyle({ setCurrentView }: VirtualHairstyleProps = {}) {
  const [selectedPeriod, setSelectedPeriod] = useState('3months');
  const [selectedStyle, setSelectedStyle] = useState('natural');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const predictionPeriods = [
    { id: '3months', label: '3개월 후', improvement: 15, available: true },
    { id: '6months', label: '6개월 후', improvement: 30, available: true },
    { id: '1year', label: '1년 후', improvement: 50, available: false, reason: '더 많은 데이터가 필요해요' }
  ];

  const hairstyles = [
    {
      id: 'natural',
      name: '자연스러운 스타일',
      description: '현재 스타일을 유지하며 볼륨만 개선',
      image: 'https://images.unsplash.com/photo-1583449993408-9366b5a231fc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBoYWlyc3R5bGUlMjBtYW58ZW58MXx8fHwxNzU4MDc1NjI5fDA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    {
      id: 'side',
      name: '사이드 파트',
      description: '옆으로 넘긴 클래식한 스타일',
      image: 'https://images.unsplash.com/photo-1583449993408-9366b5a231fc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBoYWlyc3R5bGUlMjBtYW58ZW58MXx8fHwxNzU4MDc1NjI5fDA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    {
      id: 'short',
      name: '숏 스타일',
      description: '짧고 깔끔한 현대적 스타일',
      image: 'https://images.unsplash.com/photo-1583449993408-9366b5a231fc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBoYWlyc3R5bGUlMjBtYW58ZW58MXx8fHwxNzU4MDc1NjI5fDA&ixlib=rb-4.1.0&q=80&w=1080'
    },
    {
      id: 'texture',
      name: '텍스처 스타일',
      description: '자연스러운 웨이브가 있는 스타일',
      image: 'https://images.unsplash.com/photo-1583449993408-9366b5a231fc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBoYWlyc3R5bGUlMjBtYW58ZW58MXx8fHwxNzU4MDc1NjI5fDA&ixlib=rb-4.1.0&q=80&w=1080'
    }
  ];

  const handleGenerate = () => {
    setIsGenerating(true);
    // 시뮬레이션: 3초 후 생성 완료
    setTimeout(() => {
      setGeneratedImage('https://images.unsplash.com/photo-1583449993408-9366b5a231fc?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxtb2Rlcm4lMjBoYWlyc3R5bGUlMjBtYW58ZW58MXx8fHwxNzU4MDc1NjI5fDA&ixlib=rb-4.1.0&q=80&w=1080');
      setIsGenerating(false);
    }, 3000);
  };

  const selectedPeriodData = predictionPeriods.find(p => p.id === selectedPeriod);

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
            <h1>미래의 내 모습</h1>
            <p className="text-sm text-muted-foreground">AI로 예측하는 개선 후 모습</p>
          </div>

          <Button variant="outline" size="sm">
            <Camera className="w-4 h-4 mr-2" />
            새 사진
          </Button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto p-6 space-y-6">
        {/* 개선 전망 */}
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50">
          <CardContent className="p-6">
            <div className="text-center space-y-3">
              <Sparkles className="w-12 h-12 text-purple-600 mx-auto" />
              <h2>현재 진행도를 기반으로 한 개선 전망</h2>
              <p className="text-muted-foreground">
                꾸준한 관리로 {selectedPeriodData?.improvement}%의 개선이 예상됩니다
              </p>
              
              <div className="flex justify-center gap-2 mt-4">
                {predictionPeriods.map((period) => (
                  <Button
                    key={period.id}
                    variant={selectedPeriod === period.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => period.available && setSelectedPeriod(period.id)}
                    disabled={!period.available}
                    className="relative"
                  >
                    {period.label}
                    {!period.available && (
                      <Badge variant="secondary" className="absolute -top-2 -right-2 text-xs">
                        준비중
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="preview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="preview">미리보기</TabsTrigger>
            <TabsTrigger value="styles">헤어스타일</TabsTrigger>
            <TabsTrigger value="timeline">개선 타임라인</TabsTrigger>
          </TabsList>

          <TabsContent value="preview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 현재 상태 */}
              <Card>
                <CardHeader>
                  <CardTitle>현재 (기준점)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-4">
                    <ImageWithFallback 
                      src="https://images.unsplash.com/photo-1666622833860-562f3a5caa59?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYWlyJTIwbG9zcyUyMHNjYWxwJTIwdHJlYXRtZW50fGVufDF8fHx8MTc1ODA3NTYyOHww&ixlib=rb-4.1.0&q=80&w=1080"
                      alt="현재 상태"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>모발 밀도</span>
                      <span>79%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>두피 건강</span>
                      <span>90%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 예상 개선 결과 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{selectedPeriodData?.label} 예상</span>
                    <Badge variant="default">+{selectedPeriodData?.improvement}%</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-4 relative">
                    {!generatedImage && !isGenerating && (
                      <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
                        <Wand2 className="w-12 h-12 text-muted-foreground mb-4" />
                        <h3 className="mb-2">AI 예측 이미지 생성</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          현재 진행 상황을 바탕으로 미래 모습을 예측해드려요
                        </p>
                        <Button onClick={handleGenerate}>
                          생성하기
                        </Button>
                      </div>
                    )}

                    {isGenerating && (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
                        <p className="text-sm text-muted-foreground">AI가 예측 이미지를 생성 중...</p>
                      </div>
                    )}

                    {generatedImage && (
                      <ImageWithFallback 
                        src={generatedImage}
                        alt="예상 개선 결과"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>

                  {generatedImage && (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>예상 모발 밀도</span>
                        <span className="text-green-600">91% (+12%)</span>
                      </div>
                      <div className="flex justify-between">
                        <span>예상 두피 건강</span>
                        <span className="text-green-600">95% (+5%)</span>
                      </div>
                      <Button variant="outline" size="sm" className="w-full mt-3">
                        <Download className="w-4 h-4 mr-2" />
                        이미지 저장
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {generatedImage && (
              <Card className="bg-green-50">
                <CardContent className="p-6 text-center">
                  <Target className="w-8 h-8 text-green-600 mx-auto mb-3" />
                  <h3 className="mb-2">목표까지의 여정</h3>
                  <p className="text-muted-foreground mb-4">
                    현재 속도로 계속 관리하시면 {selectedPeriodData?.label}에 이런 모습이 될 수 있어요!
                  </p>
                  <div className="flex justify-center gap-3">
                    <Button onClick={() => setCurrentView?.('challenges')}>
                      챌린지 계속하기
                    </Button>
                    <Button variant="outline" onClick={() => setCurrentView?.('tracking')}>
                      진행 상황 보기
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="styles" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>원하는 헤어스타일 선택</CardTitle>
                <p className="text-muted-foreground">
                  개선된 모발로 어떤 스타일을 시도해보고 싶으신가요?
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {hairstyles.map((style) => (
                    <div 
                      key={style.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedStyle === style.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setSelectedStyle(style.id)}
                    >
                      <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-muted">
                        <ImageWithFallback 
                          src={style.image}
                          alt={style.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <h4 className="text-sm mb-1">{style.name}</h4>
                      <p className="text-xs text-muted-foreground">{style.description}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 text-center">
                  <Button onClick={handleGenerate} disabled={!selectedStyle}>
                    <Wand2 className="w-4 h-4 mr-2" />
                    선택한 스타일로 미래 모습 보기
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>개선 타임라인</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {[
                    {
                      period: '1개월',
                      improvement: '5%',
                      description: '초기 변화 감지, 두피 상태 개선',
                      status: 'completed'
                    },
                    {
                      period: '3개월',
                      improvement: '15%',
                      description: '모발 밀도 증가, 새로운 모발 성장',
                      status: 'current'
                    },
                    {
                      period: '6개월',
                      improvement: '30%',
                      description: '뚜렷한 개선, 헤어스타일 변화 가능',
                      status: 'future'
                    },
                    {
                      period: '12개월',
                      improvement: '50%',
                      description: '최대 개선 효과, 원하는 스타일 완성',
                      status: 'future'
                    }
                  ].map((milestone, index) => (
                    <div key={index} className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        milestone.status === 'completed' ? 'bg-green-500 text-white' :
                        milestone.status === 'current' ? 'bg-primary text-primary-foreground' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {milestone.status === 'completed' ? (
                          <Sparkles className="w-6 h-6" />
                        ) : (
                          <Calendar className="w-6 h-6" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3>{milestone.period}</h3>
                          <Badge variant={milestone.status === 'current' ? 'default' : 'outline'}>
                            +{milestone.improvement}
                          </Badge>
                          {milestone.status === 'current' && (
                            <Badge variant="secondary">현재 목표</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {milestone.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default VirtualHairstyle;
export { VirtualHairstyle };