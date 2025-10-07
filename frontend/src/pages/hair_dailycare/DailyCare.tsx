import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../../utils/store';
import { fetchSeedlingInfo, updateSeedlingNickname, setSeedling } from '../../utils/seedlingSlice';
import { hairProductApi, HairProduct } from '../../services/hairProductApi';
import apiClient from '../../services/apiClient';
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

// 분석 결과 타입 정의
interface HairAnalysisResponse {
  success: boolean;
  analysis?: {
    primary_category: string;
    primary_severity: string;
    average_confidence: number;
    category_distribution: Record<string, number>;
    severity_distribution: Record<string, number>;
    diagnosis_scores: Record<string, number>;
    recommendations: string[];
  };
  similar_cases: Array<{
    id: string;
    score: number;
    metadata: {
      image_id: string;
      image_file_name: string;
      category: string;
      severity: string;
    };
  }>;
  total_similar_cases: number;
  model_info: Record<string, any>;
  preprocessing_used?: boolean;
  preprocessing_info?: {
    enabled: boolean;
    description: string;
  };
  error?: string;
}

const DailyCare: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { createdAt, username, userId } = useSelector((state: RootState) => state.user);
  const { seedlingId, seedlingName, currentPoint, loading: seedlingLoading, error: seedlingError } = useSelector((state: RootState) => state.seedling);
  
  const [checklist, setChecklist] = useState([
    { id: 1, text: '아침 샴푸 완료', subtext: '미온수로 깨끗하게', points: 10, completed: true },
    { id: 2, text: '두피 마사지 5분', subtext: '혈액순환 개선', points: 15, completed: true },
    { id: 3, text: '물 2L 섭취', subtext: '충분한 수분 공급', points: 10, completed: false },
    { id: 4, text: '영양제 복용', subtext: '비오틴, 아연', points: 5, completed: false }
  ]);

  const [streakDays, setStreakDays] = useState(7);
  const [challengeProgress, setChallengeProgress] = useState(43);
  
  // 두피 분석 관련 상태
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<HairAnalysisResponse | null>(null);
  const [products, setProducts] = useState<HairProduct[] | null>(null);
  const [tips, setTips] = useState<string[]>([]);
  
  // 새싹 관련 상태
  const [seedlingPoints, setSeedlingPoints] = useState(0);
  const [seedlingLevel, setSeedlingLevel] = useState(1);
  const [plantTitle, setPlantTitle] = useState<string>('새싹 키우기');
  
  // 날짜와 연속 케어 일수 상태
  const todayStr = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
  const [streak, setStreak] = useState<number>(1);

  // 새싹 단계 정의
  const plantStages = {
    1: { emoji: '🌱', name: '새싹' },
    2: { emoji: '🌿', name: '어린 나무' },
    3: { emoji: '🌳', name: '나무' },
    4: { emoji: '🍎', name: '열매 나무' }
  };

  // 포인트에 따른 새싹 레벨 계산
  const calculateSeedlingLevel = (points: number): number => {
    if (points >= 200) return 4; // 열매 나무
    if (points >= 100) return 3; // 나무
    if (points >= 50) return 2;  // 어린 나무
    return 1; // 새싹
  };

  // 새싹 정보 로드
  const loadSeedlingInfo = useCallback(async () => {
    if (!userId) {
      console.log('사용자 ID가 없습니다.');
      return;
    }

    try {
      console.log('새싹 정보 로드 시도:', userId);
      
      const result = await dispatch(fetchSeedlingInfo(userId)).unwrap();
      console.log('Redux 새싹 정보:', result);
      
      if (result) {
        // 새싹 포인트 설정
        if (result.currentPoint) {
          setSeedlingPoints(result.currentPoint);
          setSeedlingLevel(calculateSeedlingLevel(result.currentPoint));
        }
        // 새싹 이름 설정 (백엔드에서 가져온 이름이 있으면 사용, 없으면 로컬 스토리지 사용)
        if (result.seedlingName) {
          setPlantTitle(result.seedlingName);
        } else {
          const savedTitle = localStorage.getItem('plantTitle');
          if (savedTitle) setPlantTitle(savedTitle);
        }
      }
    } catch (error: any) {
      console.error('새싹 정보 로드 실패:', error);
      console.error('에러 상세:', error.response?.data);
      console.error('에러 상태:', error.response?.status);
      
      // 에러 시 로컬 스토리지에서 제목 로드
      const savedTitle = localStorage.getItem('plantTitle');
      if (savedTitle) setPlantTitle(savedTitle);
    }
  }, [dispatch, userId]);

  // 대시보드 카드 상태 (분석 결과 연동)
  const [scalpScore, setScalpScore] = useState<number>(78);
  const [oilinessLabel, setOilinessLabel] = useState<string>('양호');
  const [oilinessSub, setOilinessSub] = useState<string>('균형');
  const [flakeLabel, setFlakeLabel] = useState<string>('양호');
  const [flakeSub, setFlakeSub] = useState<string>('개선됨');
  const [rednessLabel, setRednessLabel] = useState<string>('양호');
  const [rednessSub, setRednessSub] = useState<string>('정상');
  const [dandruffLabel, setDandruffLabel] = useState<string>('양호');
  const [dandruffSub, setDandruffSub] = useState<string>('정상');

  const updateDashboardFromAnalysis = (res: HairAnalysisResponse): number | null => {
    // LLM 기반 종합 두피 점수 계산
    if (!res.analysis) return null;
    
    const primaryCategory = res.analysis.primary_category;
    const primarySeverity = res.analysis.primary_severity;
    const avgConfidence = res.analysis.average_confidence;
    const diagnosisScores = res.analysis.diagnosis_scores;
    
    // 비듬과 탈모 관련 내용 필터링
    const category = primaryCategory.toLowerCase();
    if (category.includes('비듬') || category.includes('탈모')) {
      // 비듬이나 탈모가 주요 카테고리인 경우 "양호"로 처리
      const filteredCategory = "0.양호";
      const filteredSeverity = "0.양호";
      
      // 필터링된 데이터로 계속 처리
      const filteredAnalysis = {
        ...res.analysis,
        primary_category: filteredCategory,
        primary_severity: filteredSeverity,
        diagnosis_scores: Object.fromEntries(
          Object.entries(diagnosisScores).filter(([key]) => 
            !key.includes('비듬') && !key.includes('탈모')
          )
        )
      };
      
      // 필터링된 분석으로 대시보드 업데이트
      return updateDashboardWithFilteredData(filteredAnalysis);
    }

    // 비듬/탈모가 아닌 경우 정상 처리
    return updateDashboardWithFilteredData(res.analysis);
  };
  
  const updateDashboardWithFilteredData = (analysis: any): number => {
    const primaryCategory = analysis.primary_category;
    const primarySeverity = analysis.primary_severity;
    const avgConfidence = analysis.average_confidence;
    const diagnosisScores = analysis.diagnosis_scores;

    // 심각도에 따른 단계 계산 (0.양호=0, 1.경증=1, 2.중등도=2, 3.중증=3)
    const severityLevel = parseInt(primarySeverity.split('.')[0]) || 0;
    const stage01to03 = Math.min(3, Math.max(0, severityLevel)); // 0~3
    const conf = typeof avgConfidence === 'number' ? avgConfidence : 0.7; // 0~1

    // LLM 기반 종합 점수 계산 (더 정교한 알고리즘)
    let baseScore = 100; // 기본 점수
    
    // 심각도에 따른 감점
    baseScore -= stage01to03 * 20; // 심각도별 20점씩 감점
    
    // 진단 점수 기반 조정
    if (diagnosisScores) {
      const scores = Object.values(diagnosisScores) as number[];
      const avgDiagnosisScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      baseScore -= (avgDiagnosisScore - 0.5) * 30; // 진단 점수 기반 조정
    }
    
    // 신뢰도 기반 보정
    baseScore += (conf - 0.5) * 20; // 신뢰도 기반 보정
    
    // 카테고리별 특별 감점 (비듬/탈모는 이미 필터링됨)
    const category = primaryCategory.toLowerCase();
    if (category.includes('홍반') || category.includes('농포')) {
      baseScore -= 10; // 염증 관련 추가 감점
    }
    if (category.includes('피지과다')) {
      baseScore -= 8; // 피지과다는 추가 감점
    }
    if (category.includes('미세각질')) {
      baseScore -= 6; // 미세각질은 추가 감점
    }
    
    const finalScore = Math.max(0, Math.min(100, Math.round(baseScore)));
    setScalpScore(finalScore);

    // finalScore 반환 (백엔드 저장용)
    console.log('계산된 두피 점수:', finalScore);

    // 카테고리와 심각도에 따른 상태 추정 (새로운 카테고리)
    
    // 피지 상태 판정
    if (category.includes('피지과다') || stage01to03 >= 2) {
      setOilinessLabel('주의');
      setOilinessSub('관리 필요');
    } else if (stage01to03 === 1) {
      setOilinessLabel('보통');
      setOilinessSub('관찰중');
    } else {
      setOilinessLabel('양호');
      setOilinessSub('균형');
    }

    // 각질 상태 판정
    if (category.includes('미세각질') || stage01to03 >= 2) {
      setFlakeLabel('주의');
      setFlakeSub('개선 필요');
    } else if (stage01to03 === 1) {
      setFlakeLabel('보통');
      setFlakeSub('관찰중');
    } else {
      setFlakeLabel('양호');
      setFlakeSub('개선됨');
    }

    // 홍반 상태 판정
    if (category.includes('홍반') || category.includes('농포') || stage01to03 >= 2) {
      setRednessLabel('주의');
      setRednessSub('케어 필요');
    } else if (stage01to03 === 1) {
      setRednessLabel('보통');
      setRednessSub('관찰중');
    } else {
      setRednessLabel('양호');
      setRednessSub('정상');
    }

    // 비듬 상태 판정
    if (category.includes('비듬') || stage01to03 >= 2) {
      setDandruffLabel('주의');
      setDandruffSub('관리 필요');
    } else if (stage01to03 === 1) {
      setDandruffLabel('보통');
      setDandruffSub('관찰중');
    } else {
      setDandruffLabel('양호');
      setDandruffSub('정상');
    }

    // 분석 결과 기반 맞춤형 케어 팁 생성
    const buildSolutions = (
      score: number,
      oiliness: string,
      flake: string,
      redness: string
    ): string[] => {
      const s: string[] = [];
      
      // 두피 점수 기반 기본 케어
      if (score >= 85) {
        s.push('🎉 두피 상태가 매우 좋습니다! 현재 케어 루틴을 유지하세요.');
        s.push('💧 수분 케어를 꾸준히 하여 건강한 상태를 지속하세요.');
      } else if (score >= 70) {
        s.push('👍 두피 상태가 양호합니다. 저자극 보습 샴푸로 컨디션을 끌어올리세요.');
        s.push('🌿 두피 보습 토닉을 사용하여 수분 밸런스를 맞춰보세요.');
      } else if (score >= 50) {
        s.push('⚠️ 두피 관리가 필요합니다. 단백질과 보습 케어를 병행하세요.');
        s.push('🔥 열기구 사용을 줄이고 저온으로 스타일링하세요.');
      } else {
        s.push('🚨 전문가 상담을 권장합니다. 저자극 샴푸와 진정 토닉을 사용하세요.');
        s.push('🏥 피부과 전문의와 상담하여 정확한 진단을 받아보세요.');
      }
      
      // 피지 상태별 맞춤 케어
      if (oiliness === '주의') {
        s.push('🧴 지성 두피 전용 샴푸로 깊은 클렌징을 하세요.');
        s.push('🚿 샴푸 시 두피를 부드럽게 마사지하며 충분히 헹구세요.');
      } else if (oiliness === '보통') {
        s.push('🧽 두피 클렌징을 강화하고 피지 조절 샴푸를 주 1-2회 사용하세요.');
      }
      
      // 각질 상태별 맞춤 케어
      if (flake === '주의') {
        s.push('✨ 각질 제거를 위해 두피 스크럽을 주 1회 사용하세요.');
        s.push('💆‍♀️ 보습에 신경 쓰고 각질이 생기지 않도록 관리하세요.');
      }
      
      // 홍반 상태별 맞춤 케어
      if (redness === '주의') {
        s.push('🌿 두피 진정 토닉과 저자극 샴푸로 염증을 완화하세요.');
        s.push('❄️ 차가운 물로 마무리 헹굼을 하여 두피를 진정시키세요.');
      }
      
      // 공통 케어 팁
      s.push('💆‍♀️ 샴푸 전후 3분 두피 마사지로 혈행을 개선하세요.');
      s.push('🌙 충분한 수면과 스트레스 관리로 두피 건강을 지켜주세요.');
      
      return s.slice(0, 6);
    };

    setTips(buildSolutions(finalScore, oilinessLabel, flakeLabel, rednessLabel));
  return finalScore;
  };

  // 연속 케어 일수 계산
  React.useEffect(() => {
    // createdAt 기반 연속 케어 일수 계산
    const calculateStreakFromCreatedAt = () => {
      if (!createdAt) {
        return 1; // createdAt이 없으면 기본값 1
      }

      const today = new Date();
      const joinDate = new Date(createdAt);
      
      // 가입일부터 오늘까지의 일수 계산
      const diffMs = today.setHours(0,0,0,0) - joinDate.setHours(0,0,0,0);
      const diffDays = Math.floor(diffMs / (1000*60*60*24));
      
      // 최소 1일, 최대 365일로 제한
      return Math.max(1, Math.min(365, diffDays + 1));
    };

    const streakCount = calculateStreakFromCreatedAt();
    setStreak(streakCount);

    // 새싹 정보 로드
    loadSeedlingInfo();
  }, [createdAt, loadSeedlingInfo]);

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

        {/* Main Title Section */}
        <div className="px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-[#1f0101] mb-2">데일리케어</h1>
          <p className="text-gray-600 text-sm">개인 맞춤형 두피 케어와 건강 추적을 시작해보세요</p>
        </div>

        {/* 상단 그라데이션 배너 (Mobile-First) */}
        <div className="bg-gradient-to-r from-[#1F0101] to-[#2A0202] text-white p-4 mx-4 rounded-xl">
          <div className="text-center">
            <p className="text-sm opacity-90">{todayStr}</p>
            <h1 className="text-xl font-bold mt-1">좋은 하루예요! 데일리 케어를 시작해볼까요?</h1>
            <p className="mt-1 text-white/90">{streak}일 연속 케어 중 ✨</p>
          </div>
        </div>

        {/* 오늘의 두피 분석 */}
        <Card className="mx-4 mt-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-[#1f0101]">오늘의 두피 분석</CardTitle>
            <p className="text-sm text-gray-600 mt-1">오늘의 두피 상태를 확인해보세요</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setSelectedImage(e.target.files?.[0] || null)}
              className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-gray-100 hover:file:bg-gray-200"
            />
            <Button
              onClick={async () => {
                if (!selectedImage) return alert('두피 사진을 업로드해주세요.');
                setIsAnalyzing(true);
                setProducts(null);
                try {
                  // 1단계: S3 업로드
                  let imageUrl: string | null = null;
                  if (username) {
                    try {
                      console.log('🔄 S3 업로드 시작...');
                      const uploadFormData = new FormData();
                      uploadFormData.append('image', selectedImage);
                      uploadFormData.append('username', username);

                      const uploadResponse = await apiClient.post('/images/upload/hair-damage', uploadFormData, {
                        headers: { 'Content-Type': 'multipart/form-data' },
                      });

                      if (uploadResponse.data.success) {
                        imageUrl = uploadResponse.data.imageUrl;
                        console.log('✅ S3 업로드 성공:', imageUrl);
                      }
                    } catch (uploadError) {
                      console.error('❌ S3 업로드 실패:', uploadError);
                      // S3 업로드 실패 시에도 분석은 진행 (imageUrl 없이)
                    }
                  }

                  // 2단계: 스프링부트 AI 분석 API 호출
                  const formData = new FormData();
                  formData.append('image', selectedImage);
                  formData.append('top_k', '10');
                  formData.append('use_preprocessing', 'true');

                  // 로그인한 사용자의 user_id 추가
                  if (userId) {
                    formData.append('user_id', userId.toString());
                    console.log('Daily 분석에 user_id 추가:', userId);
                  } else {
                    console.log('로그인하지 않은 사용자 - user_id 없음');
                  }

                  // S3 URL이 있으면 추가
                  if (imageUrl) {
                    formData.append('image_url', imageUrl);
                    console.log('📸 S3 이미지 URL 추가:', imageUrl);
                  }

                  const response = await apiClient.post('/ai/hair-loss-daily/analyze', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                  });

                          const result: HairAnalysisResponse = response.data;
                          setAnalysis(result);

                          // 두피 점수 계산 및 대시보드 업데이트
                          const calculatedScore = updateDashboardFromAnalysis(result);

                          // scalpScore를 포함하여 백엔드로 grade 저장 요청
                          if (userId && calculatedScore !== null) {
                            try {
                              console.log('두피 점수 저장 시도:', calculatedScore);

                              // save_result에 grade 추가하여 재저장 API 호출
                              const savePayload = {
                                ...result,
                                user_id: userId,
                                grade: calculatedScore,
                                image_url: imageUrl || ''
                              };

                              await apiClient.post('/ai/hair-loss-daily/save-result', savePayload);
                              console.log('두피 점수 저장 완료:', calculatedScore);
                            } catch (saveError) {
                              console.error('두피 점수 저장 실패:', saveError);
                            }
                          }


                  // 심각도에 따른 제품 추천
                  const severityLevel = result.analysis ? parseInt(result.analysis.primary_severity.split('.')[0]) || 0 : 0;
                  const stage = Math.min(3, Math.max(0, severityLevel));
                  const prodRes = await hairProductApi.getProductsByStage(stage);
                  setProducts(prodRes.products.slice(0, 6));

                  // 케어 팁은 updateDashboardFromAnalysis에서 설정됨
                } catch (e) {
                  console.error(e);
                  alert('분석 또는 추천 호출 중 오류가 발생했습니다.');
                } finally {
                  setIsAnalyzing(false);
                }
              }}
              disabled={isAnalyzing}
              className="w-full h-12 bg-[#1F0101] text-white rounded-xl hover:bg-[#2A0202] disabled:opacity-50 font-semibold"
            >
              {isAnalyzing ? '분석 중...' : '사진으로 AI 분석'}
            </Button>
          </CardContent>
        </Card>

        {/* 분석 결과 통계 카드 */}
        {analysis && (
          <div className="grid grid-cols-2 gap-3 mx-4 mt-4">
            <Card className="border-0" style={{ backgroundColor: '#1f0101' }}>
              <CardContent className="p-4 text-white">
                <p className="text-xs opacity-90">두피 점수</p>
                <div className="mt-1 text-2xl font-bold">{scalpScore}</div>
                <p className="mt-1 text-xs opacity-90">LLM 종합 분석</p>
              </CardContent>
            </Card>
            <Card className="border-0" style={{ backgroundColor: '#1f0101', opacity: 0.8 }}>
              <CardContent className="p-4 text-white">
                <p className="text-xs opacity-90">비듬 상태</p>
                <div className="mt-1 text-xl font-bold">{dandruffLabel}</div>
                <p className="mt-1 text-xs opacity-90">{dandruffSub}</p>
              </CardContent>
            </Card>
            <Card className="border-0" style={{ backgroundColor: '#1f0101', opacity: 0.6 }}>
              <CardContent className="p-4 text-white">
                <p className="text-xs opacity-90">각질 상태</p>
                <div className="mt-1 text-xl font-bold">{flakeLabel}</div>
                <p className="mt-1 text-xs opacity-90">{flakeSub}</p>
              </CardContent>
            </Card>
            <Card className="border-0" style={{ backgroundColor: '#1f0101', opacity: 0.4 }}>
              <CardContent className="p-4 text-white">
                <p className="text-xs opacity-90">홍반 상태</p>
                <div className="mt-1 text-xl font-bold">{rednessLabel}</div>
                <p className="mt-1 text-xs opacity-90">{rednessSub}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 새싹 키우기 UI */}
        <Card className="mx-4 mt-4 border-0" style={{ backgroundColor: '#1F0101' }}>
          <CardContent className="p-4 text-white">
            <div className="space-y-4">
              {/* 헤더: 새싹 아이콘과 제목 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{plantStages[seedlingLevel as keyof typeof plantStages].emoji}</span>
                  <h3 className="text-lg font-semibold">{seedlingName || plantTitle || '새싹 키우기'}</h3>
                </div>
                <button className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center hover:bg-white/30 transition-colors">
                  <i className="fas fa-pen text-sm"></i>
                </button>
              </div>
              
              {/* 새싹 이미지 */}
              <div className="text-center">
                <div className="text-6xl mb-3">{plantStages[seedlingLevel as keyof typeof plantStages].emoji}</div>
              </div>
              
              {/* 동기부여 메시지 */}
              <div className="bg-white/20 rounded-xl p-3 text-center">
                <p className="text-sm text-white/90">오늘의 건강한 습관을 실천하고 새싹을 키워보세요!</p>
              </div>
              
              {/* 진행률 바 */}
              <div className="flex items-center bg-white/20 rounded-2xl p-3">
                <span className="bg-white text-[#1F0101] px-3 py-1 rounded-full text-sm font-bold">
                  Lv.{seedlingLevel}
                </span>
                <div className="flex-1 h-2 bg-white/30 rounded-full mx-3 overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${((currentPoint || seedlingPoints) % 50) * 2}%` }}
                  />
                </div>
                <span className="text-xs text-white/90">{(currentPoint || seedlingPoints) % 50}/50</span>
              </div>
              
              {/* PT 시작 버튼 */}
              <Button 
                onClick={() => navigate('/hair-pt')}
                className="w-full h-12 bg-white text-[#1F0101] hover:bg-gray-100 rounded-xl font-semibold"
              >
                PT 시작하기
              </Button>
            </div>
          </CardContent>
        </Card>

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

        {/* 오늘의 케어 팁 */}
        {tips.length > 0 && (
          <Card className="mx-4 mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-[#1f0101]">오늘의 케어 팁</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal ml-5 text-sm text-gray-700 space-y-2">
                {tips.map((t, i) => <li key={i}>{t}</li>)}
              </ol>
            </CardContent>
          </Card>
        )}

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

export default DailyCare;
