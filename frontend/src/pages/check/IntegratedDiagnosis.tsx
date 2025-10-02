import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { ArrowLeft, ArrowRight, Info } from 'lucide-react';
import { analyzeHairWithSwin, getStageDescription, getStageColor, SwinAnalysisResult } from '../../services/swinAnalysisService';
import { analyzeHairWithRAG } from '../../services/ragAnalysisService';
import SelfCheckStep from '../../components/check/SelfCheckStep';
import ImageUploadStep from '../../components/check/ImageUploadStep';
import AnalysisProgressStep from '../../components/check/AnalysisProgressStep';
import AnalysisResultStep from '../../components/check/AnalysisResultStep';
import apiClient from '../../services/apiClient';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';

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
  const [analysisResult, setAnalysisResult] = useState<SwinAnalysisResult | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAutoFillModal, setShowAutoFillModal] = useState(false);
  const [showLoginRequiredModal, setShowLoginRequiredModal] = useState(false);

  const totalSteps = 4;

  // 사용자 정보 불러오기
  useEffect(() => {
    const loadUserInfo = async () => {
      if (user?.username && token) {
        try {
          const response = await apiClient.get(`/userinfo/${user.username}`);
          const userInfo = response.data;

          // DB에 저장된 값이 있으면 자동으로 채우기
          if (userInfo.gender || userInfo.age || userInfo.familyHistory !== null || userInfo.isLoss !== null || userInfo.stress) {
            // DB 한글 값을 영문으로 변환
            const convertGender = (gender: string) => {
              if (gender === '남' || gender === 'male') return 'male';
              if (gender === '여' || gender === 'female') return 'female';
              return '';
            };

            const convertStress = (stress: string) => {
              if (stress === '높음' || stress === 'high') return 'high';
              if (stress === '보통' || stress === 'medium') return 'medium';
              if (stress === '낮음' || stress === 'low') return 'low';
              return stress || '';
            };

            setBaspAnswers(prev => ({
              ...prev,
              gender: convertGender(userInfo.gender || ''),
              age: userInfo.age ? String(userInfo.age) : '',
              familyHistory: userInfo.familyHistory === true ? 'yes' : userInfo.familyHistory === false ? 'no' : '',
              recentHairLoss: userInfo.isLoss === true ? 'yes' : userInfo.isLoss === false ? 'no' : '',
              stress: convertStress(userInfo.stress || '')
            }));

            // 필수 필드가 모두 채워져 있으면 모달 표시
            if (userInfo.gender && userInfo.age && userInfo.familyHistory !== null && userInfo.isLoss !== null && userInfo.stress) {
              setShowAutoFillModal(true);
            }
          }
        } catch (error) {
          console.error('사용자 정보 로드 실패:', error);
        }
      }
    };

    loadUserInfo();
  }, [user?.username, token]);

  // 모달 확인 버튼 클릭 시 다음 단계로 이동
  const handleAutoFillConfirm = () => {
    setShowAutoFillModal(false);
    setTimeout(() => setCurrentStep(2), 300);
  };

  // 이미지 업로드 핸들러는 ImageUploadStep 컴포넌트로 이동됨

  const performRealAnalysis = async () => {
    // 남성인 경우 top, side 모두 필요, 여성인 경우 top만 필요
    const isMale = baspAnswers.gender === 'male';
    if (!uploadedPhotoFile) {
      setAnalysisError('Top View 이미지가 필요합니다.');
      return;
    }
    if (isMale && !uploadedSidePhotoFile) {
      setAnalysisError('남성의 경우 Side View 이미지가 필요합니다.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisProgress(0);
    setAnalysisSteps([]);

    try {
      const isMale = baspAnswers.gender === 'male';

      // 분석 단계 시뮬레이션 (성별에 따라 다른 메시지)
      const steps = isMale ? [
        '설문 분석 완료',
        '이미지 전처리 완료',
        'Swin Transformer AI 모발 분석 중...',
        '탈모 진행도 측정 완료',
        '헤어라인 분석 완료',
        '개인 맞춤 계획 수립 완료'
      ] : [
        '설문 분석 완료',
        '이미지 전처리 완료',
        'RAG 듀얼 앙상블 AI 모발 분석 중...',
        '탈모 진행도 측정 완료',
        '두피 밀도 분석 완료',
        '개인 맞춤 계획 수립 완료'
      ];

      // 단계별 진행 시뮬레이션
      for (let i = 0; i < steps.length; i++) {
        setAnalysisSteps(prev => [...prev, steps[i]]);
        setAnalysisProgress((i + 1) / steps.length * 100);

        if (i === 2) {
          // 실제 API 호출은 3번째 단계에서
          // 성별에 따라 다른 분석 방법 사용
          if (isMale) {
            // 남성: Swin Transformer 분석 (Top + Side)
            console.log('🔄 남성 - Swin API 분석 시작');

            const result = await analyzeHairWithSwin(
              uploadedPhotoFile,
              uploadedSidePhotoFile!,
              user?.userId || undefined,
              undefined,
              {
                gender: baspAnswers.gender,
                age: baspAnswers.age,
                familyHistory: baspAnswers.familyHistory,
                recentHairLoss: baspAnswers.recentHairLoss,
                stress: baspAnswers.stress
              }
            );

            console.log('✅ Swin 분석 결과:', result);
            setAnalysisResult(result.analysis);
          } else {
            // 여성: RAG v2 분석 (Top만)
            console.log('🔄 여성 - RAG v2 API 분석 시작');

            const result = await analyzeHairWithRAG(
              uploadedPhotoFile,
              user?.userId || undefined,
              undefined, // imageUrl (선택적)
              {
                gender: baspAnswers.gender,
                age: baspAnswers.age,
                familyHistory: baspAnswers.familyHistory,
                recentHairLoss: baspAnswers.recentHairLoss,
                stress: baspAnswers.stress
              }
            );

            setAnalysisResult(result.analysis);
          }
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
      setShowLoginRequiredModal(true);
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
        swinResult: analysisResult
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
    // 결과 페이지로 이동 (Swin 분석 결과와 함께)
    if (setCurrentView) {
      setCurrentView('results');
    } else {
      navigate('/diagnosis-results', {
        state: {
          swinResult: analysisResult,
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
            gender={baspAnswers.gender}
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
            gender={baspAnswers.gender}
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
            gender={baspAnswers.gender}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 기존 분석 정보 자동 입력 알림 모달 */}
      <AlertDialog open={showAutoFillModal} onOpenChange={setShowAutoFillModal}>
        <AlertDialogContent className="max-w-[90%] sm:max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center justify-center mb-2">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Info className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <AlertDialogTitle className="text-center text-xl">
              기존 분석 정보 확인
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base leading-relaxed pt-2">
              기존 분석 정보가 존재하여 데이터를 자동으로 입력했습니다.
              <br />
              <br />
              수정을 원하시면 <span className="font-semibold text-gray-800">마이페이지</span>의 분석정보를 수정해주세요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-3">
            <AlertDialogAction 
              onClick={() => {
                setShowAutoFillModal(false);
                navigate('/mypage', { state: { activeTab: 'profile', activeSubTab: 'analysis' } });
              }}
              className="w-full sm:w-auto bg-gray-200 hover:bg-gray-300 text-gray-800 px-8"
            >
              수정하기
            </AlertDialogAction>
            <AlertDialogAction 
              onClick={handleAutoFillConfirm}
              className="w-full sm:w-auto bg-[#222222] hover:bg-[#333333] text-white px-8"
            >
              확인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 로그인 필요 안내 모달 */}
      <AlertDialog open={showLoginRequiredModal} onOpenChange={setShowLoginRequiredModal}>
        <AlertDialogContent className="max-w-[90%] sm:max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center justify-center mb-2">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Info className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <AlertDialogTitle className="text-center text-xl">
              로그인이 필요합니다
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base leading-relaxed pt-2">
              맞춤 정보는 로그인 후 이용이 가능합니다
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center gap-3">
            <AlertDialogAction 
              onClick={() => setShowLoginRequiredModal(false)}
              className="w-full sm:w-auto bg-gray-200 hover:bg-gray-300 text-gray-800 px-8"
            >
              확인
            </AlertDialogAction>
            <AlertDialogAction 
              onClick={() => navigate('/login')}
              className="w-full sm:w-auto bg-[#222222] hover:bg-[#333333] text-white px-8"
            >
              로그인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
              {currentStep === 2 && uploadedPhoto && (baspAnswers.gender === 'female' || uploadedSidePhoto) && (
                <Button
                  onClick={() => {
                    setCurrentStep(3);
                    performRealAnalysis();
                  }}
                  className="flex-1 h-12 rounded-xl bg-[#222222] hover:bg-[#333333] active:scale-[0.98]"
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
                  className="flex-1 h-12 rounded-xl bg-[#222222] hover:bg-[#333333] active:scale-[0.98] disabled:opacity-50"
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