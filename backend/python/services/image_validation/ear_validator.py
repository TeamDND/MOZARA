"""
귀 기반 이미지 타입 검증 모듈
BiSeNet을 사용하여 Top(정수리) vs Side(측면) 이미지를 판별합니다.
"""

import torch
import numpy as np
from PIL import Image
import io
from torchvision import transforms


def validate_hair_loss_image(image_bytes: bytes, expected_type: str, bisenet_model, device):
    """
    귀 개수로 Top/Side 이미지 타입 검증

    판별 로직:
    - 귀 0개 → Top (정수리)
    - 귀 1개 → Side (측면)
    - 귀 2개 → Top (정수리, 살짝 비스듬한 각도)

    Args:
        image_bytes: 이미지 바이트 데이터
        expected_type: 'top' 또는 'side'
        bisenet_model: BiSeNet 모델 인스턴스
        device: torch device

    Returns:
        (is_valid: bool, message: str)
    """
    try:
        # BiSeNet으로 얼굴 파싱
        parsing_result = parse_face_with_bisenet(image_bytes, bisenet_model, device)

        # 귀 영역 픽셀 수 계산 (label 7: left_ear, 8: right_ear)
        left_ear_pixels = np.sum(parsing_result == 7)
        right_ear_pixels = np.sum(parsing_result == 8)

        # 귀가 보이는지 판단 (임계값: 100픽셀)
        # 남성 짧은 머리는 귀가 잘 보이므로 낮은 임계값 사용
        EAR_THRESHOLD = 100
        left_ear_visible = left_ear_pixels > EAR_THRESHOLD
        right_ear_visible = right_ear_pixels > EAR_THRESHOLD

        visible_ears = int(left_ear_visible) + int(right_ear_visible)

        print(f"[이미지 검증] Left ear: {left_ear_pixels}px, Right ear: {right_ear_pixels}px, Visible: {visible_ears}개")

        # 판별 로직
        if expected_type == 'top':
            # 정수리: 귀가 0개 또는 2개여야 함
            if visible_ears != 1:
                return True, "✅ 정수리 사진이 확인되었습니다"
            else:
                # 귀가 1개 = 측면 사진
                return False, "❌ 측면 사진으로 보입니다. 머리 위에서 정수리를 촬영해주세요"

        elif expected_type == 'side':
            # 측면: 귀가 정확히 1개여야 함
            if visible_ears == 1:
                return True, "✅ 측면 사진이 확인되었습니다"
            else:
                # 귀가 0개 또는 2개 = 정수리 사진
                return False, "❌ 정수리 사진으로 보입니다. 얼굴 측면이 보이도록 촬영해주세요"

        # 예상치 못한 타입
        return False, f"알 수 없는 이미지 타입: {expected_type}"

    except Exception as e:
        print(f"[이미지 검증 오류] {str(e)}")
        # 검증 실패 시 통과시킴 (분석은 진행되도록)
        return True, f"이미지 검증을 건너뜁니다: {str(e)}"


def parse_face_with_bisenet(image_bytes: bytes, model, device):
    """
    BiSeNet으로 얼굴 파싱

    Args:
        image_bytes: 이미지 바이트 데이터
        model: BiSeNet 모델
        device: torch device

    Returns:
        parsing: numpy array (512x512) with face part labels
    """
    # 이미지 로드 및 전처리
    img = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    img = img.resize((512, 512))

    # Tensor 변환 (ImageNet 정규화)
    to_tensor = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize((0.485, 0.456, 0.406), (0.229, 0.224, 0.225))
    ])

    img_tensor = to_tensor(img).unsqueeze(0).to(device)

    # BiSeNet 추론
    with torch.no_grad():
        out = model(img_tensor)[0]
        parsing = out.squeeze(0).cpu().numpy().argmax(0)

    return parsing
