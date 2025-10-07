from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from datetime import datetime

class AnalysisRequest(BaseModel):
    image_data: str  # base64 encoded image
    filename: str

class SimilarImage(BaseModel):
    id: Optional[str] = None
    score: Optional[float] = None
    stage: int
    filename: str
    path: Optional[str] = None
    similarity: Optional[float] = None  # RAG v2에서 사용
    source: Optional[str] = None  # RAG v2에서 사용 (convnext/vit)

class AnalysisResult(BaseModel):
    success: bool
    grade: Optional[int] = None  # 프로젝트 표시 단계 (0-3)
    stage: Optional[int] = None  # 프론트 하위 호환 (grade와 동일)
    confidence: Optional[float] = None
    stage_description: Optional[str] = None
    # Swin과 동일한 필드 (Gemini LLM 결과)
    title: Optional[str] = None
    description: Optional[str] = None
    advice: Optional[str] = None
    # 기존 필드들
    norwood_stage: Optional[int] = None
    norwood_description: Optional[str] = None
    stage_scores: Optional[Dict[str, float]] = None
    stage_probabilities: Optional[Dict[str, float]] = None
    similar_images: Optional[List[SimilarImage]] = None
    analysis_details: Optional[Dict[str, Any]] = None
    ensemble_details: Optional[Dict[str, Any]] = None
    fusion_method: Optional[str] = None
    fusion_weight: Optional[float] = None
    primary_viewpoint: Optional[str] = None
    secondary_viewpoint: Optional[str] = None
    primary_filename: Optional[str] = None
    secondary_filename: Optional[str] = None
    llm_analysis: Optional[str] = None
    detailed_explanation: Optional[str] = None
    error: Optional[str] = None
    timestamp: datetime

class DatabaseInfo(BaseModel):
    success: bool
    index_name: Optional[str] = None
    total_vectors: Optional[int] = None
    dimension: Optional[int] = None
    namespaces: Optional[Dict] = None
    error: Optional[str] = None
    timestamp: datetime

class UploadResponse(BaseModel):
    success: bool
    filename: Optional[str] = None
    file_path: Optional[str] = None
    file_size: Optional[int] = None
    error: Optional[str] = None
    timestamp: datetime

class DatabaseSetupRequest(BaseModel):
    recreate_index: bool = False

class DatabaseSetupResponse(BaseModel):
    success: bool
    message: str
    total_embeddings: Optional[int] = None
    error: Optional[str] = None
    timestamp: datetime

class HealthCheck(BaseModel):
    status: str
    timestamp: datetime
    version: str = "1.0.0"


class AddFolderRequest(BaseModel):
    folder_path: str
    recreate_index: bool = False


class AddFolderResponse(BaseModel):
    success: bool
    message: str
    total_embeddings: Optional[int] = None
    error: Optional[str] = None
    timestamp: datetime
