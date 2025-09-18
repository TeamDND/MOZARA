import cv2
import numpy as np
from PIL import Image
import torch
import torchvision.transforms as transforms
from sentence_transformers import SentenceTransformer
import os
import base64
import io
from typing import List, Tuple, Dict, Optional
import logging
from ..config import settings

class ImageProcessor:
    def __init__(self):
        """이미지 처리 및 특징 추출을 위한 클래스"""
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

        # CLIP 모델 로드
        try:
            self.clip_model = SentenceTransformer(settings.CLIP_MODEL_NAME)
            logging.info(f"CLIP 모델 로드 완료: {settings.CLIP_MODEL_NAME}")
        except Exception as e:
            logging.error(f"CLIP 모델 로드 실패: {e}")
            raise

        # 이미지 전처리 변환
        self.transform = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406],
                               std=[0.229, 0.224, 0.225])
        ])

        self.logger = logging.getLogger(__name__)

    def decode_base64_image(self, base64_string: str) -> Optional[Image.Image]:
        """Base64 문자열을 PIL Image로 디코딩"""
        try:
            # data:image/jpeg;base64, 부분 제거
            if "," in base64_string:
                base64_string = base64_string.split(",")[1]

            image_data = base64.b64decode(base64_string)
            image = Image.open(io.BytesIO(image_data)).convert('RGB')
            return image
        except Exception as e:
            self.logger.error(f"Base64 이미지 디코딩 실패: {e}")
            return None

    def preprocess_image(self, image: Image.Image) -> np.ndarray:
        """이미지를 전처리하여 numpy 배열로 반환"""
        try:
            # 이미지 크기 조정 (224x224)
            image = image.resize((224, 224))
            return np.array(image)
        except Exception as e:
            self.logger.error(f"이미지 전처리 실패: {e}")
            return None

    def extract_clip_embedding(self, image: Image.Image) -> Optional[np.ndarray]:
        """CLIP 모델을 사용한 이미지 임베딩 추출"""
        try:
            # CLIP 임베딩 추출
            embedding = self.clip_model.encode(image)
            return embedding
        except Exception as e:
            self.logger.error(f"CLIP 임베딩 추출 실패: {e}")
            return None

    def extract_clip_embedding_from_path(self, image_path: str) -> Optional[np.ndarray]:
        """파일 경로에서 CLIP 임베딩 추출"""
        try:
            image = Image.open(image_path).convert('RGB')
            return self.extract_clip_embedding(image)
        except Exception as e:
            self.logger.error(f"파일에서 CLIP 임베딩 추출 실패 {image_path}: {e}")
            return None

    def process_dataset(self, dataset_path: str, stages: List[int] = [2, 3, 4, 5]) -> Dict:
        """데이터셋의 모든 이미지를 처리하여 임베딩 생성"""
        embeddings_data = {
            'embeddings': [],
            'metadata': [],
            'ids': []
        }

        for stage in stages:
            stage_folder = os.path.join(dataset_path, f"LEVEL_{stage}")

            if not os.path.exists(stage_folder):
                self.logger.warning(f"폴더가 존재하지 않음: {stage_folder}")
                continue

            self.logger.info(f"LEVEL_{stage} 처리 중...")

            # 폴더 내 모든 이미지 파일 처리
            processed_count = 0
            for filename in os.listdir(stage_folder):
                if filename.lower().endswith(('.jpg', '.jpeg', '.png')):
                    image_path = os.path.join(stage_folder, filename)

                    # CLIP 임베딩 추출
                    embedding = self.extract_clip_embedding_from_path(image_path)

                    if embedding is not None:
                        # 데이터 저장
                        embeddings_data['embeddings'].append(embedding.tolist())
                        embeddings_data['metadata'].append({
                            'stage': stage,
                            'filename': filename,
                            'path': image_path
                        })
                        embeddings_data['ids'].append(f"level_{stage}_{filename}")
                        processed_count += 1

            self.logger.info(f"LEVEL_{stage} 완료: {processed_count}개 이미지 처리")

        self.logger.info(f"총 {len(embeddings_data['embeddings'])}개 임베딩 생성 완료")
        return embeddings_data

    def save_uploaded_image(self, image: Image.Image, filename: str) -> str:
        """업로드된 이미지를 저장"""
        try:
            # 업로드 디렉토리 생성
            os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

            # 파일 경로 생성
            file_path = os.path.join(settings.UPLOAD_DIR, filename)

            # 이미지 저장
            image.save(file_path)

            return file_path
        except Exception as e:
            self.logger.error(f"이미지 저장 실패: {e}")
            raise

    def process_folder_dynamically(self, folder_path: str) -> Dict:
        """지정된 폴더에서 동적으로 스테이지를 찾아 모든 이미지를 처리하여 임베딩을 생성합니다."""
        import re

        embeddings_data = {
            'embeddings': [],
            'metadata': [],
            'ids': []
        }

        if not os.path.isdir(folder_path):
            self.logger.error(f"Provided path is not a directory: {folder_path}")
            return embeddings_data

        self.logger.info(f"Processing folder dynamically: {folder_path}")

        for item in os.listdir(folder_path):
            subfolder_path = os.path.join(folder_path, item)
            if os.path.isdir(subfolder_path):
                # 폴더 이름에서 숫자(스테이지)를 찾습니다 (e.g., "level_1", "stage 2", "type3").
                match = re.search(r'\d+', item)
                if not match:
                    self.logger.warning(f"Could not extract stage number from folder name: {item}. Skipping.")
                    continue
                
                stage = int(match.group(0))
                self.logger.info(f"Processing stage {stage} from folder {item}...")

                processed_count = 0
                for filename in os.listdir(subfolder_path):
                    if filename.lower().endswith(('.jpg', '.jpeg', '.png')):
                        image_path = os.path.join(subfolder_path, filename)
                        embedding = self.extract_clip_embedding_from_path(image_path)

                        if embedding is not None:
                            embeddings_data['embeddings'].append(embedding.tolist())
                            embeddings_data['metadata'].append({
                                'stage': stage,
                                'filename': filename,
                                'path': image_path
                            })
                            embeddings_data['ids'].append(f"level_{stage}_{filename}")
                            processed_count += 1
                
                self.logger.info(f"Stage {stage} processing complete: {processed_count} images processed.")

        self.logger.info(f"Total embeddings generated from folder: {len(embeddings_data['embeddings'])}")
        return embeddings_data