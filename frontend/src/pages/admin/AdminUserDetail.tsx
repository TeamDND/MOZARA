import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import { formatKoreanDate } from '../../utils/dateFormatter';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Calendar,
  ChevronRight,
  Star,
  ArrowLeft
} from 'lucide-react';

interface UserInfo {
  userId: number;
  username: string;
  nickname: string;
  email: string;
  role: string;
  gender?: string;
  age?: number;
  familyHistory?: boolean;
  isLoss?: boolean;
  stress?: string;
}

interface AnalysisResult {
  id: number;
  inspectionDate: string;
  analysisSummary: string;
  advice: string;
  grade: number;
  imageUrl?: string;
  analysisType?: string;
  improvement: string;
}

const AdminUserDetail: React.FC = () => {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();

  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [reports, setReports] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) return;

    const fetchUserData = async () => {
      setLoading(true);
      try {
        // 1. 유저 정보 조회
        const userResponse = await apiClient.get(`/userinfo/${username}`);
        setUserInfo(userResponse.data);

        // 2. 레포트 목록 조회
        const reportsResponse = await apiClient.get(`/analysis-results/username/${username}`);

        // 날짜 포맷팅
        const formattedReports = reportsResponse.data.map((report: any) => ({
          ...report,
          inspectionDate: formatKoreanDate(report.inspectionDate)
        }));

        setReports(formattedReports);
      } catch (error) {
        console.error('데이터 조회 실패:', error);
        alert('사용자 데이터를 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [username]);

  // 레포트 클릭 핸들러
  const handleReportClick = (reportId: number) => {
    navigate(`/admin/report/${reportId}`, {
      state: { report: reports.find(r => r.id === reportId) }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#222222] border-t-transparent"></div>
      </div>
    );
  }

  if (!userInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">사용자를 찾을 수 없습니다</h2>
          <Button onClick={() => navigate('/admin')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            목록으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">사용자 상세 정보</h1>
        </div>

        {/* User Info Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>기본 정보</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">사용자 ID</p>
                    <p className="font-semibold">{userInfo.userId}</p>
                  </div>
                </div>

                <div className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">사용자명</p>
                    <p className="font-semibold">{userInfo.username}</p>
                  </div>
                </div>

                <div className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">닉네임</p>
                    <p className="font-semibold">{userInfo.nickname}</p>
                  </div>
                </div>

                <div className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">이메일</p>
                    <p className="font-semibold">{userInfo.email}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">권한</p>
                    <p className="font-semibold">{userInfo.role}</p>
                  </div>
                </div>

                <div className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">성별 / 나이</p>
                    <p className="font-semibold">
                      {userInfo.gender || 'N/A'} / {userInfo.age || 'N/A'}세
                    </p>
                  </div>
                </div>

                <div className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">가족력</p>
                    <p className="font-semibold">
                      {userInfo.familyHistory === null ? 'N/A' : userInfo.familyHistory ? '있음' : '없음'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">탈모 여부</p>
                    <p className="font-semibold">
                      {userInfo.isLoss === null ? 'N/A' : userInfo.isLoss ? '있음' : '없음'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reports Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>AI 분석 리포트</CardTitle>
              <Badge variant="outline">{reports.length}개</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {reports.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">분석 리포트가 없습니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report, index) => {
                  const totalCount = reports.length;
                  const formatAnalysisType = (type: string | undefined): string => {
                    if (!type) return '종합 진단';
                    if (type === 'daily') return '두피 분석';
                    // 탈모 단계 검사로 처리되는 모든 타입
                    if (type === 'swin_dual_model_llm_enhanced' ||
                        type === 'rag_v2_analysis') {
                      return '탈모 단계 검사';
                    }
                    return '종합 진단'; // 알 수 없는 타입은 종합 진단으로
                  };
                  const isDailyAnalysis = report.analysisType === 'daily';

                  return (
                    <div
                      key={report.id}
                      className="p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => handleReportClick(report.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-gray-900">
                              AI 탈모 분석 리포트 #{totalCount - index}
                            </h4>
                            <Badge variant="outline" className="text-xs">
                              {formatAnalysisType(report.analysisType)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {report.inspectionDate}
                            </span>
                            <span className="flex items-center gap-1">
                              <Star className="w-3 h-3" />
                              {isDailyAnalysis ? `${report.grade}점` : `${report.grade}단계`}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminUserDetail;
