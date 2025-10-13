import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { analyzeHairWithSwin } from '../../services/swinAnalysisService';
import { analyzeHairWithRAG } from '../../services/ragAnalysisService';

/**
 * 남성 탈모 AI 분석 테스트 페이지
 * - 실제 서비스에 영향 없이 분석 기능 테스트
 * - 상세한 디버그 정보 출력
 * - 다양한 설정으로 실험 가능
 */
const HairAnalysisTest = () => {
  const [topImage, setTopImage] = useState<File | null>(null);
  const [topImagePreview, setTopImagePreview] = useState<string | null>(null);
  const [sideImage, setSideImage] = useState<File | null>(null);
  const [sideImagePreview, setSideImagePreview] = useState<string | null>(null);

  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [age, setAge] = useState<string>('30');
  const [familyHistory, setFamilyHistory] = useState<string>('yes');
  const [recentHairLoss, setRecentHairLoss] = useState<string>('yes');
  const [stress, setStress] = useState<string>('중간');

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const handleTopImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setTopImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setTopImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSideImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSideImage(file);
      const reader = new FileReader();
      reader.onload = (e) => setSideImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const runAnalysis = async () => {
    if (!topImage) {
      alert('Top View 이미지를 업로드해주세요');
      return;
    }

    if (gender === 'male' && !sideImage) {
      alert('남성의 경우 Side View 이미지도 필요합니다');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setResult(null);
    setDebugInfo(null);

    const startTime = performance.now();

    try {
      const surveyData = {
        gender,
        age,
        familyHistory,
        recentHairLoss,
        stress
      };

      let analysisResult;

      if (gender === 'male') {
        console.log('🔵 [TEST] 남성 Swin Transformer 분석 시작');
        analysisResult = await analyzeHairWithSwin(
          topImage,
          sideImage!,
          undefined, // userId
          undefined, // imageUrl
          surveyData
        );
      } else {
        console.log('🟣 [TEST] 여성 RAG 분석 시작');
        analysisResult = await analyzeHairWithRAG(
          topImage,
          undefined, // userId
          undefined, // imageUrl
          surveyData
        );
      }

      const endTime = performance.now();
      const elapsedTime = ((endTime - startTime) / 1000).toFixed(2);

      setResult(analysisResult.analysis);
      setDebugInfo({
        elapsedTime: `${elapsedTime}초`,
        method: gender === 'male' ? 'Swin Transformer' : 'RAG v2',
        timestamp: new Date().toISOString(),
        surveyData,
        imageInfo: {
          topSize: `${(topImage.size / 1024).toFixed(2)} KB`,
          sideSize: sideImage ? `${(sideImage.size / 1024).toFixed(2)} KB` : 'N/A',
          topDimensions: topImagePreview ? '확인 필요' : 'N/A'
        }
      });

      console.log('✅ [TEST] 분석 완료:', analysisResult);
      console.log('⏱️ [TEST] 소요 시간:', elapsedTime, '초');

    } catch (err: any) {
      console.error('❌ [TEST] 분석 실패:', err);
      setError(err.message || '분석 중 오류가 발생했습니다');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-bold">🧪 탈모 AI 분석 테스트</h1>
            <Badge variant="destructive">개발자 전용</Badge>
          </div>
          <p className="text-gray-600">
            실제 서비스에 영향 없이 AI 분석 기능을 테스트할 수 있습니다
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 왼쪽: 입력 섹션 */}
          <div className="space-y-6">
            {/* 이미지 업로드 */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">📸 이미지 업로드</h2>

              {/* Top View */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Top View (필수)</label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleTopImageUpload}
                  className="mb-2"
                />
                {topImagePreview && (
                  <div className="mt-2 w-48 h-48 border rounded overflow-hidden">
                    <img src={topImagePreview} alt="Top View" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>

              {/* Side View */}
              {gender === 'male' && (
                <div>
                  <label className="block text-sm font-medium mb-2">Side View (남성 필수)</label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleSideImageUpload}
                    className="mb-2"
                  />
                  {sideImagePreview && (
                    <div className="mt-2 w-48 h-48 border rounded overflow-hidden">
                      <img src={sideImagePreview} alt="Side View" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>
              )}
            </Card>

            {/* 설문 데이터 */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">📋 설문 데이터</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">성별</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as 'male' | 'female')}
                    className="w-full p-2 border rounded"
                  >
                    <option value="male">남성</option>
                    <option value="female">여성</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">나이</label>
                  <Input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    placeholder="예: 30"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">가족력</label>
                  <select
                    value={familyHistory}
                    onChange={(e) => setFamilyHistory(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="yes">있음</option>
                    <option value="no">없음</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">최근 탈모 증상</label>
                  <select
                    value={recentHairLoss}
                    onChange={(e) => setRecentHairLoss(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="yes">있음</option>
                    <option value="no">없음</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">스트레스 수준</label>
                  <select
                    value={stress}
                    onChange={(e) => setStress(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="낮음">낮음</option>
                    <option value="중간">중간</option>
                    <option value="높음">높음</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* 실행 버튼 */}
            <Button
              onClick={runAnalysis}
              disabled={isAnalyzing || !topImage || (gender === 'male' && !sideImage)}
              className="w-full h-14 text-lg bg-blue-600 hover:bg-blue-700"
            >
              {isAnalyzing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  분석 중...
                </>
              ) : (
                '🚀 AI 분석 실행'
              )}
            </Button>
          </div>

          {/* 오른쪽: 결과 섹션 */}
          <div className="space-y-6">
            {/* 디버그 정보 */}
            {debugInfo && (
              <Card className="p-6 bg-gray-900 text-green-400 font-mono text-sm">
                <h2 className="text-xl font-semibold mb-4 text-white">🔍 디버그 정보</h2>
                <pre className="whitespace-pre-wrap overflow-auto max-h-96">
                  {JSON.stringify(debugInfo, null, 2)}
                </pre>
              </Card>
            )}

            {/* 에러 */}
            {error && (
              <Card className="p-6 bg-red-50 border-red-200">
                <h2 className="text-xl font-semibold mb-4 text-red-800">❌ 에러</h2>
                <p className="text-red-700">{error}</p>
              </Card>
            )}

            {/* 분석 결과 */}
            {result && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4">📊 분석 결과</h2>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">탈모 단계</label>
                    <p className="text-2xl font-bold text-blue-600">Stage {result.stage}</p>
                  </div>

                  {result.confidence && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">신뢰도</label>
                      <p className="text-lg font-semibold">{(result.confidence * 100).toFixed(1)}%</p>
                    </div>
                  )}

                  {result.description && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">설명</label>
                      <p className="text-gray-800">{result.description}</p>
                    </div>
                  )}

                  {result.advice && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">조언</label>
                      {Array.isArray(result.advice) ? (
                        <ul className="list-disc list-inside space-y-1 text-gray-800">
                          {result.advice.map((item: string, index: number) => (
                            <li key={index}>{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-800">{String(result.advice)}</p>
                      )}
                    </div>
                  )}

                  <div className="pt-4 border-t">
                    <label className="text-sm font-medium text-gray-600 mb-2 block">전체 응답 (JSON)</label>
                    <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-h-96">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                </div>
              </Card>
            )}

            {/* 안내 */}
            {!result && !error && !isAnalyzing && (
              <Card className="p-6 bg-blue-50">
                <h2 className="text-xl font-semibold mb-4">💡 사용 방법</h2>
                <ol className="list-decimal list-inside space-y-2 text-gray-700">
                  <li>Top View 이미지를 업로드합니다</li>
                  <li>남성의 경우 Side View 이미지도 업로드합니다</li>
                  <li>설문 데이터를 입력합니다</li>
                  <li>"AI 분석 실행" 버튼을 클릭합니다</li>
                  <li>콘솔(F12)에서 상세 로그를 확인할 수 있습니다</li>
                </ol>
              </Card>
            )}
          </div>
        </div>

        {/* 하단 정보 */}
        <Card className="p-4 mt-6 bg-yellow-50 border-yellow-200">
          <p className="text-sm text-yellow-800">
            ⚠️ <strong>주의:</strong> 이 페이지는 개발 및 테스트 전용입니다.
            실제 사용자 데이터는 기록되지 않으며, 프로덕션 환경에 영향을 주지 않습니다.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default HairAnalysisTest;
