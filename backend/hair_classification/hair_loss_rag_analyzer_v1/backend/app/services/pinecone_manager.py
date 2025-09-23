import os
import numpy as np
from typing import List, Dict
import logging
import time
from ..config import settings

try:
    from pinecone import Pinecone, ServerlessSpec
except ImportError as e:
    raise ImportError("Pinecone v3+ SDK is required. Install with: pip install pinecone==3.*") from e


class PineconeManager:
    def __init__(self):
        if not settings.PINECONE_API_KEY:
            raise ValueError("Pinecone API Key missing. Set PINECONE_API_KEY in .env")

        self.logger = logging.getLogger(__name__)
        self.index_name = settings.INDEX_NAME
        self.dimension = settings.EMBEDDING_DIMENSION

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

    def create_index(self, delete_if_exists: bool = False) -> bool:
        try:
            existing = self.pc.list_indexes()
            exists = self.index_name in existing.names()
            if exists and delete_if_exists:
                self.logger.info(f"Deleting existing index {self.index_name}...")
                self.pc.delete_index(self.index_name)
                time.sleep(5)
                exists = False

            if not exists:
                self.logger.info(f"Creating index {self.index_name} (dim={self.dimension})...")
                self.pc.create_index(
                    name=self.index_name,
                    dimension=self.dimension,
                    metric='cosine',
                    spec=ServerlessSpec(cloud=self.cloud, region=self.region)
                )
                for _ in range(60):
                    try:
                        desc = self.pc.describe_index(self.index_name)
                        st = getattr(desc, 'status', None)
                        if (isinstance(st, dict) and st.get('ready')) or getattr(st, 'ready', False):
                            break
                    except Exception:
                        pass
                    time.sleep(1)
            else:
                self.logger.info(f"Index {self.index_name} already exists")
            return True
        except Exception as e:
            self.logger.error(f"Index creation failed: {e}")
            return False

    def get_index(self):
        try:
            return self.pc.Index(self.index_name)
        except Exception as e:
            self.logger.error(f"Get index failed: {e}")
            raise

    def upload_embeddings(self, embeddings_data: Dict, batch_size: int = 100) -> bool:
        try:
            index = self.get_index()
            embeddings = embeddings_data['embeddings']
            metadata = embeddings_data['metadata']
            ids = embeddings_data['ids']

            self.logger.info(f"Uploading {len(embeddings)} embeddings to Pinecone...")
            for i in range(0, len(embeddings), batch_size):
                batch_end = min(i + batch_size, len(embeddings))
                batch = [
                    {
                        'id': ids[j],
                        'values': embeddings[j],
                        'metadata': metadata[j]
                    } for j in range(i, batch_end)
                ]
                index.upsert(vectors=batch)
                self.logger.info(f"Batch {i//batch_size + 1} upserted: {len(batch)} vectors")
            stats = index.describe_index_stats()
            self.logger.info(f"Upsert complete. Total vectors: {stats.get('total_vector_count', 0)}")
            return True
        except Exception as e:
            self.logger.error(f"Embedding upload failed: {e}")
            return False

    def search_similar_images(self, query_embedding: np.ndarray, top_k: int = 5, viewpoint: str = None) -> List[Dict]:
        try:
            index = self.get_index()

            # 필터 구성
            search_filter = {
                "gender": {"$eq": settings.DEFAULT_GENDER_FILTER}
            }

            # 뷰포인트가 지정된 경우 해당 뷰포인트만 검색
            if viewpoint:
                # 뷰포인트 매핑 (파일명에서 사용되는 형태들)
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
                    # 직접 매칭 시도
                    search_filter["pointview"] = {"$eq": viewpoint}

            res = index.query(
                vector=query_embedding.tolist(),
                top_k=top_k,
                include_metadata=True,
                filter=search_filter
            )
            similar_images: List[Dict] = []
            matches = res.get('matches', []) if isinstance(res, dict) else getattr(res, 'matches', [])
            for m in matches:
                md = m['metadata'] if isinstance(m, dict) else getattr(m, 'metadata', {})
                similar_images.append({
                    'id': m['id'] if isinstance(m, dict) else getattr(m, 'id', None),
                    'score': m['score'] if isinstance(m, dict) else float(getattr(m, 'score', 0.0)),
                    'stage': md.get('stage'),
                    'filename': md.get('filename'),
                    'path': md.get('path')
                })
            return similar_images
        except Exception as e:
            self.logger.error(f"Similar image search failed: {e}")
            return []

    def predict_hair_loss_stage(self, query_embedding: np.ndarray, top_k: int = 10, viewpoint: str = None) -> Dict:
        try:
            similar_images = self.search_similar_images(query_embedding, top_k, viewpoint)
            if not similar_images:
                return {
                    'predicted_stage': None,
                    'confidence': 0,
                    'stage_scores': {},
                    'similar_images': []
                }
            stage_scores: Dict[int, float] = {}
            total = 0.0
            for img in similar_images:
                st = img['stage']
                w = img['score']
                if st not in stage_scores:
                    stage_scores[st] = 0.0
                stage_scores[st] += w
                total += w
            if total > 0:
                for k in list(stage_scores.keys()):
                    stage_scores[k] /= total
            predicted_stage = max(stage_scores, key=stage_scores.get)
            confidence = stage_scores[predicted_stage]
            return {
                'predicted_stage': predicted_stage,
                'confidence': confidence,
                'stage_scores': stage_scores,
                'similar_images': similar_images[:5]
            }
        except Exception as e:
            self.logger.error(f"Prediction failed: {e}")
            return {
                'predicted_stage': None,
                'confidence': 0,
                'stage_scores': {},
                'similar_images': []
            }

    def get_index_stats(self) -> Dict:
        try:
            index = self.get_index()
            stats = index.describe_index_stats()
            return {
                'success': True,
                'total_vector_count': stats.get('total_vector_count', 0),
                'dimension': stats.get('dimension', 0),
                'namespaces': stats.get('namespaces', {}),
                'index_fullness': stats.get('index_fullness', 0)
            }
        except Exception as e:
            self.logger.error(f"Stats retrieval failed: {e}")
            return {'success': False, 'error': str(e)}

    def index_exists(self) -> bool:
        try:
            return self.index_name in self.pc.list_indexes().names()
        except Exception as e:
            self.logger.error(f"Index existence check failed: {e}")
            return False


