"""
Time-Series Analysis API Router
엔드포인트 정의 (경량)
"""

from fastapi import APIRouter, HTTPException
import logging

from ..models.schemas import (
    ImageAnalysisRequest,
    ImageAnalysisResponse,
    TimeSeriesRequest,
    TimeSeriesResponse
)
from ..services import analysis_service

logger = logging.getLogger(__name__)

# FastAPI Router 생성
router = APIRouter(prefix="/timeseries", tags=["timeseries"])


@router.get("/")
async def root():
    """API 정보"""
    return {
        "name": "Time-Series Analysis API",
        "version": "1.0.0",
        "endpoints": [
            "/timeseries/analyze-single",
            "/timeseries/compare"
        ]
    }


@router.post("/analyze-single", response_model=ImageAnalysisResponse)
async def analyze_single_image(request: ImageAnalysisRequest):
    """단일 이미지 분석 (밀도 + feature)"""
    try:
        result = analysis_service.analyze_single_image(request.image_url)
        return result
    except Exception as e:
        logger.error(f"❌ 분석 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/compare", response_model=TimeSeriesResponse)
async def compare_timeseries(request: TimeSeriesRequest):
    """시계열 비교 분석"""
    try:
        result = analysis_service.compare_timeseries(
            request.current_image_url,
            request.past_image_urls
        )
        return result
    except Exception as e:
        logger.error(f"❌ 시계열 분석 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))
