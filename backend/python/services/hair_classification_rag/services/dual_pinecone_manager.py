"""
ConvNeXt + ViT-S/16 듀얼 Pinecone 매니저
두 개의 인덱스를 동시에 관리하고 검색
"""

import os
import numpy as np
from typing import List, Dict, Tuple
import logging
import time
from ..config.settings import settings
from ..config.ensemble_config import get_ensemble_config

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
                   top_k: int = 10, viewpoint: str = None, use_roi: bool = False) -> Tuple[List[Dict], List[Dict]]:
        """ConvNeXt와 ViT 임베딩으로 동시 검색 (Full 또는 ROI)"""
        try:
            idx_conv, idx_vit = self.get_indices()

            # 필터 구성
            search_filter = {
                "gender": {"$eq": settings.DEFAULT_GENDER_FILTER}
            }

            # ROI 임베딩 검색 시 embedding_type 필터 추가
            if use_roi:
                search_filter["embedding_type"] = {"$eq": "roi"}

            # NOTE: viewpoint 필터를 제거하여 test_dual_image_fusion.py와 동일한 방식으로 동작
            # 모든 각도의 이미지를 참조하는 RAG 방식으로 성능 향상

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
                             top_k: int = 10, viewpoint: str = None, use_roi: bool = False) -> Dict:
        """앙상블 예측 수행 (Full 또는 ROI)"""
        try:
            from .ensemble_manager import EnsembleManager

            # 듀얼 검색 수행 (use_roi 파라미터 전달)
            conv_matches, vit_matches = self.dual_search(
                conv_embedding, vit_embedding, top_k, viewpoint, use_roi=use_roi
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
            ensemble = EnsembleManager()
            result = ensemble.predict_from_dual_results(conv_matches, vit_matches)

            return {
                'predicted_stage': result['predicted_stage'],
                'confidence': result['confidence'],
                'stage_scores': result['stage_scores'],
                'similar_images': result['similar_images'],
                'ensemble_details': result.get('ensemble_details', {}),
                'embedding_type': 'roi' if use_roi else 'full'
            }

        except Exception as e:
            self.logger.error(f"Ensemble prediction failed: {e}")
            return {
                'predicted_stage': None,
                'confidence': 0,
                'stage_scores': {},
                'similar_images': [],
                'error': str(e)
            }

    async def dual_search_and_ensemble(self, primary_image, secondary_image,
                                     top_k: int = 10,
                                     primary_viewpoint: str = None,
                                     secondary_viewpoint: str = None) -> Dict:
        """듀얼 이미지 검색 및 Late Fusion을 위한 결과 반환"""
        try:
            from .image_processor import ImageProcessor

            # 이미지 프로세서 초기화
            processor = ImageProcessor()

            # Primary 이미지 임베딩
            primary_conv_emb = processor.get_convnext_embedding(primary_image)
            primary_vit_emb = processor.get_vit_embedding(primary_image)

            # Secondary 이미지 임베딩
            secondary_conv_emb = processor.get_convnext_embedding(secondary_image)
            secondary_vit_emb = processor.get_vit_embedding(secondary_image)

            # Primary 이미지 검색
            primary_conv_matches, primary_vit_matches = self.dual_search(
                primary_conv_emb, primary_vit_emb, top_k, primary_viewpoint
            )

            # Secondary 이미지 검색
            secondary_conv_matches, secondary_vit_matches = self.dual_search(
                secondary_conv_emb, secondary_vit_emb, top_k, secondary_viewpoint
            )

            return {
                'success': True,
                'primary_convnext_matches': primary_conv_matches,
                'primary_vit_matches': primary_vit_matches,
                'secondary_convnext_matches': secondary_conv_matches,
                'secondary_vit_matches': secondary_vit_matches,
                'primary_viewpoint': primary_viewpoint,
                'secondary_viewpoint': secondary_viewpoint
            }

        except Exception as e:
            self.logger.error(f"Dual search and ensemble failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    def indices_exist(self) -> Tuple[bool, bool]:
        """두 인덱스 존재 여부 확인"""
        try:
            existing = self.pc.list_indexes()
            index_names = existing.names()
            conv_exists = self.index_conv in index_names
            vit_exists = self.index_vit in index_names
            return conv_exists, vit_exists
        except Exception as e:
            self.logger.error(f"Check indices existence failed: {e}")
            return False, False

    def get_dual_index_stats(self) -> Dict:
        """두 인덱스 통계 정보 조회"""
        try:
            idx_conv, idx_vit = self.get_indices()

            # ConvNeXt 인덱스 통계
            conv_stats = idx_conv.describe_index_stats()
            conv_info = {
                'name': self.index_conv,
                'dimension': self.dim_conv,
                'total_vectors': conv_stats.get('total_vector_count', 0)
            }

            # ViT 인덱스 통계
            vit_stats = idx_vit.describe_index_stats()
            vit_info = {
                'name': self.index_vit,
                'dimension': self.dim_vit,
                'total_vectors': vit_stats.get('total_vector_count', 0)
            }

            return {
                'success': True,
                'convnext': conv_info,
                'vit': vit_info
            }

        except Exception as e:
            self.logger.error(f"Get dual index stats failed: {e}")
            return {
                'success': False,
                'error': str(e)
            }
