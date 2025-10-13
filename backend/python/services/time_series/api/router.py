"""
Time-Series Analysis API Router
엔드포인트 정의 (경량)
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
import logging
import requests

from ..models.schemas import (
    ImageAnalysisRequest,
    ImageAnalysisResponse,
    TimeSeriesRequest,
    TimeSeriesResponse,
    VisualizationRequest,
    VisualizationChangeRequest
)
from ..services import analysis_service
from ..services.density_visualizer import DensityVisualizer

logger = logging.getLogger(__name__)

# 시각화 인스턴스 생성
visualizer = DensityVisualizer(threshold=30.0, circle_color=(0, 255, 0))

# FastAPI Router 생성
router = APIRouter(prefix="/timeseries", tags=["timeseries"])


@router.get("/")
async def root():
    """API 정보"""
    return {
        "name": "Time-Series Analysis API",
        "version": "1.1.0",
        "endpoints": [
            "/timeseries/analyze-single",
            "/timeseries/compare",
            "/timeseries/visualize-density",
            "/timeseries/visualize-change"
        ],
        "description": "밀도 분석 및 시각화 API (BiSeNet 기반)"
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


@router.post("/visualize-density")
async def visualize_density(request: VisualizationRequest):
    """
    밀도가 낮은 영역을 초록색 동그라미로 표시한 이미지 반환

    Args:
        request: image_url과 threshold 포함

    Returns:
        시각화된 이미지 (JPEG)
    """
    try:
        logger.info(f"📊 밀도 시각화 요청: {request.image_url}")

        # 1. 이미지 다운로드
        response = requests.get(request.image_url, timeout=10)
        if response.status_code != 200:
            raise HTTPException(status_code=400, detail="이미지 다운로드 실패")

        image_bytes = response.content

        # 2. 밀도 분석
        density_result = analysis_service.analyze_single_image(request.image_url)

        if not density_result.get('success'):
            raise HTTPException(status_code=500, detail="밀도 분석 실패")

        # 3. 시각화
        visualized_image = visualizer.visualize_low_density_regions(
            image_bytes,
            density_result['density'],
            threshold=request.threshold
        )

        logger.info("✅ 밀도 시각화 완료")

        # 4. 이미지 반환
        return Response(content=visualized_image, media_type="image/jpeg")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 밀도 시각화 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/visualize-change")
async def visualize_change(request: VisualizationChangeRequest):
    """
    과거 대비 밀도가 감소한 영역을 초록색 동그라미로 표시

    Args:
        request: current_image_url과 past_image_urls 포함

    Returns:
        변화 영역이 표시된 이미지 (JPEG)
    """
    try:
        logger.info(f"📊 밀도 변화 시각화 요청")

        # 1. 현재 이미지 다운로드
        current_response = requests.get(request.current_image_url, timeout=10)
        if current_response.status_code != 200:
            raise HTTPException(status_code=400, detail="현재 이미지 다운로드 실패")

        current_bytes = current_response.content

        # 2. 시계열 분석
        comparison_result = analysis_service.compare_timeseries(
            request.current_image_url,
            request.past_image_urls
        )

        if not comparison_result.get('success'):
            raise HTTPException(status_code=500, detail="시계열 분석 실패")

        # 3. 과거 밀도 데이터 수집
        past_densities = []
        for url in request.past_image_urls:
            try:
                past_result = analysis_service.analyze_single_image(url)
                if past_result.get('success'):
                    past_densities.append(past_result['density'])
            except Exception as e:
                logger.warning(f"⚠️ 과거 이미지 처리 실패: {e}")
                continue

        # 4. 변화 시각화
        visualized_image = visualizer.visualize_density_change(
            current_bytes,
            comparison_result['current']['density'],
            past_densities
        )

        logger.info("✅ 밀도 변화 시각화 완료")

        # 5. 이미지 반환
        return Response(content=visualized_image, media_type="image/jpeg")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ 밀도 변화 시각화 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))
