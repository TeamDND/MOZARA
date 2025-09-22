import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import { ArrowLeft, ArrowRight, Upload, CheckCircle, Brain, Camera } from 'lucide-react';

interface IntegratedDiagnosisProps {
  setCurrentView?: (view: string) => void;
  onDiagnosisComplete?: (results: any) => void;
}

function IntegratedDiagnosis({ setCurrentView, onDiagnosisComplete }: IntegratedDiagnosisProps = {}) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [baspAnswers, setBaspAnswers] = useState({
    age: '',
    familyHistory: '',
    hairLossPattern: '',
    duration: '',
    lifestyle: '',
    stress: '',
    diet: '',
    supplements: ''
  });
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  const totalSteps = 4;

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedPhoto(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const simulateAnalysis = () => {
    setAnalysisComplete(true);
    // 3초 후 결과 페이지로 이동
    setTimeout(() => {
      setCurrentStep(4);
    }, 3000);
  };

  const handleComplete = () => {
    const results = {
      basp: {
        score: 3.2,
        stage: "초기 단계",
        riskFactors: ['가족력', '스트레스'],
        recommendations: [
          '두피 마사지 루틴 시작',
          '규칙적인 운동',
          '충분한 수면',
          '영양 보충제 섭취'
        ]
      },
      photo: {
        hairDensity: 72,
        scalpHealth: 85,
        improvementAreas: ['정수리 부분', '헤어라인'],
        overallScore: 78
      },
      integrated: {
        priority: 'medium',
        expectedImprovement: '3개월 내 15-25% 개선 가능',
        customPlan: true
      }
    };
    
    if (onDiagnosisComplete) {
      onDiagnosisComplete(results);
    }
    // 결과 페이지로 이동
    if (setCurrentView) {
      setCurrentView('results');
    } else {
      navigate('/diagnosis-results');
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <Brain className="w-12 h-12 text-primary mx-auto" />
              <h2>BASP 자가진단 설문</h2>
              <p className="text-muted-foreground">
                생활 습관과 유전적 요인을 파악하여 정확한 진단을 도와드려요
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="age">연령대</Label>
                <RadioGroup 
                  value={baspAnswers.age} 
                  onValueChange={(value) => setBaspAnswers(prev => ({...prev, age: value}))}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="20s" id="20s" />
                    <Label htmlFor="20s">20대</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="30s" id="30s" />
                    <Label htmlFor="30s">30대</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="40s" id="40s" />
                    <Label htmlFor="40s">40대 이상</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="familyHistory">가족력</Label>
                <RadioGroup 
                  value={baspAnswers.familyHistory} 
                  onValueChange={(value) => setBaspAnswers(prev => ({...prev, familyHistory: value}))}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="none" id="none" />
                    <Label htmlFor="none">없음</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="paternal" id="paternal" />
                    <Label htmlFor="paternal">부계</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="maternal" id="maternal" />
                    <Label htmlFor="maternal">모계</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="both" id="both" />
                    <Label htmlFor="both">양쪽</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="duration">탈모 지속 기간</Label>
                <RadioGroup 
                  value={baspAnswers.duration} 
                  onValueChange={(value) => setBaspAnswers(prev => ({...prev, duration: value}))}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="recent" id="recent" />
                    <Label htmlFor="recent">최근 6개월 이내</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="1year" id="1year" />
                    <Label htmlFor="1year">1년 정도</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="long" id="long" />
                    <Label htmlFor="long">2년 이상</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="stress">스트레스 수준</Label>
                <RadioGroup 
                  value={baspAnswers.stress} 
                  onValueChange={(value) => setBaspAnswers(prev => ({...prev, stress: value}))}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="low" id="low" />
                    <Label htmlFor="low">낮음</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="medium" id="medium" />
                    <Label htmlFor="medium">보통</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="high" id="high" />
                    <Label htmlFor="high">높음</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <Camera className="w-12 h-12 text-primary mx-auto" />
              <h2>AI 탈모 분석</h2>
              <p className="text-muted-foreground">
                두피와 탈모 상태를 AI가 객관적으로 분석해드려요
              </p>
            </div>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8">
                {!uploadedPhoto ? (
                  <div className="text-center space-y-4">
                    <Upload className="w-12 h-12 text-muted-foreground mx-auto" />
                    <div>
                      <h3>탈모 진단용 사진을 업로드해주세요</h3>
                      <p className="text-muted-foreground">
                        정수리와 헤어라인이 잘 보이는 사진을 선택해주세요
                      </p>
                    </div>
                    <div>
                      <Button type="button" onClick={() => document.getElementById('photo-upload')?.click()}>사진 선택</Button>
                      <Input
                        id="photo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="w-48 h-48 mx-auto rounded-lg overflow-hidden">
                      <img 
                        src={uploadedPhoto} 
                        alt="업로드된 사진" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex justify-center gap-2">
                      <Badge variant="secondary">✅ 업로드 완료</Badge>
                      <div>
                        <Badge 
                          variant="outline" 
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => document.getElementById('photo-reupload')?.click()}
                        >
                          다시 선택
                        </Badge>
                        <Input
                          id="photo-reupload"
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4>📸 탈모 진단 촬영 가이드</h4>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                  <li>• 밝은 곳에서 촬영해주세요</li>
                  <li>• 머리를 완전히 말린 상태로 촬영해주세요</li>
                  <li>• 정수리와 헤어라인이 모두 보이도록 해주세요</li>
                  <li>• 스타일링 제품 없이 자연스러운 상태로 촬영해주세요</li>
                </ul>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
              <h2>AI 탈모 분석 중...</h2>
              <p className="text-muted-foreground">
                설문 응답과 사진을 종합하여 탈모 상태를 분석하고 있어요
              </p>
            </div>

            {!analysisComplete && (
              <div className="space-y-4">
                <Progress value={75} className="h-2" />
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>BASP 설문 분석 완료</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>탈모 진행도 측정 완료</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>헤어라인 분석 완료</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <span>개인 맞춤 계획 수립 중...</span>
                  </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <p className="text-sm">
                    💡 <strong>잠깐!</strong> 분석 결과를 바탕으로 개인 맞춤형 개선 계획을 세우고 있어요. 
                    잠시만 기다려주세요.
                  </p>
                </div>
              </div>
            )}

            {analysisComplete && (
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3>분석이 완료되었습니다!</h3>
                <p className="text-muted-foreground">
                  상세한 결과를 확인해보세요
                </p>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
              <h2>통합 진단 결과</h2>
              <p className="text-muted-foreground">
                AI가 분석한 종합적인 두피 상태입니다
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>BASP 분석 결과</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>종합 점수</span>
                    <Badge variant="outline">3.2 / 7</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>진행 단계</span>
                    <Badge variant="secondary">초기 단계</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">주요 위험 요인</p>
                    <div className="flex gap-1 mt-1">
                      <Badge variant="outline" className="text-xs">가족력</Badge>
                      <Badge variant="outline" className="text-xs">스트레스</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>모발 분석 결과</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>모발 밀도</span>
                    <Badge variant="outline">72%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>두피 건강도</span>
                    <Badge variant="secondary">85%</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">개선 필요 부위</p>
                    <div className="flex gap-1 mt-1">
                      <Badge variant="outline" className="text-xs">정수리</Badge>
                      <Badge variant="outline" className="text-xs">헤어라인</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-green-50">
              <CardContent className="p-6">
                <h3 className="mb-3">🎯 개인 맞춤 개선 계획</h3>
                <div className="space-y-2">
                  <p>✅ 3개월 내 15-25% 개선이 예상됩니다</p>
                  <p>✅ 우선순위: 두피 마사지 + 생활 습관 개선</p>
                  <p>✅ 주간 챌린지가 자동으로 설정됩니다</p>
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-col gap-3 text-center">
              <Button 
                onClick={() => {
                  if (setCurrentView) {
                    setCurrentView('damage');
                  } else {
                    navigate('/hair-damage-analysis');
                  }
                }} 
                size="lg" 
                className="w-full md:w-auto"
              >
                모발 손상 분석 계속하기
              </Button>
              <Button onClick={handleComplete} variant="outline" size="lg" className="w-full md:w-auto">
                결과만 먼저 확인하기
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <div className="sticky top-0 bg-background border-b p-4">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              if (setCurrentView) {
                setCurrentView('dashboard');
              } else {
                navigate('/dashboard');
              }
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            뒤로
          </Button>
          
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {currentStep} / {totalSteps}
            </span>
            <Progress value={(currentStep / totalSteps) * 100} className="w-32" />
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-[1400px] mx-auto p-6">
        <Card>
          <CardContent className="p-8">
            {renderStep()}
          </CardContent>
        </Card>

        {/* 네비게이션 버튼 */}
        {currentStep < 4 && (
          <div className="flex justify-between mt-6">
            <Button 
              variant="outline" 
              onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              이전
            </Button>
            
            {currentStep === 2 && uploadedPhoto && (
              <Button onClick={() => {
                setCurrentStep(3);
                simulateAnalysis();
              }}>
                분석 시작
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
            
            {currentStep === 1 && (
              <Button 
                onClick={() => setCurrentStep(2)}
                disabled={!baspAnswers.age || !baspAnswers.familyHistory}
              >
                다음
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default IntegratedDiagnosis;
export { IntegratedDiagnosis };