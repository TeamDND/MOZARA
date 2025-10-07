"""
SwinTransformer feature vector 추출
기존 모델만 import, 768차원 feature 추출
"""

import sys
import os

# 상위 디렉토리를 sys.path에 추가 (services 폴더에 있으므로 2단계 위로)
current_dir = os.path.dirname(os.path.abspath(__file__))
time_series_dir = os.path.dirname(current_dir)  # time_series/
services_root = os.path.dirname(time_series_dir)  # services/
sys.path.insert(0, services_root)

from swin_hair_classification.models.swin_hair_classifier import SwinHairClassifier
from swin_hair_classification.models.face_parsing.model import BiSeNet
import torch
import numpy as np
from PIL import Image
import io
import cv2
from torchvision import transforms


class FeatureExtractor:
    """SwinTransformer 기반 feature vector 추출기"""

    def __init__(self, device='cpu'):
        """
        Args:
            device: 'cpu' 또는 'cuda'
        """
        self.device = torch.device(device)
        self.face_parser = None
        self.swin_model = None
        self._load_models()

    def _load_models(self):
        """BiSeNet + Swin 모델 로드"""
        try:
            # 1. BiSeNet 로드 (마스킹용)
            self.face_parser = BiSeNet(n_classes=19)
            face_model_path = os.path.join(
                os.path.dirname(os.path.dirname(__file__)),
                'swin_hair_classification',
                'models',
                'face_parsing',
                'res',
                'cp',
                '79999_iter.pth'
            )

            if not os.path.exists(face_model_path):
                raise FileNotFoundError(f"BiSeNet 모델 파일을 찾을 수 없습니다: {face_model_path}")

            self.face_parser.load_state_dict(torch.load(face_model_path, map_location=self.device))
            self.face_parser.to(self.device)
            self.face_parser.eval()
            print(f"✅ BiSeNet 로드 완료 (마스킹용)")

            # 2. Swin 모델 로드 (Top view)
            self.swin_model = SwinHairClassifier(num_classes=4, in_chans=6)
            swin_model_path = os.path.join(
                os.path.dirname(os.path.dirname(__file__)),
                'swin_hair_classification',
                'models',
                'best_swin_hair_classifier_top.pth'
            )

            if not os.path.exists(swin_model_path):
                raise FileNotFoundError(f"Swin 모델 파일을 찾을 수 없습니다: {swin_model_path}")

            checkpoint = torch.load(swin_model_path, map_location=self.device)
            if 'model_state_dict' in checkpoint:
                self.swin_model.load_state_dict(checkpoint['model_state_dict'])
            else:
                self.swin_model.load_state_dict(checkpoint)

            self.swin_model.to(self.device)
            self.swin_model.eval()
            print(f"✅ SwinTransformer 로드 완료")

        except Exception as e:
            print(f"❌ 모델 로드 실패: {e}")
            raise

    def extract_features(self, image_bytes: bytes) -> dict:
        """
        768차원 feature vector 추출

        Args:
            image_bytes: 이미지 바이너리 데이터

        Returns:
            {
                'feature_vector': list,  # 768차원 리스트
                'feature_norm': float,   # L2 norm
                'feature_dim': int       # 차원 수 (768)
            }
        """
        try:
            # 1. 이미지 로드 및 마스크 생성
            image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
            image_np = np.array(image)
            image_resized = cv2.resize(image_np, (512, 512))

            # BiSeNet으로 마스크 생성
            transform_512 = transforms.Compose([
                transforms.ToTensor(),
                transforms.Normalize((0.485, 0.456, 0.406), (0.229, 0.224, 0.225))
            ])
            input_tensor_512 = transform_512(image_resized).unsqueeze(0).to(self.device)

            with torch.no_grad():
                output = self.face_parser(input_tensor_512)[0]
                mask = torch.argmax(output, dim=1).squeeze().cpu().numpy()

            # 헤어 마스크 추출
            hair_mask = (mask == 17).astype(np.uint8) * 255

            # 2. Swin 입력용 이미지 준비 (224x224)
            image_224 = cv2.resize(image_np, (224, 224))
            mask_224 = cv2.resize(hair_mask, (224, 224)) / 255.0

            # 이미지 정규화
            img_transform = transforms.Compose([
                transforms.ToTensor(),
                transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
            ])

            image_tensor = img_transform(Image.fromarray(image_224))  # [3, 224, 224]

            # 마스크 텐서 (3채널로 복제)
            mask_tensor = torch.from_numpy(mask_224.astype(np.float32)).unsqueeze(0).repeat(3, 1, 1)  # [3, 224, 224]

            # 6채널 결합 (RGB + Mask)
            combined = torch.cat([image_tensor, mask_tensor], dim=0).unsqueeze(0).to(self.device)  # [1, 6, 224, 224]

            # 3. Feature 추출 (forward_features 사용)
            with torch.no_grad():
                features = self.swin_model.forward_features(combined)  # [1, 768]
                features_np = features.cpu().numpy()[0]  # [768]

            # L2 norm 계산
            feature_norm = float(np.linalg.norm(features_np))

            return {
                'feature_vector': features_np.tolist(),  # JSON 직렬화 가능
                'feature_norm': round(feature_norm, 4),
                'feature_dim': len(features_np)
            }

        except Exception as e:
            print(f"❌ Feature 추출 실패: {e}")
            raise


# 테스트 코드
if __name__ == "__main__":
    print("FeatureExtractor 테스트 시작...")

    extractor = FeatureExtractor(device='cpu')

    # 테스트 이미지 경로
    test_image_path = "test_image.jpg"

    if os.path.exists(test_image_path):
        with open(test_image_path, 'rb') as f:
            image_bytes = f.read()

        result = extractor.extract_features(image_bytes)
        print("✅ 테스트 성공!")
        print(f"Feature 차원: {result['feature_dim']}")
        print(f"Feature Norm: {result['feature_norm']}")
        print(f"Feature 샘플 (처음 10개): {result['feature_vector'][:10]}")
    else:
        print(f"⚠️ 테스트 이미지가 없습니다: {test_image_path}")
