import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { ImageWithFallback } from '../../hooks/ImageWithFallback';
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
  Award
} from 'lucide-react';

interface DiagnosisResultsProps {
  setCurrentView?: (view: string) => void;
  diagnosisData?: any;
}

function DiagnosisResults({ setCurrentView, diagnosisData }: DiagnosisResultsProps = {}) {
  const navigate = useNavigate();
  const [selectedRegion, setSelectedRegion] = useState('서울');

  // 진단 결과에 따른 추천 데이터 생성 (기본값 제공)
  const getRecommendations = () => {
    const baspScore = diagnosisData?.basp?.score || 3.2;
    const scalpHealth = diagnosisData?.photo?.scalpHealth || 85;
    
    // 병원 추천 (BASP 점수와 지역에 따라)
    const hospitals = [
      {
        name: "서울모발이식센터",
        specialty: "모발이식 전문",
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
        rating: 4.9,
        reviews: 521,
        distance: "3.1km",
        phone: "02-345-6789",
        image: "https://images.unsplash.com/photo-1690306815613-f839b74af330?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxkZXJtYXRvbG9neSUyMGNsaW5pYyUyMGhvc3BpdGFsfGVufDF8fHx8MTc1ODA3NjkxNXww&ixlib=rb-4.1.0&q=80&w=1080",
        matchReason: "개인 맞춤형 토털 케어"
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
      },
      {
        title: "탈모에 좋은 음식 vs 나쁜 음식",
        channel: "건강한일상",
        views: "156만회",
        duration: "15:20",
        thumbnail: "https://images.unsplash.com/photo-1637806631554-bcfe2c618058?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx5b3V0dWJlJTIwdmlkZW8lMjB0aHVtYm5haWxzfGVufDF8fHx8MTc1ODA3NjkxNnww&ixlib=rb-4.1.0&q=80&w=1080",
        relevance: "영양 관리"
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
        icon: <BookOpen className="w-5 h-5 text-blue-500" />,
        tips: ["미지근한 물로 세정", "부드러운 마사지", "자극적인 제품 피하기"]
      }
    ];

    return { hospitals, products, youtubeVideos, lifestyleGuides };
  };

  const recommendations = getRecommendations();
  const regions = ['서울', '경기', '부산', '대구', '인천', '광주', '대전', '울산'];

  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <div className="sticky top-0 bg-background border-b p-4 z-10">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="text-center flex-1">
            <h1>진단 결과 및 맞춤 추천</h1>
            <p className="text-sm text-muted-foreground">
              AI 분석을 바탕으로 한 개인 맞춤형 솔루션
            </p>
          </div>
          <Button 
            onClick={() => {
              if (setCurrentView) {
                setCurrentView('dashboard');
              } else {
                navigate('/dashboard');
              }
            }}
          >
            대시보드로
          </Button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto p-6 space-y-6">
        {/* 진단 결과 요약 */}
        <Card className="bg-gradient-to-r from-blue-50 to-green-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
              <div>
                <h2>진단이 완료되었습니다!</h2>
                <p className="text-muted-foreground">
                  종합 분석 결과와 맞춤형 추천을 확인해보세요
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white rounded-lg">
                <p className="text-sm text-muted-foreground">BASP 점수</p>
                <p className="text-2xl">{diagnosisData?.basp?.score || 3.2}</p>
                <Badge variant="secondary">{diagnosisData?.basp?.stage || "초기 단계"}</Badge>
              </div>
              <div className="text-center p-4 bg-white rounded-lg">
                <p className="text-sm text-muted-foreground">모발 밀도</p>
                <p className="text-2xl">{diagnosisData?.photo?.hairDensity || 72}%</p>
                <Badge variant="outline">양호</Badge>
              </div>
              <div className="text-center p-4 bg-white rounded-lg">
                <p className="text-sm text-muted-foreground">두피 건강</p>
                <p className="text-2xl">{diagnosisData?.photo?.scalpHealth || 85}%</p>
                <Badge variant="default">우수</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 맞춤 추천 탭 */}
        <Tabs defaultValue="hospitals" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="hospitals">병원 추천</TabsTrigger>
            <TabsTrigger value="products">제품 추천</TabsTrigger>
            <TabsTrigger value="videos">영상 가이드</TabsTrigger>
            <TabsTrigger value="lifestyle">생활습관</TabsTrigger>
          </TabsList>

          {/* 병원 추천 */}
          <TabsContent value="hospitals" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>내 주변 추천 병원</span>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <select 
                      value={selectedRegion}
                      onChange={(e) => setSelectedRegion(e.target.value)}
                      className="bg-background border rounded px-2 py-1 text-sm"
                    >
                      {regions.map(region => (
                        <option key={region} value={region}>{region}</option>
                      ))}
                    </select>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recommendations.hospitals.map((hospital, index) => (
                    <Card key={index} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        <div className="aspect-video rounded-lg overflow-hidden mb-3 bg-muted">
                          <ImageWithFallback 
                            src={hospital.image}
                            alt={hospital.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        
                        <h3 className="mb-2">{hospital.name}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {hospital.specialty}
                        </p>
                        
                        <div className="flex items-center gap-4 text-sm mb-3">
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span>{hospital.rating}</span>
                            <span className="text-muted-foreground">({hospital.reviews})</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <span>{hospital.distance}</span>
                          </div>
                        </div>
                        
                        <div className="bg-blue-50 p-2 rounded text-xs mb-3">
                          💡 {hospital.matchReason}
                        </div>
                        
                        <div className="flex gap-2">
                          <Button size="sm" className="flex-1">
                            <Phone className="w-4 h-4 mr-1" />
                            전화
                          </Button>
                          <Button variant="outline" size="sm" className="flex-1">
                            <Calendar className="w-4 h-4 mr-1" />
                            예약
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 제품 추천 */}
          <TabsContent value="products" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>맞춤형 제품 추천</CardTitle>
                <p className="text-muted-foreground">
                  진단 결과에 따라 선별된 헤어케어 제품들입니다
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recommendations.products.map((product, index) => (
                    <Card key={index} className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        <div className="aspect-square rounded-lg overflow-hidden mb-3 bg-muted">
                          <ImageWithFallback 
                            src={product.image}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        
                        <Badge variant="outline" className="mb-2 text-xs">
                          {product.category}
                        </Badge>
                        
                        <h3 className="mb-1">{product.name}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {product.brand}
                        </p>
                        
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-medium text-lg">{product.price}</span>
                          <div className="flex items-center gap-1 text-sm">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span>{product.rating}</span>
                            <span className="text-muted-foreground">({product.reviews})</span>
                          </div>
                        </div>
                        
                        <div className="bg-green-50 p-2 rounded text-xs mb-3">
                          ✨ {product.matchReason}
                        </div>
                        
                        <Button className="w-full" size="sm">
                          <ShoppingCart className="w-4 h-4 mr-1" />
                          구매하기
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 영상 가이드 */}
          <TabsContent value="videos" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>추천 영상 가이드</CardTitle>
                <p className="text-muted-foreground">
                  전문가들이 추천하는 탈모 관리 영상들
                </p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {recommendations.youtubeVideos.map((video, index) => (
                    <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
                      <CardContent className="p-4">
                        <div className="aspect-video rounded-lg overflow-hidden mb-3 bg-muted relative">
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
                        
                        <h3 className="mb-2 line-clamp-2">{video.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {video.channel} • {video.views}
                        </p>
                        
                        <div className="bg-red-50 p-2 rounded text-xs mb-3">
                          🎯 {video.relevance}
                        </div>
                        
                        <Button variant="outline" className="w-full" size="sm">
                          <ExternalLink className="w-4 h-4 mr-1" />
                          시청하기
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 생활습관 가이드 */}
          <TabsContent value="lifestyle" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {recommendations.lifestyleGuides.map((guide, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {guide.icon}
                      {guide.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      {guide.description}
                    </p>
                    
                    <div className="space-y-2">
                      <h4 className="text-sm">실천 방법:</h4>
                      <ul className="space-y-1">
                        {guide.tips.map((tip, tipIndex) => (
                          <li key={tipIndex} className="text-sm flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                            {tip}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* 맞춤형 루틴 제안 */}
            <Card className="bg-gradient-to-r from-purple-50 to-blue-50">
              <CardContent className="p-6">
                <div className="text-center space-y-4">
                  <Award className="w-12 h-12 text-purple-600 mx-auto" />
                  <h3>나만의 맞춤 루틴 시작하기</h3>
                  <p className="text-muted-foreground">
                    진단 결과를 바탕으로 개인 맞춤형 관리 루틴을 시작해보세요
                  </p>
                  <div className="flex justify-center gap-3">
                    <Button 
                      onClick={() => {
                        if (setCurrentView) {
                          setCurrentView('challenges');
                        } else {
                          navigate('/weekly-challenges');
                        }
                      }}
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
                    >
                      진행 상황 추적
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default DiagnosisResults;
export { DiagnosisResults };