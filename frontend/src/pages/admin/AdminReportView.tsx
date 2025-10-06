import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import apiClient from '../../services/apiClient';
import { formatKoreanDate } from '../../utils/dateFormatter';
import MyReportPage from '../mypage/MyReportPage';
import { Button } from '../../components/ui/button';
import { ArrowLeft } from 'lucide-react';

interface AnalysisResult {
  id: number;
  inspectionDate: string;
  analysisSummary: string;
  advice: string;
  grade: number;
  imageUrl?: string;
  improvement: string;
  analysisType?: string;
}

const AdminReportView: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [report, setReport] = useState<AnalysisResult | null>(
    location.state?.report || null
  );
  const [loading, setLoading] = useState(!report);

  useEffect(() => {
    // 페이지 진입 시 스크롤을 맨 위로 이동
    window.scrollTo(0, 0);

    // location.state에서 report를 받아온 경우 API 호출 생략
    if (report) {
      return;
    }

    // location.state가 없으면 API로 조회
    if (reportId) {
      const fetchReport = async () => {
        setLoading(true);
        try {
          const response = await apiClient.get(`/analysis-result/${reportId}`);

          // 날짜 포맷팅
          const formattedReport = {
            ...response.data,
            inspectionDate: formatKoreanDate(response.data.inspectionDate)
          };

          setReport(formattedReport);
        } catch (error) {
          console.error('레포트 조회 실패:', error);
          alert('레포트를 불러오는데 실패했습니다.');
          navigate(-1);
        } finally {
          setLoading(false);
        }
      };

      fetchReport();
    }
  }, [reportId, report, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#222222] border-t-transparent"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">레포트를 찾을 수 없습니다</h2>
          <Button onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            돌아가기
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* MyReportPage 재사용 */}
      <MyReportPage analysisResult={report} />
    </div>
  );
};

export default AdminReportView;
