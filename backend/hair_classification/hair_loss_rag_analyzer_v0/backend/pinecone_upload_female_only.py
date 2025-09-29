#!/usr/bin/env python3
"""여자 데이터만 파인콘 업로드 (API 레이트 리미트 대응)"""

import os
import sys
import time
from typing import List, Dict, Any
import numpy as np
from PIL import Image
import logging

# 환경변수 로드
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# 파인콘 관련 import
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

class FemalePineconeUploader:
    """여자 데이터만 업로드하는 파인콘 매니저"""

    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv('PINECONE_API_KEY')
        if not self.api_key:
            raise ValueError("PINECONE_API_KEY가 설정되지 않았습니다.")

        # 파인콘 초기화
        self.pc = Pinecone(api_key=self.api_key)
        self.index = self.pc.Index("hair-loss-rag-analyzer")
        self.dimension = 1536

        self.logger = logging.getLogger(__name__)
        self.preprocessor = PineconePreprocessor()
        self.image_processor = ImageProcessor()

    def get_female_images_only(self, dataset_path: str) -> List[str]:
        """여자 이미지 파일만 찾기"""
        female_images = []
        supported_extensions = ('.jpg', '.jpeg', '.png', '.bmp', '.tiff')

        print(f"여자 이미지 파일 검색 중: {dataset_path}")

        for root, dirs, files in os.walk(dataset_path):
            # 경로에 'female'이 포함된 경우만 처리 (하위 디렉토리 포함)
            if 'female' in root.lower():
                for file in files:
                    if file.lower().endswith(supported_extensions):
                        image_path = os.path.join(root, file)
                        female_images.append(image_path)

        print(f"여자 이미지 총 개수: {len(female_images)}")
        return female_images

    def check_existing_vectors(self) -> set:
        """이미 업로드된 벡터 ID들 확인"""
        try:
            # 현재 업로드된 벡터 중 여자 데이터 확인
            existing_ids = set()

            # 샘플링으로 기존 ID 패턴 확인
            result = self.index.query(vector=[0.1]*self.dimension, top_k=100, include_metadata=True)

            for match in result['matches']:
                if match['id'].startswith('female_'):
                    existing_ids.add(match['metadata'].get('filename', ''))

            print(f"이미 업로드된 여자 이미지: {len(existing_ids)}개")
            return existing_ids

        except Exception as e:
            print(f"기존 벡터 확인 실패: {e}")
            return set()

    def upload_female_data_with_retry(self, dataset_path: str) -> bool:
        """재시도 로직이 포함된 여자 데이터 업로드"""
        try:
            # 1. 여자 이미지만 가져오기
            female_images = self.get_female_images_only(dataset_path)

            if not female_images:
                print("여자 이미지를 찾을 수 없습니다.")
                return False

            # 2. 이미 업로드된 파일 확인
            existing_files = self.check_existing_vectors()

            # 3. 업로드할 이미지 필터링
            images_to_upload = []
            for img_path in female_images:
                filename = os.path.basename(img_path)
                if filename not in existing_files:
                    images_to_upload.append(img_path)

            print(f"새로 업로드할 여자 이미지: {len(images_to_upload)}개")

            # 4. 배치 업로드 (개선된 버전)
            batch_size = 5  # 레이트 리미트 대응으로 줄임
            vectors_to_upsert = []
            success_count = 0
            error_count = 0

            for i, image_path in enumerate(images_to_upload):
                try:
                    print(f"처리 중... ({i+1}/{len(images_to_upload)}) - {os.path.basename(image_path)}")

                    # 메타데이터 추출
                    metadata = self.preprocessor.extract_metadata_from_path(image_path)

                    # 여자가 아닌 경우 스킵
                    if metadata.get('gender') != 'female':
                        continue

                    # 이미지 로드 및 임베딩 생성
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

                        # 배치 업로드 (재시도 로직 포함)
                        if len(vectors_to_upsert) >= batch_size:
                            if self._upload_batch_with_retry(vectors_to_upsert):
                                success_count += len(vectors_to_upsert)
                            else:
                                error_count += len(vectors_to_upsert)
                            vectors_to_upsert = []

                except Exception as e:
                    print(f"이미지 처리 실패 {image_path}: {e}")
                    error_count += 1

            # 남은 벡터들 업로드
            if vectors_to_upsert:
                if self._upload_batch_with_retry(vectors_to_upsert):
                    success_count += len(vectors_to_upsert)
                else:
                    error_count += len(vectors_to_upsert)

            print(f"여자 데이터 업로드 완료!")
            print(f"성공: {success_count}개, 실패: {error_count}개")
            return True

        except Exception as e:
            self.logger.error(f"여자 데이터 업로드 실패: {e}")
            return False

    def _upload_batch_with_retry(self, vectors: List[Dict], max_retries: int = 3) -> bool:
        """재시도 로직이 포함된 배치 업로드"""
        for attempt in range(max_retries):
            try:
                self.index.upsert(vectors=vectors)
                print(f"배치 업로드 성공: {len(vectors)}개 벡터")

                # API 레이트 리미트 방지 (점진적 증가)
                wait_time = 2 + (attempt * 1)  # 2초, 3초, 4초
                time.sleep(wait_time)
                return True

            except Exception as e:
                print(f"배치 업로드 실패 (시도 {attempt+1}/{max_retries}): {e}")

                if attempt < max_retries - 1:
                    # Exponential backoff
                    wait_time = (2 ** attempt) * 5  # 5초, 10초, 20초
                    print(f"{wait_time}초 대기 후 재시도...")
                    time.sleep(wait_time)
                else:
                    self.logger.error(f"최종 배치 업로드 실패: {e}")
                    return False

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
            'filename': str(metadata.get('original_filename', 'unknown'))
        }

    def get_index_stats(self) -> Dict:
        """인덱스 통계 정보"""
        try:
            stats = self.index.describe_index_stats()
            return {
                'success': True,
                'total_vectors': stats['total_vector_count'],
                'dimension': stats['dimension']
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}


def main():
    """메인 실행 함수"""
    print("=== 여자 데이터만 파인콘 업로드 ===")

    # API 키 확인
    api_key = os.getenv('PINECONE_API_KEY')
    if not api_key:
        print("PINECONE_API_KEY 환경변수를 설정해주세요.")
        return

    try:
        # 업로더 초기화
        uploader = FemalePineconeUploader(api_key=api_key)

        # 현재 상태 확인
        stats = uploader.get_index_stats()
        if stats['success']:
            print(f"현재 인덱스 상태: {stats['total_vectors']}개 벡터")

        # 여자 데이터 업로드
        dataset_path = "C:/Users/301/Desktop/hair_loss_classification_modified"

        if uploader.upload_female_data_with_retry(dataset_path):
            print("여자 데이터 업로드 성공!")

            # 최종 상태 확인
            final_stats = uploader.get_index_stats()
            if final_stats['success']:
                print(f"최종 벡터 수: {final_stats['total_vectors']}개")
        else:
            print("여자 데이터 업로드 실패")

    except Exception as e:
        print(f"오류 발생: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()