"""
Side 모델 전용 테스트 스크립트
사용법: python test_side_model.py
"""
import os
import torch
import torch.nn as nn
from torchvision import transforms
from PIL import Image
import cv2
import numpy as np

# SwinHairClassifier import
from swin_hair_classifier import SwinHairClassifier

def load_side_model(device):
    """Side 모델 로드"""
    model = SwinHairClassifier(num_classes=4)
    model_path = 'models/best_swin_hair_classifier_side.pth'

    if os.path.exists(model_path):
        checkpoint = torch.load(model_path, map_location=device)
        if 'model_state_dict' in checkpoint:
            model.load_state_dict(checkpoint['model_state_dict'])
        else:
            model.load_state_dict(checkpoint)
        print(f"Side 모델 로드 완료: {model_path}")
    else:
        print(f"경고: Side 모델 파일을 찾을 수 없습니다: {model_path}")
        return None

    model.to(device)
    model.eval()
    return model

def generate_mask(image_path):
    """BiSeNet으로 헤어 마스크 생성"""
    try:
        import sys
        sys.path.append('BiSeNet')
        from model import BiSeNet

        # BiSeNet 모델 로드
        device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        model = BiSeNet(n_classes=19)
        model_path = 'BiSeNet/res/cp/79999_iter.pth'

        if os.path.exists(model_path):
            model.load_state_dict(torch.load(model_path, map_location=device))
            model.to(device)
            model.eval()

            # 이미지 전처리
            image = cv2.imread(image_path)
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            image_resized = cv2.resize(image, (512, 512))

            # 정규화 및 텐서 변환
            transform = transforms.Compose([
                transforms.ToTensor(),
                transforms.Normalize((0.485, 0.456, 0.406), (0.229, 0.224, 0.225))
            ])

            input_tensor = transform(image_resized).unsqueeze(0).to(device)

            # 마스크 생성
            with torch.no_grad():
                output = model(input_tensor)[0]
                mask = torch.argmax(output, dim=1).squeeze().cpu().numpy()

            # 헤어 마스크 (클래스 17)
            hair_mask = (mask == 17).astype(np.uint8) * 255
            return hair_mask

        else:
            print(f"BiSeNet 모델 파일이 없습니다: {model_path}")
            return np.zeros((512, 512), dtype=np.uint8)

    except Exception as e:
        print(f"마스크 생성 실패: {e}")
        return np.zeros((512, 512), dtype=np.uint8)

def preprocess_image_with_mask(image_path):
    """이미지와 마스크를 전처리하여 6채널 텐서 생성"""
    # 원본 이미지 로드
    image = Image.open(image_path).convert('RGB')
    image = image.resize((224, 224))

    # 마스크 생성
    mask = generate_mask(image_path)
    mask = cv2.resize(mask, (224, 224))

    # 이미지 정규화
    transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    image_tensor = transform(image)  # [3, 224, 224]

    # 마스크를 3채널로 확장하고 정규화
    mask_normalized = mask.astype(np.float32) / 255.0
    mask_tensor = torch.from_numpy(mask_normalized).unsqueeze(0)  # [1, 224, 224]
    mask_tensor = mask_tensor.repeat(3, 1, 1)  # [3, 224, 224]

    # 6채널 결합
    combined = torch.cat([image_tensor, mask_tensor], dim=0)  # [6, 224, 224]

    return combined

def test_side_model(image_path):
    """Side 모델로 이미지 분류"""
    # 설정
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"사용 디바이스: {device}")

    # Side 모델 로드
    model = load_side_model(device)
    if model is None:
        print("Side 모델 로드 실패")
        return

    # 레벨 매핑
    level_names = {
        0: 'Level 0 (정상 - 노드우드 1단계)',
        1: 'Level 1 (경미 - 노드우드 2-3단계)',
        2: 'Level 2 (중간 - 노드우드 4-5단계)',
        3: 'Level 3 (심각 - 노드우드 6-7단계)'
    }

    filename = os.path.basename(image_path)
    print(f"\n=== Side 모델로 분석 ===")
    print(f"이미지: {filename}")

    try:
        # 전처리
        print("이미지 전처리 중...")
        input_tensor = preprocess_image_with_mask(image_path)
        input_tensor = input_tensor.unsqueeze(0).to(device)  # [1, 6, 224, 224]

        # 예측
        print("Side 모델로 탈모 분석 중...")
        with torch.no_grad():
            outputs = model(input_tensor)
            probabilities = torch.softmax(outputs, dim=1)
            predicted_class = torch.argmax(outputs, dim=1).item()
            confidence = probabilities[0][predicted_class].item()

        # 결과 출력
        print(f"\n=== Side 모델 분석 결과 ===")
        print(f"예측 레벨: {level_names[predicted_class]}")
        print(f"신뢰도: {confidence:.2%}")

        # 모든 레벨별 확률 출력
        print(f"\nSide 모델 - 모든 레벨별 확률:")
        for i, prob in enumerate(probabilities[0]):
            print(f"  {level_names[i]}: {prob.item():.2%}")

        return predicted_class, confidence

    except Exception as e:
        print(f"Side 모델 분류 실패: {e}")
        return None, None

def main():
    """메인 함수"""
    print("=== Side 모델 전용 탈모 분석기 ===")
    print("측면 이미지(Left/Right) 분석에 특화된 모델입니다.")

    while True:
        # 이미지 경로 입력
        image_path = input("\n이미지 경로를 입력하세요 (종료: quit): ").strip()

        if image_path.lower() == 'quit':
            print("프로그램을 종료합니다.")
            break

        # 따옴표 제거
        image_path = image_path.strip('"').strip("'")

        # 파일 존재 확인
        if not os.path.exists(image_path):
            print(f"파일을 찾을 수 없습니다: {image_path}")
            continue

        # 이미지 파일 확인
        if not image_path.lower().endswith(('.jpg', '.jpeg', '.png')):
            print("지원하는 이미지 형식: .jpg, .jpeg, .png")
            continue

        # Side 모델로 분류 실행
        test_side_model(image_path)

if __name__ == "__main__":
    main()