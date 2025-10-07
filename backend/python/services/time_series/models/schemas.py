"""
Time-Series Analysis Pydantic Models
요청/응답 데이터 구조 정의
"""

from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from enum import Enum


class AnalysisStatus(str, Enum):
    """분석 상태"""
    SUCCESS = "success"
    FAILED = "failed"


class ImageAnalysisRequest(BaseModel):
    """단일 이미지 분석 요청"""
    image_url: str = Field(..., description="분석할 이미지 URL")


class TimeSeriesRequest(BaseModel):
    """시계열 비교 분석 요청"""
    current_image_url: str = Field(..., description="현재 이미지 URL")
    past_image_urls: List[str] = Field(..., description="과거 이미지 URL 리스트")


class DensityResult(BaseModel):
    """밀도 분석 결과"""
    overall_density: float = Field(..., description="전체 밀도")
    distribution_map: Optional[Dict[str, Any]] = Field(None, description="분포 맵")


class FeatureResult(BaseModel):
    """Feature 추출 결과"""
    feature_vector: List[float] = Field(..., description="Feature 벡터")


class ImageAnalysisResponse(BaseModel):
    """단일 이미지 분석 응답"""
    success: bool
    density: Optional[Dict[str, Any]] = None
    features: Optional[Dict[str, Any]] = None
    message: Optional[str] = None


class ComparisonResult(BaseModel):
    """시계열 비교 결과"""
    density_change: Optional[float] = None
    trend: Optional[str] = None
    analysis: Optional[str] = None


class TimeSeriesResponse(BaseModel):
    """시계열 비교 분석 응답"""
    success: bool
    current: Optional[Dict[str, Any]] = None
    comparison: Optional[Dict[str, Any]] = None
    summary: Optional[Dict[str, Any]] = None
    message: Optional[str] = None
