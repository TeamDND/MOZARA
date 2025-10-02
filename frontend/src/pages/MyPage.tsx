"use client"

import { useState, useEffect } from "react"
import { useSelector, useDispatch } from "react-redux"
import { useNavigate, useLocation } from "react-router-dom"
import { RootState } from "../utils/store"
import { clearToken } from "../utils/tokenSlice"
import { clearUser } from "../utils/userSlice"
import apiClient from "../services/apiClient"

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
  analysisType?: string // analysisType 추가
  type: string
  improvement: string
}

export default function MyPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || "reports")
  const [totalAnalysis, setTotalAnalysis] = useState(0)
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([])
  const [loading, setLoading] = useState(true)
  
  // Redux에서 실제 유저 정보 가져오기
  const user = useSelector((state: RootState) => state.user)
  const token = useSelector((state: RootState) => state.token.jwtToken)
  const dispatch = useDispatch()

  // 로그아웃 함수
  const handleLogout = async () => {
    try {
      // 백엔드 API 호출 (refresh 쿠키 삭제)
      await apiClient.post('/logout')
    } catch (error) {
      console.error('로그아웃 API 호출 실패:', error)
      // API 실패해도 프론트 정리는 진행
    } finally {
      // Redux 상태 초기화
      dispatch(clearToken())
      dispatch(clearUser())

      // localStorage 초기화
      localStorage.clear()

      // 메인 페이지로 이동
      navigate('/')
    }
  }

  // 사용자 추가 정보 상태
  const [userAdditionalInfo, setUserAdditionalInfo] = useState<{
    gender: string
    age: number
    familyHistory: boolean | null
    isLoss: boolean | null
    stress: string | null
  }>({
    gender: '',
    age: 0,
    familyHistory: null,
    isLoss: null,
    stress: null
  })

  // UserInfoEdit 컴포넌트 강제 리렌더링을 위한 key
  const [userInfoKey, setUserInfoKey] = useState(0)

  // 사용자 추가 정보를 다시 불러오는 함수
  const refreshUserInfo = async () => {
    if (!user.username || !token) {
      return
    }

    try {
      console.log('API 호출: 사용자 추가 정보 재조회', `/userinfo/${user.username}`);
      const response = await apiClient.get(`/userinfo/${user.username}`)
      console.log('사용자 추가 정보 재조회 API 응답:', response.data);

      setUserAdditionalInfo({
        gender: response.data.gender || '',
        age: response.data.age || 0,
        familyHistory: response.data.familyHistory,
        isLoss: response.data.isLoss,
        stress: response.data.stress || null
      })

      // 강제로 컴포넌트 리렌더링을 위해 key 변경
      setUserInfoKey(prev => prev + 1)
    } catch (error: any) {
      console.error('사용자 추가 정보 재조회 실패:', error);
    }
  }

  // 분석 결과 개수 및 리스트 조회
  useEffect(() => {
    const fetchAnalysisData = async () => {
      console.log('분석 결과 데이터 조회 시작:', { userId: user.userId, token: token ? '있음' : '없음' });
      
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
        const formattedResults = resultsResponse.data.map((result: any, index: number) => {
          // imageUrl은 그대로 전달 (MyReportPage에서 처리)
          return {
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
            imageUrl: result.imageUrl, // 전체 URL 그대로 전달 (|||포함)
            analysisType: result.analysisType,
            type: result.type || '종합 진단',
            improvement: result.improvement || '15% 개선됨'
          };
        })
        
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
    }

    fetchAnalysisData()
  }, [user.userId, token, dispatch])

  // 사용자 추가 정보 조회 (성별, 가족력, 최근 머리빠짐)
  useEffect(() => {
    const fetchUserAdditionalInfo = async () => {
      if (!user.username || !token) {
        return
      }

      try {
        console.log('API 호출: 사용자 추가 정보 조회', `/userinfo/${user.username}`);
        const response = await apiClient.get(`/userinfo/${user.username}`)
        console.log('사용자 추가 정보 API 응답:', response.data);
        
        setUserAdditionalInfo({
          gender: response.data.gender || '',
          age: response.data.age || 0,
          familyHistory: response.data.familyHistory,
          isLoss: response.data.isLoss,
          stress: response.data.stress || null
        })
      } catch (error: any) {
        console.error('사용자 추가 정보 조회 실패:', error);
      }
    }

    fetchUserAdditionalInfo()
  }, [user.username, token])

  // 분석 결과를 리포트 형태로 변환하는 함수
  const formatAnalysisResults = (results: AnalysisResult[]) => {
    return results.map((result, index) => ({
      id: result.id,
      title: `AI 탈모 분석 리포트 #${index + 1}`,
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

  // 성별 변환 함수
  const formatGender = (gender: string | null | undefined): string => {
    if (!gender) return "정보 없음"
    if (gender.toLowerCase() === 'male') return "남"
    if (gender.toLowerCase() === 'female') return "여"
    return gender
  }

  // 가족력 변환 함수
  const formatFamilyHistory = (familyHistory: boolean | null | undefined): string => {
    if (familyHistory === null || familyHistory === undefined) return "정보 없음"
    return familyHistory ? "있음" : "없음"
  }

  // 최근 머리빠짐 변환 함수
  const formatIsLoss = (isLoss: boolean | null | undefined): string => {
    if (isLoss === null || isLoss === undefined) return "정보 없음"
    return isLoss ? "있음" : "없음"
  }

  // 실제 유저 정보로 구성 (기본값 제공)
  const userInfo = {
    name: user.nickname || user.username || "사용자",
    email: user.email || "이메일 정보 없음",
    phone: "전화번호 정보 없음", // UserState에 phone 속성이 없음
    joinDate: "가입일 정보 없음", // UserState에 createdAt 속성이 없음
    totalAnalysis: loading ? 0 : totalAnalysis, // API에서 가져온 실제 분석 결과 개수
    satisfaction: 0, // UserState에 satisfaction 속성이 없음
    address: user.address || "주소 정보 없음",
    gender: formatGender(userAdditionalInfo.gender), // API에서 조회한 성별 변환
    age: userAdditionalInfo.age || 0, // API에서 조회한 나이 사용
    role: user.role || "일반 사용자",
    recentHairLoss: userAdditionalInfo.isLoss ?? false, // boolean 값 그대로 전달
    familyHistory: userAdditionalInfo.familyHistory ?? false, // boolean 값 그대로 전달
    stress: userAdditionalInfo.stress || undefined // 스트레스 수준
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
                
                <Button 
                  onClick={() => navigate('/integrated-diagnosis')}
                  className="w-full bg-[#222222] hover:bg-[#333333] text-white py-3 rounded-xl font-medium"
                >
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
                  <Button 
                    onClick={() => navigate('/integrated-diagnosis')}
                    className="w-full bg-[#222222] hover:bg-[#333333] text-white py-3 rounded-xl font-medium"
                  >
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
            <UserInfoEdit
              key={userInfoKey}
              userInfo={userInfo}
              initialTab={location.state?.activeSubTab as 'basic' | 'analysis' | undefined}
              onInfoUpdated={refreshUserInfo}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
