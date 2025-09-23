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
  const [uploadedSidePhoto, setUploadedSidePhoto] = useState<string | null>(null);
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

  const handleSidePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedSidePhoto(e.target?.result as string);
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
          <div className="space-y-8">
            <div className="text-center space-y-3">
              <Brain className="w-12 h-12 text-blue-600 mx-auto" />
              <h2 className="text-xl font-bold text-gray-800">BASP 자가진단 설문</h2>
              <p className="text-sm text-gray-600">
                생활 습관과 유전적 요인을 파악하여 정확한 진단을 도와드려요
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="age" className="text-base font-semibold text-gray-800">연령대</Label>
                <RadioGroup 
                  value={baspAnswers.age} 
                  onValueChange={(value) => setBaspAnswers(prev => ({...prev, age: value}))}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                    <RadioGroupItem value="20s" id="20s" />
                    <Label htmlFor="20s" className="text-sm">20대</Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                    <RadioGroupItem value="30s" id="30s" />
                    <Label htmlFor="30s" className="text-sm">30대</Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                    <RadioGroupItem value="40s" id="40s" />
                    <Label htmlFor="40s" className="text-sm">40대 이상</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label htmlFor="familyHistory" className="text-base font-semibold text-gray-800">가족력</Label>
                <RadioGroup 
                  value={baspAnswers.familyHistory} 
                  onValueChange={(value) => setBaspAnswers(prev => ({...prev, familyHistory: value}))}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                    <RadioGroupItem value="none" id="none" />
                    <Label htmlFor="none" className="text-sm">없음</Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                    <RadioGroupItem value="paternal" id="paternal" />
                    <Label htmlFor="paternal" className="text-sm">부계</Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                    <RadioGroupItem value="maternal" id="maternal" />
                    <Label htmlFor="maternal" className="text-sm">모계</Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                    <RadioGroupItem value="both" id="both" />
                    <Label htmlFor="both" className="text-sm">양쪽</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label htmlFor="duration" className="text-base font-semibold text-gray-800">탈모 지속 기간</Label>
                <RadioGroup 
                  value={baspAnswers.duration} 
                  onValueChange={(value) => setBaspAnswers(prev => ({...prev, duration: value}))}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                    <RadioGroupItem value="recent" id="recent" />
                    <Label htmlFor="recent" className="text-sm">최근 6개월 이내</Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                    <RadioGroupItem value="1year" id="1year" />
                    <Label htmlFor="1year" className="text-sm">1년 정도</Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                    <RadioGroupItem value="long" id="long" />
                    <Label htmlFor="long" className="text-sm">2년 이상</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-3">
                <Label htmlFor="stress" className="text-base font-semibold text-gray-800">스트레스 수준</Label>
                <RadioGroup 
                  value={baspAnswers.stress} 
                  onValueChange={(value) => setBaspAnswers(prev => ({...prev, stress: value}))}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                    <RadioGroupItem value="low" id="low" />
                    <Label htmlFor="low" className="text-sm">낮음</Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                    <RadioGroupItem value="medium" id="medium" />
                    <Label htmlFor="medium" className="text-sm">보통</Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
                    <RadioGroupItem value="high" id="high" />
                    <Label htmlFor="high" className="text-sm">높음</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-3">
              <Camera className="w-12 h-12 text-blue-600 mx-auto" />
              <h2 className="text-xl font-bold text-gray-800">AI 탈모 분석</h2>
              <p className="text-sm text-gray-600">
                두피와 탈모 상태를 AI가 객관적으로 분석해드려요
              </p>
            </div>

            <div className="space-y-6">
              {/* Top View - 머리 윗부분 사진 */}
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Top View - 머리 윗부분</h3>
                  <p className="text-sm text-gray-600">
                    정수리와 헤어라인이 잘 보이는 위에서 찍은 사진을 업로드해주세요
                  </p>
                </div>
                
                {!uploadedPhoto ? (
                  <div className="text-center space-y-4">
                    {/* 샘플 이미지 */}
                    <div className="w-48 h-48 mx-auto rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                      <img 
                        src="/assets/images/TopView.PNG" 
                        alt="Top View 샘플 이미지" 
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <div>
                      <Button 
                        type="button" 
                        onClick={() => document.getElementById('top-photo-upload')?.click()}
                        className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl active:scale-[0.98]"
                      >
                        Top View 사진 선택
                      </Button>
                      <Input
                        id="top-photo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="w-48 h-48 mx-auto rounded-xl overflow-hidden border border-gray-200">
                      <img 
                        src={uploadedPhoto} 
                        alt="업로드된 Top View 사진" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex justify-center gap-3">
                      <Badge variant="secondary" className="px-3 py-1">✅ Top View 업로드 완료</Badge>
                      <div>
                        <Badge 
                          variant="outline" 
                          className="cursor-pointer hover:bg-gray-50 px-3 py-1"
                          onClick={() => document.getElementById('top-photo-reupload')?.click()}
                        >
                          다시 선택
                        </Badge>
                        <Input
                          id="top-photo-reupload"
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

              {/* Side View - 머리 옆부분 사진 */}
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-800 mb-2">Side View - 머리 옆부분</h3>
                  <p className="text-sm text-gray-600">
                    머리 옆면과 헤어라인이 잘 보이는 측면 사진을 업로드해주세요
                  </p>
                </div>
                
                {!uploadedSidePhoto ? (
                  <div className="text-center space-y-4">
                    {/* 샘플 이미지 */}
                    <div className="w-48 h-48 mx-auto rounded-xl overflow-hidden border border-gray-200 bg-gray-50 flex items-center justify-center">
                      <img 
                        src="/assets/images/SideView.PNG" 
                        alt="Side View 샘플 이미지" 
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                    <div>
                      <Button 
                        type="button" 
                        onClick={() => document.getElementById('side-photo-upload')?.click()}
                        className="h-12 px-6 bg-blue-600 hover:bg-blue-700 text-white rounded-xl active:scale-[0.98]"
                      >
                        Side View 사진 선택
                      </Button>
                      <Input
                        id="side-photo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleSidePhotoUpload}
                        className="hidden"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="w-48 h-48 mx-auto rounded-xl overflow-hidden border border-gray-200">
                      <img 
                        src={uploadedSidePhoto} 
                        alt="업로드된 Side View 사진" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex justify-center gap-3">
                      <Badge variant="secondary" className="px-3 py-1">✅ Side View 업로드 완료</Badge>
                      <div>
                        <Badge 
                          variant="outline" 
                          className="cursor-pointer hover:bg-gray-50 px-3 py-1"
                          onClick={() => document.getElementById('side-photo-reupload')?.click()}
                        >
                          다시 선택
                        </Badge>
                        <Input
                          id="side-photo-reupload"
                          type="file"
                          accept="image/*"
                          onChange={handleSidePhotoUpload}
                          className="hidden"
                        />
                      </div>
                    </div>
                    
                    {/* 블러처리 버튼 - Side View 사진이 업로드된 후에만 표시 */}
                    <div className="pt-2">
                      <Button 
                        type="button" 
                        className="h-10 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg active:scale-[0.98]"
                      >
                        🔒 블러처리하기
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              

              <div className="bg-blue-50 p-4 rounded-xl">
                <h4 className="font-semibold text-blue-800 mb-3">📸 탈모 진단 촬영 가이드</h4>
                <ul className="text-sm text-blue-700 space-y-2">
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
          <div className="space-y-8">
            <div className="text-center space-y-3">
              <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              <h2 className="text-xl font-bold text-gray-800">AI 탈모 분석 중...</h2>
              <p className="text-sm text-gray-600">
                설문 응답과 사진을 종합하여 탈모 상태를 분석하고 있어요
              </p>
            </div>

            {!analysisComplete && (
              <div className="space-y-6">
                <Progress value={75} className="h-3" />
                
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-sm">BASP 설문 분석 완료</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-sm">탈모 진행도 측정 완료</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span className="text-sm">헤어라인 분석 완료</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm">개인 맞춤 계획 수립 중...</span>
                  </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded-xl">
                  <p className="text-sm text-yellow-800">
                    💡 <strong>잠깐!</strong> 분석 결과를 바탕으로 개인 맞춤형 개선 계획을 세우고 있어요. 
                    잠시만 기다려주세요.
                  </p>
                </div>
              </div>
            )}

            {analysisComplete && (
              <div className="text-center space-y-4">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                <h3 className="text-lg font-semibold text-gray-800">분석이 완료되었습니다!</h3>
                <p className="text-sm text-gray-600">
                  상세한 결과를 확인해보세요
                </p>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="space-y-8">
            <div className="text-center space-y-3">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
              <h2 className="text-xl font-bold text-gray-800">통합 진단 결과</h2>
              <p className="text-sm text-gray-600">
                AI가 분석한 종합적인 두피 상태입니다
              </p>
            </div>

            <div className="space-y-4">
              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">BASP 분석 결과</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">종합 점수</span>
                    <Badge variant="outline" className="px-2 py-1">3.2 / 7</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">진행 단계</span>
                    <Badge variant="secondary" className="px-2 py-1">초기 단계</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-2">주요 위험 요인</p>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs px-2 py-1">가족력</Badge>
                      <Badge variant="outline" className="text-xs px-2 py-1">스트레스</Badge>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">모발 분석 결과</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">모발 밀도</span>
                    <Badge variant="outline" className="px-2 py-1">72%</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">두피 건강도</span>
                    <Badge variant="secondary" className="px-2 py-1">85%</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-2">개선 필요 부위</p>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs px-2 py-1">정수리</Badge>
                      <Badge variant="outline" className="text-xs px-2 py-1">헤어라인</Badge>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-green-50 p-4 rounded-xl">
              <h3 className="text-lg font-semibold text-green-800 mb-3">🎯 개인 맞춤 개선 계획</h3>
              <div className="space-y-2 text-sm text-green-700">
                <p>✅ 3개월 내 15-25% 개선이 예상됩니다</p>
                <p>✅ 우선순위: 두피 마사지 + 생활 습관 개선</p>
                <p>✅ 주간 챌린지가 자동으로 설정됩니다</p>
              </div>
            </div>

            <div className="space-y-3">
              <Button 
                onClick={() => {
                  if (setCurrentView) {
                    setCurrentView('damage');
                  } else {
                    navigate('/hair-damage-analysis');
                  }
                }} 
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl active:scale-[0.98]"
              >
                모발 손상 분석 계속하기
              </Button>
              <Button 
                onClick={handleComplete} 
                variant="outline" 
                className="w-full h-12 rounded-xl active:scale-[0.98]"
              >
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
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-First 컨테이너 */}
      <div className="max-w-full md:max-w-md mx-auto min-h-screen bg-white flex flex-col">
        
        {/* 헤더 (Mobile-First) */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
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
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              뒤로
            </Button>
            
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">
                {currentStep} / {totalSteps}
              </span>
              <Progress value={(currentStep / totalSteps) * 100} className="w-24 h-2" />
            </div>
          </div>
        </div>

        {/* 메인 컨텐츠 (Mobile-First) */}
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-md p-6">
            {renderStep()}
          </div>

          {/* 네비게이션 버튼 (Mobile-First) */}
          {currentStep < 4 && (
            <div className="flex justify-between gap-3 mt-6">
              <Button 
                variant="outline" 
                onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                disabled={currentStep === 1}
                className="flex-1 h-12 rounded-xl"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                이전
              </Button>
              
              {currentStep === 2 && uploadedPhoto && (
                <Button 
                  onClick={() => {
                    setCurrentStep(3);
                    simulateAnalysis();
                  }}
                  className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98]"
                >
                  분석 시작
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
              
              {currentStep === 1 && (
                <Button 
                  onClick={() => setCurrentStep(2)}
                  disabled={!baspAnswers.age || !baspAnswers.familyHistory}
                  className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] disabled:opacity-50"
                >
                  다음
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default IntegratedDiagnosis;
export { IntegratedDiagnosis };