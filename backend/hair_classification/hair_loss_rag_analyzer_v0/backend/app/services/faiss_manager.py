import os
import faiss
import numpy as np
import pickle
from typing import List, Dict, Any, Tuple
import logging
from ..config import settings

class FAISSManager:
    def __init__(self):
        """FAISS 매니저 초기화"""
        self.dimension = settings.EMBEDDING_DIMENSION
        self.index_file = os.path.join(settings.UPLOAD_DIR, "hair_loss_faiss.index")
        self.metadata_file = os.path.join(settings.UPLOAD_DIR, "hair_loss_metadata.pkl")
        self.index = None
        self.metadata = []
        self.logger = logging.getLogger(__name__)

        # 업로드 디렉토리 생성
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

        # 기존 인덱스 로드
        self.load_index()

    def create_index(self, delete_if_exists: bool = False) -> bool:
        """FAISS 인덱스 생성"""
        try:
            if delete_if_exists or not os.path.exists(self.index_file):
                self.logger.info(f"새 FAISS 인덱스 생성 중... (차원: {self.dimension})")
                # L2 거리 기반 인덱스 생성
                self.index = faiss.IndexFlatL2(self.dimension)
                self.metadata = []
                self.save_index()
                self.logger.info("FAISS 인덱스 생성 완료")
                return True
            else:
                self.logger.info("기존 FAISS 인덱스 사용")
                return True
        except Exception as e:
            self.logger.error(f"FAISS 인덱스 생성 실패: {e}")
            return False

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
                self.logger.info("기존 인덱스가 없습니다. 새로 생성해야 합니다.")
                return False
        except Exception as e:
            self.logger.error(f"인덱스 로드 실패: {e}")
            return False

    def save_index(self) -> bool:
        """인덱스 저장"""
        try:
            if self.index is not None:
                faiss.write_index(self.index, self.index_file)
                with open(self.metadata_file, 'wb') as f:
                    pickle.dump(self.metadata, f)
                self.logger.info("인덱스 저장 완료")
                return True
            return False
        except Exception as e:
            self.logger.error(f"인덱스 저장 실패: {e}")
            return False

    def upload_embeddings(self, embeddings_data: Dict, batch_size: int = 100) -> bool:
        """임베딩 데이터를 FAISS에 업로드"""
        try:
            if self.index is None:
                self.create_index()

            embeddings = np.array(embeddings_data['embeddings'], dtype=np.float32)
            metadata = embeddings_data['metadata']
            ids = embeddings_data['ids']

            self.logger.info(f"총 {len(embeddings)}개 임베딩 업로드 시작...")

            # 기존 데이터 초기화 (재생성 시)
            if embeddings_data.get('recreate', False):
                self.index = faiss.IndexFlatL2(self.dimension)
                self.metadata = []

            # 벡터 추가
            self.index.add(embeddings)

            # 메타데이터 추가
            for i, (meta, id_) in enumerate(zip(metadata, ids)):
                meta_with_id = meta.copy()
                meta_with_id['id'] = id_
                meta_with_id['index_position'] = len(self.metadata) + i
                self.metadata.append(meta_with_id)

            # 저장
            self.save_index()

            self.logger.info(f"업로드 완료. 총 벡터 수: {self.index.ntotal}")
            return True

        except Exception as e:
            self.logger.error(f"임베딩 업로드 실패: {e}")
            return False

    def search_similar_images(self, query_embedding: np.ndarray, top_k: int = 5) -> List[Dict]:
        """유사한 이미지 검색"""
        try:
            if self.index is None or self.index.ntotal == 0:
                self.logger.warning("인덱스가 비어있습니다.")
                return []

            # 쿼리 임베딩을 float32로 변환하고 2D 배열로 만들기
            query_vector = np.array([query_embedding], dtype=np.float32)

            # 검색 실행
            distances, indices = self.index.search(query_vector, min(top_k, self.index.ntotal))

            # 결과 포맷팅
            similar_images = []
            for i, (distance, idx) in enumerate(zip(distances[0], indices[0])):
                if idx < len(self.metadata):
                    meta = self.metadata[idx]
                    # 거리를 유사도 점수로 변환 (거리가 작을수록 유사도가 높음)
                    similarity_score = 1.0 / (1.0 + distance)

                    similar_images.append({
                        'id': meta['id'],
                        'score': similarity_score,
                        'distance': float(distance),
                        'stage': meta['stage'],
                        'filename': meta['filename'],
                        'path': meta['path']
                    })

            # Filter out stage 1 and keep only stages 2..7 for consistency
            try:
                filtered = []
                for img in similar_images:
                    try:
                        st = int(img.get('stage', 0))
                    except Exception:
                        st = img.get('stage')
                    if isinstance(st, int) and (2 <= st <= 7):
                        img['stage'] = st
                        filtered.append(img)
                similar_images = filtered
            except Exception:
                pass

            return similar_images

        except Exception as e:
            self.logger.error(f"유사 이미지 검색 실패: {e}")
            return []

    def predict_hair_loss_stage(self, query_embedding: np.ndarray, top_k: int = 10) -> Dict:
        """탈모 단계 예측"""
        try:
            similar_images = self.search_similar_images(query_embedding, top_k)

            if not similar_images:
                # 모든 근접 이웃이 필터링(예: 레벨 1만)되어 비었을 때
                # 보수적으로 2단계로 설정하고 신뢰도는 0으로 둠
                return {
                    'predicted_stage': 2,
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
            # 단계 범위 제한: 2~7만 허용하여 예측
            allowed_scores = {int(s): v for s, v in stage_scores.items() if 2 <= int(s) <= 7}

            if allowed_scores:
                predicted_stage = max(allowed_scores, key=allowed_scores.get)
                confidence = allowed_scores[predicted_stage]
                stage_scores = allowed_scores
            else:
                # 허용 범위가 전혀 없으면 보수적으로 클램프
                if stage_scores:
                    raw_pred = max(stage_scores, key=stage_scores.get)
                    try:
                        raw_pred_int = int(raw_pred)
                    except Exception:
                        raw_pred_int = 2
                    predicted_stage = min(7, max(2, raw_pred_int))
                    confidence = stage_scores.get(raw_pred, 0)
                    # stage_scores는 허용 구간이 없으므로 노이즈 제거
                    stage_scores = {}
                else:
                    predicted_stage = 2
                    confidence = 0

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
            if self.index is None:
                return {
                    'success': False,
                    'error': '인덱스가 로드되지 않았습니다.'
                }

            return {
                'success': True,
                'total_vector_count': self.index.ntotal,
                'dimension': self.dimension,
                'index_type': 'FAISS IndexFlatL2',
                'metadata_count': len(self.metadata)
            }
        except Exception as e:
            self.logger.error(f"인덱스 통계 조회 실패: {e}")
            return {'success': False, 'error': str(e)}

    def index_exists(self) -> bool:
        """인덱스 존재 여부 확인"""
        try:
            return os.path.exists(self.index_file) and os.path.exists(self.metadata_file)
        except Exception as e:
            self.logger.error(f"인덱스 존재 확인 실패: {e}")
            return False
