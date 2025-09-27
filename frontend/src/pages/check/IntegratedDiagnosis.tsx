import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { analyzeHairWithGemini, getStageDescription, getStageColor, GeminiAnalysisResult } from '../../services/geminiAnalysisService';
import SelfCheckStep from '../../components/check/SelfCheckStep';
import ImageUploadStep from '../../components/check/ImageUploadStep';
import AnalysisProgressStep from '../../components/check/AnalysisProgressStep';
import AnalysisResultStep from '../../components/check/AnalysisResultStep';

interface IntegratedDiagnosisProps {
  setCurrentView?: (view: string) => void;
  onDiagnosisComplete?: (results: any) => void;
}

function IntegratedDiagnosis({ setCurrentView, onDiagnosisComplete }: IntegratedDiagnosisProps = {}) {
  const navigate = useNavigate();
  const user = useSelector((state: any) => state.user);
  const token = useSelector((state: any) => state.token.jwtToken);
  const [currentStep, setCurrentStep] = useState(1);
  const [baspAnswers, setBaspAnswers] = useState({
    gender: '',
    age: '',
    familyHistory: '',
    hairLossPattern: '',
    duration: '',
    lifestyle: '',
    stress: '',
    diet: '',
    supplements: '',
    recentHairLoss: ''
  });
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [uploadedPhotoFile, setUploadedPhotoFile] = useState<File | null>(null);
  const [uploadedSidePhoto, setUploadedSidePhoto] = useState<string | null>(null);
  const [uploadedSidePhotoFile, setUploadedSidePhotoFile] = useState<File | null>(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisSteps, setAnalysisSteps] = useState<string[]>([]);
  const [analysisResult, setAnalysisResult] = useState<GeminiAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const totalSteps = 4;

  // 이미지 업로드 핸들러는 ImageUploadStep 컴포넌트로 이동됨

  const performRealAnalysis = async () => {
    if (!uploadedPhotoFile) {
      setAnalysisError('분석할 이미지가 없습니다.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisProgress(0);
    setAnalysisSteps([]);

    try {
      // 분석 단계 시뮬레이션
      const steps = [
        'BASP 설문 분석 완료',
        '이미지 전처리 완료',
        'Gemini AI 모발 분석 중...',
        '탈모 진행도 측정 완료',
        '헤어라인 분석 완료',
        '개인 맞춤 계획 수립 완료'
      ];

      // 단계별 진행 시뮬레이션
      for (let i = 0; i < steps.length; i++) {
        setAnalysisSteps(prev => [...prev, steps[i]]);
        setAnalysisProgress((i + 1) / steps.length * 100);

        if (i === 2) {
          // 실제 API 호출은 3번째 단계에서
          console.log('🔄 실제 Gemini API 분석 시작');

          const result = await analyzeHairWithGemini(
            uploadedPhotoFile,
            undefined, // 현재는 userId 없이 (로그인 구현 후 추가 가능)
            undefined  // imageUrl 없이
          );

          console.log('✅ Gemini 분석 결과:', result);
          setAnalysisResult(result.analysis);
        }

        // 각 단계 사이의 지연
        await new Promise(resolve => setTimeout(resolve, i === 2 ? 2000 : 800));
      }

      setAnalysisComplete(true);

      // 결과 화면으로 이동
      setTimeout(() => {
        setCurrentStep(4);
      }, 1000);

    } catch (error) {
      console.error('❌ 분석 오류:', error);
      setAnalysisError(
        error instanceof Error
          ? error.message
          : '분석 중 오류가 발생했습니다. 다시 시도해주세요.'
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleComplete = () => {
    // 로그인 상태 확인
    const isLoggedIn = !!(user.username && token);
    if (!isLoggedIn) {
      alert('로그인 후 확인하실 수 있습니다');
      navigate('/login');
      return;
    }

    const results = {
      basp: {
        score: 3.2,
        stage: analysisResult ? getStageDescription(analysisResult.stage) : "초기 단계",
        riskFactors: ['가족력', '스트레스'],
        recommendations: analysisResult ? analysisResult.advice : [
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
        overallScore: 78,
        geminiResult: analysisResult
      },
      integrated: {
        priority: analysisResult && analysisResult.stage <= 1 ? 'low' : analysisResult && analysisResult.stage >= 3 ? 'high' : 'medium',
        expectedImprovement: '3개월 내 15-25% 개선 가능',
        customPlan: true
      }
    };

    if (onDiagnosisComplete) {
      onDiagnosisComplete(results);
    }
    // 결과 페이지로 이동 (Gemini 분석 결과와 함께)
    if (setCurrentView) {
      setCurrentView('results');
    } else {
      navigate('/diagnosis-results', {
        state: {
          geminiResult: analysisResult,
          diagnosisData: results
        }
      });
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <SelfCheckStep 
            baspAnswers={baspAnswers}
            setBaspAnswers={setBaspAnswers}
          />
        );

      case 2:
        return (
          <ImageUploadStep 
            uploadedPhoto={uploadedPhoto}
            setUploadedPhoto={setUploadedPhoto}
            setUploadedPhotoFile={setUploadedPhotoFile}
            uploadedSidePhoto={uploadedSidePhoto}
            setUploadedSidePhoto={setUploadedSidePhoto}
            setUploadedSidePhotoFile={setUploadedSidePhotoFile}
          />
        );

      case 3:
        return (
          <AnalysisProgressStep 
            analysisComplete={analysisComplete}
            analysisProgress={analysisProgress}
            analysisSteps={analysisSteps}
            analysisResult={analysisResult}
            analysisError={analysisError}
            isAnalyzing={isAnalyzing}
            onRetry={() => {
                    setAnalysisError(null);
                    setCurrentStep(2);
                  }}
            onGoBack={() => setCurrentStep(2)}
          />
        );

      case 4:
        return (
          <AnalysisResultStep 
            analysisResult={analysisResult}
            onComplete={handleComplete}
          />
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
          <div className="flex items-center justify-center">           
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">
                {currentStep} / {totalSteps}
              </span>
              <Progress value={(currentStep / totalSteps) * 100} className="w-60 h-2" />
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
                    performRealAnalysis();
                  }}
                  className="flex-1 h-12 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98]"
                  disabled={isAnalyzing}
                >
                  {isAnalyzing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      분석 중...
                    </>
                  ) : (
                    <>
                      🧠 AI 분석 시작
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
              
              {currentStep === 1 && (
                <Button 
                  onClick={() => setCurrentStep(2)}
                  disabled={!baspAnswers.gender || !baspAnswers.age || !baspAnswers.familyHistory || !baspAnswers.recentHairLoss || !baspAnswers.stress}
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