import cv2
import numpy as np
from PIL import Image, ImageEnhance
import torch
import torchvision.transforms as transforms
import timm
import os
import base64
import io
import re
from typing import List, Tuple, Dict, Optional
import logging
from ..config.settings import settings
from ..config.ensemble_config import get_ensemble_config

class ImageProcessor:
    def __init__(self, bisenet_model=None):
        """ConvNeXt + ViT-S/16 앙상블 이미지 처리 클래스

        Args:
            bisenet_model: 외부에서 주입받은 BiSeNet 모델 (싱글턴)
        """
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.ensemble_config = get_ensemble_config()
        self.bisenet_model = bisenet_model  # 싱글턴 BiSeNet 저장

        # ConvNeXt 모델 로드
        try:
            self.conv_model = timm.create_model("convnext_large.fb_in22k_ft_in1k_384",
                                              pretrained=True, num_classes=0, global_pool="avg")
            self.conv_model.eval().to(self.device)
            logging.info("ConvNeXt 모델 로드 완료")
        except Exception as e:
            logging.error(f"ConvNeXt 모델 로드 실패: {e}")
            raise

        # ViT-S/16 모델 로드
        try:
            self.vit_model = timm.create_model("vit_small_patch16_224",
                                             pretrained=True, num_classes=0, global_pool="avg")
            self.vit_model.eval().to(self.device)
            logging.info("ViT-S/16 모델 로드 완료")
        except Exception as e:
            logging.error(f"ViT-S/16 모델 로드 실패: {e}")
            raise

        # 전처리 변환
        self.transform_conv = transforms.Compose([
            transforms.Resize(384, interpolation=transforms.InterpolationMode.BICUBIC),
            transforms.CenterCrop(384),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

        self.transform_vit = transforms.Compose([
            transforms.Resize(224, interpolation=transforms.InterpolationMode.BICUBIC),
            transforms.CenterCrop(224),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
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
            # 이미지 크기 조정 (384x384)
            image = image.resize((384, 384))
            return np.array(image)
        except Exception as e:
            self.logger.error(f"이미지 전처리 실패: {e}")
            return None

    def enhance_image(self, img: Image.Image) -> Image.Image:
        """이미지 향상"""
        img = ImageEnhance.Sharpness(img).enhance(1.05)
        img = ImageEnhance.Contrast(img).enhance(1.05)
        img = ImageEnhance.Brightness(img).enhance(1.03)
        img = ImageEnhance.Color(img).enhance(1.03)
        return img

    def extract_embedding(self, image: Image.Image, model, transform) -> Optional[np.ndarray]:
        """단일 모델 임베딩 추출"""
        try:
            if image.mode != "RGB":
                image = image.convert("RGB")
            image = self.enhance_image(image)

            input_tensor = transform(image).unsqueeze(0).to(self.device)

            with torch.no_grad():
                features = model(input_tensor)
                embedding = features.squeeze().cpu().numpy()

            # L2 정규화
            embedding = embedding / (np.linalg.norm(embedding) + 1e-12)
            return embedding
        except Exception as e:
            self.logger.error(f"임베딩 추출 실패: {e}")
            return None

    def extract_dual_embeddings(self, image: Image.Image) -> Tuple[Optional[np.ndarray], Optional[np.ndarray]]:
        """ConvNeXt + ViT 듀얼 임베딩 추출"""
        conv_embedding = self.extract_embedding(image, self.conv_model, self.transform_conv)
        vit_embedding = self.extract_embedding(image, self.vit_model, self.transform_vit)
        return conv_embedding, vit_embedding

    def get_convnext_embedding(self, image: Image.Image) -> Optional[np.ndarray]:
        """ConvNeXt 단일 임베딩 추출"""
        return self.extract_embedding(image, self.conv_model, self.transform_conv)

    def get_vit_embedding(self, image: Image.Image) -> Optional[np.ndarray]:
        """ViT 단일 임베딩 추출"""
        return self.extract_embedding(image, self.vit_model, self.transform_vit)

    def extract_clip_embedding(self, image: Image.Image) -> Optional[np.ndarray]:
        """하위 호환성을 위한 메서드 (ConvNeXt 임베딩 반환)"""
        conv_embedding, _ = self.extract_dual_embeddings(image)
        return conv_embedding

    def extract_clip_embedding_from_path(self, image_path: str) -> Optional[np.ndarray]:
        """파일 경로에서 ConvNeXt-L 임베딩 추출"""
        try:
            image = Image.open(image_path).convert('RGB')
            return self.extract_clip_embedding(image)
        except Exception as e:
            self.logger.error(f"파일에서 ConvNeXt-L 임베딩 추출 실패 {image_path}: {e}")
            return None

    def process_dataset(self, dataset_path: str, stages: List[int] = [0, 1, 2, 3, 4, 5, 6, 7]) -> Dict:
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
                if filename.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp')):
                    image_path = os.path.join(stage_folder, filename)

                    try:
                        embedding = self.extract_clip_embedding_from_path(image_path)
                        if embedding is not None:
                            embeddings_data['embeddings'].append(embedding.tolist())
                            embeddings_data['metadata'].append({
                                'stage': stage,
                                'level': f'level_{stage}',
                                'filename': filename,
                                'path': image_path
                            })
                            embeddings_data['ids'].append(f"level_{stage}_{filename}")
                            processed_count += 1

                    except Exception as e:
                        self.logger.error(f"이미지 처리 실패 {image_path}: {e}")

            self.logger.info(f"LEVEL_{stage}: {processed_count}개 이미지 처리 완료")

        self.logger.info(f"총 {len(embeddings_data['embeddings'])}개 임베딩 생성 완료")
        return embeddings_data

    def process_dual_dataset(self, dataset_path: str, stages: List[int] = [2, 3, 4, 5, 6, 7]) -> Tuple[Dict, Dict]:
        """ConvNeXt + ViT 듀얼 임베딩 데이터셋 생성"""
        conv_data = {'embeddings': [], 'metadata': [], 'ids': []}
        vit_data = {'embeddings': [], 'metadata': [], 'ids': []}

        for stage in stages:
            stage_folder = os.path.join(dataset_path, f"LEVEL_{stage}")

            if not os.path.exists(stage_folder):
                self.logger.warning(f"폴더가 존재하지 않음: {stage_folder}")
                continue

            self.logger.info(f"LEVEL_{stage} 듀얼 임베딩 처리 중...")
            processed_count = 0

            for filename in os.listdir(stage_folder):
                if filename.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp')):
                    image_path = os.path.join(stage_folder, filename)

                    try:
                        image = Image.open(image_path).convert('RGB')
                        conv_emb, vit_emb = self.extract_dual_embeddings(image)

                        if conv_emb is not None and vit_emb is not None:
                            metadata = {
                                'stage': stage,
                                'level': f'level_{stage}',
                                'filename': filename,
                                'path': image_path
                            }
                            file_id = f"level_{stage}_{filename}"

                            conv_data['embeddings'].append(conv_emb.tolist())
                            conv_data['metadata'].append(metadata)
                            conv_data['ids'].append(file_id)

                            vit_data['embeddings'].append(vit_emb.tolist())
                            vit_data['metadata'].append(metadata)
                            vit_data['ids'].append(file_id)

                            processed_count += 1

                    except Exception as e:
                        self.logger.error(f"듀얼 임베딩 처리 실패 {image_path}: {e}")

            self.logger.info(f"LEVEL_{stage}: {processed_count}개 듀얼 임베딩 완료")

        self.logger.info(f"ConvNeXt: {len(conv_data['embeddings'])}개, ViT: {len(vit_data['embeddings'])}개 임베딩 생성")
        return conv_data, vit_data

    def simulate_bisenet_segmentation(self, image: Image.Image) -> Image.Image:
        """
        BiSeNet 세그멘테이션 (두피 영역 추출)

        싱글턴 BiSeNet 모델이 주입되어 있으면 실제 세그멘테이션 수행
        없으면 중앙 70% 영역을 ROI로 크롭 (fallback)
        """
        if self.bisenet_model is not None:
            # 실제 BiSeNet 세그멘테이션 수행
            try:
                # 이미지를 512x512로 리사이즈
                image_np = np.array(image)
                image_resized = cv2.resize(image_np, (512, 512))

                # 전처리
                transform_512 = transforms.Compose([
                    transforms.ToTensor(),
                    transforms.Normalize((0.485, 0.456, 0.406), (0.229, 0.224, 0.225))
                ])
                input_tensor = transform_512(image_resized).unsqueeze(0).to(self.device)

                # BiSeNet으로 마스크 생성
                with torch.no_grad():
                    output = self.bisenet_model(input_tensor)[0]
                    mask = torch.argmax(output, dim=1).squeeze().cpu().numpy()

                # 헤어 마스크 추출 (클래스 17 = hair)
                hair_mask = (mask == 17).astype(np.uint8) * 255

                # 마스크 적용하여 ROI 추출
                mask_3ch = cv2.cvtColor(hair_mask, cv2.COLOR_GRAY2RGB)
                masked_img = cv2.bitwise_and(image_resized, mask_3ch)

                # 원본 크기로 복원
                width, height = image.size
                masked_img_resized = cv2.resize(masked_img, (width, height))

                # PIL Image로 변환
                roi_img = Image.fromarray(masked_img_resized)

                self.logger.info("✅ BiSeNet 세그멘테이션 완료")
                return roi_img

            except Exception as e:
                self.logger.warning(f"BiSeNet 세그멘테이션 실패, fallback 사용: {e}")
                # fallback으로 중앙 크롭 사용

        # Fallback: 중앙 70% 영역 크롭 (시뮬레이션)
        width, height = image.size
        left = int(width * 0.15)
        top = int(height * 0.15)
        right = int(width * 0.85)
        bottom = int(height * 0.85)

        # ROI 추출
        roi_img = image.crop((left, top, right, bottom))

        # 원본 크기로 resize (모델 입력 크기 맞추기)
        roi_img = roi_img.resize((width, height), Image.Resampling.LANCZOS)

        return roi_img

    def extract_roi_dual_embeddings(self, image: Image.Image) -> Tuple[Optional[np.ndarray], Optional[np.ndarray]]:
        """
        BiSeNet ROI 처리 후 ConvNeXt + ViT 듀얼 임베딩 추출
        """
        try:
            # BiSeNet으로 두피 영역 추출
            roi_image = self.simulate_bisenet_segmentation(image)

            # ROI 이미지로 듀얼 임베딩 생성
            conv_embedding = self.extract_embedding(roi_image, self.conv_model, self.transform_conv)
            vit_embedding = self.extract_embedding(roi_image, self.vit_model, self.transform_vit)

            return conv_embedding, vit_embedding

        except Exception as e:
            self.logger.error(f"ROI 듀얼 임베딩 추출 실패: {e}")
            return None, None
