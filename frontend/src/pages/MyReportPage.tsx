import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ImageWithFallback } from '../hooks/ImageWithFallback';
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
  ArrowLeft
} from 'lucide-react';

interface AnalysisResult {
  id: number;
  inspectionDate: string;
  analysisSummary: string;
  advice: string;
  grade: number;
  imageUrl?: string;
  type: string;
  improvement: string;
}

interface MyReportPageProps {
  analysisResult?: AnalysisResult;
}

function MyReportPage({ analysisResult: propAnalysisResult }: MyReportPageProps) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // URL state에서 분석 결과 데이터 가져오기
  const stateAnalysisResult = location.state?.analysisResult as AnalysisResult;
  const analysisResult = propAnalysisResult || stateAnalysisResult;
  
  const [selectedRegion, setSelectedRegion] = useState('서울');
  const [selectedCategory, setSelectedCategory] = useState('전체');

  // 분석 결과가 없으면 마이페이지로 돌아가기
  if (!analysisResult) {
    navigate('/mypage');
    return null;
  }

  // 진단 결과에 따른 추천 데이터 생성
  const getRecommendations = () => {
    const baspScore = analysisResult.grade / 20; // grade를 5점 만점으로 변환
    const scalpHealth = Math.min(analysisResult.grade + 10, 100); // grade 기반으로 두피 건강도 계산
    
    // 병원 추천
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
      }
    ];

    // 제품 추천
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
      }
    ];

    // 유튜브 추천
    const youtubeVideos = [
      {
        title: "탈모 초기 단계, 이것만은 꼭 하세요!",
        channel: "헤어닥터TV",
        views: "124만회",
        duration: "12:34",
        thumbnail: "https://images.unsplash.com/photo-1637806631554-bcfe2c618058?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3V0dWJlJTIwdmlkZW8lMjB0aHVtYm5haWxzfGVufDF8fHx8MTc1ODA3NjkxNnww&ixlib=rb-4.1.0&q=80&w=1080",
        relevance: baspScore < 4 ? "초기 관리법" : "진행 단계 관리"
      },
      {
        title: "두피 마사지 완벽 가이드 - 혈액순환 개선",
        channel: "뷰티헬스",
        views: "89만회",
        duration: "8:45",
        thumbnail: "https://images.unsplash.com/photo-1637806631554-bcfe2c618058?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3V0dWJlJTIwdmlkZW8lMjB0aHVtYm5haWxzfGVufDF8fHx8MTc1ODA3NjkxNnww&ixlib=rb-4.1.0&q=80&w=1080",
        relevance: "실용적인 관리법"
      }
    ];

    // 생활습관 가이드
    const lifestyleGuides = [
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
        icon: <BookOpen className="w-5 h-5 text-[#222222]" />,
        tips: ["미지근한 물로 세정", "부드러운 마사지", "자극적인 제품 피하기"]
      }
    ];

    return { hospitals, products, youtubeVideos, lifestyleGuides };
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
          {/* 레포트 헤더 */}
          <div className="text-center py-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">AI 분석 리포트</h1>
            <p className="text-sm text-gray-500">{analysisResult.type}</p>
          </div>

          {/* 분석 결과 정보 카드 */}
          <div className="bg-white p-5 rounded-xl shadow-md border border-gray-100">
            <div className="mb-4 pb-3 border-b-2 border-gray-200">
              <h2 className="text-lg font-bold text-gray-800">분석 결과</h2>
            </div>
            <div className="space-y-4">
              {/* HairFit 분석 단계 */}
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#222222] rounded-lg flex items-center justify-center">
                    <Award className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">HairFit 분석 단계</p>
                    <p className="text-lg font-bold text-gray-800">{analysisResult.grade}단계</p>
                  </div>
                </div>
                <Badge variant="secondary" className="text-sm px-3 py-1">{analysisResult.type}</Badge>
              </div>

              {/* 분석일 */}
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">분석일</p>
                    <p className="text-base font-semibold text-gray-800">{analysisResult.inspectionDate}</p>
                  </div>
                </div>
              </div>

              {/* 분석요약 */}
              <div className="py-3 border-b border-gray-100">
                <div className="flex items-start gap-3 mb-2">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-2">분석요약</p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {analysisResult.analysisSummary || '분석 결과 요약이 없습니다.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* HairFit 제안 */}
              <div className="py-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Target className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-2">HairFit 제안</p>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      {analysisResult.advice || '개선 방안이 제시되지 않았습니다.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 분석 이미지 */}
          {analysisResult.imageUrl && (
            <div className="bg-white p-4 rounded-xl shadow-md">
              <h3 className="text-base font-semibold text-gray-800 mb-3">분석 이미지</h3>
              <div className="aspect-video rounded-lg overflow-hidden bg-gray-200">
                <ImageWithFallback 
                  src={analysisResult.imageUrl}
                  alt="분석 결과 이미지"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          )}

          {/* 레포트 제목 */}
          <div className="bg-white p-5 rounded-xl shadow-md border-l-4 border-[#222222]">
            <h2 className="text-xl font-bold text-gray-800 mb-2">맞춤형 케어 추천</h2>
            <p className="text-sm text-gray-600">분석 결과를 기반으로 한 개인 맞춤 솔루션</p>
          </div>

          {/* 맞춤 추천 탭 (Mobile-First) */}
          <Tabs defaultValue="hospitals" className="space-y-4">
            <TabsList className="grid grid-cols-4 gap-2 bg-transparent p-0">
              <TabsTrigger 
                value="hospitals" 
                className="px-3 py-2.5 text-xs font-medium rounded-lg bg-[#222222] text-white data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-600 hover:bg-[#333333] transition-colors"
              >
                병원
              </TabsTrigger>
              <TabsTrigger 
                value="products" 
                className="px-3 py-2.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 data-[state=active]:bg-[#222222] data-[state=active]:text-white hover:bg-gray-200 transition-colors"
              >
                제품
              </TabsTrigger>
              <TabsTrigger 
                value="videos" 
                className="px-3 py-2.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 data-[state=active]:bg-[#222222] data-[state=active]:text-white hover:bg-gray-200 transition-colors"
              >
                영상
              </TabsTrigger>
              <TabsTrigger 
                value="lifestyle" 
                className="px-3 py-2.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 data-[state=active]:bg-[#222222] data-[state=active]:text-white hover:bg-gray-200 transition-colors"
              >
                생활
              </TabsTrigger>
            </TabsList>

            {/* 병원 추천 (Mobile-First) */}
            <TabsContent value="hospitals" className="space-y-4">
              <div className="bg-white p-4 rounded-xl shadow-md">
                <div className="mb-4 pb-3 border-b border-gray-200">
                  <h3 className="text-base font-bold text-gray-800 mb-1">추천 전문 병원</h3>
                  <p className="text-xs text-gray-500">회원님의 분석 결과 기반 병원 추천</p>
                </div>
                <div className="flex items-center justify-between mb-4">
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
                <div className="mb-4 pb-3 border-b border-gray-200">
                  <h3 className="text-base font-bold text-gray-800 mb-1">추천 케어 제품</h3>
                  <p className="text-xs text-gray-500">분석 결과에 따라 선별된 헤어케어 제품</p>
                </div>
                
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

            {/* 영상 가이드 (Mobile-First) */}
            <TabsContent value="videos" className="space-y-4">
              <div className="bg-white p-4 rounded-xl shadow-md">
                <div className="mb-4 pb-3 border-b border-gray-200">
                  <h3 className="text-base font-bold text-gray-800 mb-1">관리 영상 가이드</h3>
                  <p className="text-xs text-gray-500">전문가 추천 케어 영상 자료</p>
                </div>
                
                <div className="space-y-4">
                  {recommendations.youtubeVideos.map((video, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-xl">
                      <div className="aspect-video rounded-lg overflow-hidden mb-3 bg-gray-200 relative">
                        <ImageWithFallback 
                          src={video.thumbnail}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                            <Play className="w-6 h-6 text-white fill-white" />
                          </div>
                        </div>
                        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                          {video.duration}
                        </div>
                      </div>
                      
                      <h4 className="text-base font-semibold text-gray-800 mb-2 line-clamp-2">{video.title}</h4>
                      <p className="text-sm text-gray-600 mb-2">
                        {video.channel} • {video.views}
                      </p>
                      
                      <div className="bg-red-50 p-3 rounded-lg text-xs mb-3">
                        🎯 {video.relevance}
                      </div>
                      
                      <Button variant="outline" className="w-full h-10 rounded-lg active:scale-[0.98]">
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
              <div className="bg-white p-4 rounded-xl shadow-md mb-4">
                <div className="mb-4 pb-3 border-b border-gray-200">
                  <h3 className="text-base font-bold text-gray-800 mb-1">생활습관 개선 가이드</h3>
                  <p className="text-xs text-gray-500">일상에서 실천 가능한 케어 방법</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {recommendations.lifestyleGuides.map((guide, index) => (
                  <div key={index} className="bg-white p-4 rounded-xl shadow-md">
                    <div className="flex items-center gap-3 mb-3">
                      {guide.icon}
                      <h3 className="text-base font-bold text-gray-800">{guide.title}</h3>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">
                      {guide.description}
                    </p>
                    
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-gray-700">• 실천 방법</h4>
                      <ul className="space-y-2 ml-2">
                        {guide.tips.map((tip, tipIndex) => (
                          <li key={tipIndex} className="text-sm flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                            <span className="text-gray-600">{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>

            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default MyReportPage;
export { MyReportPage };
