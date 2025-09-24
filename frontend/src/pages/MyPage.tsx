"use client"

import { useState, useEffect } from "react"
import { useSelector, useDispatch } from "react-redux"
import { useNavigate } from "react-router-dom"
import { RootState } from "../utils/store"
import { clearToken } from "../utils/tokenSlice"
import { clearUser } from "../utils/userSlice"
import apiClient from "../services/apiClient"
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card"
import { Button } from "../components/ui/button"
import { Badge } from "../components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs"
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

  const favorites = {
    maps: [
      { id: 1, name: "강남 모발이식 클리닉", location: "서울 강남구", rating: 4.8, distance: "1.2km" },
      { id: 2, name: "홍대 탈모 전문병원", location: "서울 마포구", rating: 4.6, distance: "2.5km" },
    ],
    videos: [
      { id: 1, title: "탈모 예방을 위한 5가지 습관", channel: "헤어케어TV", views: "12만", duration: "8:32" },
      { id: 2, title: "모발이식 후기 솔직 리뷰", channel: "탈모극복", views: "8.5만", duration: "12:15" },
    ],
    products: [
      { id: 1, name: "프리미엄 탈모 샴푸", brand: "헤어랩", price: "29,000원", rating: 4.7 },
      { id: 2, name: "모발 영양 세럼", brand: "스칼프케어", price: "45,000원", rating: 4.8 },
    ],
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
    gender: user.gender || "성별 정보 없음",
    age: user.age || 0,
    role: user.role || "일반 사용자"
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="px-4 py-6 bg-white">
        <div className="flex items-center gap-4 mb-6">
          <div className="h-16 w-16 rounded-full bg-blue-100 border-2 border-blue-200 flex items-center justify-center">
            <User className="h-8 w-8 text-blue-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 mb-1">{userInfo.name}</h2>
            <p className="text-sm text-gray-500 mb-2">가입일: {userInfo.joinDate}</p>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Users className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">
                  {loading ? "로딩 중..." : `${userInfo.totalAnalysis}회 분석`}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-500 fill-current" />
                <span className="text-sm font-medium text-gray-700">{userInfo.satisfaction} 만족도</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
          <div className="space-y-3">
            <TabsList className="flex gap-2 w-full pb-2 bg-transparent">
              <TabsTrigger
                value="reports"
                className="flex-1 px-3 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white data-[state=inactive]:bg-gray-100 data-[state=inactive]:text-gray-600 hover:bg-blue-700 transition-colors"
              >
                <FileText className="h-4 w-4 mr-1" />
                내 리포트
              </TabsTrigger>
              <TabsTrigger
                value="favorites"
                className="flex-1 px-3 py-2 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white hover:bg-gray-200 transition-colors"
              >
                <Heart className="h-4 w-4 mr-1" />
                내 찜
              </TabsTrigger>
              <TabsTrigger
                value="profile"
                className="flex-1 px-3 py-2 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 data-[state=active]:bg-blue-600 data-[state=active]:text-white hover:bg-gray-200 transition-colors"
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
              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
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
                
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium">
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
                                <Badge variant="outline" className="text-xs border-blue-200 text-blue-700">
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
                  <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium">
                    새로운 AI 분석 시작하기
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="favorites" className="space-y-6">
            {/* 탈모 맵 */}
            <div>
              <div className="flex items-center gap-2 mb-4 px-1">
                <MapPin className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold text-gray-900">탈모 맵</h3>
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">{favorites.maps.length}</Badge>
              </div>
              <div className="space-y-3">
                {favorites.maps.map((map) => (
                  <Card
                    key={map.id}
                    className="border-0 shadow-sm bg-white hover:shadow-md transition-all duration-200"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 text-sm mb-1">{map.name}</h4>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>{map.location}</span>
                            <span>• {map.distance}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium text-gray-700">{map.rating}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* 유튜브 */}
            <div>
              <div className="flex items-center gap-2 mb-4 px-1">
                <Youtube className="h-5 w-5 text-red-500" />
                <h3 className="font-bold text-gray-900">유튜브</h3>
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">{favorites.videos.length}</Badge>
              </div>
              <div className="space-y-3">
                {favorites.videos.map((video) => (
                  <Card
                    key={video.id}
                    className="border-0 shadow-sm bg-white hover:shadow-md transition-all duration-200"
                  >
                    <CardContent className="p-4">
                      <h4 className="font-semibold text-gray-900 text-sm mb-2">{video.title}</h4>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>{video.channel}</span>
                        <div className="flex items-center gap-2">
                          <span>조회수 {video.views}</span>
                          <span>• {video.duration}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* 제품 */}
            <div>
              <div className="flex items-center gap-2 mb-4 px-1">
                <Package className="h-5 w-5 text-blue-600" />
                <h3 className="font-bold text-gray-900">제품</h3>
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">{favorites.products.length}</Badge>
              </div>
              <div className="space-y-3">
                {favorites.products.map((product) => (
                  <Card
                    key={product.id}
                    className="border-0 shadow-sm bg-white hover:shadow-md transition-all duration-200"
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 text-sm mb-1">{product.name}</h4>
                          <div className="flex items-center gap-3 text-xs text-gray-500">
                            <span>{product.brand}</span>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span>{product.rating}</span>
                            </div>
                          </div>
                        </div>
                        <span className="text-sm font-bold text-blue-600">{product.price}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="profile" className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 px-1">회원정보 수정</h3>

            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-gray-900">기본 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">이름</label>
                  <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">{userInfo.name}</div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">이메일</label>
                  <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">{userInfo.email}</div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">주소</label>
                  <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">{userInfo.address}</div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">성별</label>
                  <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">{userInfo.gender}</div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">나이</label>
                  <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">{userInfo.age > 0 ? `${userInfo.age}세` : "나이 정보 없음"}</div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">회원 등급</label>
                  <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">{userInfo.role}</div>
                </div>

                <Button className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-medium">
                  정보 수정하기
                </Button>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm bg-white">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold text-gray-900">계정 관리</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start bg-white border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg"
                >
                  비밀번호 변경
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start bg-white border-gray-200 text-gray-700 hover:bg-gray-50 rounded-lg"
                >
                  알림 설정
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start text-red-600 hover:text-red-700 bg-white border-gray-200 hover:bg-red-50 rounded-lg"
                >
                  회원 탈퇴
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
