import os
import numpy as np
import re
from typing import Dict, List, Any, Optional, Tuple
import logging
from datetime import datetime
from .image_processor import ImageProcessor
from .pinecone_manager import PineconeManager
from .dual_pinecone_manager import DualPineconeManager
from .llm_analyzer import LLMHairAnalyzer
from ..config import settings
from ..per_class_config import get_ensemble_config
from PIL import Image

class HairLossAnalyzer:
    def __init__(self):
        """탈모 RAG 분석기 초기화 (ConvNeXt + ViT-S/16 듀얼 이미지 Late Fusion 앙상블)"""
        try:
            self.image_processor = ImageProcessor()
            self.vector_manager = PineconeManager()  # 하위 호환성
            self.dual_manager = DualPineconeManager()  # 앙상블용
            self.llm_analyzer = LLMHairAnalyzer()
            self.ensemble_config = get_ensemble_config()
            self.logger = logging.getLogger(__name__)

            # 앙상블 파라미터
            self.NUM_CLASSES = 7
            self.CLASS_OFFSET = 1
            self.TOP_K = self.ensemble_config["top_k"]
            self.T_CONV = self.ensemble_config["Tconv"]
            self.T_VIT = self.ensemble_config["Tvit"]
            self.USE_OVERRIDE = self.ensemble_config["override"]

            self.logger.info("HairLossAnalyzer 초기화 완료 (듀얼 이미지 Late Fusion 앙상블)")
        except Exception as e:
            self.logger.error(f"HairLossAnalyzer 초기화 실패: {e}")
            raise

    def map_to_norwood_stage(self, level: int) -> Tuple[int, str]:
        """7단계 레벨을 4단계 노우드 스케일로 변환"""
        if level == 1:
            return 0, "0단계(정상 단계)"
        elif 2 <= level <= 3:
            return 1, "1단계(초기 단계)"
        elif 4 <= level <= 5:
            return 2, "2단계(중기 단계)"
        elif 6 <= level <= 7:
            return 3, "3단계(심화 단계)"
        else:
            return 0, "0단계(정상 단계)"

    async def setup_database(self, recreate_index: bool = False) -> Dict:
        """데이터베이스 설정 및 임베딩 업로드"""
        try:
            self.logger.info("데이터베이스 설정 시작...")

            # 데이터셋 경로 확인
            if not os.path.exists(settings.DATASET_PATH):
                return {
                    'success': False,
                    'error': f'데이터셋 경로를 찾을 수 없습니다: {settings.DATASET_PATH}',
                    'timestamp': datetime.now()
                }

            # 인덱스 생성
            index_created = self.vector_manager.create_index(delete_if_exists=recreate_index)
            if not index_created:
                return {
                    'success': False,
                    'error': 'FAISS 인덱스 생성 실패',
                    'timestamp': datetime.now()
                }

            # 데이터셋 처리
            self.logger.info("이미지 임베딩 생성 중...")
            embeddings_data = self.image_processor.process_dataset(settings.DATASET_PATH)

            if len(embeddings_data['embeddings']) == 0:
                return {
                    'success': False,
                    'error': '처리된 이미지가 없습니다. 데이터셋 경로를 확인하세요.',
                    'timestamp': datetime.now()
                }

            # FAISS에 업로드
            self.logger.info("FAISS에 임베딩 업로드 중...")
            embeddings_data['recreate'] = recreate_index
            upload_success = self.vector_manager.upload_embeddings(embeddings_data)

            if not upload_success:
                return {
                    'success': False,
                    'error': 'FAISS 임베딩 업로드 실패',
                    'timestamp': datetime.now()
                }

            return {
                'success': True,
                'message': '데이터베이스 설정 완료',
                'total_embeddings': len(embeddings_data['embeddings']),
                'timestamp': datetime.now()
            }

        except Exception as e:
            self.logger.error(f"데이터베이스 설정 실패: {e}")
            return {
                'success': False,
                'error': str(e),
                'timestamp': datetime.now()
            }


    def get_database_info(self) -> Dict:
        """데이터베이스 정보 조회 (듀얼 인덱스)"""
        try:
            # 듀얼 인덱스 존재 확인
            conv_exists, vit_exists = self.dual_manager.indices_exist()

            if not conv_exists or not vit_exists:
                return {
                    'success': False,
                    'error': f'인덱스 상태: ConvNeXt={conv_exists}, ViT={vit_exists}. 두 인덱스가 모두 필요합니다.',
                    'timestamp': datetime.now()
                }

            stats = self.dual_manager.get_dual_index_stats()

            if not stats['success']:
                return {
                    'success': False,
                    'error': stats.get('error', '알 수 없는 오류'),
                    'timestamp': datetime.now()
                }

            return {
                'success': True,
                'index_type': 'Dual Pinecone (ConvNeXt + ViT)',
                'convnext_index': stats['convnext'],
                'vit_index': stats['vit'],
                'total_vectors': stats['convnext']['total_vectors'] + stats['vit']['total_vectors'],
                'timestamp': datetime.now()
            }

        except Exception as e:
            self.logger.error(f"데이터베이스 정보 조회 실패: {e}")
            return {
                'success': False,
                'error': str(e),
                'timestamp': datetime.now()
            }

    def detect_viewpoint_from_filename(self, filename: str) -> str:
        """파일명에서 뷰포인트 추정"""
        filename_lower = filename.lower()
        # 하이픈 패턴 우선 확인
        if '-left' in filename_lower or '_left_' in filename_lower:
            return 'left'
        elif '-right' in filename_lower or '_right_' in filename_lower:
            return 'right'
        elif '-top' in filename_lower or 'top-down' in filename_lower or '_t_' in filename_lower:
            return 'top-down'
        elif '-front' in filename_lower or '_front_' in filename_lower:
            return 'front'
        elif '-back' in filename_lower or '_back_' in filename_lower:
            return 'back'
        # 기존 일반 패턴 (하이픈 없는 경우)
        elif 'left' in filename_lower or '_l_' in filename_lower:
            return 'left'
        elif 'right' in filename_lower or '_r_' in filename_lower:
            return 'right'
        elif 'top' in filename_lower or 'down' in filename_lower:
            return 'top-down'
        elif 'front' in filename_lower or '_f_' in filename_lower:
            return 'front'
        elif 'back' in filename_lower or '_b_' in filename_lower:
            return 'back'
        else:
            return 'unknown'

    def knn_to_probs(self, matches: List[Dict], T: float = 0.20) -> np.ndarray:
        """KNN 결과를 확률분포로 변환 (테스터와 동일한 로직)"""
        if not matches:
            return np.zeros(self.NUM_CLASSES, dtype=float)

        sims = np.array([m["score"] for m in matches], float)
        w = np.exp(sims / T)
        w = w / (w.sum() + 1e-12)

        probs = np.zeros(self.NUM_CLASSES, float)
        for wi, m in zip(w, matches):
            md = m.get("metadata", {})
            # stage 키 우선, 없으면 level/label 추정
            if "stage" in md:
                st = int(md["stage"])  # 1..7
            else:
                st = None
                for k in ("level", "class", "label"):
                    v = md.get(k)
                    if isinstance(v, str):
                        mm = re.search(r"(\d+)", v)
                        if mm:
                            st = int(mm.group(1))
                            break
                if st is None:
                    src = m.get("id") or ""
                    mm = re.search(r"(\d+)", str(src))
                    st = int(mm.group(1)) if mm else 0

            if 1 <= st <= 7:  # Level 1-7
                probs[st-self.CLASS_OFFSET] += wi

        s = probs.sum()
        return probs / s if s > 0 else probs

    def apply_ensemble(self, p_conv: np.ndarray, p_vit: np.ndarray) -> Tuple[int, np.ndarray]:
        """앙상블 적용 (테스터와 동일한 로직)"""
        # Level 1-7에 해당하는 가중치 사용
        w_conv = np.array(self.ensemble_config["weights"]["conv"], float)
        w_vit = np.array(self.ensemble_config["weights"]["vit"], float)
        P_ens = w_conv * p_conv + w_vit * p_vit

        if self.USE_OVERRIDE:
            strong_c = np.array(self.ensemble_config["strong"]["conv"], int)
            strong_v = np.array(self.ensemble_config["strong"]["vit"], int)
            tau_c = np.array(self.ensemble_config["tau"]["conv"], float)
            tau_v = np.array(self.ensemble_config["tau"]["vit"], float)

            for c in range(self.NUM_CLASSES):
                if strong_c[c] and p_conv[c] >= tau_c[c] and tau_c[c] > 0:
                    P_ens[c] = p_conv[c]
                if strong_v[c] and p_vit[c] >= tau_v[c] and tau_v[c] > 0:
                    P_ens[c] = p_vit[c]

        s = P_ens.sum()
        if s > 0:
            P_ens = P_ens / s
        pred = int(np.argmax(P_ens)) + self.CLASS_OFFSET  # level 1-7 indexing
        return pred, P_ens

    def late_fusion_predict(self, p_conv1: np.ndarray, p_vit1: np.ndarray,
                           p_conv2: np.ndarray, p_vit2: np.ndarray,
                           fusion_weight: float = 0.5) -> Tuple[int, np.ndarray]:
        """Late Fusion으로 두 이미지 결합 (테스터와 동일한 로직)"""
        # 각 이미지별로 앙상블 확률 계산
        _, p_ens1 = self.apply_ensemble(p_conv1, p_vit1)
        _, p_ens2 = self.apply_ensemble(p_conv2, p_vit2)

        # Late Fusion: 가중 평균
        P_fused = fusion_weight * p_ens1 + (1 - fusion_weight) * p_ens2

        # 정규화
        s = P_fused.sum()
        if s > 0:
            P_fused = P_fused / s

        pred = int(np.argmax(P_fused)) + self.CLASS_OFFSET
        return pred, P_fused

    async def analyze_dual_images(self, primary_image: Image.Image, secondary_image: Image.Image,
                                 primary_filename: str = "primary.jpg",
                                 secondary_filename: str = "secondary.jpg",
                                 use_llm: bool = True) -> Dict:
        """듀얼 이미지 Late Fusion 분석"""
        try:
            self.logger.info(f"듀얼 이미지 분석 시작: {primary_filename}, {secondary_filename}")

            # 뷰포인트 감지
            primary_viewpoint = self.detect_viewpoint_from_filename(primary_filename)
            secondary_viewpoint = self.detect_viewpoint_from_filename(secondary_filename)

            # 듀얼 임베딩 생성
            dual_result = await self.dual_manager.dual_search_and_ensemble(
                primary_image, secondary_image,
                top_k=self.TOP_K,
                primary_viewpoint=primary_viewpoint,
                secondary_viewpoint=secondary_viewpoint
            )

            if not dual_result['success']:
                return {
                    'success': False,
                    'error': dual_result['error'],
                    'timestamp': datetime.now()
                }

            # Primary 이미지 분석
            primary_conv_probs = self.knn_to_probs(dual_result['primary_convnext_matches'], T=self.T_CONV)
            primary_vit_probs = self.knn_to_probs(dual_result['primary_vit_matches'], T=self.T_VIT)

            # Secondary 이미지 분석
            secondary_conv_probs = self.knn_to_probs(dual_result['secondary_convnext_matches'], T=self.T_CONV)
            secondary_vit_probs = self.knn_to_probs(dual_result['secondary_vit_matches'], T=self.T_VIT)

            # Late Fusion
            predicted_stage, final_probs = self.late_fusion_predict(
                primary_conv_probs, primary_vit_probs,
                secondary_conv_probs, secondary_vit_probs,
                fusion_weight=0.5
            )

            confidence = float(np.max(final_probs))

            # 노우드 단계 변환
            norwood_stage, norwood_description = self.map_to_norwood_stage(predicted_stage)

            result = {
                'success': True,
                'predicted_stage': predicted_stage,
                'norwood_stage': norwood_stage,
                'norwood_description': norwood_description,
                'confidence': confidence,
                'stage_description': settings.STAGE_DESCRIPTIONS.get(predicted_stage, ''),
                'stage_probabilities': {
                    f'stage_{i+self.CLASS_OFFSET}': float(final_probs[i])
                    for i in range(self.NUM_CLASSES)
                },
                'timestamp': datetime.now()
            }

            # LLM 분석 추가 (선택적)
            if use_llm:
                try:
                    llm_result = await self.llm_analyzer.analyze_dual_result(
                        primary_image, secondary_image, result
                    )
                    if llm_result['success']:
                        result['llm_analysis'] = llm_result['analysis']
                        result['detailed_explanation'] = llm_result['detailed_explanation']
                except Exception as e:
                    self.logger.warning(f"LLM 분석 실패 (계속 진행): {e}")
                    result['llm_analysis'] = "LLM 분석을 사용할 수 없습니다."

            # 참고 이미지 추가 (predicted_stage에 해당하는 front, side 이미지)
            try:
                gender_filter = settings.DEFAULT_GENDER_FILTER if hasattr(settings, 'DEFAULT_GENDER_FILTER') else None
                reference_images = self.vector_manager.get_reference_images_by_stage(
                    predicted_stage,
                    gender=gender_filter,
                    top_k=3,
                    timeout=3.0
                )
                result['reference_image_front'] = reference_images.get('front')
                result['reference_image_side'] = reference_images.get('side')
            except Exception as e:
                self.logger.warning(f"Failed to get reference images: {e}")
                result['reference_image_front'] = None
                result['reference_image_side'] = None

            self.logger.info(f"듀얼 이미지 분석 완료: 단계 {predicted_stage} (신뢰도: {confidence:.3f})")
            return result

        except Exception as e:
            self.logger.error(f"듀얼 이미지 분석 실패: {e}")
            return {
                'success': False,
                'error': str(e),
                'timestamp': datetime.now()
            }

    def get_health_status(self) -> Dict:
        """시스템 상태 확인"""
        try:
            health_status = {
                'status': 'healthy',
                'services': {
                    'image_processor': True,
                    'vector_storage': False,
                    'dataset': False
                },
                'timestamp': datetime.now()
            }

            # 벡터 저장소 연결 확인 (듀얼 인덱스)
            try:
                conv_exists, vit_exists = self.dual_manager.indices_exist()
                health_status['services']['vector_storage'] = conv_exists and vit_exists
                health_status['services']['convnext_index'] = conv_exists
                health_status['services']['vit_index'] = vit_exists
            except:
                health_status['services']['vector_storage'] = False
                health_status['services']['convnext_index'] = False
                health_status['services']['vit_index'] = False

            # 데이터셋 경로 확인
            health_status['services']['dataset'] = os.path.exists(settings.DATASET_PATH)

            # 전체 상태 결정
            if not all(health_status['services'].values()):
                health_status['status'] = 'degraded'

            return health_status

        except Exception as e:
            self.logger.error(f"헬스 체크 실패: {e}")
            return {
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.now()
            }

    async def add_data_from_folder(self, folder_path: str, recreate_index: bool = False) -> Dict:
        """지정된 폴더 경로에서 데이터를 처리하고 Pinecone에 추가합니다."""
        try:
            self.logger.info(f"Starting data addition from folder: {folder_path}")

            if not os.path.isdir(folder_path):
                return {
                    'success': False,
                    'error': f'The provided path is not a valid directory: {folder_path}',
                    'timestamp': datetime.now()
                }

            # 필요시 인덱스 생성 또는 재생성
            index_created = self.vector_manager.create_index(delete_if_exists=recreate_index)
            if not index_created:
                return {
                    'success': False,
                    'error': 'Failed to create or verify FAISS index',
                    'timestamp': datetime.now()
                }

            # 동적으로 폴더 처리
            self.logger.info("Generating embeddings from the folder...")
            embeddings_data = self.image_processor.process_folder_dynamically(folder_path)

            if not embeddings_data or not embeddings_data['embeddings']:
                return {
                    'success': False,
                    'error': 'No images were processed. Check the folder structure and content.',
                    'timestamp': datetime.now()
                }

            # FAISS에 업로드
            self.logger.info("Uploading embeddings to FAISS...")
            embeddings_data['recreate'] = recreate_index
            upload_success = self.vector_manager.upload_embeddings(embeddings_data)

            if not upload_success:
                return {
                    'success': False,
                    'error': 'Failed to upload embeddings to FAISS',
                    'timestamp': datetime.now()
                }

            return {
                'success': True,
                'message': f"Successfully added data from {folder_path}",
                'total_embeddings': len(embeddings_data['embeddings']),
                'timestamp': datetime.now()
            }

        except Exception as e:
            self.logger.error(f"Failed to add data from folder: {e}")
            return {
                'success': False,
                'error': str(e),
                'timestamp': datetime.now()
            }

