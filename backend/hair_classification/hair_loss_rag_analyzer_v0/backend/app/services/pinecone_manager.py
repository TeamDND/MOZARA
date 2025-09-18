import os
from pinecone import Pinecone, ServerlessSpec
import numpy as np
from typing import List, Dict, Any, Tuple
import logging
import time
from ..config import settings

class PineconeManager:
    def __init__(self):
        """Pinecone 매니저 초기화"""
        if not settings.PINECONE_API_KEY:
            raise ValueError("Pinecone API 키가 필요합니다. .env 파일에서 PINECONE_API_KEY를 설정하세요.")

        # Pinecone 클라이언트 초기화
        try:
            self.pc = Pinecone(api_key=settings.PINECONE_API_KEY)
            self.index_name = settings.INDEX_NAME
            self.dimension = settings.EMBEDDING_DIMENSION
            logging.info("Pinecone 클라이언트 초기화 완료")
        except Exception as e:
            logging.error(f"Pinecone 클라이언트 초기화 실패: {e}")
            raise

        self.logger = logging.getLogger(__name__)

    def create_index(self, delete_if_exists: bool = False) -> bool:
        """Pinecone 인덱스 생성"""
        try:
            # 기존 인덱스 확인
            existing_indexes = self.pc.list_indexes().names()

            if self.index_name in existing_indexes:
                if delete_if_exists:
                    self.logger.info(f"기존 인덱스 {self.index_name} 삭제 중...")
                    self.pc.delete_index(self.index_name)
                    time.sleep(10)  # 삭제 완료 대기
                else:
                    self.logger.info(f"인덱스 {self.index_name}이 이미 존재합니다.")
                    return True

            # 새 인덱스 생성
            self.logger.info(f"인덱스 {self.index_name} 생성 중...")
            self.pc.create_index(
                name=self.index_name,
                dimension=self.dimension,
                metric='cosine',
                spec=ServerlessSpec(
                    cloud='aws',
                    region='us-east-1'
                )
            )

            # 인덱스가 준비될 때까지 대기
            while not self.pc.describe_index(self.index_name).status['ready']:
                time.sleep(1)

            self.logger.info(f"인덱스 {self.index_name} 생성 완료")
            return True

        except Exception as e:
            self.logger.error(f"인덱스 생성 실패: {e}")
            return False

    def get_index(self):
        """인덱스 객체 반환"""
        try:
            return self.pc.Index(self.index_name)
        except Exception as e:
            self.logger.error(f"인덱스 연결 실패: {e}")
            raise

    def upload_embeddings(self, embeddings_data: Dict, batch_size: int = 100) -> bool:
        """임베딩 데이터를 Pinecone에 업로드"""
        try:
            index = self.get_index()

            embeddings = embeddings_data['embeddings']
            metadata = embeddings_data['metadata']
            ids = embeddings_data['ids']

            self.logger.info(f"총 {len(embeddings)}개 임베딩 업로드 시작...")

            # 배치 단위로 업로드
            for i in range(0, len(embeddings), batch_size):
                batch_end = min(i + batch_size, len(embeddings))

                # 배치 데이터 준비
                batch_data = []
                for j in range(i, batch_end):
                    batch_data.append({
                        'id': ids[j],
                        'values': embeddings[j],
                        'metadata': metadata[j]
                    })

                # 업로드
                index.upsert(vectors=batch_data)
                self.logger.info(f"배치 {i//batch_size + 1} 업로드 완료: {len(batch_data)}개")

            # 인덱스 통계 확인
            stats = index.describe_index_stats()
            self.logger.info(f"업로드 완료. 총 벡터 수: {stats['total_vector_count']}")
            return True

        except Exception as e:
            self.logger.error(f"임베딩 업로드 실패: {e}")
            return False

    def search_similar_images(self, query_embedding: np.ndarray, top_k: int = 5) -> List[Dict]:
        """유사한 이미지 검색"""
        try:
            index = self.get_index()

            # 검색 실행
            results = index.query(
                vector=query_embedding.tolist(),
                top_k=top_k,
                include_metadata=True
            )

            # 결과 포맷팅
            similar_images = []
            for match in results['matches']:
                similar_images.append({
                    'id': match['id'],
                    'score': match['score'],
                    'stage': match['metadata']['stage'],
                    'filename': match['metadata']['filename'],
                    'path': match['metadata']['path']
                })

            return similar_images

        except Exception as e:
            self.logger.error(f"유사 이미지 검색 실패: {e}")
            return []

    def predict_hair_loss_stage(self, query_embedding: np.ndarray, top_k: int = 10) -> Dict:
        """탈모 단계 예측"""
        try:
            similar_images = self.search_similar_images(query_embedding, top_k)

            if not similar_images:
                return {
                    'predicted_stage': None,
                    'confidence': 0,
                    'stage_scores': {},
                    'similar_images': []
                }

            # 단계별 점수 계산 (유사도 기반 가중평균)
            stage_scores = {}
            total_weight = 0

            for img in similar_images:
                stage = img['stage']
                weight = img['score']  # 유사도 점수

                if stage not in stage_scores:
                    stage_scores[stage] = 0

                stage_scores[stage] += weight
                total_weight += weight

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
                'stage_scores': stage_scores,
                'similar_images': similar_images[:5]  # 상위 5개만 반환
            }

        except Exception as e:
            self.logger.error(f"탈모 단계 예측 실패: {e}")
            return {
                'predicted_stage': None,
                'confidence': 0,
                'stage_scores': {},
                'similar_images': []
            }

    def get_index_stats(self) -> Dict:
        """인덱스 통계 정보 반환"""
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
            self.logger.error(f"인덱스 통계 조회 실패: {e}")
            return {'success': False, 'error': str(e)}

    def index_exists(self) -> bool:
        """인덱스 존재 여부 확인"""
        try:
            existing_indexes = self.pc.list_indexes().names()
            return self.index_name in existing_indexes
        except Exception as e:
            self.logger.error(f"인덱스 존재 확인 실패: {e}")
            return False