from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from datetime import datetime

class AnalysisRequest(BaseModel):
    image_data: str  # base64 encoded image
    filename: str

class SimilarImage(BaseModel):
    id: str
    score: float
    stage: int
    filename: str
    path: str

class AnalysisResult(BaseModel):
    success: bool
    predicted_stage: Optional[int] = None
    confidence: Optional[float] = None
    stage_description: Optional[str] = None
    stage_scores: Optional[Dict[str, float]] = None
    stage_probabilities: Optional[Dict[str, float]] = None
    similar_images: Optional[List[SimilarImage]] = None
    analysis_details: Optional[Dict[str, Any]] = None
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