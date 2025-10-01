export const API_BASE_URL = "http://localhost:8000"; // 백엔드 서버 주소

// 백엔드의 AnalysisResult 모델과 일치시킴
export interface AnalysisResult {
  success: boolean;
  predicted_stage?: number;
  stage_description?: string;
  stage_probabilities?: { [key: string]: number };
  detailed_explanation?: string;
  llm_analysis?: string;
  reference_image_front?: string;
  reference_image_side?: string;
  error?: string;
}

export const analyzeImages = async (
  primaryFile: File,
  secondaryFile: File
): Promise<AnalysisResult> => {
  const formData = new FormData();
  formData.append("primary_file", primaryFile);
  formData.append("secondary_file", secondaryFile);

  try {
    const response = await fetch(`${API_BASE_URL}/api/analysis/analyze-dual-upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "서버에서 오류가 발생했습니다.");
    }

    return await response.json();
  } catch (error) {
    console.error("API 호출 중 오류 발생:", error);
    const errorMessage = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    return {
        success: false,
        error: errorMessage,
      };
  }
};