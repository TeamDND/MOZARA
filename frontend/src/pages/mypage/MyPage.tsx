"use client"

import { useState, useEffect, useCallback } from "react"
import { useSelector, useDispatch } from "react-redux"
import { useNavigate, useLocation } from "react-router-dom"
import { RootState } from "../../utils/store"
import { clearToken } from "../../utils/tokenSlice"
import { clearUser } from "../../utils/userSlice"
import apiClient from "../../services/apiClient"

import { Card, CardContent } from "../../components/ui/card"
import { Button } from "../../components/ui/button"
import { Badge } from "../../components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs"
import UserProfile from "./UserProfile"
import HospitalMap from "./HospitalMap"
import ProductRecommendation from "./ProductRecommendation"
import VideoContent from "./VideoContent"
import UserInfoEdit from "./UserInfoEdit"
import MyFavorites from "./MyFavorites"
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
  analysisType?: string 
  improvement: string
}

export default function MyPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || "reports")
  const [activeReportTab, setActiveReportTab] = useState<'all' | 'hairloss' | 'daily'>('all')
  const [totalAnalysis, setTotalAnalysis] = useState(0)
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult[]>([])
  const [hairlossResults, setHairlossResults] = useState<AnalysisResult[]>([])
  const [dailyResults, setDailyResults] = useState<AnalysisResult[]>([])
  const [loading, setLoading] = useState(true)
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  
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
    createdAt: string | null
  }>({
    gender: '',
    age: 0,
    familyHistory: null,
    isLoss: null,
    stress: null,
    createdAt: null
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
        stress: response.data.stress || null,
        createdAt: response.data.createdAt || null
      })

      // 강제로 컴포넌트 리렌더링을 위해 key 변경
      setUserInfoKey(prev => prev + 1)
    } catch (error: any) {
      console.error('사용자 추가 정보 재조회 실패:', error);
    }
  }

  // 분석 결과 데이터 조회 함수 (Incoming의 useCallback 구조 사용)
  const fetchAnalysisData = useCallback(async () => {
    console.log('분석 결과 데이터 조회 시작:', { userId: user.userId, token: token ? '있음' : '없음' });

    if (!user.userId || !token) {
      console.log('사용자 ID 또는 토큰이 없음:', { userId: user.userId, token: token });
      setLoading(false)
      return
    }

    try {
      // 전체 분석 결과 개수 조회
      console.log('API 호출: 분석 결과 개수 조회', `/analysis-count/${user.userId}`);
      const countResponse = await apiClient.get(`/analysis-count/${user.userId}`)
      console.log('분석 결과 개수 API 응답:', countResponse.data);
      const countData = countResponse.data
      setTotalAnalysis(countData.count || 0)

      // 전체 분석 결과 리스트 조회
      console.log('API 호출: 분석 결과 리스트 조회', `/analysis-results/${user.userId}?sort=${sortOrder}`);
      const resultsResponse = await apiClient.get(`/analysis-results/${user.userId}?sort=${sortOrder}`)
      console.log('분석 결과 리스트 API 응답:', resultsResponse.data);

      // 날짜 포맷팅 및 데이터 변환
      const formattedResults = resultsResponse.data.map((result: any, index: number) => {
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
          grade: result.grade !== undefined && result.grade !== null ? result.grade : 0,
          imageUrl: result.imageUrl,
          analysisType: result.analysisType || '종합 진단',
          improvement: result.improvement || '15% 개선됨'
        };
      })

      setAnalysisResults(formattedResults)

      // 탈모분석 결과 조회 (hair_loss_male, hair_loss_female, hairloss 모두 조회)
      try {
        const [maleResponse, femaleResponse, hairlossResponse] = await Promise.all([
          apiClient.get(`/analysis-results/${user.userId}/type/hair_loss_male?sort=${sortOrder}`).catch(() => ({ data: [] })),
          apiClient.get(`/analysis-results/${user.userId}/type/hair_loss_female?sort=${sortOrder}`).catch(() => ({ data: [] })),
          apiClient.get(`/analysis-results/${user.userId}/type/hairloss?sort=${sortOrder}`).catch(() => ({ data: [] }))
        ]);

        // 세 가지 타입의 결과를 모두 합치고 날짜순으로 정렬
        const allHairlossData = [
          ...maleResponse.data,
          ...femaleResponse.data,
          ...hairlossResponse.data
        ].sort((a: any, b: any) => {
          const dateA = new Date(a.inspectionDate || 0).getTime();
          const dateB = new Date(b.inspectionDate || 0).getTime();
          return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
        });

        const hairlossFormatted = allHairlossData.map((result: any, index: number) => ({
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
          grade: result.grade !== undefined && result.grade !== null ? result.grade : 0,
          imageUrl: result.imageUrl,
          analysisType: result.analysisType || '탈모 분석',
          improvement: result.improvement || '15% 개선됨'
        }))
        setHairlossResults(hairlossFormatted)
      } catch (error) {
        console.log('탈모분석 결과 조회 실패:', error)
        setHairlossResults([])
      }

      // 두피분석 결과 조회
      try {
        const dailyResponse = await apiClient.get(`/analysis-results/${user.userId}/type/daily?sort=${sortOrder}`)
        const dailyFormatted = dailyResponse.data.map((result: any, index: number) => ({
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
          grade: result.grade !== undefined && result.grade !== null ? result.grade : 0,
          imageUrl: result.imageUrl,
          analysisType: result.analysisType || '두피 분석',
          improvement: result.improvement || '15% 개선됨'
        }))
        setDailyResults(dailyFormatted)
      } catch (error) {
        console.log('두피분석 결과 조회 실패:', error)
        setDailyResults([])
      }

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
      setHairlossResults([])
      setDailyResults([])
    } finally {
      setLoading(false)
    }
  }, [user.userId, token, dispatch, sortOrder])

  // 데이터 로드 (사용자 ID, 토큰, 정렬 옵션 변경 시)
  useEffect(() => {
    fetchAnalysisData()
  }, [fetchAnalysisData])

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
          stress: response.data.stress || null,
          createdAt: response.data.createdAt || null
        })
      } catch (error: any) {
        console.error('사용자 추가 정보 조회 실패:', error);
      }
    }

    fetchUserAdditionalInfo()
  }, [user.username, token])

  // 분석 타입을 한글로 변환하는 함수 (HEAD의 로직 사용)
  const formatAnalysisType = (type: string | undefined): string => {
    if (!type) return '종합 진단';
    if (type === 'daily') return '두피 분석';
    // 탈모 단계 검사로 처리되는 모든 타입
    if (type === 'hair_loss_male' ||
        type === 'hair_loss_female' ||
        type === 'swin_dual_model_llm_enhanced' ||
        type === 'rag_v2_analysis' ||
        type === 'swin_analysis' ||
        type === 'gemini_analysis' ||
        type.includes('swin') ||
        type.includes('rag') ||
        type.includes('hairloss') ||
        type.includes('hair_loss')) {
      return '탈모 단계 검사';
    }
    return '종합 진단'; // 알 수 없는 타입은 종합 진단으로
  };

  // 분석 결과를 정렬하는 함수 (Incoming 추가)
  const sortAnalysisResults = (results: AnalysisResult[]) => {
    return [...results].sort((a, b) => {
      const dateA = new Date(a.inspectionDate.replace(/\./g, '-'))
      const dateB = new Date(b.inspectionDate.replace(/\./g, '-'))

      if (sortOrder === 'newest') {
        return dateB.getTime() - dateA.getTime() // 최신순
      } else {
        return dateA.getTime() - dateB.getTime() // 오래된순
      }
    })
  }

  // 현재 선택된 탭에 따라 표시할 데이터를 반환하는 함수 (Incoming 추가)
  const getCurrentResults = () => {
    switch (activeReportTab) {
      case 'hairloss':
        return hairlossResults
      case 'daily':
        return dailyResults
      default:
        return analysisResults
    }
  }

  // 현재 선택된 탭의 개수를 반환하는 함수 (Incoming 추가)
  const getCurrentCount = () => {
    switch (activeReportTab) {
      case 'hairloss':
        return hairlossResults.length
      case 'daily':
        return dailyResults.length
      default:
        return totalAnalysis
    }
  }

  // 분석 결과를 리포트 형태로 변환하는 함수 (Incoming 구조 + HEAD의 역순 번호)
  const formatAnalysisResults = (results: AnalysisResult[]) => {
    const sortedResults = sortAnalysisResults(results)
    const totalCount = sortedResults.length; // HEAD의 역순 번호를 위한 전체 개수
    return sortedResults.map((result, index) => ({
      id: result.id,
      title: `AI ${formatAnalysisType(result.analysisType)} 리포트 #${totalCount - index}`, // HEAD의 역순 번호 + formatAnalysisType
      date: result.inspectionDate,
      status: "완료",
      score: result.grade,
      analysistype: formatAnalysisType(result.analysisType), // 한글로 변환
      analysisTypeRaw: result.analysisType, // 원본 타입도 전달
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
    joinDate: userAdditionalInfo.createdAt ? new Date(userAdditionalInfo.createdAt).toLocaleDateString('ko-KR') : "가입일 정보 없음",
    totalAnalysis: loading ? 0 : totalAnalysis, // API에서 가져온 실제 분석 결과 개수
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
                className="flex-1 px-3 py-2 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 data-[state=active]:!bg-[#1f0101] data-[state=active]:!text-white hover:bg-gray-200 transition-colors"
              >
                <FileText className="h-4 w-4 mr-1" />
                내 리포트
              </TabsTrigger>
              <TabsTrigger
                value="favorites"
                className="flex-1 px-3 py-2 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 data-[state=active]:!bg-[#1f0101] data-[state=active]:!text-white hover:bg-gray-200 transition-colors"
              >
                <Heart className="h-4 w-4 mr-1" />
                내 찜
              </TabsTrigger>
              <TabsTrigger
                value="profile"
                className="flex-1 px-3 py-2 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 data-[state=active]:!bg-[#1f0101] data-[state=active]:!text-white hover:bg-gray-200 transition-colors"
              >
                <User className="h-4 w-4 mr-1" />
                회원정보
              </TabsTrigger>
            </TabsList>
            {/* 구분선 */}
            <div className="border-b border-gray-200"></div>
          </div>

          <TabsContent value="reports" className="space-y-4">
            {/* 내 리포트 이중탭 */}
            <Tabs value={activeReportTab} onValueChange={(value) => setActiveReportTab(value as 'all' | 'hairloss' | 'daily')} className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-bold text-gray-900">내 AI 분석 리포트</h3>
                  <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-100">
                    {loading ? "로딩 중..." : `${getCurrentCount()}개`}
                  </Badge>
                </div>
                {getCurrentCount() > 0 && (
                  <select 
                    value={sortOrder} 
                    onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
                    className="w-24 h-8 text-xs border border-gray-300 rounded-md px-2 bg-white focus:outline-none focus:ring-2 focus:ring-[#1f0101] focus:border-transparent"
                  >
                    <option value="newest">최신순</option>
                    <option value="oldest">오래된순</option>
                  </select>
                )}
              </div>

              <TabsList className="flex overflow-x-auto space-x-1 pb-2 bg-transparent">
                <TabsTrigger 
                  value="all" 
                  className="flex-shrink-0 px-3 py-2 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 data-[state=active]:!bg-[#1f0101] data-[state=active]:!text-white hover:bg-gray-200 transition-colors"
                >
                  전체
                </TabsTrigger>
                <TabsTrigger 
                  value="hairloss" 
                  className="flex-shrink-0 px-3 py-2 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 data-[state=active]:!bg-[#1f0101] data-[state=active]:!text-white hover:bg-gray-200 transition-colors"
                >
                  탈모분석
                </TabsTrigger>
                <TabsTrigger 
                  value="daily" 
                  className="flex-shrink-0 px-3 py-2 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 data-[state=active]:!bg-[#1f0101] data-[state=active]:!text-white hover:bg-gray-200 transition-colors"
                >
                  두피분석
                </TabsTrigger>
              </TabsList>

              {/* 전체 탭 */}
              <TabsContent value="all" className="space-y-4">
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
                      className="w-full bg-[#1f0101] hover:bg-[#333333] text-white py-3 rounded-xl font-medium"
                    >
                      새로운 AI 분석 시작하기
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* 레포트 리스트 영역 */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="p-4 border-b border-gray-100">
                        <h4 className="text-sm font-semibold text-gray-700">전체 분석 리포트 목록</h4>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {formatAnalysisResults(getCurrentResults()).map((report) => {
                          const reportData = getCurrentResults().find(r => r.id === report.id)
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
                                      {report.analysistype}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-4 mb-2">
                                    <span className="flex items-center gap-1 text-xs text-gray-500">
                                      <Calendar className="h-3 w-3" />
                                      {report.date}
                                    </span>
                                    <span className="flex items-center gap-1 text-xs text-gray-500">
                                      <Star className="h-3 w-3" />
                                      {report.analysisTypeRaw === 'daily' ? `${report.score}점` : `${report.score}단계`}
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
                        className="w-full bg-[#1f0101] hover:bg-[#333333] text-white py-3 rounded-xl font-medium"
                      >
                        새로운 AI 분석 시작하기
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* 탈모분석 탭 */}
              <TabsContent value="hairloss" className="space-y-4">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="text-gray-500">로딩 중...</div>
                  </div>
                ) : hairlossResults.length === 0 ? (
                  <div className="space-y-4">
                    <Card className="border-0 shadow-sm bg-white">
                      <CardContent className="p-6 text-center">
                        <div className="mb-4">
                          <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                          <h4 className="text-lg font-semibold text-gray-900 mb-2">
                            탈모분석 리포트가 없습니다
                          </h4>
                          <p className="text-sm text-gray-500">
                            탈모분석을 통해 모발 상태를 확인해보세요.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Button 
                      onClick={() => navigate('/integrated-diagnosis')}
                      className="w-full bg-[#1f0101] hover:bg-[#333333] text-white py-3 rounded-xl font-medium"
                    >
                      탈모분석 시작하기
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* 레포트 리스트 영역 */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="p-4 border-b border-gray-100">
                        <h4 className="text-sm font-semibold text-gray-700">탈모분석 리포트 목록</h4>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {formatAnalysisResults(getCurrentResults()).map((report) => {
                          const reportData = getCurrentResults().find(r => r.id === report.id)
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
                                      {report.analysistype}
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
                        className="w-full bg-[#1f0101] hover:bg-[#333333] text-white py-3 rounded-xl font-medium"
                      >
                        새로운 탈모분석 시작하기
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>

              {/* 두피분석 탭 */}
              <TabsContent value="daily" className="space-y-4">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className="text-gray-500">로딩 중...</div>
                  </div>
                ) : dailyResults.length === 0 ? (
                  <div className="space-y-4">
                    <Card className="border-0 shadow-sm bg-white">
                      <CardContent className="p-6 text-center">
                        <div className="mb-4">
                          <Users className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                          <h4 className="text-lg font-semibold text-gray-900 mb-2">
                            두피분석 리포트가 없습니다
                          </h4>
                          <p className="text-sm text-gray-500">
                            두피분석을 통해 두피 상태를 확인해보세요.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Button 
                      onClick={() => navigate('/integrated-diagnosis')}
                      className="w-full bg-[#1f0101] hover:bg-[#333333] text-white py-3 rounded-xl font-medium"
                    >
                      두피분석 시작하기
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* 레포트 리스트 영역 */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="p-4 border-b border-gray-100">
                        <h4 className="text-sm font-semibold text-gray-700">두피분석 리포트 목록</h4>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {formatAnalysisResults(getCurrentResults()).map((report) => {
                          const reportData = getCurrentResults().find(r => r.id === report.id)
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
                                      {report.analysistype}
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
                        className="w-full bg-[#1f0101] hover:bg-[#333333] text-white py-3 rounded-xl font-medium"
                      >
                        새로운 두피분석 시작하기
                      </Button>
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>

          <TabsContent value="favorites" className="space-y-4">
            {/* 사용자의 찜 목록 */}
            <MyFavorites />
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
