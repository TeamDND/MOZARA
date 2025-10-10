import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import { Button } from '../../components/ui/button';
import { ChevronLeft, ChevronRight, Users, BarChart3, Activity } from 'lucide-react';

interface UserListItem {
  userId: number;
  username: string;
  nickname: string;
  email: string;
  role: string;
}

interface PageResponse {
  content: UserListItem[];
  totalPages: number;
  totalElements: number;
  number: number;
  size: number;
}

interface AnalyticsData {
  pageViews?: {
    data: Array<{ date: string; pageViews: string }>;
    total: number;
  };
  activeUsers?: {
    data: Array<{ date: string; activeUsers: string }>;
    total: number;
  };
  topPages?: {
    data: Array<{ pagePath?: string; pageTitle?: string; pageViews: string }>;
  };
}

interface MetricsData {
  keywords: string[];
  period?: string;
}

interface MetricsOverview {
  totalSearches: number;
  activeUsers: number;
  totalDiagnosis: number;
  period: string;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'users' | 'analytics' | 'metrics'>('users');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [metricsData, setMetricsData] = useState<MetricsData | null>(null);
  const [metricsOverview, setMetricsOverview] = useState<MetricsOverview | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const pageSize = 20;

  // 유저 목록 조회
  const fetchUsers = async (page: number) => {
    setLoading(true);
    try {
      const response = await apiClient.get<PageResponse>(`/admin/users?page=${page}&size=${pageSize}`);

      setUsers(response.data.content);
      setTotalPages(response.data.totalPages);
      setTotalElements(response.data.totalElements);
      setCurrentPage(response.data.number);
    } catch (error) {
      console.error('유저 목록 조회 실패:', error);
      alert('유저 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(0);
  }, []);

  // Analytics 데이터 조회
  const fetchAnalyticsData = async () => {
    setAnalyticsLoading(true);
    try {
      const response = await apiClient.get<AnalyticsData>('/admin/analytics/dashboard');
      setAnalyticsData(response.data);
    } catch (error) {
      console.error('Analytics 데이터 조회 실패:', error);
      alert('Analytics 데이터를 불러오는데 실패했습니다.');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // UserMetrics 데이터 조회
  const fetchMetricsData = async () => {
    setMetricsLoading(true);
    try {
      const [keywordsRes, overviewRes] = await Promise.all([
        apiClient.get<MetricsData>('/admin/metrics/popular-searches?days=7'),
        apiClient.get<MetricsOverview>('/admin/metrics/overview')
      ]);
      setMetricsData(keywordsRes.data);
      setMetricsOverview(overviewRes.data);
    } catch (error) {
      console.error('UserMetrics 데이터 조회 실패:', error);
      alert('UserMetrics 데이터를 불러오는데 실패했습니다.');
    } finally {
      setMetricsLoading(false);
    }
  };

  // Analytics/Metrics 탭 선택 시 데이터 로드
  useEffect(() => {
    if (activeTab === 'analytics' && !analyticsData) {
      fetchAnalyticsData();
    }
    if (activeTab === 'metrics' && !metricsData) {
      fetchMetricsData();
    }
  }, [activeTab]);

  // 페이지 변경
  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && newPage < totalPages) {
      fetchUsers(newPage);
    }
  };

  // 유저 행 클릭
  const handleUserClick = (username: string) => {
    navigate(`/admin/user/${username}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">관리자 대시보드</h1>
          <p className="text-gray-600">
            {activeTab === 'users'
              ? `전체 사용자 목록 (${totalElements}명)`
              : activeTab === 'analytics'
              ? '구글 애널리틱스 데이터'
              : '사용자 행동 메트릭 분석'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === 'users' ? 'default' : 'outline'}
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 ${activeTab === 'users' ? 'bg-[#222222]' : ''}`}
          >
            <Users className="w-4 h-4" />
            사용자 목록
          </Button>
          <Button
            variant={activeTab === 'analytics' ? 'default' : 'outline'}
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 ${activeTab === 'analytics' ? 'bg-[#222222]' : ''}`}
          >
            <BarChart3 className="w-4 h-4" />
            Analytics
          </Button>
          <Button
            variant={activeTab === 'metrics' ? 'default' : 'outline'}
            onClick={() => setActiveTab('metrics')}
            className={`flex items-center gap-2 ${activeTab === 'metrics' ? 'bg-[#222222]' : ''}`}
          >
            <Activity className="w-4 h-4" />
            UserMetrics
          </Button>
        </div>

        {/* Content */}
        {activeTab === 'users' ? (
          <>
            {/* Loading */}
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#222222] border-t-transparent"></div>
              </div>
            ) : (
              <>
                {/* User Table */}
                <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
                  <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Username
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nickname
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr
                      key={user.userId}
                      onClick={() => handleUserClick(user.username)}
                      className="cursor-pointer"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.userId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {user.username}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {user.nickname}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.role}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 0}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                이전
              </Button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i;
                  } else if (currentPage < 3) {
                    pageNum = i;
                  } else if (currentPage > totalPages - 3) {
                    pageNum = totalPages - 5 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={currentPage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePageChange(pageNum)}
                      className={currentPage === pageNum ? 'bg-[#222222]' : ''}
                    >
                      {pageNum + 1}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages - 1}
                className="flex items-center gap-1"
              >
                다음
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

                <div className="text-center text-sm text-gray-600 mt-4">
                  페이지 {currentPage + 1} / {totalPages}
                </div>
              </>
            )}
          </>
        ) : activeTab === 'analytics' ? (
          /* Analytics Tab */
          <div className="space-y-6">
            {analyticsLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#222222] border-t-transparent"></div>
              </div>
            ) : analyticsData ? (
              <>
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* 총 페이지뷰 */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-600">총 페이지뷰</h3>
                      <BarChart3 className="w-5 h-5 text-blue-500" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">
                      {analyticsData.pageViews?.total?.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">최근 7일</p>
                  </div>

                  {/* 활성 사용자 */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-600">활성 사용자</h3>
                      <Users className="w-5 h-5 text-green-500" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">
                      {analyticsData.activeUsers?.total?.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">최근 7일</p>
                  </div>

                  {/* 인기 페이지 수 */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-600">추적 중인 페이지</h3>
                      <BarChart3 className="w-5 h-5 text-purple-500" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">
                      {analyticsData.topPages?.data?.length || 0}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">TOP 페이지</p>
                  </div>
                </div>

                {/* 인기 페이지 테이블 */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">인기 페이지 TOP 10</h3>
                    <p className="text-sm text-gray-600">최근 7일간 가장 많이 방문한 페이지</p>
                  </div>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          순위
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          페이지 경로
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          페이지뷰
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {analyticsData.topPages?.data?.map((page, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            #{index + 1}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900">
                            {page.pagePath || page.pageTitle}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {Number(page.pageViews).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* 일별 데이터 (선택사항) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* 일별 페이지뷰 */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">일별 페이지뷰</h3>
                    <div className="space-y-2">
                      {analyticsData.pageViews?.data?.map((day, index) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">{day.date}</span>
                          <span className="font-medium text-gray-900">{Number(day.pageViews).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 일별 사용자 */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">일별 활성 사용자</h3>
                    <div className="space-y-2">
                      {analyticsData.activeUsers?.data?.map((day, index) => (
                        <div key={index} className="flex justify-between items-center text-sm">
                          <span className="text-gray-600">{day.date}</span>
                          <span className="font-medium text-gray-900">{Number(day.activeUsers).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* GA 설정 안내 */
              <div className="bg-white rounded-lg shadow p-6">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Google Analytics 설정이 필요합니다
                  </h3>
                  <div className="text-sm text-gray-600 space-y-2 max-w-2xl mx-auto">
                    <p>1. Google Analytics에서 Property ID 확인</p>
                    <p>2. 서비스 계정 JSON 키 파일 배치</p>
                    <p>3. application.properties에 GA_PROPERTY_ID 설정</p>
                    <p>4. 서버 재시작 후 데이터 확인</p>
                  </div>
                  <div className="mt-6">
                    <Button onClick={fetchAnalyticsData} className="bg-[#222222]">
                      다시 시도
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          /* UserMetrics Tab */
          <div className="space-y-6">
            {metricsLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#222222] border-t-transparent"></div>
              </div>
            ) : metricsData ? (
              <>
                {/* 인기 검색어 카드 */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-blue-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                          <Activity className="w-5 h-5 text-purple-600" />
                          인기 검색 키워드
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                          최근 {metricsData.period || '7일'}간 사용자들이 가장 많이 검색한 키워드
                        </p>
                      </div>
                      <Button
                        onClick={fetchMetricsData}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <Activity className="w-4 h-4" />
                        새로고침
                      </Button>
                    </div>
                  </div>

                  <div className="p-6">
                    {metricsData.keywords && metricsData.keywords.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                        {metricsData.keywords.map((keyword, index) => (
                          <div
                            key={index}
                            className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-100 hover:shadow-md transition-shadow"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-purple-600">
                                #{index + 1}
                              </span>
                            </div>
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {keyword}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">아직 검색 데이터가 없습니다</p>
                        <p className="text-sm text-gray-400 mt-1">
                          사용자들이 RAG 검색을 시작하면 데이터가 수집됩니다
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 안내 카드 */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                        <BarChart3 className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-md font-semibold text-gray-900 mb-2">
                        UserMetrics 시스템 정보
                      </h4>
                      <div className="space-y-2 text-sm text-gray-600">
                        <p>✅ <strong>RAG 검색 추적:</strong> 사용자의 검색 쿼리와 결과 클릭 기록</p>
                        <p>✅ <strong>두피 진단 기록:</strong> 진단 결과 및 점수 저장</p>
                        <p>✅ <strong>제품 클릭 분석:</strong> 제품 카테고리별 선호도 파악</p>
                        <p>✅ <strong>케어 미션 완료:</strong> 사용자 참여도 측정</p>
                        <p className="mt-3 pt-3 border-t border-gray-200">
                          <strong className="text-purple-600">🤖 AI 추천 엔진:</strong>
                          <span className="ml-1">수집된 데이터를 기반으로 나이대별 맞춤 추천 제공 (챗봇 통합)</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 실시간 통계 카드 */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-600">총 검색 횟수</h3>
                      <Activity className="w-5 h-5 text-blue-500" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">
                      {metricsOverview?.totalSearches.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{metricsOverview?.period || '최근 7일'}</p>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-600">활성 사용자 수</h3>
                      <Users className="w-5 h-5 text-green-500" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">
                      {metricsOverview?.activeUsers.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{metricsOverview?.period || '최근 7일'}</p>
                  </div>

                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-sm font-medium text-gray-600">두피 진단 횟수</h3>
                      <BarChart3 className="w-5 h-5 text-purple-500" />
                    </div>
                    <p className="text-3xl font-bold text-gray-900">
                      {metricsOverview?.totalDiagnosis.toLocaleString() || 0}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{metricsOverview?.period || '최근 7일'}</p>
                  </div>
                </div>
              </>
            ) : (
              /* 설정 안내 */
              <div className="bg-white rounded-lg shadow p-6">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Activity className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    UserMetrics 데이터 수집 중
                  </h3>
                  <div className="text-sm text-gray-600 space-y-2 max-w-2xl mx-auto">
                    <p>사용자들이 서비스를 이용하면 자동으로 데이터가 수집됩니다.</p>
                    <p>RAG 검색, 두피 진단, 제품 클릭 등의 행동이 추적됩니다.</p>
                  </div>
                  <div className="mt-6">
                    <Button onClick={fetchMetricsData} className="bg-[#222222]">
                      데이터 확인
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
