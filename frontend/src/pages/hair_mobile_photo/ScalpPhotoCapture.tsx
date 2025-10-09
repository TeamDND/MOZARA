import React, { useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../utils/store';
import apiClient from '../../services/apiClient';
import { X, Camera, Upload, Brain, CheckCircle } from 'lucide-react';

// 분석 결과 타입 정의
interface HairAnalysisResponse {
  success: boolean;
  analysis?: {
    primary_category: string;
    primary_severity: string;
    average_confidence: number;
    category_distribution: Record<string, number>;
    severity_distribution: Record<string, number>;
    diagnosis_scores: Record<string, number>;
    recommendations: string[];
  };
  similar_cases: Array<{
    id: string;
    score: number;
    metadata: {
      image_id: string;
      image_file_name: string;
      category: string;
      severity: string;
    };
  }>;
  total_similar_cases: number;
  model_info: Record<string, any>;
  preprocessing_used?: boolean;
  preprocessing_info?: {
    enabled: boolean;
    description: string;
  };
  error?: string;
}

interface AnalysisResult {
  scalpScore: number;
  dandruffLabel: string;
  flakeLabel: string;
  rednessLabel: string;
}

interface ScalpPhotoCaptureProps {
  buttonText?: string;
  confirmButtonText?: string;
  onPhotoSelected?: (file: File, imageUrl: string) => void;
  onAnalysisComplete?: (imageUrl: string, analysisResult: AnalysisResult) => void;
  disabled?: boolean;
  showPreview?: boolean;
  className?: string;
  showIcon?: boolean;
  enableAnalysis?: boolean; // AI 분석 활성화 여부
}

// 임시 저장소 타입 (분석 완료 후 콜백에 전달할 데이터)
interface PendingCallbackData {
  imageUrl: string;
  analysisResult: AnalysisResult;
}

const ScalpPhotoCapture: React.FC<ScalpPhotoCaptureProps> = ({
  buttonText = '사진 촬영하기',
  confirmButtonText = '이 사진으로 진행',
  onPhotoSelected,
  onAnalysisComplete,
  disabled = false,
  showPreview = true,
  className = '',
  showIcon = false,
  enableAnalysis = false
}) => {
  const { username, userId } = useSelector((state: RootState) => state.user);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [pendingCallback, setPendingCallback] = useState<PendingCallbackData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 사진 촬영/선택 트리거
  const handleCaptureClick = () => {
    fileInputRef.current?.click();
  };

  // 파일 선택 시
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 이미지 파일인지 확인
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.');
      return;
    }

    console.log('📸 파일 선택됨:', file.name, 'showPreview:', showPreview);
    setSelectedFile(file);
    setAnalysisResult(null); // 이전 결과 초기화

    // 미리보기 URL 생성
    const reader = new FileReader();
    reader.onload = (event) => {
      const previewDataUrl = event.target?.result as string;
      setPreviewUrl(previewDataUrl);
      console.log('🖼️ 미리보기 URL 생성 완료, showPreview:', showPreview);

      if (showPreview) {
        console.log('✅ 모달 표시');
        setShowModal(true);
      } else {
        console.log('⏭️ 미리보기 건너뛰고 바로 업로드');
        // 미리보기 없이 바로 처리
        handleProcess(file);
      }
    };
    reader.readAsDataURL(file);
  };

  // AI 분석 실행
  const analyzeScalp = async (file: File, imageUrl: string): Promise<AnalysisResult | null> => {
    try {
      console.log('🧠 AI 분석 시작...');
      const formData = new FormData();
      formData.append('image', file);
      formData.append('top_k', '10');
      formData.append('use_preprocessing', 'true');

      if (userId) {
        formData.append('user_id', userId.toString());
      }

      if (imageUrl) {
        formData.append('image_url', imageUrl);
      }

      const response = await apiClient.post('/ai/hair-loss-daily/analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const result: HairAnalysisResponse = response.data;

      if (!result.analysis) {
        throw new Error('분석 결과가 없습니다.');
      }

      // 두피 점수 계산 (DailyCare 로직 참고)
      const diagnosisScores = result.analysis.diagnosis_scores;

      // 비듬 점수
      const dandruffScore = diagnosisScores['비듬'] || 0;
      const dandruffLabel = dandruffScore < 0.5 ? '양호' : dandruffScore < 1.0 ? '주의' : '경고';

      // 각질 점수
      const flakeScore = diagnosisScores['각질'] || 0;
      const flakeLabel = flakeScore < 0.5 ? '양호' : flakeScore < 1.0 ? '주의' : '경고';

      // 홍반 점수
      const rednessScore = diagnosisScores['홍반'] || 0;
      const rednessLabel = rednessScore < 0.5 ? '양호' : rednessScore < 1.0 ? '주의' : '경고';

      // 종합 두피 점수 계산 (0-100)
      const avgScore = (dandruffScore + flakeScore + rednessScore) / 3;
      const scalpScore = Math.round(Math.max(0, 100 - (avgScore * 50)));

      const analyzedResult: AnalysisResult = {
        scalpScore,
        dandruffLabel,
        flakeLabel,
        rednessLabel
      };

      console.log('✅ AI 분석 완료:', analyzedResult);

      // 결과 저장
      if (userId) {
        try {
          const savePayload = {
            ...result,
            user_id: userId,
            grade: scalpScore,
            image_url: imageUrl || ''
          };
          await apiClient.post('/ai/hair-loss-daily/save-result', savePayload);
          console.log('💾 분석 결과 저장 완료');
        } catch (saveError) {
          console.error('❌ 분석 결과 저장 실패:', saveError);
        }
      }

      return analyzedResult;
    } catch (error) {
      console.error('❌ AI 분석 실패:', error);
      alert('AI 분석 중 오류가 발생했습니다.');
      return null;
    }
  };

  // 처리 버튼 클릭 (업로드 + 선택적 분석)
  const handleProcess = async (fileToProcess?: File) => {
    const file = fileToProcess || selectedFile;
    if (!file) return;

    setIsUploading(true);

    try {
      // 1. S3 업로드
      let imageUrl = '';
      if (username) {
        const uploadFormData = new FormData();
        uploadFormData.append('image', file);
        uploadFormData.append('username', username);

        const uploadResponse = await apiClient.post('/images/upload/hair-damage', uploadFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (uploadResponse.data.success) {
          imageUrl = uploadResponse.data.imageUrl;
          console.log('✅ S3 업로드 성공:', imageUrl);
        }
      }

      setIsUploading(false);

      // 2. AI 분석 (활성화된 경우)
      if (enableAnalysis) {
        setIsAnalyzing(true);
        const result = await analyzeScalp(file, imageUrl);
        setIsAnalyzing(false);

        if (result) {
          console.log('✅ 분석 결과 설정:', result);
          setAnalysisResult(result);
          console.log('✅ 모달 상태 유지 (결과 표시)');

          // 콜백 데이터를 임시 저장 (사용자가 "확인" 버튼 클릭 시 실행)
          setPendingCallback({ imageUrl, analysisResult: result });
        } else {
          console.log('❌ 분석 결과 없음 - 모달 닫기');
          handleCloseModal();
        }
      } else {
        // 분석 없이 바로 콜백
        if (onPhotoSelected) {
          onPhotoSelected(file, imageUrl);
        }
        // 모달 닫기
        handleCloseModal();
      }
    } catch (error) {
      console.error('❌ 처리 실패:', error);
      alert('사진 처리 중 오류가 발생했습니다.');
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  };

  // 완료 버튼 (분석 결과 확인 후)
  const handleComplete = () => {
    // 분석 완료 콜백 실행 (임시 저장된 데이터 사용)
    if (pendingCallback && onAnalysisComplete) {
      console.log('🎉 분석 완료 콜백 실행:', pendingCallback);
      onAnalysisComplete(pendingCallback.imageUrl, pendingCallback.analysisResult);
    }

    handleCloseModal();
  };

  // 다시 촬영
  const handleRetake = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setAnalysisResult(null);
    setShowModal(false);

    // input 초기화 후 다시 클릭
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      setTimeout(() => {
        fileInputRef.current?.click();
      }, 100);
    }
  };

  // 모달 닫기
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedFile(null);
    setPreviewUrl(null);
    setAnalysisResult(null);
    setPendingCallback(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <>
      {/* 숨겨진 파일 input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 촬영 버튼 */}
      <button
        onClick={handleCaptureClick}
        disabled={disabled || isUploading || isAnalyzing}
        className={className || "w-full h-12 px-4 bg-[#1F0101] text-white rounded-xl hover:bg-[#2A0202] disabled:opacity-50 font-semibold active:scale-[0.98] transition-all flex items-center justify-center gap-2"}
      >
        {showIcon && <Camera className="w-5 h-5" />}
        {isUploading || isAnalyzing ? '처리 중...' : buttonText}
      </button>

      {/* 미리보기 및 분석 결과 모달 */}
      {showModal && previewUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* 모달 헤더 */}
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center rounded-t-2xl">
              <h3 className="text-lg font-bold text-gray-800">
                {analysisResult ? '분석 완료' : '사진 확인'}
              </h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                disabled={isUploading || isAnalyzing}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 콘텐츠 */}
            <div className="p-4">
              {/* 미리보기 이미지 */}
              <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 mb-4">
                <img
                  src={previewUrl}
                  alt="촬영한 사진"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* 분석 결과 표시 */}
              {analysisResult ? (
                <div className="space-y-4">
                  {/* 성공 메시지 */}
                  <div className="p-3 bg-green-50 rounded-lg flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <p className="text-sm text-green-800 font-semibold">
                      AI 분석이 완료되었습니다!
                    </p>
                  </div>

                  {/* 분석 결과 카드들 */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white p-4 rounded-xl border border-gray-200">
                      <p className="text-xs text-gray-500">두피 점수</p>
                      <div className="mt-1 text-2xl font-bold text-gray-800">{analysisResult.scalpScore}</div>
                      <p className="mt-1 text-xs text-green-600">LLM 종합 분석</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200">
                      <p className="text-xs text-gray-500">비듬 상태</p>
                      <div className="mt-1 text-xl font-bold text-gray-800">{analysisResult.dandruffLabel}</div>
                      <p className="mt-1 text-xs text-emerald-600">상태 양호</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200">
                      <p className="text-xs text-gray-500">각질 상태</p>
                      <div className="mt-1 text-xl font-bold text-gray-800">{analysisResult.flakeLabel}</div>
                      <p className="mt-1 text-xs text-teal-600">정상 범위</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-gray-200">
                      <p className="text-xs text-gray-500">홍반 상태</p>
                      <div className="mt-1 text-xl font-bold text-gray-800">{analysisResult.rednessLabel}</div>
                      <p className="mt-1 text-xs text-green-600">건강함</p>
                    </div>
                  </div>

                  {/* 완료 버튼 */}
                  <button
                    onClick={handleComplete}
                    className="w-full h-12 px-4 bg-[#1F0101] text-white rounded-xl hover:bg-[#2A0202] font-semibold transition-all"
                  >
                    확인
                  </button>
                </div>
              ) : (
                <>
                  {/* 분석 전 안내 메시지 */}
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      📸 사진이 선명하게 촬영되었는지 확인해주세요.
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                      불선명하거나 어두운 경우 다시 촬영을 권장합니다.
                    </p>
                  </div>

                  {/* 버튼 그룹 */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={handleRetake}
                      disabled={isUploading || isAnalyzing}
                      className="h-12 px-4 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 disabled:opacity-50 font-semibold transition-all flex items-center justify-center gap-2"
                    >
                      <Camera className="w-4 h-4" />
                      다시 촬영
                    </button>
                    <button
                      onClick={() => handleProcess()}
                      disabled={isUploading || isAnalyzing}
                      className="h-12 px-4 bg-[#1F0101] text-white rounded-xl hover:bg-[#2A0202] disabled:opacity-50 font-semibold transition-all flex items-center justify-center gap-2"
                    >
                      {isUploading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                          업로드 중...
                        </>
                      ) : isAnalyzing ? (
                        <>
                          <Brain className="w-4 h-4 animate-pulse" />
                          분석 중...
                        </>
                      ) : (
                        <>
                          {enableAnalysis ? <Brain className="w-4 h-4" /> : <Upload className="w-4 h-4" />}
                          {confirmButtonText}
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ScalpPhotoCapture;
