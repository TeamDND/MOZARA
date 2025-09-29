"use client"

import { useState, useEffect } from "react"
import { useSelector, useDispatch } from "react-redux"
import { useNavigate } from "react-router-dom"
import { RootState } from "../utils/store"
import { clearToken } from "../utils/tokenSlice"
import { clearUser } from "../utils/userSlice"

import { Card, CardContent } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
import UserProfile from "../components/mypage/UserProfile"
import HospitalMap from "../components/mypage/HospitalMap"
import ProductRecommendation from "../components/mypage/ProductRecommendation"
import VideoContent from "../components/mypage/VideoContent"
import UserInfoEdit from "../components/mypage/UserInfoEdit"
import {
  FileText,
  Heart,
  User,
  MapPin,
  Youtube,
  Package,
  Calendar,
  Star,
  Edit3,
  ChevronRight,
  Menu,
  TrendingUp,
  Users,
  Play,
  ShoppingCart,
  ExternalLink,
  LogOut,
} from "lucide-react"

// 분석 결과 타입 정의
interface AnalysisResult {
  id: number
  inspectionDate: string
  analysisSummary: string
  advice: string
  grade: number
  imageUrl?: string
  type: string
  improvement: string
}

export default function MyPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState("reports")
  const [totalAnalysis, setTotalAnalysis] = useState(0)
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([])
  const [loading, setLoading] = useState(true)
  
  // Redux에서 실제 유저 정보 가져오기
  const user = useSelector((state: RootState) => state.user)
  const token = useSelector((state: RootState) => state.token.jwtToken)
  const dispatch = useDispatch()

  // 로그아웃 함수
  const handleLogout = () => {
    dispatch(clearToken())
    dispatch(clearUser())
    navigate('/')
  }

  // 분석 결과 개수 및 리스트 조회
  useEffect(() => {
    const fetchAnalysisData = async () => {
      console.log('분석 결과 데이터 조회 시작:', { userId: user.userId, token: token ? '있음' : '없음' });
      
      // 샘플 데이터로 테스트 (실제 API 호출 전에 샘플 데이터 표시)
      const sampleResults: AnalysisResult[] = [
        {
          id: 1,
          inspectionDate: '2024.09.25',
          analysisSummary: '전반적인 두피 건강 상태 양호. 모근 강도 개선 필요.',
          advice: '비타민 B 복합체 섭취 및 두피 마사지 권장',
          grade: 75,
          imageUrl: '/sam1.png',
          type: '종합 진단',
          improvement: '12% 개선됨'
        },
        {
          id: 2,
          inspectionDate: '2024.09.20',
          analysisSummary: '정수리 부분 모발 밀도 감소 감지. 조기 관리 필요.',
          advice: 'DHT 차단 샴푸 사용 및 전문의 상담 권장',
          grade: 65,
          imageUrl: '/sam2.png',
          type: '탈모 진단',
          improvement: '8% 개선됨'
        },
        {
          id: 3,
          inspectionDate: '2024.09.15',
          analysisSummary: '두피 염증 및 각질 문제 발견. 세정 관리 강화 필요.',
          advice: '저자극 샴푸 사용 및 주 2회 두피 스케일링',
          grade: 70,
          imageUrl: '/sam3.png',
          type: '두피 건강',
          improvement: '15% 개선됨'
        },
        {
          id: 4,
          inspectionDate: '2024.09.10',
          analysisSummary: '모발 굵기 및 탄력성 양호. 지속적인 관리 유지 권장.',
          advice: '프로틴 함유 헤어케어 제품 사용',
          grade: 85,
          imageUrl: '/sam1.png',
          type: '모발 품질',
          improvement: '20% 개선됨'
        },
        {
          id: 5,
          inspectionDate: '2024.09.05',
          analysisSummary: '이마선 후퇴 초기 단계 감지. 적극적인 관리 필요.',
          advice: '미녹시딜 5% 솔루션 사용 및 생활습관 개선',
          grade: 60,
          imageUrl: '/sam2.png',
          type: '탈모 진행',
          improvement: '5% 개선됨'
        }
      ];

      // 샘플 데이터 설정
      setTotalAnalysis(sampleResults.length);
      setAnalysisResults(sampleResults);
      setLoading(false);

      // 실제 API 호출은 주석 처리 (필요시 활성화)
      /*
      if (!user.userId || !token) {
        console.log('사용자 ID 또는 토큰이 없음:', { userId: user.userId, token: token });
        setLoading(false)
        return
      }

      try {
        // 분석 결과 개수 조회
        console.log('API 호출: 분석 결과 개수 조회', `/analysis-count/${user.userId}`);
        const countResponse = await apiClient.get(`/analysis-count/${user.userId}`)
        console.log('분석 결과 개수 API 응답:', countResponse.data);
        const countData = countResponse.data
        setTotalAnalysis(countData.count || 0)

        // 분석 결과 리스트 조회
        console.log('API 호출: 분석 결과 리스트 조회', `/analysis-results/${user.userId}`);
        const resultsResponse = await apiClient.get(`/analysis-results/${user.userId}`)
        console.log('분석 결과 리스트 API 응답:', resultsResponse.data);
        
        // 날짜 포맷팅 및 데이터 변환
        const formattedResults = resultsResponse.data.map((result: any, index: number) => ({
          id: result.id,
          inspectionDate: result.inspectionDate ? 
            new Date(result.inspectionDate).toLocaleDateString('ko-KR', {
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            }).replace(/\./g, '.').replace(/\s/g, '') : 
            `2024.01.${String(index + 1).padStart(2, '0')}`,
          analysisSummary: result.analysisSummary || '분석 결과 요약',
          advice: result.advice || '개선 방안 제시',
          grade: result.grade || 85,
          imageUrl: result.imageUrl,
          type: result.type || '종합 진단',
          improvement: result.improvement || '15% 개선됨'
        }))
        
        setAnalysisResults(formattedResults)
      } catch (error: any) {
        console.error('분석 결과 데이터 조회 실패:', error);
        console.error('에러 상세:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: error.message
        });
        
        // 토큰 만료(456) 또는 인증 실패(401) 시
        if (error.response?.status === 456 || error.response?.status === 401) {
          console.log('토큰 만료 또는 인증 실패 - 토큰 갱신 시도됨');
          // 토큰 갱신은 apiClient에서 자동으로 처리됨
        }
        
        // 심각한 인증 오류 시 Redux 상태 정리
        if (error.response?.status === 401 && error.response?.data?.includes('invalid')) {
          console.log('유효하지 않은 토큰 - 상태 정리');
          dispatch(clearToken());
          dispatch(clearUser());
        }
        
        setTotalAnalysis(0)
        setAnalysisResults([])
      } finally {
        setLoading(false)
      }
      */
    }

    fetchAnalysisData()
  }, [user.userId, token])

  // 분석 결과를 리포트 형태로 변환하는 함수
  const formatAnalysisResults = (results: AnalysisResult[]) => {
    return results.map((result, index) => ({
      id: result.id,
      title: `AI 탈모 분석 리포트 #${String(result.id).padStart(3, '0')}`,
      date: result.inspectionDate,
      status: "완료",
      score: result.grade,
      type: result.type,
      improvement: result.improvement,
    }))
  }

  // 모바일 우선 추천 데이터
  const getRecommendations = () => {
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
        image: "/sam1.png",
        matchReason: "중등도 탈모에 특화된 치료"
      },
      {
        name: "더마헤어클리닉",
        specialty: "피부과 전문의",
        category: "탈모병원",
        rating: 4.6,
        reviews: 198,
        distance: "1.8km", 
        phone: "02-234-5678",
        image: "/sam2.png",
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
        image: "/sam3.png",
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
        image: "/sam1.png",
        matchReason: "두피 진정 및 pH 밸런스 조절",
        category: "샴푸"
      },
      {
        name: "비오틴 헤어 토닉",
        brand: "닥터포헤어",
        price: "45,000원",
        rating: 4.3,
        reviews: 892,
        image: "/sam2.png",
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
        thumbnail: "/sam3.png",
        relevance: "초기 관리법"
      },
      {
        title: "두피 마사지 완벽 가이드 - 혈액순환 개선",
        channel: "뷰티헬스",
        views: "89만회",
        duration: "8:45",
        thumbnail: "/sam1.png",
        relevance: "실용적인 관리법"
      }
    ];

    return { hospitals, products, youtubeVideos };
  };

  const recommendations = getRecommendations();

  // 실제 유저 정보로 구성 (기본값 제공)
  const userInfo = {
    name: user.nickname || user.username || "사용자",
    email: user.email || "이메일 정보 없음",
    phone: "전화번호 정보 없음", // UserState에 phone 속성이 없음
    joinDate: "가입일 정보 없음", // UserState에 createdAt 속성이 없음
    totalAnalysis: loading ? 0 : totalAnalysis, // API에서 가져온 실제 분석 결과 개수
    satisfaction: 0, // UserState에 satisfaction 속성이 없음
    address: user.address || "주소 정보 없음",
    gender: user.gender || "성별 정보 없음",
    age: user.age || 0,
    role: user.role || "일반 사용자",
    recentHairLoss: false, // 기본값: 최근 머리빠짐 없음
    familyHistory: false // 기본값: 가족력 없음
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <UserProfile userInfo={userInfo} loading={loading} onLogout={handleLogout} />

      <div className="px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
          <div className="space-y-3">
            <TabsList className="flex gap-2 w-full pb-2 bg-transparent">
              <TabsTrigger
                value="reports"
                className="flex-1 px-3 py-2 text-xs font-medium rounded-lg bg-[#222222] text-white data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-600 hover:bg-[#333333] transition-colors"
              >
                <FileText className="h-4 w-4 mr-1" />
                내 리포트
              </TabsTrigger>
              <TabsTrigger
                value="favorites"
                className="flex-1 px-3 py-2 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 data-[state=active]:bg-[#222222] data-[state=active]:text-white hover:bg-gray-200 transition-colors"
              >
                <Heart className="h-4 w-4 mr-1" />
                내 찜
              </TabsTrigger>
              <TabsTrigger
                value="profile"
                className="flex-1 px-3 py-2 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 data-[state=active]:bg-[#222222] data-[state=active]:text-white hover:bg-gray-200 transition-colors"
              >
                <User className="h-4 w-4 mr-1" />
                회원정보
              </TabsTrigger>
            </TabsList>
            {/* 구분선 */}
            <div className="border-b border-gray-200"></div>
          </div>

          <TabsContent value="reports" className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-lg font-bold text-gray-900">내 AI 분석 리포트</h3>
              <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">
                {loading ? "로딩 중..." : `${totalAnalysis}개`}
              </Badge>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="text-gray-500">로딩 중...</div>
              </div>
            ) : totalAnalysis === 0 ? (
              <div className="space-y-4">
                <Card className="border-0 shadow-sm bg-white">
                  <CardContent className="p-6 text-center">
                    <div className="mb-4">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <h4 className="text-lg font-semibold text-gray-900 mb-2">
                        아직 분석 레포트가 없으시군요?
                      </h4>
                      <p className="text-sm text-gray-500">
                        AI 분석을 통해 두피 상태를 확인하고 개선 방안을 알아보세요.
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Button className="w-full bg-[#222222] hover:bg-[#333333] text-white py-3 rounded-xl font-medium">
                  새로운 AI 분석 시작하기
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 레포트 리스트 영역 */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-4 border-b border-gray-100">
                    <h4 className="text-sm font-semibold text-gray-700">분석 리포트 목록</h4>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {formatAnalysisResults(analysisResults).map((report) => {
                      const reportData = analysisResults.find(r => r.id === report.id)
                      return (
                        <div
                          key={report.id}
                          className="p-4 hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
                          onClick={() => {
                            if (reportData) {
                              navigate('/my-report', { 
                                state: { analysisResult: reportData } 
                              })
                            }
                          }}
                        >
                          <div className="flex items-center justify-between">
                            {/* 이미지 영역 */}
                            <div className="flex-shrink-0 mr-4">
                              {reportData?.imageUrl ? (
                                <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100">
                                  <img
                                    src={reportData.imageUrl}
                                    alt="분석 결과 이미지"
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      // 이미지 로드 실패 시 더미 이미지로 대체
                                      const target = e.target as HTMLImageElement
                                      target.style.display = 'none'
                                      const parent = target.parentElement
                                      if (parent) {
                                        parent.innerHTML = `
                                          <div class="w-full h-full flex items-center justify-center bg-gray-200">
                                            <svg class="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                            </svg>
                                          </div>
                                        `
                                      }
                                    }}
                                  />
                                </div>
                              ) : (
                                <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center">
                                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                  </svg>
                                </div>
                              )}
                            </div>
                            
                            {/* 콘텐츠 영역 */}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-3">
                                <h4 className="font-semibold text-gray-900 text-sm">{report.title}</h4>
                                <Badge variant="outline" className="text-xs border-gray-200 text-gray-700">
                                  {report.type}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-4 mb-2">
                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                  <Calendar className="h-3 w-3" />
                                  {report.date}
                                </span>
                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                  <Star className="h-3 w-3" />
                                  {report.score}단계
                                </span>
                              </div>
                            </div>
                            
                            {/* 화살표 */}
                            <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                
                {/* 새로운 분석 시작 버튼 영역 */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                  <Button className="w-full bg-[#222222] hover:bg-[#333333] text-white py-3 rounded-xl font-medium">
                    새로운 AI 분석 시작하기
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="favorites" className="space-y-4">
            {/* 맞춤 추천 탭 (Mobile-First) */}
            <Tabs defaultValue="hospitals" className="space-y-4">
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
              </TabsList>

              {/* 병원 추천 (Mobile-First) */}
              <TabsContent value="hospitals" className="space-y-4">
                <HospitalMap hospitals={recommendations.hospitals} />
              </TabsContent>

              {/* 제품 추천 (Mobile-First) */}
              <TabsContent value="products" className="space-y-4">
                <ProductRecommendation products={recommendations.products} />
              </TabsContent>

              {/* 영상 가이드 (Mobile-First) */}
              <TabsContent value="videos" className="space-y-4">
                <VideoContent videos={recommendations.youtubeVideos} />
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="profile" className="space-y-4">
            <UserInfoEdit userInfo={userInfo} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
