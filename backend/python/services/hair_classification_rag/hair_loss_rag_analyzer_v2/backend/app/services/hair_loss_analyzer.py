import os
import numpy as np
import re
from typing import Dict, List, Any, Optional, Tuple
import logging
from datetime import datetime
from .image_processor import ImageProcessor
from .dual_pinecone_manager import DualPineconeManager
from .llm_analyzer import LLMHairAnalyzer
from ..config import settings
from ..per_class_config import get_ensemble_config
from PIL import Image

class HairLossAnalyzer:
    def __init__(self):
        """여성형 탈모 RAG 분석기 초기화 (ROI BiSeNet + ConvNeXt + ViT 듀얼 앙상블)"""
        try:
            self.image_processor = ImageProcessor()
            self.dual_manager = DualPineconeManager()
            self.llm_analyzer = LLMHairAnalyzer()
            self.ensemble_config = get_ensemble_config()
            self.logger = logging.getLogger(__name__)

            # Sinclair Scale 파라미터 (Stage 1-5)
            self.NUM_CLASSES = 5
            self.CLASS_OFFSET = 1
            self.TOP_K = self.ensemble_config["top_k"]

            self.logger.info("HairLossAnalyzer 초기화 완료 (여성형 탈모, ROI BiSeNet + 듀얼 앙상블)")
        except Exception as e:
            self.logger.error(f"HairLossAnalyzer 초기화 실패: {e}")
            raise


    async def analyze_image_from_base64(self, base64_data: str, filename: str, top_k: int = 10, use_llm: bool = True, viewpoint: str = None) -> Dict:
        """Base64 이미지 데이터 분석"""
        try:
            self.logger.info(f"이미지 분석 시작: {filename}")

            # Base64 데이터를 PIL Image로 변환
            image = self.image_processor.decode_base64_image(base64_data)
            if image is None:
                return {
                    'success': False,
                    'error': 'Base64 이미지 디코딩 실패',
                    'timestamp': datetime.now()
                }

            return await self.analyze_image(image, filename, top_k, use_llm, viewpoint)

        except Exception as e:
            self.logger.error(f"Base64 이미지 분석 실패: {e}")
            return {
                'success': False,
                'error': str(e),
                'timestamp': datetime.now()
            }

    async def analyze_image(self, image: Image.Image, filename: str, top_k: int = 10, use_llm: bool = True, viewpoint: str = None, use_roi: bool = True) -> Dict:
        """PIL Image 객체 분석 (ConvNeXt + ViT-S/16 앙상블, ROI 기반)"""
        try:
            # ROI 듀얼 임베딩 추출 (BiSeNet 세그멘테이션 적용)
            if use_roi:
                conv_embedding, vit_embedding = self.image_processor.extract_roi_dual_embeddings(image)
            else:
                # Full 임베딩 (하위 호환성)
                conv_embedding, vit_embedding = self.image_processor.extract_dual_embeddings(image)

            if conv_embedding is None or vit_embedding is None:
                return {
                    'success': False,
                    'error': '이미지 임베딩 추출 실패',
                    'timestamp': datetime.now()
                }

            # 앙상블 예측 수행 (ROI 임베딩으로 검색)
            ensemble_result = self.dual_manager.predict_ensemble_stage(
                conv_embedding, vit_embedding, top_k, viewpoint, use_roi=use_roi
            )

            if ensemble_result['predicted_stage'] is None:
                return {
                    'success': False,
                    'error': '유사한 이미지를 찾을 수 없습니다',
                    'timestamp': datetime.now()
                }

            # LLM 분석 수행 여부 결정
            if use_llm:
                self.logger.info(f"LLM 분석 시작: {filename}")
                llm_result = await self.llm_analyzer.analyze_with_llm(image, ensemble_result)

                # 앙상블과 LLM 결과 결합
                combined_result = self.llm_analyzer.combine_results(ensemble_result, llm_result)

                if combined_result['success']:
                    result = {
                        'success': True,
                        'predicted_stage': combined_result['predicted_stage'],
                        'confidence': round(combined_result['confidence'], 3),
                        'stage_description': combined_result['stage_description'],
                        'stage_scores': {
                            str(k): round(v, 3) for k, v in combined_result.get('ensemble_results', {}).get('stage_scores', {}).items()
                        },
                        'similar_images': combined_result.get('ensemble_results', {}).get('similar_images', []),
                        'analysis_details': {
                            'filename': filename,
                            'method': combined_result['method'],
                            'llm_analysis': combined_result.get('analysis_details', {}),
                            'llm_reasoning': combined_result.get('analysis_details', {}).get('llm_reasoning', ''),
                            'token_usage': combined_result.get('analysis_details', {}).get('token_usage', {}),
                            'embedding_dimension': f"ConvNeXt: {len(conv_embedding)}, ViT: {len(vit_embedding)}",
                            'search_parameters': {'top_k': top_k, 'llm_enabled': True, 'ensemble': True}
                        },
                        'ensemble_comparison': combined_result.get('ensemble_results', {}),
                        'timestamp': datetime.now()
                    }
                    self.logger.info(f"LLM+앙상블 분석 완료: 단계 {result['predicted_stage']} (신뢰도: {result['confidence']:.3f})")
                else:
                    # LLM 실패 시 앙상블 결과만 사용
                    use_llm = False
                    self.logger.warning("LLM 분석 실패, 앙상블 결과만 사용")

            if not use_llm:
                # 앙상블 결과만 사용
                result = {
                    'success': True,
                    'predicted_stage': ensemble_result['predicted_stage'],
                    'confidence': round(ensemble_result['confidence'], 3),
                    'stage_description': settings.STAGE_DESCRIPTIONS.get(
                        ensemble_result['predicted_stage'],
                        "알 수 없는 단계"
                    ),
                    'stage_scores': {
                        str(k): round(v, 3) for k, v in ensemble_result['stage_scores'].items()
                    },
                    'similar_images': ensemble_result['similar_images'],
                    'analysis_details': {
                        'filename': filename,
                        'method': 'ensemble_only',
                        'total_similar_found': len(ensemble_result['similar_images']),
                        'embedding_dimension': f"ConvNeXt: {len(conv_embedding)}, ViT: {len(vit_embedding)}",
                        'search_parameters': {'top_k': top_k, 'llm_enabled': False, 'ensemble': True},
                        'ensemble_details': ensemble_result.get('ensemble_details', {})
                    },
                    'timestamp': datetime.now()
                }

            self.logger.info(f"분석 완료: 단계 {result['predicted_stage']} (신뢰도: {result['confidence']:.3f})")
            return result

        except Exception as e:
            self.logger.error(f"이미지 분석 실패: {e}")
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


