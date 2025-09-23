import os
import numpy as np
from typing import Dict, List, Any, Optional
import logging
from datetime import datetime
from .image_processor import ImageProcessor
from .pinecone_manager import PineconeManager
from .llm_analyzer import LLMHairAnalyzer
from ..config import settings
from PIL import Image

class HairLossAnalyzer:
    def __init__(self):
        """탈모 RAG 분석기 초기화"""
        try:
            self.image_processor = ImageProcessor()
            self.vector_manager = PineconeManager()
            self.llm_analyzer = LLMHairAnalyzer()
            self.logger = logging.getLogger(__name__)
            self.logger.info("HairLossAnalyzer 초기화 완료 (LLM 통합)")
        except Exception as e:
            self.logger.error(f"HairLossAnalyzer 초기화 실패: {e}")
            raise

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

    async def analyze_image(self, image: Image.Image, filename: str, top_k: int = 10, use_llm: bool = True, viewpoint: str = None) -> Dict:
        """PIL Image 객체 분석"""
        try:
            # 이미지 임베딩 추출
            query_embedding = self.image_processor.extract_clip_embedding(image)

            if query_embedding is None:
                return {
                    'success': False,
                    'error': '이미지 임베딩 추출 실패',
                    'timestamp': datetime.now()
                }

            # FAISS 기반 탈모 단계 예측 (뷰포인트 필터 적용)
            faiss_result = self.vector_manager.predict_hair_loss_stage(
                query_embedding, top_k, viewpoint
            )

            if faiss_result['predicted_stage'] is None:
                return {
                    'success': False,
                    'error': '유사한 이미지를 찾을 수 없습니다',
                    'timestamp': datetime.now()
                }

            # LLM 분석 수행 여부 결정
            if use_llm:
                self.logger.info(f"LLM 분석 시작: {filename}")
                llm_result = await self.llm_analyzer.analyze_with_llm(image, faiss_result)

                # FAISS와 LLM 결과 결합
                combined_result = self.llm_analyzer.combine_results(faiss_result, llm_result)

                if combined_result['success']:
                    result = {
                        'success': True,
                        'predicted_stage': combined_result['predicted_stage'],
                        'confidence': round(combined_result['confidence'], 3),
                        'stage_description': combined_result['stage_description'],
                        'stage_scores': {
                            str(k): round(v, 3) for k, v in combined_result.get('faiss_results', {}).get('stage_scores', {}).items()
                        },
                        'similar_images': combined_result.get('faiss_results', {}).get('similar_images', []),
                        'analysis_details': {
                            'filename': filename,
                            'method': combined_result['method'],
                            'llm_analysis': combined_result.get('analysis_details', {}),
                            'llm_reasoning': combined_result.get('analysis_details', {}).get('llm_reasoning', ''),
                            'token_usage': combined_result.get('analysis_details', {}).get('token_usage', {}),
                            'embedding_dimension': len(query_embedding),
                            'search_parameters': {'top_k': top_k, 'llm_enabled': True}
                        },
                        'faiss_comparison': combined_result.get('faiss_results', {}),
                        'timestamp': datetime.now()
                    }
                    self.logger.info(f"LLM 분석 완료: 단계 {result['predicted_stage']} (신뢰도: {result['confidence']:.3f})")
                else:
                    # LLM 실패 시 FAISS 결과만 사용
                    use_llm = False
                    self.logger.warning("LLM 분석 실패, FAISS 결과만 사용")

            if not use_llm:
                # FAISS 결과만 사용
                result = {
                    'success': True,
                    'predicted_stage': faiss_result['predicted_stage'],
                    'confidence': round(faiss_result['confidence'], 3),
                    'stage_description': settings.STAGE_DESCRIPTIONS.get(
                        faiss_result['predicted_stage'],
                        "알 수 없는 단계"
                    ),
                    'stage_scores': {
                        str(k): round(v, 3) for k, v in faiss_result['stage_scores'].items()
                    },
                    'similar_images': faiss_result['similar_images'],
                    'analysis_details': {
                        'filename': filename,
                        'method': 'faiss_only',
                        'total_similar_found': len(faiss_result['similar_images']),
                        'embedding_dimension': len(query_embedding),
                        'search_parameters': {'top_k': top_k, 'llm_enabled': False}
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
        """데이터베이스 정보 조회"""
        try:
            # 인덱스 존재 확인
            if not self.vector_manager.index_exists():
                return {
                    'success': False,
                    'error': 'FAISS 인덱스가 존재하지 않습니다. 먼저 데이터베이스를 설정하세요.',
                    'timestamp': datetime.now()
                }

            stats = self.vector_manager.get_index_stats()

            if not stats['success']:
                return {
                    'success': False,
                    'error': stats.get('error', '알 수 없는 오류'),
                    'timestamp': datetime.now()
                }

            return {
                'success': True,
                'index_type': stats.get('index_type', 'FAISS'),
                'total_vectors': stats.get('total_vector_count', 0),
                'dimension': stats.get('dimension', 0),
                'metadata_count': stats.get('metadata_count', 0),
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

            # 벡터 저장소 연결 확인
            try:
                health_status['services']['vector_storage'] = self.vector_manager.index_exists()
            except:
                health_status['services']['vector_storage'] = False

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
