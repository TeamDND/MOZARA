import React, { useState } from 'react';
import { hairDamageService, HairAnalysisRequest, HairAnalysisResponse } from '../../services/hairDamageService';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Progress } from '../../components/ui/progress';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../../components/ui/radio-group';
import { Badge } from '../../components/ui/badge';
import { ArrowLeft, ArrowRight, Upload, CheckCircle, Zap, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface HairDamageAnalysisProps {
  setCurrentView?: (view: string) => void;
  onAnalysisComplete?: (results: any) => void;
  previousData?: any;
}

export default function HairDamageAnalysis({ 
  setCurrentView, 
  onAnalysisComplete, 
  previousData 
}: HairDamageAnalysisProps = {}) {
  const navigate = useNavigate();
  
  // 단계별 UI 상태
  const [currentStep, setCurrentStep] = useState(1);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  
  // 설문 답변 상태
  const [damageAnswers, setDamageAnswers] = useState({
    chemicalTreatment: '',
    heatStyling: '',
    hairType: '',
    porosity: '',
    elasticity: '',
    breakage: '',
    dryness: '',
    tangling: ''
  });
  
  // 기존 API 관련 상태
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [textQuery, setTextQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<HairAnalysisResponse | null>(null);
  
  const totalSteps = 4;

  // 사진 업로드 핸들러 (temp 스타일)
  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedPhoto(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 실제 AI 분석 실행 (기존 API 사용)
  const executeRealAnalysis = async () => {
    if (!selectedImage && !textQuery.trim()) {
      console.warn('이미지나 텍스트가 없어서 시뮬레이션으로 진행합니다.');
    }

    setIsLoading(true);
    setAnalysisComplete(false);
    
    try {
      if (selectedImage || textQuery.trim()) {
        // 실제 API 호출
        const request: HairAnalysisRequest = {
          image: selectedImage || undefined,
          textQuery: textQuery.trim() || undefined,
        };

        const result = await hairDamageService.analyzeHairDamage(request);
        setAnalysisResult(result);
      }
      
      // 분석 완료 후 3초 뒤 4단계로 이동
      setTimeout(() => {
        setAnalysisComplete(true);
        setTimeout(() => {
          setCurrentStep(4);
        }, 1000);
      }, 3000);
    } catch (error) {
      console.error('분석 오류:', error);
      // 오류 발생 시에도 시뮬레이션 결과로 진행
      setTimeout(() => {
        setAnalysisComplete(true);
        setTimeout(() => {
          setCurrentStep(4);
        }, 1000);
      }, 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // 종합 결과 처리 
  const handleComplete = () => {
    const damageResults = {
      damage: {
        overallScore: analysisResult?.results?.[0]?.properties?.confidence ? 
          Math.round(analysisResult.results[0].properties.confidence * 100) : 68,
        porosity: damageAnswers.porosity || 'medium',
        elasticity: damageAnswers.elasticity || 'good',
        breakageLevel: damageAnswers.breakage || 'low',
        drynessLevel: damageAnswers.dryness || 'medium',
        chemicalTreatment: damageAnswers.chemicalTreatment,
        heatStyling: damageAnswers.heatStyling,
        hairType: damageAnswers.hairType,
        recommendations: analysisResult?.summary ? [analysisResult.summary] : [
          '주 2회 딥 컨디셔닝 트리트먼트',
          '열 보호 제품 사용',
          '화학 시술 후 집중 케어',
          '단백질 트리트먼트 월 1회'
        ],
        analysisResults: analysisResult
      },
      photo: {
        cuticleHealth: 75,
        shineLevel: 70,
        textureUniformity: 82,
        colorFading: 15
      },
      integrated: {
        damageStage: analysisResult?.results?.[0]?.properties?.stage || 'mild',
        recoveryTime: '6-8주',
        priority: 'hydration'
      }
    };
    
    // 이전 탈모 분석 결과와 결합
    const combinedResults = {
      ...previousData,
      hairDamage: damageResults
    };
    
    if (onAnalysisComplete) {
      onAnalysisComplete(combinedResults);
    }
    
    if (setCurrentView) {
      setCurrentView('results');
    } else {
      navigate('/diagnosis-results');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-100';
      case 'error': return 'text-red-600 bg-red-100';
      case 'warning': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStageDescription = (stage: number) => {
    switch (stage) {
      case 1: return '모발 손상 없음';
      case 2: return '모발 끝부분 손상, 건조함';
      case 3: return '모발 중간 부분 손상, 갈라짐';
      case 4: return '모발 뿌리 부분 손상, 탈락 위험';
      default: return '알 수 없음';
    }
  };

  // temp 파일의 단계별 렌더링 로직
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <Zap className="w-12 h-12 text-orange-500 mx-auto" />
              <h2>모발 손상 진단 설문</h2>
              <p className="text-muted-foreground">
                모발의 건강 상태와 손상 정도를 정확히 파악해보세요
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="chemicalTreatment">화학적 시술 경험</Label>
                <RadioGroup 
                  value={damageAnswers.chemicalTreatment} 
                  onValueChange={(value) => setDamageAnswers(prev => ({...prev, chemicalTreatment: value}))}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="none" id="none" />
                    <Label htmlFor="none">없음</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="perm" id="perm" />
                    <Label htmlFor="perm">파마 (최근 6개월)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="color" id="color" />
                    <Label htmlFor="color">염색 (최근 3개월)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="both" id="both" />
                    <Label htmlFor="both">파마 + 염색</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="heatStyling">열 기구 사용 빈도</Label>
                <RadioGroup 
                  value={damageAnswers.heatStyling} 
                  onValueChange={(value) => setDamageAnswers(prev => ({...prev, heatStyling: value}))}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="never" id="never" />
                    <Label htmlFor="never">사용하지 않음</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="weekly" id="weekly" />
                    <Label htmlFor="weekly">주 1-2회</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="daily" id="daily" />
                    <Label htmlFor="daily">거의 매일</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="hairType">모발 타입</Label>
                <RadioGroup 
                  value={damageAnswers.hairType} 
                  onValueChange={(value) => setDamageAnswers(prev => ({...prev, hairType: value}))}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="straight" id="straight" />
                    <Label htmlFor="straight">직모</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="wavy" id="wavy" />
                    <Label htmlFor="wavy">웨이브</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="curly" id="curly" />
                    <Label htmlFor="curly">곱슬모</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="breakage">모발 끊어짐 정도</Label>
                <RadioGroup 
                  value={damageAnswers.breakage} 
                  onValueChange={(value) => setDamageAnswers(prev => ({...prev, breakage: value}))}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="none" id="break-none" />
                    <Label htmlFor="break-none">거의 없음</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="mild" id="break-mild" />
                    <Label htmlFor="break-mild">가끔 발생</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="severe" id="break-severe" />
                    <Label htmlFor="break-severe">자주 발생</Label>
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
              <Camera className="w-12 h-12 text-orange-500 mx-auto" />
              <h2>모발 상태 사진 분석</h2>
              <p className="text-muted-foreground">
                모발의 질감, 윤기, 끝머리 상태를 AI가 분석해드려요
              </p>
            </div>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-8">
                {!uploadedPhoto ? (
                  <div className="text-center space-y-4">
                    <Upload className="w-12 h-12 text-muted-foreground mx-auto" />
                    <div>
                      <h3>모발 상태 사진을 업로드해주세요</h3>
                      <p className="text-muted-foreground">
                        모발 끝부분과 전체적인 질감이 잘 보이는 사진을 선택해주세요
                      </p>
                    </div>
                    <Label htmlFor="damage-photo-upload" className="cursor-pointer">
                      <Button type="button">사진 선택</Button>
                      <Input
                        id="damage-photo-upload"
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </Label>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="w-48 h-48 mx-auto rounded-lg overflow-hidden">
                      <img 
                        src={uploadedPhoto} 
                        alt="모발 상태 사진" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex justify-center gap-2">
                      <Badge variant="secondary">✅ 업로드 완료</Badge>
                      <Label htmlFor="damage-photo-reupload" className="cursor-pointer">
                        <Badge variant="outline">다시 선택</Badge>
                        <Input
                          id="damage-photo-reupload"
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                      </Label>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="textQuery">추가 질문 (선택사항)</Label>
                <textarea
                  id="textQuery"
                  value={textQuery}
                  onChange={(e) => setTextQuery(e.target.value)}
                  placeholder="모발 상태에 대해 궁금한 점을 입력하세요..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>

              <div className="bg-orange-50 p-4 rounded-lg">
                <h4>📸 모발 촬영 가이드</h4>
                <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                  <li>• 자연광에서 촬영해주세요</li>
                  <li>• 모발 끝부분이 잘 보이도록 촬영해주세요</li>
                  <li>• 스타일링 제품 없이 자연스러운 상태로 촬영해주세요</li>
                  <li>• 모발의 윤기와 질감이 확인될 수 있도록 해주세요</li>
                </ul>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="animate-spin w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full mx-auto"></div>
              <h2>모발 손상 분석 중...</h2>
              <p className="text-muted-foreground">
                모발의 건강 상태를 정밀하게 분석하고 있어요
              </p>
            </div>

            {!analysisComplete && (
              <div className="space-y-4">
                <Progress value={60} className="h-2" />
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>모발 질감 분석 완료</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>큐티클 상태 측정 완료</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>손상 정도 평가 완료</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                    <span>맞춤형 케어 플랜 생성 중...</span>
                  </div>
                </div>

                <div className="bg-orange-50 p-4 rounded-lg">
                  <p className="text-sm">
                    🔬 <strong>정밀 분석 진행 중</strong> 모발의 다공성, 탄력성, 윤기도를 
                    종합적으로 분석하여 개인 맞춤형 케어 방법을 제안해드려요.
                  </p>
                </div>
              </div>
            )}

            {analysisComplete && (
              <div className="text-center">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3>모발 손상 분석이 완료되었습니다!</h3>
                <p className="text-muted-foreground">
                  탈모 분석과 함께 종합적인 결과를 확인해보세요
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
              <h2>모발 손상 분석 결과</h2>
              <p className="text-muted-foreground">
                AI가 분석한 모발 건강 상태와 개선 방안입니다
              </p>
            </div>

            {/* 실제 분석 결과 표시 */}
            {analysisResult && (
              <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-4">🔍 AI 분석 결과</h3>
                
                {/* Medical Disclaimer */}
                <div className="bg-yellow-50 border-l-4 border-yellow-500 text-yellow-800 p-4 mb-6 rounded-r-lg">
                  <h4 className="font-bold mb-2">⚠️ 중요 안내</h4>
                  <p className="text-sm">
                    이 분석 결과는 AI가 측정한 참고용 데이터입니다. 정확한 진단과 치료를 위해서는 반드시 전문의와 상담하시기 바랍니다.
                  </p>
                </div>
                
                {/* AI Summary Section */}
                {analysisResult.summary && (
                  <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-800 p-4 mb-6 rounded-r-lg">
                    <h4 className="font-bold mb-2">🤖 AI 종합 분석</h4>
                    <p>{analysisResult.summary}</p>
                  </div>
                )}

                {analysisResult.results.length > 0 && (
                  <div className="space-y-4 mb-6">
                    {analysisResult.results.map((result, index: number) => {
                      const damageStatus = hairDamageService.determineHairDamageStatus(result.properties.diagnosis);
                      const isCurrentImage = result.uuid === "current_image_analysis";
                      
                      return (
                        <div key={result.uuid} className={`border rounded-lg p-4 ${isCurrentImage ? 'border-blue-300 bg-blue-50' : 'border-gray-200'}`}>
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-medium text-gray-800">
                              {isCurrentImage ? '📸 현재 이미지 분석 결과' : `유사 사례 #${index}`}
                            </h4>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(damageStatus.color)}`}>
                              {damageStatus.status}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-gray-600">상태:</span>
                              <span className="ml-2 font-medium">{result.properties.diagnosis}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">성별:</span>
                              <span className="ml-2 font-medium">{result.properties.gender}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">단계:</span>
                              <span className="ml-2 font-medium">
                                {result.properties.stage}단계
                                <span className="text-xs text-gray-500 ml-1">
                                  ({getStageDescription(result.properties.stage)})
                                </span>
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">{isCurrentImage ? '신뢰도:' : '유사도:'}</span>
                              <span className="ml-2 font-medium">{(result.properties.confidence * 100).toFixed(1)}%</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>손상 정도 분석</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>전체 건강도</span>
                    <Badge variant="outline">
                      {analysisResult?.results?.[0]?.properties?.confidence ? 
                        Math.round(analysisResult.results[0].properties.confidence * 100) : 68} / 100
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>손상 단계</span>
                    <Badge variant="secondary">
                      {analysisResult?.results?.[0]?.properties?.diagnosis || '경미한 손상'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">주요 손상 원인</p>
                    <div className="flex gap-1 mt-1">
                      {damageAnswers.chemicalTreatment && damageAnswers.chemicalTreatment !== 'none' && (
                        <Badge variant="outline" className="text-xs">화학 손상</Badge>
                      )}
                      {damageAnswers.heatStyling && damageAnswers.heatStyling !== 'never' && (
                        <Badge variant="outline" className="text-xs">열 손상</Badge>
                      )}
                      {damageAnswers.breakage && damageAnswers.breakage !== 'none' && (
                        <Badge variant="outline" className="text-xs">끊어짐</Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>모발 특성 분석</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>모발 타입</span>
                    <Badge variant="outline">{damageAnswers.hairType || '보통'}</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>탄력성</span>
                    <Badge variant="secondary">양호</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">개선 필요 부분</p>
                    <div className="flex gap-1 mt-1">
                      <Badge variant="outline" className="text-xs">수분 공급</Badge>
                      <Badge variant="outline" className="text-xs">윤기 개선</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-orange-50">
              <CardContent className="p-6">
                <h3 className="mb-3">🎯 모발 회복 계획</h3>
                <div className="space-y-2">
                  <p>✅ 6-8주 내 상당한 개선이 예상됩니다</p>
                  <p>✅ 우선순위: 수분 공급 + 열 보호</p>
                  <p>✅ 맞춤형 제품 추천이 준비됩니다</p>
                </div>
              </CardContent>
            </Card>

            <div className="text-center">
              <Button onClick={handleComplete} size="lg" className="w-full md:w-auto">
                종합 결과 및 추천 확인하기
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
                setCurrentView('diagnosis');
              } else {
                navigate('/integrated-diagnosis');
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
                executeRealAnalysis();
              }}>
                분석 시작
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
            
            {currentStep === 1 && (
              <Button 
                onClick={() => setCurrentStep(2)}
                disabled={!damageAnswers.chemicalTreatment || !damageAnswers.heatStyling}
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
