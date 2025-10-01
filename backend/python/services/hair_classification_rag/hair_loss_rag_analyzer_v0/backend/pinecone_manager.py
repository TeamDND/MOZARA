#!/usr/bin/env python3
"""파인콘 매니저 - 인덱스 생성 및 데이터 업로드"""

import os
import sys
import asyncio
import time
from typing import List, Dict, Any, Tuple
import numpy as np
from PIL import Image
import logging

# 환경변수 로드
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# 파인콘 관련 import (최신 API)
try:
    from pinecone import Pinecone, ServerlessSpec
    print("Using modern Pinecone API")
except ImportError:
    print("Pinecone library not installed.")
    print("pip install pinecone==3.0.3")
    sys.exit(1)

# 기존 모듈들
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from pinecone_preprocessor import PineconePreprocessor
from app.services.image_processor import ImageProcessor

class PineconeManager:
    """파인콘 벡터 데이터베이스 매니저"""

    def __init__(self, api_key: str = None):
        """
        Args:
            api_key: 파인콘 API 키 (None이면 환경변수에서 읽음)
        """
        self.api_key = api_key or os.getenv('PINECONE_API_KEY')
        if not self.api_key:
            raise ValueError("PINECONE_API_KEY가 설정되지 않았습니다.")

        # 파인콘 초기화 (최신 API)
        self.pc = Pinecone(api_key=self.api_key)

        self.index = None
        self.index_name = "hair-loss-rag-analyzer"
        self.dimension = 1536  # ConvNext + CLIP 임베딩 차원

        self.logger = logging.getLogger(__name__)

        # 전처리기 및 이미지 프로세서 초기화
        self.preprocessor = PineconePreprocessor()
        self.image_processor = ImageProcessor()

    def create_index(self) -> bool:
        """파인콘 인덱스 생성"""
        try:
            print(f"Creating Pinecone index '{self.index_name}'...")

            # 기존 인덱스 확인 및 삭제
            existing_indexes = self.pc.list_indexes()
            if self.index_name in existing_indexes.names():
                print(f"Deleting existing index '{self.index_name}'...")
                self.pc.delete_index(self.index_name)
                time.sleep(10)

            # 새 인덱스 생성
            self.pc.create_index(
                name=self.index_name,
                dimension=self.dimension,
                metric='cosine',
                spec=ServerlessSpec(
                    cloud='aws',
                    region='us-east-1'
                )
            )

            # 인덱스 생성 완료 대기
            print("Index creation in progress... (1-2 minutes)")
            time.sleep(60)

            # 인덱스 연결
            self.index = self.pc.Index(self.index_name)
            print(f"Index '{self.index_name}' created successfully!")
            return True

        except Exception as e:
            self.logger.error(f"Index creation failed: {e}")
            print(f"Error: {e}")
            return False

    def connect_to_index(self) -> bool:
        """기존 인덱스에 연결"""
        try:
            self.index = self.pc.Index(self.index_name)

            # 인덱스 상태 확인
            stats = self.index.describe_index_stats()
            vector_count = stats.get('total_vector_count', 0)
            print(f"Connected to index: {vector_count} vectors")
            return True

        except Exception as e:
            self.logger.error(f"Index connection failed: {e}")
            print(f"Error: {e}")
            return False

    def process_and_upload_dataset(self, dataset_path: str) -> bool:
        """데이터셋 전처리 및 파인콘 업로드"""
        try:
            print(f"데이터셋 처리 시작: {dataset_path}")

            # 1. 전처리 실행
            metadata_list = self.preprocessor.process_dataset(
                dataset_path=dataset_path,
                output_path=None,  # 파일 저장하지 않고 메모리에서만 처리
                save_metadata=False
            )

            if not metadata_list:
                print("처리할 이미지가 없습니다.")
                return False

            print(f"전처리 완료: {len(metadata_list)}개 이미지")

            # 2. 임베딩 생성 및 업로드
            vectors_to_upsert = []
            batch_size = 10  # 배치 크기

            for i, metadata in enumerate(metadata_list):
                print(f"임베딩 생성 중... ({i+1}/{len(metadata_list)})")

                # 이미지 로드 및 임베딩 생성
                image_path = metadata['original_path']
                image = Image.open(image_path).convert('RGB')
                embedding = self.image_processor.extract_clip_embedding(image)

                if embedding is not None:
                    # 벡터 ID 생성
                    vector_id = self._generate_vector_id(metadata, i)

                    # 파인콘용 메타데이터 구성
                    pinecone_metadata = self._create_pinecone_metadata(metadata)

                    # 벡터 추가
                    vectors_to_upsert.append({
                        'id': vector_id,
                        'values': embedding.tolist(),
                        'metadata': pinecone_metadata
                    })

                    # 배치 업로드
                    if len(vectors_to_upsert) >= batch_size:
                        self._upload_batch(vectors_to_upsert)
                        vectors_to_upsert = []

            # 남은 벡터들 업로드
            if vectors_to_upsert:
                self._upload_batch(vectors_to_upsert)

            print(f"모든 벡터 업로드 완료!")
            return True

        except Exception as e:
            self.logger.error(f"데이터셋 업로드 실패: {e}")
            return False

    def _generate_vector_id(self, metadata: Dict, index: int) -> str:
        """벡터 ID 생성"""
        gender = metadata.get('gender', 'unknown')
        stage = metadata.get('stage', 'unknown')
        pointview = metadata.get('pointview', 'none')
        return f"{gender}_stage{stage}_{pointview}_{index:04d}"

    def _create_pinecone_metadata(self, metadata: Dict) -> Dict:
        """파인콘용 메타데이터 생성"""
        return {
            'gender': str(metadata.get('gender', 'unknown')),
            'stage': int(metadata.get('stage', 0)),
            'pointview': str(metadata.get('pointview', 'none')),
            'filename': str(metadata.get('original_filename', 'unknown')),
            
        }

    def _upload_batch(self, vectors: List[Dict]) -> bool:
        """배치 업로드"""
        try:
            self.index.upsert(vectors=vectors)
            print(f"배치 업로드 완료: {len(vectors)}개 벡터")
            time.sleep(1)  # API 레이트 리미트 방지
            return True
        except Exception as e:
            self.logger.error(f"배치 업로드 실패: {e}")
            return False

    def test_query(self, test_image_path: str, top_k: int = 5) -> Dict:
        """테스트 쿼리 실행"""
        try:
            print(f"테스트 쿼리 실행: {test_image_path}")

            # 1. 테스트 이미지 임베딩 생성
            image = Image.open(test_image_path).convert('RGB')
            query_embedding = self.image_processor.extract_clip_embedding(image)

            if query_embedding is None:
                return {'success': False, 'error': '임베딩 생성 실패'}

            # 2. 파인콘 검색
            query_results = self.index.query(
                vector=query_embedding.tolist(),
                top_k=top_k,
                include_metadata=True
            )

            # 3. 결과 분석
            results = {
                'success': True,
                'test_image': test_image_path,
                'query_embedding_shape': query_embedding.shape,
                'similar_images': []
            }

            for match in query_results['matches']:
                similar_info = {
                    'id': match['id'],
                    'score': float(match['score']),
                    'metadata': match['metadata']
                }
                results['similar_images'].append(similar_info)

            return results

        except Exception as e:
            self.logger.error(f"테스트 쿼리 실패: {e}")
            return {'success': False, 'error': str(e)}

    def get_index_stats(self) -> Dict:
        """인덱스 통계 정보"""
        try:
            stats = self.index.describe_index_stats()
            return {
                'success': True,
                'total_vectors': stats['total_vector_count'],
                'dimension': stats['dimension'],
                'index_fullness': stats.get('index_fullness', 0),
                'namespaces': stats.get('namespaces', {})
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}


async def main():
    """메인 테스트 함수"""
    print("=== 파인콘 테스트 시작 ===")

    # API 키 확인
    api_key = os.getenv('PINECONE_API_KEY')
    if not api_key:
        print("PINECONE_API_KEY 환경변수를 설정해주세요.")
        return

    try:
        # 1. 파인콘 매니저 초기화
        manager = PineconeManager(api_key=api_key)

        # 2. 인덱스 생성
        if not manager.create_index():
            print("인덱스 생성 실패")
            return

        # 3. 데이터셋 업로드
        dataset_path = "C:/Users/301/Desktop/test1"
        if not manager.process_and_upload_dataset(dataset_path):
            print("데이터셋 업로드 실패")
            return

        # 4. 인덱스 상태 확인
        time.sleep(5)  # 인덱싱 완료 대기
        stats = manager.get_index_stats()
        if stats['success']:
            print(f"\n인덱스 통계:")
            print(f"  총 벡터 수: {stats['total_vectors']}")
            print(f"  차원: {stats['dimension']}")
        else:
            print(f"통계 확인 실패: {stats['error']}")

        # 5. 테스트 쿼리
        test_image = "C:/Users/301/Desktop/test1/male/stage_1/20231102125902gnLbcj_jpg.rf.653ed95656087444ae21c7e6d45bd469-top.jpg"
        if os.path.exists(test_image):
            print(f"\n테스트 쿼리 실행...")
            result = manager.test_query(test_image, top_k=3)

            if result['success']:
                print(f"테스트 이미지: {os.path.basename(result['test_image'])}")
                print(f"임베딩 형태: {result['query_embedding_shape']}")
                print(f"\n상위 {len(result['similar_images'])}개 유사 이미지:")

                for i, similar in enumerate(result['similar_images'], 1):
                    metadata = similar['metadata']
                    print(f"  {i}. {similar['id']}")
                    print(f"     점수: {similar['score']:.4f}")
                    print(f"     성별: {metadata['gender']}")
                    print(f"     단계: {metadata['stage']}")
                    print(f"     위치: {metadata['pointview']}")
                    print(f"     파일: {metadata['filename']}")
                    print()
            else:
                print(f"테스트 쿼리 실패: {result['error']}")

        print("=== 파인콘 테스트 완료 ===")

    except Exception as e:
        print(f"오류 발생: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
