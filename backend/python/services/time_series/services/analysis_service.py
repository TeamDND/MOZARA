"""
Time-Series Analysis Service
비즈니스 로직 처리 (경량화: 밀도 비교만)
"""

import requests
import logging
from typing import List, Dict, Any

from .density_analyzer import DensityAnalyzer
# from .feature_extractor import FeatureExtractor  # ← 경량화: 주석 처리
from .timeseries_comparator import TimeSeriesComparator

logger = logging.getLogger(__name__)

# 전역 인스턴스 (한 번만 로드)
_density_analyzer = None
# _feature_extractor = None  # ← 경량화: 주석 처리
_comparator = TimeSeriesComparator()


def _initialize_models():
    """모델 초기화 (lazy loading) - 밀도 분석만"""
    global _density_analyzer  # , _feature_extractor

    if _density_analyzer is None:
        logger.info("🔄 DensityAnalyzer 초기화 중...")
        _density_analyzer = DensityAnalyzer(device='cpu')
        logger.info("✅ DensityAnalyzer 초기화 완료")

    # ← 경량화: Feature 추출 비활성화
    # if _feature_extractor is None:
    #     logger.info("🔄 FeatureExtractor 초기화 중...")
    #     _feature_extractor = FeatureExtractor(device='cpu')
    #     logger.info("✅ FeatureExtractor 초기화 완료")


def analyze_single_image(image_url: str) -> Dict[str, Any]:
    """
    단일 이미지 분석 (밀도만)

    Args:
        image_url: 이미지 URL

    Returns:
        분석 결과 (밀도만)
    """
    _initialize_models()

    logger.info(f"📥 이미지 다운로드: {image_url}")

    response = requests.get(image_url, timeout=10)
    if response.status_code != 200:
        raise ValueError(f"이미지 다운로드 실패: {response.status_code}")

    image_bytes = response.content

    logger.info("🔍 밀도 측정 중...")
    density_result = _density_analyzer.calculate_density(image_bytes)

    # ← 경량화: Feature 추출 비활성화
    # logger.info("🧠 Feature 추출 중...")
    # feature_result = _feature_extractor.extract_features(image_bytes)

    logger.info("✅ 분석 완료 (밀도만)")

    return {
        "success": True,
        "density": density_result,
        # "features": feature_result  # ← 경량화: 제거
    }


def compare_timeseries(current_image_url: str, past_image_urls: List[str]) -> Dict[str, Any]:
    """
    시계열 비교 분석 (밀도만)

    Args:
        current_image_url: 현재 이미지 URL
        past_image_urls: 과거 이미지 URL 리스트

    Returns:
        비교 분석 결과 (밀도만)
    """
    _initialize_models()

    logger.info(f"📥 현재 이미지 분석: {current_image_url}")

    # 1. 현재 이미지 분석 (밀도만)
    current_response = requests.get(current_image_url, timeout=10)
    if current_response.status_code != 200:
        raise ValueError("현재 이미지 다운로드 실패")

    current_bytes = current_response.content
    current_density = _density_analyzer.calculate_density(current_bytes)
    # current_features = _feature_extractor.extract_features(current_bytes)  # ← 경량화: 주석

    logger.info(f"📥 과거 이미지 {len(past_image_urls)}개 분석")

    # 2. 과거 이미지들 분석 (밀도만)
    past_densities = []
    # past_features = []  # ← 경량화: 주석
    # past_maps = []  # ← 경량화: 주석

    for idx, url in enumerate(past_image_urls):
        try:
            logger.info(f"  - 과거 이미지 {idx+1}/{len(past_image_urls)}")
            past_response = requests.get(url, timeout=10)
            if past_response.status_code != 200:
                logger.warning(f"  ⚠️ 다운로드 실패: {url}")
                continue

            past_bytes = past_response.content
            past_density = _density_analyzer.calculate_density(past_bytes)
            # past_feature = _feature_extractor.extract_features(past_bytes)  # ← 경량화: 주석

            past_densities.append(past_density)
            # past_features.append(past_feature['feature_vector'])  # ← 경량화: 주석
            # past_maps.append(past_density['distribution_map'])  # ← 경량화: 주석

        except Exception as e:
            logger.warning(f"  ⚠️ 처리 실패: {e}")
            continue

    if not past_densities:
        return {
            "success": False,
            "message": "비교할 과거 데이터가 없습니다."
        }

    logger.info("📊 시계열 비교 분석 중 (밀도만)...")

    # 3. 시계열 비교 (밀도만)
    density_comparison = _comparator.compare_density(current_density, past_densities)
    # distribution_comparison = _comparator.compare_distribution(  # ← 경량화: 주석
    #     current_density['distribution_map'],
    #     past_maps
    # )
    # feature_comparison = _comparator.compare_features(  # ← 경량화: 주석
    #     current_features['feature_vector'],
    #     past_features
    # )

    # 4. 종합 요약 (밀도만)
    summary = _comparator.generate_summary(
        density_comparison,
        None,  # distribution_comparison  # ← 경량화: None
        None   # feature_comparison  # ← 경량화: None
    )

    logger.info("✅ 시계열 분석 완료 (밀도만)")

    return {
        "success": True,
        "current": {
            "density": current_density,
            # "features": current_features  # ← 경량화: 제거
        },
        "comparison": {
            "density": density_comparison,
            # "distribution": distribution_comparison,  # ← 경량화: 제거
            # "features": feature_comparison  # ← 경량화: 제거
        },
        "summary": summary
    }
