import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../utils/store';
import apiClient from '../../services/apiClient';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  CheckCircle,
  BarChart3,
  Calendar
} from 'lucide-react';

// 타입 정의
interface DensityData {
  hair_density_percentage: number;
  total_hair_pixels: number;
  distribution_map: number[][];
  top_region_density: number;
  middle_region_density: number;
  bottom_region_density: number;
}

interface ComparisonData {
  density: {
    trend: 'improving' | 'stable' | 'declining';
    change_percentage: number;
    weekly_change: number;
    monthly_change: number;
    trend_coefficient: number;
  };
  distribution: {
    similarity: number;
    change_detected: boolean;
    hotspots: Array<{
      position: [number, number];
      change: number;
      type: 'increase' | 'decrease';
    }>;
  };
  features: {
    similarity: number;
    distance: number;
    change_score: number;
  };
}

interface AnalysisResult {
  success: boolean;
  current: {
    density: DensityData;
    features: {
      feature_vector: number[];
      feature_norm: number;
    };
  };
  comparison: ComparisonData;
  summary: {
    overall_trend: string;
    risk_level: string;
    recommendations: string[];
  };
}

const TimeSeriesAnalysis: React.FC = () => {
  const navigate = useNavigate();
  const userId = useSelector((state: RootState) => state.user.userId);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  // 시계열 분석 실행
  const runAnalysis = async () => {
    if (!userId) {
      setError('로그인이 필요합니다.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.get(`/timeseries/analyze/${userId}`);

      if (!response.data.success) {
        setError(response.data.message || '분석에 실패했습니다.');
        return;
      }

      setAnalysisResult(response.data);
    } catch (err: any) {
      console.error('❌ 시계열 분석 실패:', err);
      setError(err.response?.data?.message || '분석 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 페이지 로드 시 자동 실행
  useEffect(() => {
    runAnalysis();
  }, [userId]);

  // 트렌드 아이콘 반환
  const getTrendIcon = (trend: string) => {
    if (trend === 'improving') return <TrendingUp className="h-5 w-5 text-green-600" />;
    if (trend === 'declining') return <TrendingDown className="h-5 w-5 text-red-600" />;
    return <Minus className="h-5 w-5 text-gray-600" />;
  };

  // 트렌드 텍스트 반환
  const getTrendText = (trend: string) => {
    if (trend === 'improving') return '개선';
    if (trend === 'declining') return '악화';
    return '유지';
  };

  // 트렌드 색상 반환
  const getTrendColor = (trend: string) => {
    if (trend === 'improving') return 'text-green-600';
    if (trend === 'declining') return 'text-red-600';
    return 'text-gray-600';
  };

  // 리스크 레벨 색상
  const getRiskLevelColor = (level: string) => {
    if (level === 'high') return 'bg-red-100 text-red-800 border-red-300';
    if (level === 'medium') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    return 'bg-green-100 text-green-800 border-green-300';
  };

  // 리스크 레벨 텍스트
  const getRiskLevelText = (level: string) => {
    if (level === 'high') return '높음';
    if (level === 'medium') return '보통';
    return '낮음';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto bg-white min-h-screen pb-20">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 z-10">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="p-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-bold text-gray-800">시계열 분석</h1>
              <p className="text-xs text-gray-600">머리 밀도 변화 추이</p>
            </div>
          </div>
        </div>

        {/* 컨텐츠 */}
        <div className="p-4 space-y-4">
          {/* 로딩 상태 */}
          {loading && (
            <Card>
              <CardContent className="p-6 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1f0101] mx-auto mb-3"></div>
                <p className="text-sm text-gray-600">분석 중입니다...</p>
                <p className="text-xs text-gray-500 mt-1">과거 이미지를 비교하고 있습니다.</p>
              </CardContent>
            </Card>
          )}

          {/* 에러 상태 */}
          {error && (
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-red-800">분석 실패</p>
                    <p className="text-xs text-red-700 mt-1">{error}</p>
                  </div>
                </div>
                <Button
                  onClick={runAnalysis}
                  className="w-full mt-3 bg-red-600 hover:bg-red-700"
                  size="sm"
                >
                  다시 시도
                </Button>
              </CardContent>
            </Card>
          )}

          {/* 분석 결과 */}
          {analysisResult && analysisResult.success && (
            <>
              {/* 종합 요약 */}
              <Card className="bg-gradient-to-r from-[#1f0101] to-[#2A0202] text-white">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-5 w-5" />
                      <h3 className="font-semibold">종합 분석</h3>
                    </div>
                    <Badge className={getRiskLevelColor(analysisResult.summary.risk_level)}>
                      리스크: {getRiskLevelText(analysisResult.summary.risk_level)}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    {getTrendIcon(analysisResult.summary.overall_trend)}
                    <span className="text-lg font-bold">
                      전체 트렌드: {getTrendText(analysisResult.summary.overall_trend)}
                    </span>
                  </div>

                  <div className="bg-white/20 rounded-lg p-3 space-y-2">
                    <p className="text-sm font-semibold opacity-90">AI 권장 사항:</p>
                    {analysisResult.summary.recommendations.map((rec, idx) => (
                      <p key={idx} className="text-sm opacity-90 flex items-start gap-2">
                        <span className="text-white/70">•</span>
                        <span>{rec}</span>
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* 밀도 변화 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-[#1f0101]" />
                    밀도 변화 분석
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* 현재 밀도 */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-600 mb-1">현재 머리 밀도</p>
                    <p className="text-2xl font-bold text-[#1f0101]">
                      {analysisResult.current.density.hair_density_percentage.toFixed(1)}%
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      픽셀 수: {analysisResult.current.density.total_hair_pixels.toLocaleString()}
                    </p>
                  </div>

                  {/* 변화율 */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-blue-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-blue-700 mb-1">주간 변화</p>
                      <p className={`text-lg font-bold ${
                        analysisResult.comparison.density.weekly_change > 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {analysisResult.comparison.density.weekly_change > 0 ? '+' : ''}
                        {analysisResult.comparison.density.weekly_change.toFixed(1)}%
                      </p>
                    </div>

                    <div className="bg-purple-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-purple-700 mb-1">월간 변화</p>
                      <p className={`text-lg font-bold ${
                        analysisResult.comparison.density.monthly_change > 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {analysisResult.comparison.density.monthly_change > 0 ? '+' : ''}
                        {analysisResult.comparison.density.monthly_change.toFixed(1)}%
                      </p>
                    </div>
                  </div>

                  {/* 트렌드 */}
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">밀도 트렌드</span>
                    <div className="flex items-center gap-2">
                      {getTrendIcon(analysisResult.comparison.density.trend)}
                      <span className={`font-semibold ${getTrendColor(analysisResult.comparison.density.trend)}`}>
                        {getTrendText(analysisResult.comparison.density.trend)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 분포 히트맵 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">헤어 분포 맵 (8x8)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-8 gap-1 mb-3">
                    {analysisResult.current.density.distribution_map.map((row, i) =>
                      row.map((cell, j) => (
                        <div
                          key={`${i}-${j}`}
                          className="aspect-square rounded"
                          style={{
                            backgroundColor: `rgba(31, 1, 1, ${Math.min(cell / 100, 1)})`,
                          }}
                          title={`위치: (${i}, ${j})\n밀도: ${cell.toFixed(1)}%`}
                        />
                      ))
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>밀도 낮음</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-3 bg-gradient-to-r from-white via-red-300 to-[#1f0101] rounded"></div>
                    </div>
                    <span>밀도 높음</span>
                  </div>

                  {/* 유사도 */}
                  {analysisResult.comparison.distribution && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-700">이전과 유사도</span>
                        <span className="font-semibold text-[#1f0101]">
                          {(analysisResult.comparison.distribution.similarity * 100).toFixed(1)}%
                        </span>
                      </div>
                      <Progress value={analysisResult.comparison.distribution.similarity * 100} />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* AI 변화 감지 점수 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">AI 변화 감지 점수</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-700">Feature 유사도</span>
                      <span className="font-semibold">
                        {(analysisResult.comparison.features.similarity * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={analysisResult.comparison.features.similarity * 100} />
                  </div>

                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-sm font-semibold text-blue-800 mb-1">변화 점수</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {analysisResult.comparison.features.change_score.toFixed(1)} / 100
                    </p>
                    <p className="text-xs text-blue-700 mt-2">
                      {analysisResult.comparison.features.change_score < 30
                        ? '변화가 거의 없습니다'
                        : analysisResult.comparison.features.change_score < 60
                        ? '중간 수준의 변화가 감지되었습니다'
                        : '상당한 변화가 감지되었습니다. 전문의 상담을 권장합니다.'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* 영역별 밀도 */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">영역별 밀도</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">상단 영역</span>
                    <span className="font-semibold text-[#1f0101]">
                      {analysisResult.current.density.top_region_density.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">중간 영역</span>
                    <span className="font-semibold text-[#1f0101]">
                      {analysisResult.current.density.middle_region_density.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span className="text-sm">하단 영역</span>
                    <span className="font-semibold text-[#1f0101]">
                      {analysisResult.current.density.bottom_region_density.toFixed(1)}%
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* 안내 메시지 */}
              <Card className="bg-gray-50 border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-gray-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-700">
                        이 결과는 AI 분석에 기반한 참고용이며, 정확한 진단을 위해서는 반드시 전문의 상담이 필요합니다.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimeSeriesAnalysis;
