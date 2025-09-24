"""
ConvNeXt + ViT-S/16 듀얼 Pinecone 매니저
두 개의 인덱스를 동시에 관리하고 검색
"""

import os
import numpy as np
from typing import List, Dict, Tuple
import logging
import time
from ..config import settings
from ..per_class_config import get_ensemble_config

try:
    from pinecone import Pinecone, ServerlessSpec
except ImportError as e:
    raise ImportError("Pinecone v3+ SDK is required. Install with: pip install pinecone==3.*") from e


class DualPineconeManager:
    def __init__(self):
        if not settings.PINECONE_API_KEY:
            raise ValueError("Pinecone API Key missing. Set PINECONE_API_KEY in .env")

        self.logger = logging.getLogger(__name__)
        self.config = get_ensemble_config()

        # 두 개의 인덱스 이름
        self.index_conv = self.config["index_conv"]  # "hair-loss-rag-analyzer"
        self.index_vit = self.config["index_vit"]    # "hair-loss-vit-s16"

        # 차원수
        self.dim_conv = 1536  # ConvNeXt embedding dimension
        self.dim_vit = 384    # ViT-S/16 embedding dimension

        # Parse cloud/region from legacy environment string like 'us-east-1-aws'
        cloud = 'aws'
        region = 'us-east-1'
        env = getattr(settings, 'PINECONE_ENVIRONMENT', '') or ''
        if env and '-' in env:
            parts = env.split('-')
            if len(parts) >= 3:
                region = '-'.join(parts[0:3]) if len(parts) > 3 else '-'.join(parts[0:2])
                cloud = parts[-1]
            else:
                region = parts[0]
                cloud = parts[-1]

        self.pc = Pinecone(api_key=settings.PINECONE_API_KEY)
        self.cloud = cloud
        self.region = region

    def create_indices(self, delete_if_exists: bool = False) -> Tuple[bool, bool]:
        """두 인덱스 모두 생성"""
        conv_success = self._create_single_index(
            self.index_conv, self.dim_conv, delete_if_exists
        )
        vit_success = self._create_single_index(
            self.index_vit, self.dim_vit, delete_if_exists
        )
        return conv_success, vit_success

    def _create_single_index(self, index_name: str, dimension: int, delete_if_exists: bool = False) -> bool:
        """단일 인덱스 생성"""
        try:
            existing = self.pc.list_indexes()
            exists = index_name in existing.names()

            if exists and delete_if_exists:
                self.logger.info(f"Deleting existing index {index_name}...")
                self.pc.delete_index(index_name)
                time.sleep(5)
                exists = False

            if not exists:
                self.logger.info(f"Creating index {index_name} (dim={dimension})...")
                self.pc.create_index(
                    name=index_name,
                    dimension=dimension,
                    metric='cosine',
                    spec=ServerlessSpec(cloud=self.cloud, region=self.region)
                )

                # Wait for index to be ready
                for _ in range(60):
                    try:
                        desc = self.pc.describe_index(index_name)
                        st = getattr(desc, 'status', None)
                        if (isinstance(st, dict) and st.get('ready')) or getattr(st, 'ready', False):
                            break
                    except Exception:
                        pass
                    time.sleep(1)
            else:
                self.logger.info(f"Index {index_name} already exists")
            return True
        except Exception as e:
            self.logger.error(f"Index creation failed for {index_name}: {e}")
            return False

    def get_indices(self) -> Tuple:
        """두 인덱스 객체 반환"""
        try:
            idx_conv = self.pc.Index(self.index_conv)
            idx_vit = self.pc.Index(self.index_vit)
            return idx_conv, idx_vit
        except Exception as e:
            self.logger.error(f"Get indices failed: {e}")
            raise

    def dual_search(self, conv_embedding: np.ndarray, vit_embedding: np.ndarray,
                   top_k: int = 10, viewpoint: str = None) -> Tuple[List[Dict], List[Dict]]:
        """ConvNeXt와 ViT 임베딩으로 동시 검색"""
        try:
            idx_conv, idx_vit = self.get_indices()

            # 필터 구성
            search_filter = {
                "gender": {"$eq": settings.DEFAULT_GENDER_FILTER}
            }

            # 뷰포인트 필터 적용
            if viewpoint:
                viewpoint_mapping = {
                    'top-down': ['Top-Down', 'top-down', 'top_down', 'top'],
                    'front': ['Front', 'front'],
                    'left': ['Left', 'left'],
                    'right': ['Right', 'right'],
                    'back': ['Back', 'back'],
                    'side': ['Side', 'side']
                }

                if viewpoint.lower() in viewpoint_mapping:
                    search_filter["pointview"] = {"$in": viewpoint_mapping[viewpoint.lower()]}
                else:
                    search_filter["pointview"] = {"$eq": viewpoint}

            # ConvNeXt 검색
            res_conv = idx_conv.query(
                vector=conv_embedding.tolist(),
                top_k=top_k,
                include_metadata=True,
                filter=search_filter
            )

            # ViT 검색
            res_vit = idx_vit.query(
                vector=vit_embedding.tolist(),
                top_k=top_k,
                include_metadata=True,
                filter=search_filter
            )

            # 결과 정리
            conv_matches = self._process_matches(res_conv)
            vit_matches = self._process_matches(res_vit)

            return conv_matches, vit_matches

        except Exception as e:
            self.logger.error(f"Dual search failed: {e}")
            return [], []

    def _process_matches(self, res) -> List[Dict]:
        """검색 결과 처리"""
        matches = res.get('matches', []) if isinstance(res, dict) else getattr(res, 'matches', [])
        processed_matches = []

        for m in matches:
            md = m['metadata'] if isinstance(m, dict) else getattr(m, 'metadata', {})
            processed_matches.append({
                'id': m['id'] if isinstance(m, dict) else getattr(m, 'id', None),
                'score': m['score'] if isinstance(m, dict) else float(getattr(m, 'score', 0.0)),
                'metadata': md
            })

        return processed_matches

    def predict_ensemble_stage(self, conv_embedding: np.ndarray, vit_embedding: np.ndarray,
                             top_k: int = 10, viewpoint: str = None) -> Dict:
        """앙상블 예측 수행"""
        try:
            from .ensemble_manager import EnsembleManager

            # 듀얼 검색 수행
            conv_matches, vit_matches = self.dual_search(
                conv_embedding, vit_embedding, top_k, viewpoint
            )

            if not conv_matches and not vit_matches:
                return {
                    'predicted_stage': None,
                    'confidence': 0,
                    'stage_scores': {},
                    'similar_images': [],
                    'error': 'No similar images found'
                }

            # 앙상블 매니저로 예측
            ensemble_manager = EnsembleManager()
            result = ensemble_manager.predict_from_dual_results(conv_matches, vit_matches)

            return result

        except Exception as e:
            self.logger.error(f"Ensemble prediction failed: {e}")
            return {
                'predicted_stage': None,
                'confidence': 0,
                'stage_scores': {},
                'similar_images': [],
                'error': str(e)
            }

    def get_dual_index_stats(self) -> Dict:
        """두 인덱스 통계 반환"""
        try:
            idx_conv, idx_vit = self.get_indices()

            stats_conv = idx_conv.describe_index_stats()
            stats_vit = idx_vit.describe_index_stats()

            return {
                'success': True,
                'convnext': {
                    'index_name': self.index_conv,
                    'total_vectors': stats_conv.get('total_vector_count', 0),
                    'dimension': stats_conv.get('dimension', 0),
                    'fullness': stats_conv.get('index_fullness', 0)
                },
                'vit': {
                    'index_name': self.index_vit,
                    'total_vectors': stats_vit.get('total_vector_count', 0),
                    'dimension': stats_vit.get('dimension', 0),
                    'fullness': stats_vit.get('index_fullness', 0)
                }
            }
        except Exception as e:
            self.logger.error(f"Dual stats retrieval failed: {e}")
            return {'success': False, 'error': str(e)}

    def indices_exist(self) -> Tuple[bool, bool]:
        """두 인덱스 존재 여부 확인"""
        try:
            existing = self.pc.list_indexes().names()
            conv_exists = self.index_conv in existing
            vit_exists = self.index_vit in existing
            return conv_exists, vit_exists
        except Exception as e:
            self.logger.error(f"Index existence check failed: {e}")
            return False, False