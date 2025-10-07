"""
BiSeNet을 활용한 헤어 밀도 측정
기존 swin_hair_classification 모델만 import, 코드 수정 없음
"""

import sys
import os

# 상위 디렉토리를 sys.path에 추가 (services 폴더에 있으므로 2단계 위로)
current_dir = os.path.dirname(os.path.abspath(__file__))
time_series_dir = os.path.dirname(current_dir)  # time_series/
services_root = os.path.dirname(time_series_dir)  # services/
sys.path.insert(0, services_root)

from swin_hair_classification.models.face_parsing.model import BiSeNet
import torch
import cv2
import numpy as np
from PIL import Image
import io
from torchvision import transforms
import logging

logger = logging.getLogger(__name__)


class DensityAnalyzer:
    """BiSeNet 기반 헤어 밀도 측정기"""

    def __init__(self, device='cpu'):
        """
        Args:
            device: 'cpu' 또는 'cuda'
        """
        self.device = torch.device(device)
        self.model = None
        self._load_model()

    def _load_model(self):
        """BiSeNet 모델 로드"""
        try:
            self.model = BiSeNet(n_classes=19)

            # 모델 파일 경로 (상대 경로 수정 - services 폴더 기준)
            # 현재 위치: services/time_series/services/density_analyzer.py
            # 목표 위치: services/swin_hair_classification/...
            current_file = os.path.abspath(__file__)  # density_analyzer.py
            services_time_series_services = os.path.dirname(current_file)  # time_series/services/
            services_time_series = os.path.dirname(services_time_series_services)  # time_series/
            services_root = os.path.dirname(services_time_series)  # services/

            model_path = os.path.join(
                services_root,
                'swin_hair_classification',
                'models',
                'face_parsing',
                'res',
                'cp',
                '79999_iter.pth'
            )

            if not os.path.exists(model_path):
                raise FileNotFoundError(f"BiSeNet 모델 파일을 찾을 수 없습니다: {model_path}")

            self.model.load_state_dict(torch.load(model_path, map_location=self.device))
            self.model.to(self.device)
            self.model.eval()

            print(f"✅ BiSeNet 모델 로드 완료: {model_path}")
        except Exception as e:
            print(f"❌ BiSeNet 모델 로드 실패: {e}")
            raise

    def calculate_density(self, image_bytes: bytes) -> dict:
        """
        이미지로부터 헤어 밀도 측정

        Args:
            image_bytes: 이미지 바이너리 데이터

        Returns:
            {
                'hair_density_percentage': float,      # 헤어 영역 비율 (0-100%)
                'total_hair_pixels': int,              # 전체 헤어 픽셀 수
                'distribution_map': list,              # 8x8 그리드 분포
                'top_region_density': float,           # 상단 1/3 밀도
                'middle_region_density': float,        # 중간 1/3 밀도
                'bottom_region_density': float         # 하단 1/3 밀도
            }
        """
        try:
            # 1. 이미지 전처리
            image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
            image_np = np.array(image)
            image_resized = cv2.resize(image_np, (512, 512))

            # 2. 텐서 변환
            transform = transforms.Compose([
                transforms.ToTensor(),
                transforms.Normalize((0.485, 0.456, 0.406), (0.229, 0.224, 0.225))
            ])
            input_tensor = transform(image_resized).unsqueeze(0).to(self.device)

            # 3. BiSeNet으로 마스크 생성
            with torch.no_grad():
                output = self.model(input_tensor)[0]
                mask = torch.argmax(output, dim=1).squeeze().cpu().numpy()

            # 4. 헤어 마스크 추출 (클래스 17)
            hair_mask = (mask == 17).astype(np.uint8) * 255

            # 5. 머리 밀도 계산 (전체 이미지 대비)
            total_hair_pixels = int(np.sum(hair_mask > 0))
            face_pixels = int(np.sum(mask == 1))  # 클래스 1 = skin (얼굴 피부)
            total_pixels = hair_mask.shape[0] * hair_mask.shape[1]

            # 🔍 상세 로그
            logger.info(f"🎨 세그멘테이션 결과:")
            logger.info(f"  전체 픽셀: {total_pixels:,}")
            logger.info(f"  머리 픽셀: {total_hair_pixels:,}")
            logger.info(f"  얼굴 픽셀: {face_pixels:,}")

            # ✅ 수정: 전체 이미지 대비 머리 비율 (0-100%)
            # 이유: 얼굴 대비 비율은 각도/거리에 따라 변동이 심함
            # 예: 위에서 찍은 사진 → 얼굴 작음 → 밀도가 비정상적으로 높게 나옴 (226%)
            density_percentage = (total_hair_pixels / total_pixels) * 100
            logger.info(f"  밀도 계산: 머리/전체 = {total_hair_pixels:,}/{total_pixels:,} = {density_percentage:.2f}%")

            # 6. 8x8 그리드 분포 맵 생성
            grid_size = 8
            cell_h = 512 // grid_size
            cell_w = 512 // grid_size
            distribution_map = []

            for i in range(grid_size):
                row = []
                for j in range(grid_size):
                    cell = hair_mask[i*cell_h:(i+1)*cell_h, j*cell_w:(j+1)*cell_w]
                    cell_density = np.sum(cell > 0) / (cell_h * cell_w) * 100
                    row.append(round(float(cell_density), 2))
                distribution_map.append(row)

            # 7. 영역별 밀도 계산 (상/중/하)
            h, w = hair_mask.shape
            top_region_density = np.sum(hair_mask[0:h//3, :] > 0) / (h//3 * w) * 100
            middle_region_density = np.sum(hair_mask[h//3:2*h//3, :] > 0) / (h//3 * w) * 100
            bottom_region_density = np.sum(hair_mask[2*h//3:h, :] > 0) / (h//3 * w) * 100

            return {
                'hair_density_percentage': round(float(density_percentage), 2),
                'total_hair_pixels': total_hair_pixels,
                'distribution_map': distribution_map,
                'top_region_density': round(float(top_region_density), 2),
                'middle_region_density': round(float(middle_region_density), 2),
                'bottom_region_density': round(float(bottom_region_density), 2)
            }

        except Exception as e:
            print(f"❌ 밀도 측정 실패: {e}")
            raise


# 테스트 코드
if __name__ == "__main__":
    print("DensityAnalyzer 테스트 시작...")

    analyzer = DensityAnalyzer(device='cpu')

    # 테스트 이미지 경로 (실제 이미지로 교체 필요)
    test_image_path = "test_image.jpg"

    if os.path.exists(test_image_path):
        with open(test_image_path, 'rb') as f:
            image_bytes = f.read()

        result = analyzer.calculate_density(image_bytes)
        print("✅ 테스트 성공!")
        print(f"밀도: {result['hair_density_percentage']}%")
        print(f"픽셀 수: {result['total_hair_pixels']}")
    else:
        print(f"⚠️ 테스트 이미지가 없습니다: {test_image_path}")
