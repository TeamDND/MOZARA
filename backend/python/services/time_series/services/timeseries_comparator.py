"""
시계열 비교 분석
밀도, 분포, feature vector 유사도 계산
"""

import numpy as np
from scipy.spatial.distance import cosine
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)


class TimeSeriesComparator:
    """시계열 데이터 비교 분석기"""

    def compare_density(self, current: dict, past_list: List[dict]) -> dict:
        """
        밀도 변화 분석

        Args:
            current: {'hair_density_percentage': 48.5, ...}
            past_list: [{'hair_density_percentage': 50.2, ...}, ...]

        Returns:
            {
                'trend': 'improving' | 'stable' | 'declining',
                'change_percentage': float,
                'weekly_change': float,
                'monthly_change': float,
                'trend_coefficient': float
            }
        """
        if not past_list:
            return {
                'trend': 'insufficient_data',
                'message': '비교할 과거 데이터가 없습니다.'
            }

        current_density = current['hair_density_percentage']
        past_density = past_list[-1]['hair_density_percentage']

        # 주간 변화 (가장 최근과 비교)
        weekly_change = current_density - past_density

        # 🔍 상세 로그 추가 (근본 원인 파악용)
        logger.info(f"📊 밀도 변화 분석:")
        logger.info(f"  과거 밀도: {past_density:.2f}%")
        logger.info(f"  현재 밀도: {current_density:.2f}%")
        logger.info(f"  절대 변화: {weekly_change:+.2f}% (percentage point)")
        if past_density > 0:
            relative_change = (weekly_change / past_density) * 100
            logger.info(f"  상대 변화: {relative_change:+.2f}% (relative ratio)")

        # 월간 변화 (4주 전과 비교, 데이터가 충분하면)
        if len(past_list) >= 4:
            past_monthly_density = past_list[-4]['hair_density_percentage']
            monthly_change = current_density - past_monthly_density
            logger.info(f"  월간 절대 변화: {monthly_change:+.2f}% (4주 전 대비)")
        else:
            monthly_change = weekly_change

        # 트렌드 분석 (선형 회귀)
        densities = [p['hair_density_percentage'] for p in past_list] + [current_density]
        x = np.arange(len(densities))
        slope = np.polyfit(x, densities, 1)[0]  # 선형 회귀 기울기

        # 트렌드 판정
        if slope > 0.5:
            trend = 'improving'  # 개선
        elif slope < -0.5:
            trend = 'declining'  # 악화
        else:
            trend = 'stable'     # 유지

        return {
            'trend': trend,
            'change_percentage': round(float(weekly_change), 2),
            'weekly_change': round(float(weekly_change), 2),
            'monthly_change': round(float(monthly_change), 2),
            'trend_coefficient': round(float(slope), 4)
        }

    def compare_distribution(self, current_map: list, past_maps: List[list]) -> dict:
        """
        분포 변화 분석 (8x8 히트맵 비교)

        Args:
            current_map: 현재 8x8 분포 맵
            past_maps: 과거 8x8 분포 맵 리스트

        Returns:
            {
                'similarity': float,           # 0-1 (1에 가까울수록 유사)
                'change_detected': bool,       # 변화 감지 여부
                'hotspots': list               # 변화가 큰 영역들
            }
        """
        if not past_maps:
            return {
                'similarity': 1.0,
                'change_detected': False,
                'message': '비교할 과거 데이터가 없습니다.'
            }

        # 가장 최근 분포 맵과 비교
        current_flat = np.array(current_map).flatten()
        past_flat = np.array(past_maps[-1]).flatten()

        # 코사인 유사도 계산
        similarity = 1 - cosine(current_flat, past_flat)

        # Hotspot 감지 (변화가 5% 이상인 셀)
        diff_map = np.array(current_map) - np.array(past_maps[-1])
        hotspots = []

        for i in range(8):
            for j in range(8):
                change = diff_map[i, j]
                if abs(change) > 5:  # 5% 이상 변화
                    hotspots.append({
                        'position': [i, j],
                        'change': round(float(change), 2),
                        'type': 'increase' if change > 0 else 'decrease'
                    })

        return {
            'similarity': round(float(similarity), 3),
            'change_detected': similarity < 0.9,  # 유사도 90% 이하면 변화 감지
            'hotspots': hotspots
        }

    def compare_features(self, current_feature: list, past_features: List[list]) -> dict:
        """
        Feature vector 유사도 분석 (768차원)

        Args:
            current_feature: 현재 feature vector (768차원)
            past_features: 과거 feature vector 리스트

        Returns:
            {
                'similarity': float,          # 0-1 (코사인 유사도)
                'distance': float,            # L2 거리
                'change_score': float         # 0-100 점수
            }
        """
        if not past_features:
            return {
                'similarity': 1.0,
                'distance': 0.0,
                'change_score': 0.0,
                'message': '비교할 과거 데이터가 없습니다.'
            }

        # 가장 최근 feature와 비교
        current_np = np.array(current_feature)
        past_np = np.array(past_features[-1])

        # 코사인 유사도
        similarity = 1 - cosine(current_np, past_np)

        # L2 거리
        distance = np.linalg.norm(current_np - past_np)

        # 변화 점수 (0-100, 높을수록 많이 변함)
        change_score = min(distance * 10, 100)

        return {
            'similarity': round(float(similarity), 3),
            'distance': round(float(distance), 2),
            'change_score': round(float(change_score), 1)
        }

    def generate_summary(self, density_comparison: dict,
                        distribution_comparison: dict = None,
                        feature_comparison: dict = None) -> dict:
        """
        종합 분석 요약 생성 (경량화: 밀도만)

        Returns:
            {
                'overall_trend': str,
                'risk_level': str,
                'recommendations': list
            }
        """
        # 종합 트렌드 (밀도만 사용)
        density_trend = density_comparison.get('trend', 'stable')
        # feature_change = feature_comparison.get('change_score', 0)  # ← 경량화: 주석
        feature_change = 0 if feature_comparison is None else feature_comparison.get('change_score', 0)

        if density_trend == 'declining' or feature_change > 60:
            overall_trend = 'declining'
            risk_level = 'high'
        elif density_trend == 'improving':
            overall_trend = 'improving'
            risk_level = 'low'
        else:
            overall_trend = 'stable'
            risk_level = 'medium'

        # 권장 사항
        recommendations = []
        if risk_level == 'high':
            recommendations.append("전문의 상담을 권장합니다.")
            recommendations.append("현재 케어 루틴을 재검토해보세요.")
        elif risk_level == 'medium':
            recommendations.append("현재 케어를 꾸준히 유지하세요.")
        else:
            recommendations.append("좋은 상태입니다. 계속 유지하세요!")

        return {
            'overall_trend': overall_trend,
            'risk_level': risk_level,
            'recommendations': recommendations
        }


# 테스트 코드
if __name__ == "__main__":
    print("TimeSeriesComparator 테스트 시작...")

    comparator = TimeSeriesComparator()

    # 테스트 데이터
    current_density = {'hair_density_percentage': 45.5}
    past_densities = [
        {'hair_density_percentage': 48.0},
        {'hair_density_percentage': 47.2},
        {'hair_density_percentage': 46.8},
        {'hair_density_percentage': 46.0}
    ]

    # 밀도 비교
    density_result = comparator.compare_density(current_density, past_densities)
    print("✅ 밀도 비교 테스트 성공!")
    print(f"트렌드: {density_result['trend']}")
    print(f"주간 변화: {density_result['weekly_change']}%")
    print(f"월간 변화: {density_result['monthly_change']}%")

    # 분포 비교 (더미 데이터)
    current_map = [[10] * 8 for _ in range(8)]
    past_maps = [[[12] * 8 for _ in range(8)]]

    distribution_result = comparator.compare_distribution(current_map, past_maps)
    print(f"\n✅ 분포 비교 테스트 성공!")
    print(f"유사도: {distribution_result['similarity']}")
