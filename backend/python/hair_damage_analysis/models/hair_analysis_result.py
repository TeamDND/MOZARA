"""
Hair Analysis Result Models
"""
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
from datetime import datetime

class HairAnalysisResult(BaseModel):
    """모발 분석 결과 모델"""
    diagnosis: str
    gender: str
    scale_type: str
    stage: int
    confidence: float
    image_url: Optional[str] = None
    analysis_date: Optional[datetime] = None

class AnalysisRequest(BaseModel):
    """분석 요청 모델"""
    image_base64: Optional[str] = None
    text_query: Optional[str] = None

class AnalysisResponse(BaseModel):
    """분석 응답 모델"""
    message: str
    results: List[Dict[str, Any]]
    success: bool = True

class RAGChatRequest(BaseModel):
    """RAG 채팅 요청 모델"""
    image_base64: Optional[str] = None
    text_query: Optional[str] = None

class RAGChatResponse(BaseModel):
    """RAG 채팅 응답 모델"""
    message: str
    answer: str
    context_used: bool
    similar_cases_count: int
    success: bool = True
