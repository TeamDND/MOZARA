"""
Confusion Matrix 생성 스크립트
데이터셋을 사용하여 모델 성능을 평가하고 Confusion Matrix를 생성합니다.

사용법:
    python evaluate_model.py --model_type top
    python evaluate_model.py --model_type side
    python evaluate_model.py --model_type both
"""

import os
import sys
import torch
import torch.nn as nn
from torchvision import transforms
from PIL import Image
import cv2
import numpy as np
import argparse
from tqdm import tqdm
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import confusion_matrix, classification_report, accuracy_score
import json
from datetime import datetime

# 현재 디렉토리를 path에 추가
current_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, current_dir)

# Swin 모델 import
from models.swin_hair_classifier import SwinHairClassifier
from models.face_parsing.model import BiSeNet


class HairLossEvaluator:
    """탈모 모델 평가 클래스"""

    def __init__(self, dataset_path, mask_path, model_path, model_type='top', device=None):
        """
        Args:
            dataset_path: 데이터셋 경로 (예: C:/Users/301/dev/hair_loss/dataset)
            mask_path: 마스크 데이터셋 경로 (예: C:/Users/301/dev/hair_loss/dataset_masks)
            model_path: 모델 가중치 파일 경로
            model_type: 'top' 또는 'side'
            device: torch.device (None이면 자동 설정)
        """
        self.dataset_path = dataset_path
        self.mask_path = mask_path
        self.model_type = model_type
        self.device = device if device else torch.device('cuda' if torch.cuda.is_available() else 'cpu')

        print(f"=" * 60)
        print(f"탈모 모델 평가 시작")
        print(f"=" * 60)
        print(f"모델 타입: {model_type}")
        print(f"디바이스: {self.device}")
        print(f"데이터셋 경로: {dataset_path}")
        print(f"마스크 경로: {mask_path}")

        # 모델 로드
        self.model = self._load_model(model_path)

        # Face parsing 모델 로드 (마스크 생성용)
        self.face_parsing_model = self._load_face_parsing_model()

        # Transform 정의
        self.transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
        ])

        # 클래스 이름
        self.class_names = ['Level 0 (정상)', 'Level 1 (경미)', 'Level 2 (중등도)', 'Level 3 (심각)']

    def _load_model(self, model_path):
        """Swin 모델 로드"""
        print(f"\n모델 로드 중: {model_path}")
        model = SwinHairClassifier(num_classes=4)

        if os.path.exists(model_path):
            checkpoint = torch.load(model_path, map_location=self.device)
            if 'model_state_dict' in checkpoint:
                model.load_state_dict(checkpoint['model_state_dict'])
                print(f"✓ 체크포인트에서 로드 (Epoch: {checkpoint.get('epoch', 'N/A')})")
            else:
                model.load_state_dict(checkpoint)
                print(f"✓ State dict에서 로드")
        else:
            raise FileNotFoundError(f"모델 파일을 찾을 수 없습니다: {model_path}")

        model.to(self.device)
        model.eval()
        print(f"✓ 모델 로드 완료")
        return model

    def _load_face_parsing_model(self):
        """Face parsing 모델 로드"""
        print(f"\nFace parsing 모델 로드 중...")
        model = BiSeNet(n_classes=19)
        model_path = os.path.join(current_dir, 'models/face_parsing/res/cp/79999_iter.pth')

        if os.path.exists(model_path):
            model.load_state_dict(torch.load(model_path, map_location=self.device))
            model.to(self.device)
            model.eval()
            print(f"✓ Face parsing 모델 로드 완료")
        else:
            print(f"⚠ Face parsing 모델을 찾을 수 없습니다: {model_path}")
            print(f"  마스크를 생성할 수 없으므로 기존 마스크 파일을 사용합니다.")
            return None

        return model

    def _generate_hair_mask(self, image_path):
        """이미지에서 헤어 마스크 생성"""
        if self.face_parsing_model is None:
            # Face parsing 모델이 없으면 기존 마스크 파일 사용
            return None

        try:
            # 이미지 로드
            image = cv2.imread(image_path)
            image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            image_resized = cv2.resize(image, (512, 512))

            # 정규화 및 텐서 변환
            transform = transforms.Compose([
                transforms.ToTensor(),
                transforms.Normalize((0.485, 0.456, 0.406), (0.229, 0.224, 0.225))
            ])

            input_tensor = transform(image_resized).unsqueeze(0).to(self.device)

            # 마스크 생성
            with torch.no_grad():
                output = self.face_parsing_model(input_tensor)[0]
                mask = torch.argmax(output, dim=1).squeeze().cpu().numpy()

            # 헤어 마스크 (클래스 17)
            hair_mask = (mask == 17).astype(np.uint8) * 255
            return hair_mask

        except Exception as e:
            print(f"⚠ 마스크 생성 실패: {e}")
            return None

    def _load_or_generate_mask(self, image_path):
        """마스크 로드 또는 생성"""
        # 1. 먼저 dataset_masks 폴더에서 마스크 찾기
        rel_path = os.path.relpath(image_path, self.dataset_path)
        mask_path = os.path.join(self.mask_path, rel_path)

        if os.path.exists(mask_path):
            # 기존 마스크 로드
            mask = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)
            return mask

        # 2. 마스크가 없으면 생성
        mask = self._generate_hair_mask(image_path)
        if mask is None:
            # 생성도 실패하면 빈 마스크 반환
            return np.zeros((512, 512), dtype=np.uint8)

        return mask

    def _preprocess_image(self, image_path):
        """이미지와 마스크를 전처리하여 6채널 텐서 생성"""
        # 원본 이미지 로드
        image = Image.open(image_path).convert('RGB')
        image = image.resize((224, 224))

        # 마스크 로드 또는 생성
        mask = self._load_or_generate_mask(image_path)
        mask = cv2.resize(mask, (224, 224))

        # 이미지 정규화
        image_tensor = self.transform(image)  # [3, 224, 224]

        # 마스크를 3채널로 확장하고 정규화
        mask_normalized = mask.astype(np.float32) / 255.0
        mask_tensor = torch.from_numpy(mask_normalized).unsqueeze(0)  # [1, 224, 224]
        mask_tensor = mask_tensor.repeat(3, 1, 1)  # [3, 224, 224]

        # 6채널 결합
        combined = torch.cat([image_tensor, mask_tensor], dim=0)  # [6, 224, 224]

        return combined

    def _get_image_paths_and_labels(self):
        """데이터셋에서 이미지 경로와 레이블 가져오기"""
        image_paths = []
        labels = []

        # 모델 타입에 따라 경로 설정
        data_dir = os.path.join(self.dataset_path, self.model_type)

        # 각 레벨별로 이미지 수집
        for level in range(4):
            level_dir = os.path.join(data_dir, f'level_{level}')
            if not os.path.exists(level_dir):
                print(f"⚠ 경고: {level_dir} 폴더가 없습니다.")
                continue

            # 이미지 파일 찾기
            for filename in os.listdir(level_dir):
                if filename.lower().endswith(('.jpg', '.jpeg', '.png')):
                    image_path = os.path.join(level_dir, filename)
                    image_paths.append(image_path)
                    labels.append(level)

        print(f"\n데이터셋 로드 완료:")
        for level in range(4):
            count = labels.count(level)
            print(f"  Level {level}: {count}개")
        print(f"  총 이미지 수: {len(image_paths)}개")

        return image_paths, labels

    def evaluate(self):
        """모델 평가 수행"""
        print(f"\n{'=' * 60}")
        print(f"평가 시작")
        print(f"{'=' * 60}")

        # 데이터 로드
        image_paths, true_labels = self._get_image_paths_and_labels()

        if len(image_paths) == 0:
            print("❌ 이미지가 없습니다. 데이터셋 경로를 확인하세요.")
            return None, None, None

        # 예측 수행
        predictions = []
        confidences = []

        print(f"\n예측 수행 중...")
        with torch.no_grad():
            for image_path in tqdm(image_paths, desc="이미지 처리"):
                try:
                    # 전처리
                    input_tensor = self._preprocess_image(image_path)
                    input_tensor = input_tensor.unsqueeze(0).to(self.device)  # [1, 6, 224, 224]

                    # 예측
                    outputs = self.model(input_tensor)
                    probabilities = torch.softmax(outputs, dim=1)
                    predicted_class = torch.argmax(outputs, dim=1).item()
                    confidence = probabilities[0][predicted_class].item()

                    predictions.append(predicted_class)
                    confidences.append(confidence)

                except Exception as e:
                    print(f"\n⚠ 예측 실패: {os.path.basename(image_path)} - {e}")
                    predictions.append(0)  # 기본값
                    confidences.append(0.0)

        return true_labels, predictions, confidences

    def plot_confusion_matrix(self, true_labels, predictions, save_path=None):
        """Confusion Matrix 시각화"""
        # Confusion Matrix 계산
        cm = confusion_matrix(true_labels, predictions)

        # 시각화
        plt.figure(figsize=(10, 8))
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                    xticklabels=self.class_names,
                    yticklabels=self.class_names,
                    cbar_kws={'label': '샘플 수'})

        plt.title(f'Confusion Matrix - {self.model_type.upper()} Model', fontsize=16, pad=20)
        plt.ylabel('실제 레이블 (True Label)', fontsize=12)
        plt.xlabel('예측 레이블 (Predicted Label)', fontsize=12)
        plt.tight_layout()

        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"✓ Confusion Matrix 저장: {save_path}")

        plt.show()

        return cm

    def plot_normalized_confusion_matrix(self, true_labels, predictions, save_path=None):
        """정규화된 Confusion Matrix 시각화 (비율 표시)"""
        # Confusion Matrix 계산
        cm = confusion_matrix(true_labels, predictions)

        # 정규화 (각 행의 합이 1이 되도록)
        cm_normalized = cm.astype('float') / cm.sum(axis=1)[:, np.newaxis]

        # 시각화
        plt.figure(figsize=(10, 8))
        sns.heatmap(cm_normalized, annot=True, fmt='.2%', cmap='Blues',
                    xticklabels=self.class_names,
                    yticklabels=self.class_names,
                    cbar_kws={'label': '비율'})

        plt.title(f'Normalized Confusion Matrix - {self.model_type.upper()} Model', fontsize=16, pad=20)
        plt.ylabel('실제 레이블 (True Label)', fontsize=12)
        plt.xlabel('예측 레이블 (Predicted Label)', fontsize=12)
        plt.tight_layout()

        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            print(f"✓ Normalized Confusion Matrix 저장: {save_path}")

        plt.show()

        return cm_normalized

    def generate_report(self, true_labels, predictions, confidences, save_path=None):
        """평가 리포트 생성"""
        # Classification Report
        report = classification_report(true_labels, predictions,
                                       target_names=self.class_names,
                                       digits=4)

        # Confusion Matrix
        cm = confusion_matrix(true_labels, predictions)

        # 정확도
        accuracy = accuracy_score(true_labels, predictions)

        # 평균 신뢰도
        avg_confidence = np.mean(confidences)

        # 리포트 작성
        report_text = f"""
{'=' * 80}
탈모 모델 평가 리포트
{'=' * 80}

[모델 정보]
- 모델 타입: {self.model_type.upper()}
- 디바이스: {self.device}
- 평가 날짜: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

[데이터셋 정보]
- 총 샘플 수: {len(true_labels)}개
- Level 0 (정상): {true_labels.count(0)}개
- Level 1 (경미): {true_labels.count(1)}개
- Level 2 (중등도): {true_labels.count(2)}개
- Level 3 (심각): {true_labels.count(3)}개

[전체 성능]
- 전체 정확도 (Overall Accuracy): {accuracy:.4f} ({accuracy*100:.2f}%)
- 평균 신뢰도 (Average Confidence): {avg_confidence:.4f} ({avg_confidence*100:.2f}%)

[클래스별 성능]
{report}

[Confusion Matrix]
실제 \\ 예측  │  Level 0  │  Level 1  │  Level 2  │  Level 3  │
─────────────┼───────────┼───────────┼───────────┼───────────┤
Level 0      │  {cm[0][0]:6d}   │  {cm[0][1]:6d}   │  {cm[0][2]:6d}   │  {cm[0][3]:6d}   │
Level 1      │  {cm[1][0]:6d}   │  {cm[1][1]:6d}   │  {cm[1][2]:6d}   │  {cm[1][3]:6d}   │
Level 2      │  {cm[2][0]:6d}   │  {cm[2][1]:6d}   │  {cm[2][2]:6d}   │  {cm[2][3]:6d}   │
Level 3      │  {cm[3][0]:6d}   │  {cm[3][1]:6d}   │  {cm[3][2]:6d}   │  {cm[3][3]:6d}   │

[Normalized Confusion Matrix (비율)]
실제 \\ 예측  │  Level 0  │  Level 1  │  Level 2  │  Level 3  │
─────────────┼───────────┼───────────┼───────────┼───────────┤
Level 0      │  {cm[0][0]/cm[0].sum():6.2%}   │  {cm[0][1]/cm[0].sum():6.2%}   │  {cm[0][2]/cm[0].sum():6.2%}   │  {cm[0][3]/cm[0].sum():6.2%}   │
Level 1      │  {cm[1][0]/cm[1].sum():6.2%}   │  {cm[1][1]/cm[1].sum():6.2%}   │  {cm[1][2]/cm[1].sum():6.2%}   │  {cm[1][3]/cm[1].sum():6.2%}   │
Level 2      │  {cm[2][0]/cm[2].sum():6.2%}   │  {cm[2][1]/cm[2].sum():6.2%}   │  {cm[2][2]/cm[2].sum():6.2%}   │  {cm[2][3]/cm[2].sum():6.2%}   │
Level 3      │  {cm[3][0]/cm[3].sum():6.2%}   │  {cm[3][1]/cm[3].sum():6.2%}   │  {cm[3][2]/cm[3].sum():6.2%}   │  {cm[3][3]/cm[3].sum():6.2%}   │

{'=' * 80}
"""

        print(report_text)

        if save_path:
            with open(save_path, 'w', encoding='utf-8') as f:
                f.write(report_text)
            print(f"✓ 리포트 저장: {save_path}")

        return report_text

    def save_results_json(self, true_labels, predictions, confidences, cm, save_path):
        """결과를 JSON 형식으로 저장"""
        # Classification Report (dict 형식)
        from sklearn.metrics import precision_recall_fscore_support

        precision, recall, f1, support = precision_recall_fscore_support(
            true_labels, predictions, labels=[0, 1, 2, 3], zero_division=0
        )

        results = {
            "model_info": {
                "model_type": self.model_type,
                "device": str(self.device),
                "evaluation_date": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            },
            "dataset_info": {
                "total_samples": len(true_labels),
                "level_0": true_labels.count(0),
                "level_1": true_labels.count(1),
                "level_2": true_labels.count(2),
                "level_3": true_labels.count(3)
            },
            "overall_performance": {
                "accuracy": float(accuracy_score(true_labels, predictions)),
                "average_confidence": float(np.mean(confidences))
            },
            "per_class_performance": {
                f"level_{i}": {
                    "precision": float(precision[i]),
                    "recall": float(recall[i]),
                    "f1_score": float(f1[i]),
                    "support": int(support[i])
                }
                for i in range(4)
            },
            "confusion_matrix": cm.tolist()
        }

        with open(save_path, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)

        print(f"✓ JSON 결과 저장: {save_path}")


def main():
    """메인 함수"""
    parser = argparse.ArgumentParser(description='탈모 모델 평가 및 Confusion Matrix 생성')
    parser.add_argument('--model_type', type=str, required=True, choices=['top', 'side', 'both'],
                        help='평가할 모델 타입 (top, side, both)')
    parser.add_argument('--dataset_path', type=str,
                        default='C:/Users/301/dev/hair_loss/dataset',
                        help='데이터셋 경로')
    parser.add_argument('--mask_path', type=str,
                        default='C:/Users/301/dev/hair_loss/dataset_masks',
                        help='마스크 데이터셋 경로')
    parser.add_argument('--output_dir', type=str,
                        default='./evaluation_results',
                        help='결과 저장 디렉토리')

    args = parser.parse_args()

    # 출력 디렉토리 생성
    os.makedirs(args.output_dir, exist_ok=True)

    # 평가할 모델 결정
    model_types = ['top', 'side'] if args.model_type == 'both' else [args.model_type]

    for model_type in model_types:
        print(f"\n\n{'#' * 80}")
        print(f"# {model_type.upper()} 모델 평가 시작")
        print(f"{'#' * 80}\n")

        # 모델 경로 설정
        model_path = os.path.join(current_dir, f'models/best_swin_hair_classifier_{model_type}.pth')

        if not os.path.exists(model_path):
            print(f"❌ 모델 파일을 찾을 수 없습니다: {model_path}")
            continue

        # Evaluator 생성
        evaluator = HairLossEvaluator(
            dataset_path=args.dataset_path,
            mask_path=args.mask_path,
            model_path=model_path,
            model_type=model_type
        )

        # 평가 수행
        true_labels, predictions, confidences = evaluator.evaluate()

        if true_labels is None:
            print(f"❌ {model_type} 모델 평가 실패")
            continue

        # Confusion Matrix 시각화 및 저장
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')

        # 1. Confusion Matrix (카운트)
        cm_path = os.path.join(args.output_dir, f'confusion_matrix_{model_type}_{timestamp}.png')
        cm = evaluator.plot_confusion_matrix(true_labels, predictions, save_path=cm_path)

        # 2. Normalized Confusion Matrix (비율)
        cm_norm_path = os.path.join(args.output_dir, f'confusion_matrix_normalized_{model_type}_{timestamp}.png')
        evaluator.plot_normalized_confusion_matrix(true_labels, predictions, save_path=cm_norm_path)

        # 3. 리포트 생성
        report_path = os.path.join(args.output_dir, f'evaluation_report_{model_type}_{timestamp}.txt')
        evaluator.generate_report(true_labels, predictions, confidences, save_path=report_path)

        # 4. JSON 결과 저장
        json_path = os.path.join(args.output_dir, f'evaluation_results_{model_type}_{timestamp}.json')
        evaluator.save_results_json(true_labels, predictions, confidences, cm, save_path=json_path)

        print(f"\n✅ {model_type.upper()} 모델 평가 완료!")
        print(f"   결과 저장 위치: {args.output_dir}")


if __name__ == "__main__":
    main()
