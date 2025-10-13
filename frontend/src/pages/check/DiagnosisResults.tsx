import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { ImageWithFallback } from '../../hooks/ImageWithFallback';
import { getStageDescription, getStageColor } from '../../services/swinAnalysisService';
import apiClient from '../../services/apiClient';
import { locationService, Hospital } from '../../services/locationService';
import { hairProductApi, HairProduct } from '../../services/hairProductApi';
import { elevenStApi } from '../../services/elevenStApi';
import StoreFinderTab from './result/StoreFinderTab';
import HairLossProductsTab from './result/HairLossProductsTab';
import YouTubeVideosTab from './result/YouTubeVideosTab';
import DailyCareTab from './result/DailyCareTab';
import {
  CheckCircle,
  MapPin,
  Star,
  Clock,
  Phone,
  ExternalLink,
  Play,
  ShoppingCart,
  Calendar,
  Target,
  BookOpen,
  Heart,
  Award,
  Brain,
  HelpCircle,
  X,
  ArrowRight
} from 'lucide-react';

interface DiagnosisResultsProps {
  setCurrentView?: (view: string) => void;
  diagnosisData?: any;
}

interface Video {
  videoId: string;
  title: string;
  channelName: string;
  thumbnailUrl: string;
}

interface StageRecommendation {
  title: string;
  query: string;
  description: string;
}

function DiagnosisResults({ setCurrentView, diagnosisData }: DiagnosisResultsProps = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedRegion, setSelectedRegion] = useState('서울');
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [youtubeVideos, setYoutubeVideos] = useState<Video[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [videosError, setVideosError] = useState<string | null>(null);
  const [showStageInfo, setShowStageInfo] = useState(false);
  
  // 위치 정보 상태
  const [currentLocation, setCurrentLocation] = useState<{latitude: number, longitude: number} | null>(null);
  
  // URL state 또는 props에서 Swin 분석 결과 가져오기
  const swinResult = location.state?.swinResult || diagnosisData?.photo?.swinResult;

  // 이미지 URL 처리 (남성 탈모 검사는 top|||side 형식)
  const imageUrl = location.state?.imageUrl || diagnosisData?.imageUrl || '';
  const analysisType = location.state?.analysisType || diagnosisData?.analysisType || '';
  const [topImageUrl, sideImageUrl] = imageUrl.includes('|||')
    ? imageUrl.split('|||')
    : [imageUrl, null];
  // analysis_result의 grade를 기반으로 단계 결정
  const analysisGrade = location.state?.analysis_result?.grade || diagnosisData?.analysis_result?.grade;
  const currentStage = analysisGrade !== undefined ? analysisGrade : (swinResult?.stage !== undefined ? swinResult.stage : 0);
  const stageRecommendations: Record<number, StageRecommendation> = {
    0: {
      title: '정상 - 예방 및 두피 관리',
      query: '탈모 예방 두피 관리 샴푸',
      description: '건강한 두피를 유지하기 위한 예방법과 관리 방법'
    },
    1: {
      title: '초기 탈모 - 초기 증상 및 관리법',
      query: '탈모 초기 증상 치료 샴푸 영양제',
      description: '초기 탈모 단계에서의 적절한 대응 방법과 관리법'
    },
    2: {
      title: '중등도 탈모 - 약물 치료 및 전문 관리',
      query: '탈모 치료 미녹시딜 프로페시아 병원',
      description: '중등도 탈모에 효과적인 치료법과 전문의 상담'
    },
    3: {
      title: '심각한 탈모 - 모발이식 및 고급 시술',
      query: '모발이식 두피문신 SMP 병원 후기',
      description: '심각한 탈모 단계에서의 모발이식과 고급 치료법'
    }
  };

  // YouTube 영상 가져오기
  const fetchYouTubeVideos = useCallback(async (query: string) => {
    setVideosLoading(true);
    setVideosError(null);

    try {
      const response = await apiClient.get(`/ai/youtube/search?q=${encodeURIComponent(query)}&order=relevance&max_results=6`);
      const data = response.data;

      if (data.items && data.items.length > 0) {
        const videoList: Video[] = data.items.map((item: any) => ({
          videoId: item.id.videoId,
          title: item.snippet.title,
          channelName: item.snippet.channelTitle,
          thumbnailUrl: item.snippet.thumbnails.high.url
        }));
        setYoutubeVideos(videoList);
      } else {
        throw new Error('검색 결과가 없습니다.');
      }
    } catch (error) {
      console.error('YouTube API Error:', error);
      setVideosError('YouTube 영상을 불러오는 중 오류가 발생했습니다.');

      // 더미 데이터로 대체
      const dummyVideos: Video[] = [
        {
          videoId: 'dummy1',
          title: '탈모 예방을 위한 올바른 샴푸 사용법',
          channelName: '헤어케어 전문가',
          thumbnailUrl: 'https://placehold.co/300x168/4F46E5/FFFFFF?text=탈모+예방+가이드'
        },
        {
          videoId: 'dummy2',
          title: '두피 마사지로 혈액순환 개선하기',
          channelName: '건강관리 채널',
          thumbnailUrl: 'https://placehold.co/300x168/059669/FFFFFF?text=두피+마사지'
        },
        {
          videoId: 'dummy3',
          title: '탈모에 좋은 음식 vs 나쁜 음식',
          channelName: '영양 정보',
          thumbnailUrl: 'https://placehold.co/300x168/DC2626/FFFFFF?text=탈모+영양관리'
        }
      ];
      setYoutubeVideos(dummyVideos);
    } finally {
      setVideosLoading(false);
    }
  }, []);
  
  // 위치 정보 가져오기
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('위치 정보를 가져올 수 없습니다:', error);
        }
      );
    }
  }, []);

  // 컴포넌트 마운트 시 현재 단계에 맞는 YouTube 영상 로드
  useEffect(() => {
    const recommendation = stageRecommendations[currentStage];
    if (recommendation) {
      fetchYouTubeVideos(recommendation.query);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStage]); // currentStage가 변경될 때만 실행

  // 진단 결과에 따른 추천 데이터 생성 (Swin 결과 반영)
  const getRecommendations = () => {
    // Swin 결과가 있으면 우선 사용, 없으면 기본값
    const swinStage = swinResult?.stage;
    const baspScore = swinStage !== undefined ? swinStage : (diagnosisData?.basp?.score || 3.2);
    const scalpHealth = diagnosisData?.photo?.scalpHealth || 85;
    const swinTitle = swinResult?.title || '';
    
    // 병원 추천 (BASP 점수와 지역에 따라)
    const hospitals = [
      {
        name: "서울모발이식센터",
        specialty: "모발이식 전문",
        category: "모발이식",
        rating: 4.8,
        reviews: 342,
        distance: "2.3km",
        phone: "02-123-4567",
        image: "https://images.unsplash.com/photo-1690306815613-f839b74af330?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZXJtYXRvbG9neSUyMGNsaW5pYyUyMGhvc3BpdGFsfGVufDF8fHx8MTc1ODA3NjkxNXww&ixlib=rb-4.1.0&q=80&w=1080",
        matchReason: baspScore > 4 ? "중등도 탈모에 특화된 치료" : "초기 탈모 예방 프로그램"
      },
      {
        name: "더마헤어클리닉",
        specialty: "피부과 전문의",
        category: "탈모병원",
        rating: 4.6,
        reviews: 198,
        distance: "1.8km", 
        phone: "02-234-5678",
        image: "https://images.unsplash.com/photo-1690306815613-f839b74af330?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZXJtYXRvbG9neSUyMGNsaW5pYyUyMGhvc3BpdGFsfGVufDF8fHx8MTc1ODA3NjkxNXww&ixlib=rb-4.1.0&q=80&w=1080",
        matchReason: "두피 염증 치료 및 케어"
      },
      {
        name: "프리미엄모발클리닉",
        specialty: "종합 탈모 관리",
        category: "탈모클리닉",
        rating: 4.9,
        reviews: 521,
        distance: "3.1km",
        phone: "02-345-6789",
        image: "https://images.unsplash.com/photo-1690306815613-f839b74af330?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZXJtYXRvbG9neSUyMGNsaW5pYyUyMGhvc3BpdGFsfGVufDF8fHx8MTc1ODA3NjkxNXww&ixlib=rb-4.1.0&q=80&w=1080",
        matchReason: "개인 맞춤형 토털 케어"
      },
      {
        name: "헤어라인클리닉",
        specialty: "탈모 전문 클리닉",
        category: "탈모클리닉",
        rating: 4.7,
        reviews: 289,
        distance: "1.5km",
        phone: "02-456-7890",
        image: "https://images.unsplash.com/photo-1690306815613-f839b74af330?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZXJtYXRvbG9neSUyMGNsaW5pYyUyMGhvc3BpdGFsfGVufDF8fHx8MTc1ODA3NjkxNXww&ixlib=rb-4.1.0&q=80&w=1080",
        matchReason: "비침습적 탈모 치료"
      },
      {
        name: "가발전문샵 헤어스타일",
        specialty: "가발 및 헤어피스",
        category: "가발",
        rating: 4.4,
        reviews: 156,
        distance: "2.7km",
        phone: "02-567-8901",
        image: "https://images.unsplash.com/photo-1690306815613-f839b74af330?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZXJtYXRvbG9neSUyMGNsaW5pYyUyMGhvc3BpdGFsfGVufDF8fHx8MTc1ODA3NjkxNXww&ixlib=rb-4.1.0&q=80&w=1080",
        matchReason: "자연스러운 가발 제작 및 관리"
      }
    ];

    // 제품 추천 (두피 건강도에 따라)
    const products = [
      {
        name: "아미노산 약산성 샴푸",
        brand: "로레알 프로페셔널",
        price: "28,000원",
        rating: 4.5,
        reviews: 1234,
        image: "https://images.unsplash.com/photo-1730115656817-92eb256f2c01?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYWlyJTIwY2FyZSUyMHByb2R1Y3RzJTIwc2hhbXBvb3xlbnwxfHx8fDE3NTgwMTQ2NTd8MA&ixlib=rb-4.1.0&q=80&w=1080",
        matchReason: scalpHealth < 80 ? "두피 진정 및 pH 밸런스 조절" : "건강한 두피 유지",
        category: "샴푸"
      },
      {
        name: "비오틴 헤어 토닉",
        brand: "닥터포헤어",
        price: "45,000원",
        rating: 4.3,
        reviews: 892,
        image: "https://images.unsplash.com/photo-1730115656817-92eb256f2c01?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYWlyJTIwY2FyZSUyMHByb2R1Y3RzJTIwc2hhbXBvb3xlbnwxfHx8fDE3NTgwMTQ2NTd8MA&ixlib=rb-4.1.0&q=80&w=1080",
        matchReason: "모발 성장 촉진 및 영양 공급",
        category: "토닉"
      },
      {
        name: "케라틴 단백질 앰플",
        brand: "미장센",
        price: "18,000원",
        rating: 4.7,
        reviews: 567,
        image: "https://images.unsplash.com/photo-1730115656817-92eb256f2c01?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxoYWlyJTIwY2FyZSUyMHByb2R1Y3RzJTIwc2hhbXBvb3xlbnwxfHx8fDE3NTgwMTQ2NTd8MA&ixlib=rb-4.1.0&q=80&w=1080",
        matchReason: "모발 강화 및 끊어짐 방지",
        category: "트리트먼트"
      }
    ];

    const getLifestyleGuides = () => {
      const baseGuides = [
        {
          title: "스트레스 관리법",
          description: "명상, 요가, 규칙적인 운동으로 스트레스 해소",
          icon: <Heart className="w-5 h-5 text-red-500" />,
          tips: ["주 3회 이상 운동", "하루 10분 명상", "충분한 수면"]
        },
        {
          title: "영양 관리",
          description: "모발 건강에 필요한 영양소 섭취",
          icon: <Target className="w-5 h-5 text-green-500" />,
          tips: ["단백질 충분히 섭취", "비타민 B군 보충", "아연, 철분 섭취"]
        },
        {
          title: "두피 케어",
          description: "올바른 세정과 마사지 루틴",
          icon: <BookOpen className="w-5 h-5 text-blue-500" />,
          tips: ["미지근한 물로 세정", "부드러운 마사지", "자극적인 제품 피하기"]
        }
      ];

      // Swin 조언이 있으면 추가
      if (swinResult && swinResult.advice && swinResult.advice.length > 0) {
        baseGuides.push({
          title: "🧠 AI 맞춤 가이드",
          description: swinResult.description || "AI 분석 결과를 바탕으로 한 맞춤형 가이드",
          icon: <Brain className="w-5 h-5 text-purple-500" />,
          tips: swinResult.advice.split('\n')
        });
      }

      return baseGuides;
    };

    return { hospitals, products, lifestyleGuides: getLifestyleGuides() };
  };

  const recommendations = getRecommendations();
  const regions = ['서울', '경기', '부산', '대구', '인천', '광주', '대전', '울산'];
  const categories = ['전체', '탈모병원', '탈모클리닉', '모발이식', '가발'];

  // 카테고리별 병원 필터링
  const filteredHospitals = selectedCategory === '전체' 
    ? recommendations.hospitals 
    : recommendations.hospitals.filter(hospital => hospital.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gray-50 -mt-[52px]">
      {/* Mobile-First 컨테이너 */}
      <div className="max-w-md mx-auto min-h-screen bg-white flex flex-col">
        
        {/* Mobile-First 데일리 케어 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-[60]">
          <div className="flex items-center justify-between">
            <div className="flex-1 text-center">
              <h1 className="text-lg font-bold text-gray-800">진단 결과 및 맞춤 추천</h1>
              <p className="text-xs text-gray-600 mt-1">
                AI 분석을 바탕으로 한 개인 맞춤형 솔루션
              </p>
            </div>            
          </div>
        </div>
        {/* 메인 컨텐츠 (Mobile-First) */}
        <div className="flex-1 px-4 pb-4 overflow-y-auto space-y-4">
          {/* 진단 결과 요약 (Mobile-First) */}
              <div className="bg-gradient-to-r from-gray-50 to-green-50 p-4 rounded-xl">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <h2 className="text-lg font-semibold text-gray-800">진단이 완료되었습니다!</h2>
                <p className="text-sm text-gray-600">
                  종합 분석 결과와 맞춤형 추천을 확인해보세요
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-white rounded-xl">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <p className="text-xs text-gray-600">🧠 AI 분석</p>
                  <button
                    onClick={() => setShowStageInfo(true)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="단계 기준 보기"
                  >
                    <HelpCircle className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-xl font-bold text-gray-800">
                  {currentStage}단계
                </p>
                <Badge
                  className={`text-xs px-2 py-1 ${
                    getStageColor(currentStage)
                  }`}
                >
                  {getStageDescription(currentStage)}
                </Badge>
              </div>
              <div className="text-center p-3 bg-white rounded-xl">
                <p className="text-xs text-gray-600">모발 밀도</p>
                <p className="text-xl font-bold text-gray-800">{diagnosisData?.photo?.hairDensity || 72}%</p>
                <Badge variant="outline" className="text-xs px-2 py-1">양호</Badge>
              </div>
              <div className="text-center p-3 bg-white rounded-xl">
                <p className="text-xs text-gray-600">두피 건강</p>
                <p className="text-xl font-bold text-gray-800">{diagnosisData?.photo?.scalpHealth || 85}%</p>
                <Badge variant="default" className="text-xs px-2 py-1">우수</Badge>
              </div>
            </div>

            {/* AI 분석 결과 요약 */}
            {(swinResult || analysisGrade !== undefined) && (
              <div className="mt-4 p-3 bg-blue-50 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-semibold text-blue-800">
                    {swinResult?.title || `${currentStage}단계 분석 결과`}
                  </h3>
                </div>
                <p className="text-xs text-blue-700 mb-3">
                  {swinResult?.description || stageRecommendations[currentStage]?.description}
                </p>
                {swinResult?.advice && (
                  <div className="space-y-1 pt-2 border-t border-blue-200">
                    <p className="text-xs font-semibold text-blue-800 mb-1">AI 추천 조언:</p>
                    {swinResult.advice.split('\n').map((advice: string, index: number) => (
                      <p key={index} className="text-xs text-blue-700 flex items-start gap-1">
                        <span className="text-blue-500">•</span>
                        <span>{advice}</span>
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 남성 탈모 검사 이미지 표시 (swin_dual_model_llm_enhanced) */}
            {analysisType === 'swin_dual_model_llm_enhanced' && topImageUrl && sideImageUrl && (
              <div className="mt-4 p-3 bg-white rounded-lg">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">분석 이미지</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-600 mb-2 text-center">정수리</p>
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <ImageWithFallback
                        src={topImageUrl}
                        alt="정수리 이미지"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-2 text-center">측면</p>
                    <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                      <ImageWithFallback
                        src={sideImageUrl}
                        alt="측면 이미지"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* 맞춤 추천 탭 (Mobile-First) */}
          <Tabs defaultValue="hospitals" className="space-y-4 w-full">
            <TabsList className="flex overflow-x-auto space-x-1 pb-2 bg-transparent w-full">
              <TabsTrigger 
                value="hospitals" 
                className="flex-shrink-0 px-3 py-2 text-xs font-medium rounded-xl bg-gray-100 text-gray-600 data-[state=active]:!bg-[#1f0101] data-[state=active]:!text-white hover:bg-gray-200 transition-colors"
              >
                탈모 맵
              </TabsTrigger>
              <TabsTrigger 
                value="products" 
                className="flex-shrink-0 px-3 py-2 text-xs font-medium rounded-xl bg-gray-100 text-gray-600 data-[state=active]:!bg-[#1f0101] data-[state=active]:!text-white hover:bg-gray-200 transition-colors"
              >
                제품 추천
              </TabsTrigger>
              <TabsTrigger 
                value="videos" 
                className="flex-shrink-0 px-3 py-2 text-xs font-medium rounded-xl bg-gray-100 text-gray-600 data-[state=active]:!bg-[#1f0101] data-[state=active]:!text-white hover:bg-gray-200 transition-colors"
              >
                영상 컨텐츠
              </TabsTrigger>
              <TabsTrigger 
                value="lifestyle" 
                className="flex-shrink-0 px-3 py-2 text-xs font-medium rounded-xl bg-gray-100 text-gray-600 data-[state=active]:!bg-[#1f0101] data-[state=active]:!text-white hover:bg-gray-200 transition-colors"
              >
                생활습관
              </TabsTrigger>
            </TabsList>

            {/* 병원 추천 (Mobile-First) */}
            <TabsContent value="hospitals" className="space-y-4 w-full">
              <div className="bg-white p-4 rounded-xl shadow-md w-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">내 주변 탈모 맵</h3>
                  <Button 
                    onClick={() => navigate('/store-finder', { 
                      state: { 
                        diagnosisResult: { stage: currentStage },
                        analysis_result: { grade: currentStage }
                      } 
                    })}
                    className="h-8 px-3 text-white text-xs rounded-xl"
                    style={{ backgroundColor: "#1f0101" }}
                  >
                    더보기
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
                <StoreFinderTab 
                  currentStage={currentStage} 
                  currentLocation={currentLocation} 
                />
              </div>
            </TabsContent>

            {/* 제품 추천 (Mobile-First) */}
            <TabsContent value="products" className="space-y-4 w-full">
              <div className="bg-white p-4 rounded-xl shadow-md w-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">맞춤형 제품 추천</h3>
                  <Button 
                    onClick={() => navigate('/hair-loss-products', { 
                      state: { 
                        diagnosisResult: { stage: currentStage },
                        analysis_result: { grade: currentStage }
                      } 
                    })}
                    className="h-8 px-3 text-white text-xs rounded-xl"
                    style={{ backgroundColor: "#1f0101" }}
                  >
                    더보기
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
                <HairLossProductsTab currentStage={currentStage} />
              </div>
            </TabsContent>

            {/* 영상 가이드 (Mobile-First) - YouTube API 연동 */}
            <TabsContent value="videos" className="space-y-4 w-full">
              <div className="bg-white p-4 rounded-xl shadow-md w-full">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-[#1f0101]" />
                    <h3 className="text-lg font-semibold text-gray-800">
                      AI 맞춤 영상 추천
                      <span className="text-sm font-normal text-gray-600">
                        ({getStageDescription(currentStage)} 맞춤)
                      </span>
                    </h3>
                  </div>
                  <Button 
                    onClick={() => navigate('/youtube-videos')}
                    className="h-8 px-3 text-white text-xs rounded-xl"
                    style={{ backgroundColor: "#1f0101" }}
                  >
                    더보기
                    <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
                <YouTubeVideosTab currentStage={currentStage} />
              </div>
            </TabsContent>

            {/* 생활습관 가이드 (Mobile-First) */}
            <TabsContent value="lifestyle" className="space-y-4 w-full">
              <DailyCareTab 
                currentStage={currentStage}
                onNavigateToDailyCare={() => navigate('/hair-dailycare')}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* 단계 기준 설명 모달 */}
      {showStageInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center rounded-t-2xl">
              <h3 className="text-lg font-bold text-gray-800">탈모 단계 분석 기준</h3>
              <button
                onClick={() => setShowStageInfo(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="bg-blue-50 p-3 rounded-xl">
                <p className="text-xs text-blue-800 mb-2">
                  🤖 AI 분석은 다음 요소들을 종합적으로 고려합니다:
                </p>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• 이미지 분석 (정수리, 측면)</li>
                  <li>• 나이 및 성별</li>
                  <li>• 가족력 유무</li>
                  <li>• 최근 탈모 증상</li>
                  <li>• 스트레스 수준</li>
                </ul>
              </div>

              {/* 0단계 */}
              <div className="border-l-4 border-green-500 pl-3 py-2">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-green-100 text-green-800 border-green-300">
                    0단계 - 정상
                  </Badge>
                </div>
                <p className="text-xs text-gray-700 mb-2">
                  탈모 징후가 관찰되지 않는 건강한 모발 상태
                </p>
                <div className="bg-gray-50 p-2 rounded text-xs text-gray-600">
                  <p className="font-semibold mb-1">분석 기준:</p>
                  <ul className="space-y-1">
                    <li>• 모발 밀도 정상 범위</li>
                    <li>• 탈모 증상 없음</li>
                    <li>• 두피 건강 상태 양호</li>
                  </ul>
                </div>
              </div>

              {/* 1단계 */}
              <div className="border-l-4 border-yellow-500 pl-3 py-2">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                    1단계 - 초기
                  </Badge>
                </div>
                <p className="text-xs text-gray-700 mb-2">
                  초기 단계의 모발 변화가 감지되는 상태
                </p>
                <div className="bg-gray-50 p-2 rounded text-xs text-gray-600">
                  <p className="font-semibold mb-1">분석 기준:</p>
                  <ul className="space-y-1">
                    <li>• 경미한 모발 밀도 감소</li>
                    <li>• 최근 탈모 증상 시작</li>
                    <li>• 가족력이 있는 경우 주의</li>
                    <li>• 예방 관리로 진행 지연 가능</li>
                  </ul>
                </div>
              </div>

              {/* 2단계 */}
              <div className="border-l-4 border-orange-500 pl-3 py-2">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-orange-100 text-orange-800 border-orange-300">
                    2단계 - 중등도
                  </Badge>
                </div>
                <p className="text-xs text-gray-700 mb-2">
                  중등도의 탈모가 진행되고 있는 상태
                </p>
                <div className="bg-gray-50 p-2 rounded text-xs text-gray-600">
                  <p className="font-semibold mb-1">분석 기준:</p>
                  <ul className="space-y-1">
                    <li>• 뚜렷한 모발 밀도 감소</li>
                    <li>• 탈모 진행 속도 증가</li>
                    <li>• 전문적 치료 필요</li>
                    <li>• 미녹시딜 등 치료제 고려</li>
                  </ul>
                </div>
              </div>

              {/* 3단계 */}
              <div className="border-l-4 border-red-500 pl-3 py-2">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className="bg-red-100 text-red-800 border-red-300">
                    3단계 - 심각
                  </Badge>
                </div>
                <p className="text-xs text-gray-700 mb-2">
                  상당히 진행된 탈모 상태
                </p>
                <div className="bg-gray-50 p-2 rounded text-xs text-gray-600">
                  <p className="font-semibold mb-1">분석 기준:</p>
                  <ul className="space-y-1">
                    <li>• 현저한 모발 손실</li>
                    <li>• 두피 노출 부위 확대</li>
                    <li>• 즉시 전문의 진료 필요</li>
                    <li>• 모발이식 등 적극적 치료 고려</li>
                  </ul>
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-xl">
                <p className="text-xs text-gray-600">
                  ⚠️ 이 결과는 AI 분석에 기반한 참고용이며, 정확한 진단을 위해서는 반드시 전문의 상담이 필요합니다.
                </p>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 rounded-b-2xl">
                <Button
                onClick={() => setShowStageInfo(false)}
                className="w-full h-10 text-white rounded-xl"
                style={{ backgroundColor: "#1f0101" }}
              >
                확인
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DiagnosisResults;
export { DiagnosisResults };