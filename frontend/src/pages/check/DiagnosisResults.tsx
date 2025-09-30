import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { ImageWithFallback } from '../../hooks/ImageWithFallback';
import { getStageDescription, getStageColor } from '../../services/swinAnalysisService';
import apiClient from '../../services/apiClient';
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
  Brain
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

  // URL state 또는 props에서 Swin 분석 결과 가져오기
  const swinResult = location.state?.swinResult || diagnosisData?.photo?.swinResult;

  // Swin 단계별 YouTube 영상 추천 설정
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

  // 컴포넌트 마운트 시 Swin 단계에 맞는 영상 로드
  useEffect(() => {
    if (swinResult && swinResult.stage !== undefined) {
      const stage = swinResult.stage;
      const recommendation = stageRecommendations[stage];
      if (recommendation) {
        fetchYouTubeVideos(recommendation.query);
      }
    } else {
      // 기본값으로 일반적인 탈모 관리 영상 로드
      fetchYouTubeVideos('탈모 관리 예방 두피케어');
    }
  }, [swinResult, fetchYouTubeVideos]);

  // 진단 결과에 따른 추천 데이터 생성 (Swin 결과 반영)
  const getRecommendations = () => {
    // Swin 결과가 있으면 우선 사용, 없으면 기본값
    const swinStage = swinResult?.stage;
    const baspScore = swinStage !== undefined ? swinStage : (diagnosisData?.basp?.score || 3.2);
    const scalpHealth = diagnosisData?.photo?.scalpHealth || 85;
    const swinTitle = swinResult?.title || '';
    const swinDescription = swinResult?.description || '';
    
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

    // 생활습관 가이드 (Swin 결과에 따라 조정)
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
          description: swinDescription,
          icon: <Brain className="w-5 h-5 text-purple-500" />,
          tips: swinResult.advice
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
    <div className="min-h-screen bg-gray-50">
      {/* Mobile-First 컨테이너 */}
      <div className="max-w-full md:max-w-md mx-auto min-h-screen bg-white flex flex-col">
        
        

        {/* 메인 컨텐츠 (Mobile-First) */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
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
              <div className="text-center p-3 bg-white rounded-lg">
                <p className="text-xs text-gray-600">🧠 Swin AI 분석</p>
                <p className="text-xl font-bold text-gray-800">
                  {swinResult ? `${swinResult.stage}단계` : '분석 중'}
                </p>
                <Badge
                  className={`text-xs px-2 py-1 ${
                    swinResult ? getStageColor(swinResult.stage) : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {swinResult ? getStageDescription(swinResult.stage) : "분석 중"}
                </Badge>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <p className="text-xs text-gray-600">모발 밀도</p>
                <p className="text-xl font-bold text-gray-800">{diagnosisData?.photo?.hairDensity || 72}%</p>
                <Badge variant="outline" className="text-xs px-2 py-1">양호</Badge>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <p className="text-xs text-gray-600">두피 건강</p>
                <p className="text-xl font-bold text-gray-800">{diagnosisData?.photo?.scalpHealth || 85}%</p>
                <Badge variant="default" className="text-xs px-2 py-1">우수</Badge>
              </div>
            </div>

            {/* Swin 분석 결과 요약 */}
            {swinResult && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-semibold text-blue-800">{swinResult.title}</h3>
                </div>
                <p className="text-xs text-blue-700">{swinResult.description}</p>
              </div>
            )}
          </div>

          {/* Mobile-First 데일리 케어 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex-1 text-center">
              <h1 className="text-lg font-bold text-gray-800">진단 결과 및 맞춤 추천</h1>
              <p className="text-xs text-gray-600 mt-1">
                AI 분석을 바탕으로 한 개인 맞춤형 솔루션
              </p>
            </div>
            <Button 
              onClick={() => {
                  navigate('/daily-care');
              }}
              className="ml-3 h-10 px-4 bg-[#222222] hover:bg-[#333333] text-white rounded-xl active:scale-[0.98]"
            >
              데일리 케어
            </Button>
          </div>
        </div>

          {/* 맞춤 추천 탭 (Mobile-First) */}
          <Tabs defaultValue="hospitals" className="space-y-4 flex items-center">
            <TabsList className="flex overflow-x-auto space-x-1 pb-2 bg-transparent">
              <TabsTrigger 
                value="hospitals" 
                className="flex-shrink-0 px-3 py-2 text-xs font-medium rounded-lg bg-[#222222] text-white data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-600 hover:bg-[#333333] transition-colors"
              >
                탈모 맵
              </TabsTrigger>
              <TabsTrigger 
                value="products" 
                className="flex-shrink-0 px-3 py-2 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 data-[state=active]:bg-[#222222] data-[state=active]:text-white hover:bg-gray-200 transition-colors"
              >
                제품 추천
              </TabsTrigger>
              <TabsTrigger 
                value="videos" 
                className="flex-shrink-0 px-3 py-2 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 data-[state=active]:bg-[#222222] data-[state=active]:text-white hover:bg-gray-200 transition-colors"
              >
                영상 컨텐츠
              </TabsTrigger>
              <TabsTrigger 
                value="lifestyle" 
                className="flex-shrink-0 px-3 py-2 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 data-[state=active]:bg-[#222222] data-[state=active]:text-white hover:bg-gray-200 transition-colors"
              >
                생활습관
              </TabsTrigger>
            </TabsList>

            {/* 병원 추천 (Mobile-First) */}
            <TabsContent value="hospitals" className="space-y-4">
              <div className="bg-white p-4 rounded-xl shadow-md">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">내 주변 탈모 맵</h3>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-gray-600" />
                    <select 
                      value={selectedRegion}
                      onChange={(e) => setSelectedRegion(e.target.value)}
                      className="bg-white border border-gray-300 rounded-lg px-2 py-1 text-sm"
                    >
                      {regions.map(region => (
                        <option key={region} value={region}>{region}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 이중 탭 - 카테고리 선택 */}
                <div className="mb-4">
                  <div className="flex overflow-x-auto space-x-1 pb-2">
                    {categories.map((category) => (
                      <button
                        key={category}
                        onClick={() => setSelectedCategory(category)}
                        className={`flex-shrink-0 px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                          selectedCategory === category
                            ? 'bg-[#222222] text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-4">
                  {filteredHospitals.map((hospital, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-xl">
                      <div className="aspect-video rounded-lg overflow-hidden mb-3 bg-gray-200">
                        <ImageWithFallback 
                          src={hospital.image}
                          alt={hospital.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      <h4 className="text-base font-semibold text-gray-800 mb-2">{hospital.name}</h4>
                      <p className="text-sm text-gray-600 mb-2">
                        {hospital.specialty}
                      </p>
                      
                      <div className="flex items-center gap-4 text-sm mb-3">
                        <div className="flex items-center gap-1">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span>{hospital.rating}</span>
                          <span className="text-gray-500">({hospital.reviews})</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <span>{hospital.distance}</span>
                        </div>
                      </div>
                      
                      <div className="bg-gray-50 p-3 rounded-lg text-xs mb-3">
                        💡 {hospital.matchReason}
                      </div>
                      
                      <Button className="w-full h-10 rounded-lg bg-[#222222] hover:bg-[#333333] text-white active:scale-[0.98]">
                        자세히 보기
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* 제품 추천 (Mobile-First) */}
            <TabsContent value="products" className="space-y-4">
              <div className="bg-white p-4 rounded-xl shadow-md">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">맞춤형 제품 추천</h3>
                <p className="text-sm text-gray-600 mb-4">
                  진단 결과에 따라 선별된 헤어케어 제품들입니다
                </p>
                
                <div className="space-y-4">
                  {recommendations.products.map((product, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-xl">
                      <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-gray-200">
                        <ImageWithFallback 
                          src={product.image}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      
                      <Badge variant="outline" className="mb-2 text-xs px-2 py-1">
                        {product.category}
                      </Badge>
                      
                      <h4 className="text-base font-semibold text-gray-800 mb-1">{product.name}</h4>
                      <p className="text-sm text-gray-600 mb-2">
                        {product.brand}
                      </p>
                      
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-semibold text-lg text-gray-800">{product.price}</span>
                        <div className="flex items-center gap-1 text-sm">
                          <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                          <span>{product.rating}</span>
                          <span className="text-gray-500">({product.reviews})</span>
                        </div>
                      </div>
                      
                      <div className="bg-green-50 p-3 rounded-lg text-xs mb-3">
                        ✨ {product.matchReason}
                      </div>
                      
                      <Button className="w-full h-10 rounded-lg bg-[#222222] hover:bg-[#333333] active:scale-[0.98]">
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        구매하기
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* 영상 가이드 (Mobile-First) - YouTube API 연동 */}
            <TabsContent value="videos" className="space-y-4">
              <div className="bg-white p-4 rounded-xl shadow-md">
                <div className="flex items-center gap-2 mb-2">
                  <Brain className="w-5 h-5 text-[#222222]" />
                  <h3 className="text-lg font-semibold text-gray-800">
                    AI 맞춤 영상 추천
                    {swinResult && (
                      <span className="text-sm font-normal text-gray-600">
                        ({getStageDescription(swinResult.stage)} 맞춤)
                      </span>
                    )}
                  </h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  {swinResult && stageRecommendations[swinResult.stage]
                    ? stageRecommendations[swinResult.stage].description
                    : '전문가들이 추천하는 탈모 관리 영상들'
                  }
                </p>

                {videosLoading && (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#222222] mb-2"></div>
                    <p className="text-sm text-gray-600">맞춤 영상을 불러오는 중...</p>
                  </div>
                )}

                {videosError && (
                  <div className="bg-yellow-50 p-3 rounded-lg mb-4">
                    <p className="text-sm text-yellow-800">⚠️ {videosError}</p>
                    <p className="text-xs text-yellow-600 mt-1">샘플 영상을 표시합니다.</p>
                  </div>
                )}

                <div className="space-y-4">
                  {youtubeVideos.map((video, index) => (
                    <div key={video.videoId} className="bg-gray-50 p-4 rounded-xl">
                      <div className="aspect-video rounded-lg overflow-hidden mb-3 bg-gray-200 relative">
                        <ImageWithFallback
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = 'https://placehold.co/300x168/E8E8E8/424242?text=YouTube+Video';
                          }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors">
                            <Play className="w-6 h-6 text-white fill-white" />
                          </div>
                        </div>
                      </div>

                      <h4 className="text-base font-semibold text-gray-800 mb-2 line-clamp-2">{video.title}</h4>
                      <p className="text-sm text-gray-600 mb-2">
                        {video.channelName}
                      </p>

                      {swinResult && (
                        <div className="bg-blue-50 p-3 rounded-lg text-xs mb-3">
                          🎯 {stageRecommendations[swinResult.stage]?.title || '맞춤 추천'}
                        </div>
                      )}

                      <Button
                        variant="outline"
                        className="w-full h-10 rounded-lg active:scale-[0.98]"
                        onClick={() => {
                          const url = video.videoId.startsWith('dummy')
                            ? '#'  // 더미 데이터인 경우
                            : `https://www.youtube.com/watch?v=${video.videoId}`;
                          if (!video.videoId.startsWith('dummy')) {
                            window.open(url, '_blank', 'noopener,noreferrer');
                          }
                        }}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        시청하기
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* 생활습관 가이드 (Mobile-First) */}
            <TabsContent value="lifestyle" className="space-y-4">
              <div className="space-y-4">
                {recommendations.lifestyleGuides.map((guide, index) => (
                  <div key={index} className="bg-white p-4 rounded-xl shadow-md">
                    <div className="flex items-center gap-3 mb-3">
                      {guide.icon}
                      <h3 className="text-lg font-semibold text-gray-800">{guide.title}</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      {guide.description}
                    </p>
                    
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-gray-800">실천 방법:</h4>
                      <ul className="space-y-2">
                        {guide.tips.map((tip, tipIndex) => (
                          <li key={tipIndex} className="text-sm flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                            <span className="text-gray-700">{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>

              {/* 맞춤형 루틴 제안 (Mobile-First) */}
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-xl">
                <div className="text-center space-y-4">
                  <Award className="w-12 h-12 text-purple-600 mx-auto" />
                  <h3 className="text-lg font-semibold text-gray-800">나만의 맞춤 루틴 시작하기</h3>
                  <p className="text-sm text-gray-600">
                    진단 결과를 바탕으로 개인 맞춤형 관리 루틴을 시작해보세요
                  </p>
                  <div className="space-y-3">
                    <Button 
                      onClick={() => {
                        if (setCurrentView) {
                          setCurrentView('challenges');
                        } else {
                          navigate('/weekly-challenges');
                        }
                      }}
                      className="w-full h-12 bg-purple-600 hover:bg-purple-700 text-white rounded-xl active:scale-[0.98]"
                    >
                      주간 챌린지 시작
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        if (setCurrentView) {
                          setCurrentView('tracking');
                        } else {
                          navigate('/progress-tracking');
                        }
                      }}
                      className="w-full h-12 rounded-xl active:scale-[0.98]"
                    >
                      진행 상황 추적
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default DiagnosisResults;
export { DiagnosisResults };