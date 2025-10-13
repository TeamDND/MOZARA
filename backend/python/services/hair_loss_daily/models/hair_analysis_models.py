"""
머리사진 분석 관련 Pydantic 모델
"""
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from enum import Enum

class SeverityLevel(str, Enum):
    """심각도 레벨"""
    NORMAL = "양호"
    MILD = "경증"
    MODERATE = "중등도"
    SEVERE = "중증"

class HairCategory(str, Enum):
    """머리카락 관련 카테고리"""
    FINE_SCALES = "미세각질"
    EXCESSIVE_SEBUM = "피지과다"
    FOLLICULAR_ERYTHEMA = "모낭사이홍반"
    FOLLICULAR_PUSTULE = "모낭홍반농포"
    DANDRUFF = "비듬"
    HAIR_LOSS = "탈모"

class DiagnosisScore(BaseModel):
    """진단 점수"""
    category: str
    score: float = Field(..., ge=0, le=3)
    severity: str

class SimilarCase(BaseModel):
    """유사 케이스"""
    id: str
    score: float = Field(..., ge=0, le=2)  # 1보다 큰 값도 허용
    metadata: Dict[str, Any]

class RAGAnalysis(BaseModel):
    """RAG 분석 결과"""
    primary_category: str
    primary_severity: str
    average_confidence: float
    category_distribution: Dict[str, int]
    severity_distribution: Dict[str, int]
    diagnosis_scores: Dict[str, float]
    recommendations: List[str]
    scalp_score: int = Field(default=100, ge=0, le=100, description="두피 건강 점수 (0-100)")

class AIAnalysis(BaseModel):
    """AI 분석 결과"""
    diagnosis: str
    main_issues: List[str]
    causes: List[str]
    management_plan: List[str]
    precautions: List[str]
    medical_consultation: bool
    prevention_tips: List[str]
    confidence_level: str

class HairAnalysisRequest(BaseModel):
    """머리사진 분석 요청"""
    top_k: int = Field(default=10, ge=1, le=20, description="검색할 유사 케이스 수")

class HairAnalysisResponse(BaseModel):
    """머리사진 분석 응답"""
    success: bool
    analysis: Optional[RAGAnalysis] = None
    ai_analysis: Optional[AIAnalysis] = None
    similar_cases: List[SimilarCase] = []
    total_similar_cases: int = 0
    model_info: Dict[str, Any] = {}
    error: Optional[str] = None

class CategorySearchRequest(BaseModel):
    """카테고리별 검색 요청"""
    category: HairCategory
    top_k: int = Field(default=5, ge=1, le=10)

class CategorySearchResponse(BaseModel):
    """카테고리별 검색 응답"""
    success: bool
    category: str
    similar_cases: List[SimilarCase] = []
    total_cases: int = 0
    error: Optional[str] = None

class HealthCheckResponse(BaseModel):
    """헬스체크 응답"""
    status: str
    services: Dict[str, Any]
    timestamp: str
