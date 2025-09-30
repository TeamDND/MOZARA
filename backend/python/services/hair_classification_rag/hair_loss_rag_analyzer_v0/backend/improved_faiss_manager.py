#!/usr/bin/env python3
"""개선된 FAISS 매니저 - k-NN 로직 개선"""

import os
import faiss
import numpy as np
import pickle
from typing import List, Dict, Any, Tuple
import logging
from collections import defaultdict
from app.config import settings

class ImprovedFAISSManager:
    def __init__(self):
        """개선된 FAISS 매니저 초기화"""
        self.dimension = settings.EMBEDDING_DIMENSION
        self.index_file = os.path.join(settings.UPLOAD_DIR, "hair_loss_faiss.index")
        self.metadata_file = os.path.join(settings.UPLOAD_DIR, "hair_loss_metadata.pkl")
        self.index = None
        self.metadata = []
        self.logger = logging.getLogger(__name__)

        # 기존 인덱스 로드
        self.load_index()

    def load_index(self) -> bool:
        """기존 인덱스 로드"""
        try:
            if os.path.exists(self.index_file) and os.path.exists(self.metadata_file):
                self.index = faiss.read_index(self.index_file)
                with open(self.metadata_file, 'rb') as f:
                    self.metadata = pickle.load(f)
                self.logger.info(f"기존 인덱스 로드 완료: {self.index.ntotal}개 벡터")
                return True
            else:
                self.logger.warning("기존 인덱스를 찾을 수 없습니다.")
                return False
        except Exception as e:
            self.logger.error(f"인덱스 로드 실패: {e}")
            return False

    def search_similar_images_improved(self, query_embedding: np.ndarray,
                                     top_k: int = 20,
                                     exclude_levels: List[int] = None,
                                     distance_threshold: float = None) -> List[Dict]:
        """개선된 유사 이미지 검색"""
        try:
            if self.index is None or self.index.ntotal == 0:
                self.logger.warning("인덱스가 비어있습니다.")
                return []

            # 쿼리 임베딩을 float32로 변환하고 2D 배열로 만들기
            query_vector = np.array([query_embedding], dtype=np.float32)

            # 더 많은 후보를 검색 (필터링을 위해)
            search_k = min(top_k * 3, self.index.ntotal)
            distances, indices = self.index.search(query_vector, search_k)

            # 결과 포맷팅 및 필터링
            similar_images = []
            level_counts = defaultdict(int)

            for i, (distance, idx) in enumerate(zip(distances[0], indices[0])):
                if idx < len(self.metadata):
                    meta = self.metadata[idx]
                    stage = meta['stage']

                    # 제외할 레벨 필터링
                    if exclude_levels and stage in exclude_levels:
                        continue

                    # 거리 임계값 필터링
                    if distance_threshold and distance > distance_threshold:
                        continue

                    # 레벨별 균형 조정 (각 레벨당 최대 개수 제한)
                    max_per_level = max(2, top_k // 7)  # 각 레벨당 최소 2개, 최대 top_k/7개
                    if level_counts[stage] >= max_per_level:
                        continue

                    # 개선된 유사도 계산
                    # 1. 지수 감쇠 방식
                    similarity_score_exp = np.exp(-distance / 100.0)  # 거리 100당 1/e로 감소

                    # 2. 역제곱 방식
                    similarity_score_inv = 1.0 / (1.0 + (distance / 50.0) ** 2)

                    # 3. 최종 점수는 두 방식의 평균
                    final_score = (similarity_score_exp + similarity_score_inv) / 2.0

                    similar_images.append({
                        'id': meta.get('id', f'unknown_{idx}'),
                        'score': final_score,
                        'distance': float(distance),
                        'stage': stage,
                        'filename': meta.get('filename', 'unknown'),
                        'image_path': meta.get('path', meta.get('image_path', 'unknown'))
                    })

                    level_counts[stage] += 1

                    # 충분한 결과를 얻었으면 중단
                    if len(similar_images) >= top_k:
                        break

            # 거리 기준으로 정렬
            similar_images.sort(key=lambda x: x['distance'])

            return similar_images[:top_k]

        except Exception as e:
            self.logger.error(f"개선된 유사 이미지 검색 실패: {e}")
            return []

    def predict_hair_loss_stage_improved(self, query_embedding: np.ndarray,
                                       top_k: int = 50,
                                       exclude_levels: List[int] = None,
                                       use_distance_weighting: bool = True) -> Dict:
        """개선된 탈모 단계 예측"""
        try:
            # 기본적으로 레벨 1 제외 (ConvNext 모델의 레벨1-레벨2 구분 문제 해결)
            if exclude_levels is None:
                exclude_levels = [1]
            elif 1 not in exclude_levels:
                exclude_levels = exclude_levels + [1]

            # 개선된 검색 실행
            similar_images = self.search_similar_images_improved(
                query_embedding,
                top_k=top_k,
                exclude_levels=exclude_levels
            )

            if not similar_images:
                return {
                    'predicted_stage': None,
                    'confidence': 0,
                    'stage_scores': {},
                    'similar_images': []
                }

            # 단계별 점수 계산
            stage_scores = defaultdict(float)
            total_weight = 0

            for i, img in enumerate(similar_images):
                stage = img['stage']

                if use_distance_weighting:
                    # 거리 기반 가중치 (가까운 이미지에 더 높은 가중치)
                    weight = img['score']

                    # 순위 기반 추가 가중치 (상위 결과에 더 높은 가중치)
                    rank_weight = 1.0 / (1.0 + i * 0.1)  # 순위가 낮을수록 가중치 감소
                    final_weight = weight * rank_weight
                else:
                    # 단순 카운트 방식
                    final_weight = 1.0

                stage_scores[stage] += final_weight
                total_weight += final_weight

            # 정규화
            if total_weight > 0:
                for stage in stage_scores:
                    stage_scores[stage] /= total_weight

            # 가장 높은 점수의 단계 선택
            predicted_stage = max(stage_scores, key=stage_scores.get)
            confidence = stage_scores[predicted_stage]

            return {
                'predicted_stage': predicted_stage,
                'confidence': confidence,
                'stage_scores': dict(stage_scores),
                'similar_images': similar_images[:5],  # 상위 5개만 반환
                'analysis_info': {
                    'total_candidates': len(similar_images),
                    'excluded_levels': exclude_levels or [],
                    'distance_weighting': use_distance_weighting
                }
            }

        except Exception as e:
            self.logger.error(f"개선된 탈모 단계 예측 실패: {e}")
            return {
                'predicted_stage': None,
                'confidence': 0,
                'stage_scores': {},
                'similar_images': []
            }

    def get_index_stats(self) -> Dict:
        """인덱스 통계 정보"""
        try:
            if self.index is None:
                return {'success': False, 'error': '인덱스가 로드되지 않았습니다.'}

            level_distribution = defaultdict(int)
            for meta in self.metadata:
                stage = meta.get('stage', 'unknown')
                level_distribution[stage] += 1

            return {
                'success': True,
                'total_vector_count': self.index.ntotal,
                'dimension': self.index.d,
                'level_distribution': dict(level_distribution)
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}