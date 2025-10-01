import os
import json
import torch
import torch.nn as nn
from torchvision import transforms
from PIL import Image
import cv2
import numpy as np
import sys
from typing import Dict, Any, List
from datetime import datetime
import io

# Swin 모델 import
from services.swin_hair_classification.models.swin_hair_classifier import SwinHairClassifier

# Face parsing 모델 import
from services.swin_hair_classification.models.face_parsing.model import BiSeNet

def log_message(message):
    """로깅 함수"""
    timestamp = datetime.now().strftime("[%H:%M:%S]")
    print(f"{timestamp} {message}")

def load_swin_model(model_path: str, device: torch.device) -> SwinHairClassifier:
    """Swin 모델 로드"""
    model = SwinHairClassifier(num_classes=4)

    if os.path.exists(model_path):
        checkpoint = torch.load(model_path, map_location=device)
        if 'model_state_dict' in checkpoint:
            model.load_state_dict(checkpoint['model_state_dict'])
        else:
            model.load_state_dict(checkpoint)
        log_message(f"모델 로드 완료: {model_path}")
    else:
        raise FileNotFoundError(f"모델 파일을 찾을 수 없습니다: {model_path}")

    model.to(device)
    model.eval()
    return model

def load_face_parsing_model(device: torch.device) -> BiSeNet:
    """Face parsing 모델 로드 (마스킹용)"""
    model = BiSeNet(n_classes=19)
    model_path = 'services/swin_hair_classification/models/face_parsing/res/cp/79999_iter.pth'

    if os.path.exists(model_path):
        model.load_state_dict(torch.load(model_path, map_location=device))
        model.to(device)
        model.eval()
        log_message(f"Face parsing 모델 로드 완료: {model_path}")
    else:
        raise FileNotFoundError(f"Face parsing 모델을 찾을 수 없습니다: {model_path}")

    return model

def apply_face_blur(image_bytes: bytes, face_parsing_model: BiSeNet, device: torch.device, blur_strength: int = 25) -> bytes:
    """
    얼굴 부분만 블러 처리한 이미지 반환
    Args:
        image_bytes: 원본 이미지의 이진 데이터
        face_parsing_model: Face parsing 모델
        device: 디바이스
        blur_strength: 블러 강도 (기본값 25)
    Returns: 블러 처리된 이미지의 이진 데이터
    """
    try:
        # bytes를 PIL Image로 변환
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        image_np = np.array(image)
        original_size = image_np.shape[:2]  # (height, width)

        # OpenCV 형식으로 변환 및 리사이즈
        image_resized = cv2.resize(image_np, (512, 512))

        # 정규화 및 텐서 변환
        transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize((0.485, 0.456, 0.406), (0.229, 0.224, 0.225))
        ])

        input_tensor = transform(image_resized).unsqueeze(0).to(device)

        # Face Parsing으로 얼굴 마스크 생성
        with torch.no_grad():
            output = face_parsing_model(input_tensor)[0]
            mask = torch.argmax(output, dim=1).squeeze().cpu().numpy()

        # 얼굴 영역 마스크 생성 (클래스: 1=skin, 10=nose, 11=eyes, 12=eyebrows, 13=ears)
        face_mask = np.isin(mask, [1, 10, 11, 12, 13]).astype(np.uint8) * 255

        # 마스크를 원본 크기로 리사이즈
        face_mask_resized = cv2.resize(face_mask, (original_size[1], original_size[0]))

        # 블러 처리할 이미지 생성
        blurred_image = cv2.GaussianBlur(image_np, (blur_strength, blur_strength), 0)

        # 마스크를 3채널로 확장
        face_mask_3ch = cv2.cvtColor(face_mask_resized, cv2.COLOR_GRAY2BGR) / 255.0

        # 얼굴 부분만 블러 적용
        result = (image_np * (1 - face_mask_3ch) + blurred_image * face_mask_3ch).astype(np.uint8)

        # 결과를 bytes로 변환
        result_image = Image.fromarray(result)
        output_buffer = io.BytesIO()
        result_image.save(output_buffer, format='JPEG', quality=90)
        output_buffer.seek(0)

        log_message("얼굴 블러 처리 완료")
        return output_buffer.read()

    except Exception as e:
        log_message(f"얼굴 블러 처리 실패: {e}")
        return image_bytes  # 실패 시 원본 반환

def generate_hair_mask(image_bytes: bytes, face_parsing_model: BiSeNet, device: torch.device) -> np.ndarray:
    """이미지에서 헤어 마스크 생성"""
    try:
        # bytes를 PIL Image로 변환
        image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
        image_np = np.array(image)

        # OpenCV 형식으로 변환 및 리사이즈
        image_resized = cv2.resize(image_np, (512, 512))

        # 정규화 및 텐서 변환
        transform = transforms.Compose([
            transforms.ToTensor(),
            transforms.Normalize((0.485, 0.456, 0.406), (0.229, 0.224, 0.225))
        ])

        input_tensor = transform(image_resized).unsqueeze(0).to(device)

        # 마스크 생성
        with torch.no_grad():
            output = face_parsing_model(input_tensor)[0]
            mask = torch.argmax(output, dim=1).squeeze().cpu().numpy()

        # 헤어 마스크 (클래스 17)
        hair_mask = (mask == 17).astype(np.uint8) * 255
        return hair_mask

    except Exception as e:
        log_message(f"마스크 생성 실패: {e}")
        return np.zeros((512, 512), dtype=np.uint8)

def preprocess_image_with_mask(image_bytes: bytes, mask: np.ndarray) -> torch.Tensor:
    """이미지와 마스크를 전처리하여 6채널 텐서 생성"""
    # 원본 이미지 로드
    image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
    image = image.resize((224, 224))

    # 마스크 리사이즈
    mask_resized = cv2.resize(mask, (224, 224))

    # 이미지 정규화
    transform = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    image_tensor = transform(image)  # [3, 224, 224]

    # 마스크를 3채널로 확장하고 정규화
    mask_normalized = mask_resized.astype(np.float32) / 255.0
    mask_tensor = torch.from_numpy(mask_normalized).unsqueeze(0)  # [1, 224, 224]
    mask_tensor = mask_tensor.repeat(3, 1, 1)  # [3, 224, 224]

    # 6채널 결합
    combined = torch.cat([image_tensor, mask_tensor], dim=0)  # [6, 224, 224]

    return combined

def analyze_single_image(image_bytes: bytes, model: SwinHairClassifier,
                        face_parsing_model: BiSeNet, device: torch.device) -> Dict[str, Any]:
    """단일 이미지 분석"""
    try:
        # 1. 마스크 생성
        mask = generate_hair_mask(image_bytes, face_parsing_model, device)

        # 2. 전처리
        input_tensor = preprocess_image_with_mask(image_bytes, mask)
        input_tensor = input_tensor.unsqueeze(0).to(device)  # [1, 6, 224, 224]

        # 3. 예측
        with torch.no_grad():
            outputs = model(input_tensor)
            probabilities = torch.softmax(outputs, dim=1)
            predicted_class = torch.argmax(outputs, dim=1).item()
            confidence = probabilities[0][predicted_class].item()

        return {
            'level': predicted_class,
            'confidence': confidence,
            'probabilities': probabilities[0].cpu().numpy().tolist()
        }

    except Exception as e:
        log_message(f"이미지 분석 실패: {e}")
        return None

def calculate_survey_score(survey_data: Dict[str, Any]) -> float:
    """
    설문 데이터를 기반으로 위험도 점수 계산 (0-3 범위)
    """
    score = 0.0

    # 나이 (0-0.5)
    age = int(survey_data.get('age', 25))
    if age >= 50:
        score += 0.5
    elif age >= 40:
        score += 0.3
    elif age >= 30:
        score += 0.1

    # 가족력 (0-0.8)
    if survey_data.get('familyHistory') == 'yes':
        score += 0.8

    # 최근 탈모 (0-0.8)
    if survey_data.get('recentHairLoss') == 'yes':
        score += 0.8

    # 스트레스 (0-0.5)
    stress = survey_data.get('stress', 'low')
    if stress == 'high':
        score += 0.5
    elif stress == 'medium':
        score += 0.25

    # 0-3 범위로 정규화 (최대 2.6이므로 약간 조정)
    normalized_score = min(score * (3.0 / 2.6), 3.0)

    return normalized_score

def calculate_dynamic_weights(age: int, family_history: str,
                              top_confidence: float, side_confidence: float) -> Dict[str, float]:
    """
    나이/증상별 + 신뢰도 기반 동적 가중치 계산 (B + C 결합)
    """
    # 1단계: 나이별 기본 가중치 (B)
    if age < 30:
        base_top = 0.6
        base_side = 0.4
        base_survey = 0.0
    elif age < 50:
        base_top = 0.5
        base_side = 0.35
        base_survey = 0.15
    else:  # 50대 이상
        base_top = 0.45
        base_side = 0.3
        base_survey = 0.25

    # 가족력이 있으면 설문 가중치 증가
    if family_history == 'yes':
        base_survey += 0.1
        base_top -= 0.05
        base_side -= 0.05

    # 2단계: 신뢰도 기반 동적 조정 (C)
    # Swin 모델의 평균 신뢰도
    avg_swin_confidence = (top_confidence + side_confidence) / 2.0

    if avg_swin_confidence > 0.85:  # AI가 확신함
        adjustment = 0.1
        final_top = base_top + adjustment * 0.6
        final_side = base_side + adjustment * 0.4
        final_survey = max(0, base_survey - adjustment)
    elif avg_swin_confidence < 0.6:  # AI가 불확실
        adjustment = 0.15
        final_top = base_top - adjustment * 0.6
        final_side = base_side - adjustment * 0.4
        final_survey = base_survey + adjustment
    else:  # 보통
        final_top = base_top
        final_side = base_side
        final_survey = base_survey

    # 가중치 합이 1이 되도록 정규화
    total = final_top + final_side + final_survey
    final_top /= total
    final_side /= total
    final_survey /= total

    return {
        'top': final_top,
        'side': final_side,
        'survey': final_survey,
        'avg_confidence': avg_swin_confidence
    }

def fuse_results(top_result: Dict[str, Any], side_result: Dict[str, Any] = None,
                survey_data: Dict[str, Any] = None) -> Dict[str, Any]:
    """Top과 Side 결과를 융합 (B+C 동적 가중치 시스템)"""
    # Top만 있는 경우 (여성) - 설문 데이터 없으면 단순 반환
    if not side_result:
        if top_result:
            return {
                'stage': top_result['level'],
                'confidence': top_result['confidence'],
                'source': 'single_model_top',
                'weights': {'top': 1.0, 'side': 0.0, 'survey': 0.0}
            }
        else:
            return {'stage': 0, 'confidence': 0.5, 'source': 'error'}

    # Side만 있는 경우 (드문 경우)
    if not top_result:
        return {
            'stage': side_result['level'],
            'confidence': side_result['confidence'],
            'source': 'single_model_side',
            'weights': {'top': 0.0, 'side': 1.0, 'survey': 0.0}
        }

    # 둘 다 있는 경우 (남성) - B+C 동적 가중치 적용
    top_stage = top_result['level']
    side_stage = side_result['level']
    top_confidence = top_result['confidence']
    side_confidence = side_result['confidence']

    # 설문 데이터가 있으면 동적 가중치 계산
    if survey_data:
        age = int(survey_data.get('age', 25))
        family_history = survey_data.get('familyHistory', 'no')

        # B+C 결합: 동적 가중치 계산
        weights = calculate_dynamic_weights(age, family_history, top_confidence, side_confidence)

        # 설문 점수 계산
        survey_score = calculate_survey_score(survey_data)

        # 최종 stage 계산 (가중 평균)
        weighted_stage = (
            top_stage * weights['top'] +
            side_stage * weights['side'] +
            survey_score * weights['survey']
        )
        final_stage = round(weighted_stage)

        # 신뢰도 계산
        final_confidence = (
            top_confidence * weights['top'] +
            side_confidence * weights['side'] +
            0.7 * weights['survey']  # 설문은 70% 신뢰도로 가정
        )

        log_message(f"동적 가중치 - Top: {weights['top']:.2f}, Side: {weights['side']:.2f}, Survey: {weights['survey']:.2f}")
        log_message(f"Stage 계산 - Top: {top_stage}, Side: {side_stage}, Survey: {survey_score:.2f} → Final: {final_stage}")

        return {
            'stage': final_stage,
            'confidence': final_confidence,
            'top_result': top_result,
            'side_result': side_result,
            'survey_score': survey_score,
            'weights': weights,
            'source': 'dynamic_weighted'
        }
    else:
        # 설문 데이터가 없으면 기본 가중치 사용
        top_weight = 0.6
        side_weight = 0.4

        weighted_stage = (top_stage * top_weight + side_stage * side_weight)
        final_stage = round(weighted_stage)

        final_confidence = (top_confidence * top_weight + side_confidence * side_weight)

        return {
            'stage': final_stage,
            'confidence': final_confidence,
            'top_result': top_result,
            'side_result': side_result,
            'weights': {'top': top_weight, 'side': side_weight, 'survey': 0.0},
            'source': 'dual_model'
        }

def generate_advice(stage: int) -> List[str]:
    """단계별 조언 생성"""
    advice_map = {
        0: [
            "현재 건강한 모발 상태를 유지하고 있습니다.",
            "예방 차원에서 규칙적인 두피 마사지를 권장합니다.",
            "균형 잡힌 영양 섭취와 충분한 수면을 유지하세요."
        ],
        1: [
            "초기 단계의 모발 변화가 감지되었습니다.",
            "전문의 상담을 통한 정확한 진단을 받아보세요.",
            "탈모 예방 샴푸 사용과 두피 케어를 시작하세요."
        ],
        2: [
            "중등도의 탈모 진행이 확인되었습니다.",
            "피부과 전문의 방문을 강력히 권장합니다.",
            "미녹시딜 등의 치료제 사용을 고려해보세요."
        ],
        3: [
            "진행된 탈모 상태입니다.",
            "즉시 전문의 진료를 받으시기 바랍니다.",
            "모발이식이나 기타 치료 옵션을 상담받아보세요."
        ]
    }
    return advice_map.get(stage, advice_map[0])

def generate_title_and_description(stage: int) -> tuple:
    """단계별 제목과 설명 생성"""
    stage_info = {
        0: {
            'title': '정상 - 건강한 모발 상태',
            'description': '현재 탈모 징후가 관찰되지 않는 건강한 모발 상태입니다. 지속적인 관리를 통해 현재 상태를 유지하시기 바랍니다.'
        },
        1: {
            'title': '초기 단계 - 경미한 모발 변화',
            'description': '초기 단계의 모발 변화가 감지되었습니다. 적절한 예방 관리와 전문의 상담을 통해 진행을 늦출 수 있습니다.'
        },
        2: {
            'title': '중등도 - 진행 중인 탈모',
            'description': '중등도의 탈모가 진행되고 있습니다. 전문적인 치료와 관리가 필요한 시점입니다.'
        },
        3: {
            'title': '심각 단계 - 진행된 탈모',
            'description': '상당히 진행된 탈모 상태입니다. 전문의와의 상담을 통한 적극적인 치료가 필요합니다.'
        }
    }
    info = stage_info.get(stage, stage_info[0])
    return info['title'], info['description']

# 글로벌 모델 변수 (모델 로딩 최적화)
_side_model = None
_top_model = None
_face_parsing_model = None
_device = None

def initialize_models():
    """모델들을 초기화 (한 번만 로드)"""
    global _side_model, _top_model, _face_parsing_model, _device

    if _side_model is None:
        _device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        log_message(f"사용 디바이스: {_device}")

        # 모델 경로
        side_model_path = 'services/swin_hair_classification/models/best_swin_hair_classifier_side.pth'
        top_model_path = 'services/swin_hair_classification/models/best_swin_hair_classifier_top.pth'

        # 모델 로드
        _side_model = load_swin_model(side_model_path, _device)
        _top_model = load_swin_model(top_model_path, _device)
        _face_parsing_model = load_face_parsing_model(_device)

        log_message("모든 모델 초기화 완료")

def analyze_hair_with_swin(top_image_data: bytes, side_image_data: bytes = None,
                          survey_data: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Swin 모델로 이미지 분석을 수행하고 표준 결과를 반환합니다.
    Args:
        top_image_data: Top view 이미지의 이진(bytes) 데이터
        side_image_data: Side view 이미지의 이진(bytes) 데이터 (optional, 여성의 경우 None)
        survey_data: 설문 데이터 (optional, 동적 가중치 계산에 사용)
    Returns: {"stage": int, "title": str, "description": str, "advice": List[str]}
    """
    try:
        # 모델 초기화 (처음 한 번만)
        initialize_models()

        log_message("Swin 모델 분석 시작")
        if survey_data:
            log_message(f"설문 데이터: 나이={survey_data.get('age')}, 가족력={survey_data.get('familyHistory')}")

        # Top 이미지 분석
        log_message("Top view 분석 중...")
        top_result = analyze_single_image(top_image_data, _top_model, _face_parsing_model, _device)

        # Side 이미지 분석 (있는 경우만)
        side_result = None
        if side_image_data:
            log_message("Side view 분석 중...")
            side_result = analyze_single_image(side_image_data, _side_model, _face_parsing_model, _device)
        else:
            log_message("Side view 이미지 없음 (여성 분석)")

        # 결과 융합 (설문 데이터 포함)
        log_message("결과 융합 중...")
        fused_result = fuse_results(top_result, side_result, survey_data)

        # 최종 결과 구성
        final_stage = fused_result['stage']
        title, description = generate_title_and_description(final_stage)
        advice = generate_advice(final_stage)

        result = {
            "stage": final_stage,
            "title": title,
            "description": description,
            "advice": advice,
            "confidence": fused_result['confidence'],
            "analysis_type": "hairloss"
        }

        log_message(f"분석 완료: Stage {final_stage}, 신뢰도 {fused_result['confidence']:.2%}")
        return result

    except Exception as e:
        log_message(f"Swin 분석 중 오류: {e}")
        import traceback
        traceback.print_exc()

        # 오류 시 기본 결과 반환
        return {
            "stage": 0,
            "title": "분석 오류 발생",
            "description": "이미지 분석 중 오류가 발생했습니다. 다시 시도해주세요.",
            "advice": ["이미지를 다시 업로드해주세요.", "문제가 지속되면 관리자에게 문의하세요."],
            "confidence": 0.0,
            "analysis_type": "error"
        }