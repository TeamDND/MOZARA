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
from dotenv import load_dotenv
import google.generativeai as genai

# Swin 모델 import
from services.swin_hair_classification.models.swin_hair_classifier import SwinHairClassifier

# Face parsing 모델 import
from services.swin_hair_classification.models.face_parsing.model import BiSeNet

# 환경 변수 로드
load_dotenv("../../../.env")
load_dotenv("../../.env")
load_dotenv(".env")

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

def enhance_with_llm(stage: int, confidence: float, survey_data: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    LLM을 사용하여 분석 결과를 자연스럽고 상세하게 포장
    Args:
        stage: 분석된 탈모 단계 (0-3)
        confidence: 분석 신뢰도
        survey_data: 설문 데이터 (optional)
    Returns: {"title": str, "description": str, "advice": List[str]}
    """
    try:
        # Gemini API 설정 (결과 포장 전용 키 사용)
        api_key = os.getenv("GEMINI_API_KEY_1")
        log_message(f"🔑 API 키 확인: {'존재함' if api_key else '없음'}")

        if not api_key:
            log_message("⚠️ GEMINI_API_KEY_1 없음 - 기본 템플릿 사용")
            return generate_title_and_description_fallback(stage)

        log_message("📡 Gemini API 호출 준비 중...")
        genai.configure(api_key=api_key)

        # 사용 가능한 모델명 시도 (순서대로)
        model_names = [
            'gemini-2.5-pro',
            'gemini-pro',
            'gemini-1.5-pro-latest',
            'models/gemini-pro',
            'gemini-1.0-pro'
        ]

        model = None
        for model_name in model_names:
            try:
                model = genai.GenerativeModel(model_name)
                log_message(f"✅ 모델 로드 성공: {model_name}")
                break
            except Exception as e:
                log_message(f"⚠️ {model_name} 실패: {str(e)[:100]}")
                continue

        if model is None:
            log_message("❌ 모든 모델 로드 실패 - 기본 템플릿 사용")
            return generate_title_and_description_fallback(stage)

        # 설문 데이터 정보 추가
        survey_context = ""
        if survey_data:
            age = survey_data.get('age', '알 수 없음')
            family_history = "있음" if survey_data.get('familyHistory') == 'yes' else "없음"
            recent_loss = "있음" if survey_data.get('recentHairLoss') == 'yes' else "없음"
            stress = survey_data.get('stress', 'low')
            stress_level = {"low": "낮음", "medium": "보통", "high": "높음"}.get(stress, "보통")

            survey_context = f"""
사용자 정보:
- 나이: {age}세
- 가족력: {family_history}
- 최근 탈모 증상: {recent_loss}
- 스트레스 수준: {stress_level}
"""

        # 단계별 기본 정보
        stage_info = {
            0: {"level": "정상", "severity": "건강한 상태"},
            1: {"level": "초기 단계", "severity": "경미한 변화"},
            2: {"level": "중등도", "severity": "진행 중"},
            3: {"level": "심각 단계", "severity": "상당히 진행됨"}
        }
        info = stage_info.get(stage, stage_info[0])

        # 성별 정보 추가
        gender_text = "남성" if survey_data and survey_data.get('gender') == 'male' else "여성"

        # LLM 프롬프트
        prompt = f"""당신은 경험이 풍부한 탈모 전문의입니다. AI 분석 결과와 환자의 설문조사 정보를 종합적으로 분석하여, 환자 개개인에게 맞춤화된 상세한 설명과 조언을 제공해주세요.

AI 분석 결과:
- 성별: {gender_text}
- 탈모 단계: {stage}단계 ({info['level']})
- 심각도: {info['severity']}
- 분석 신뢰도: {confidence:.1%}
{survey_context}

다음 JSON 형식으로만 응답해주세요:
{{
  "title": "환자 상태를 정확히 표현하는 진단명 (15자 이내, 성별 특성 반영)",
  "description": "현재 상태에 대한 상세하고 전문적인 설명 (100-200자). 반드시 **{gender_text} 탈모의 특징**과 설문조사 정보(나이, 가족력, 최근 탈모 증상, 스트레스 수준)를 언급하며 환자의 상황을 구체적으로 분석해주세요. {gender_text} 탈모 패턴(예: 남성은 M자 탈모나 정수리 탈모, 여성은 전체적인 모발 밀도 감소)을 설명에 포함하세요.",
  "advice": [
    "{gender_text} 탈모 특성을 고려한 구체적이고 실천 가능한 조언 1 (30-50자, 환자의 나이/생활습관 고려)",
    "환자 맞춤형 조언 2 (30-50자, 가족력/스트레스 수준 반영)",
    "단계별 필수 관리 방법 조언 3 (30-50자, 즉시 실천 가능한 내용)"
  ]
}}

중요 요구사항:
1. **성별 특성을 반드시 언급**
   - {gender_text} 탈모의 일반적인 패턴 설명
   - {gender_text}에게 흔한 탈모 원인 언급 (예: 남성은 DHT, 여성은 호르몬 변화)
   - {gender_text} 환자에게 적합한 관리 방법 제시

2. 설문조사 정보를 적극적으로 활용하여 개인 맞춤형 설명 작성
   - 나이대별 특성 언급 (예: "30대 {gender_text}으로 탈모가 시작되기 쉬운 시기입니다")
   - 가족력이 있으면 유전적 요인 강조
   - 스트레스 수준이 높으면 스트레스 관리의 중요성 언급
   - 최근 탈모 증상이 있으면 진행 속도 주의사항 설명

3. description은 최소 100자 이상으로 자세하게 작성
   - {gender_text} 탈모의 특징
   - 현재 상태 분석
   - 설문조사 정보와의 연관성
   - 향후 전망 및 관리 필요성

4. advice는 {gender_text} 환자의 상황에 맞는 구체적인 행동 지침 제공
   - 일반적인 조언이 아닌 성별과 개인 상황에 맞춤화된 조언
   - 실천 가능한 구체적인 방법 제시

5. 친절하고 희망적인 톤 유지하되, 정확한 정보 전달
6. 추가 텍스트 없이 JSON만 반환"""

        # LLM 호출
        log_message("🤖 Gemini에 요청 전송 중...")
        response = model.generate_content(prompt)
        response_text = response.text.strip()
        log_message(f"📥 Gemini 응답 수신 완료 (길이: {len(response_text)})")

        # JSON 추출
        import re
        json_match = re.search(r'\{[\s\S]*\}', response_text)
        if not json_match:
            log_message(f"❌ JSON 추출 실패 - 응답 내용: {response_text[:200]}")
            return generate_title_and_description_fallback(stage)

        result = json.loads(json_match.group())

        # 검증
        if not all(key in result for key in ['title', 'description', 'advice']):
            log_message(f"❌ 필드 누락 - 응답: {result}")
            return generate_title_and_description_fallback(stage)

        log_message(f"✅ LLM 포장 완료: {result['title']}")
        return result

    except Exception as e:
        log_message(f"LLM 포장 실패: {e} - 기본 템플릿 사용")
        return generate_title_and_description_fallback(stage)

def generate_title_and_description_fallback(stage: int) -> Dict[str, Any]:
    """LLM 사용 불가 시 기본 템플릿 (기존 함수)"""
    stage_info = {
        0: {
            'title': '정상 - 건강한 모발 상태',
            'description': '현재 탈모 징후가 관찰되지 않는 건강한 모발 상태입니다. 지속적인 관리를 통해 현재 상태를 유지하시기 바랍니다.',
            'advice': generate_advice(0)
        },
        1: {
            'title': '초기 단계 - 경미한 모발 변화',
            'description': '초기 단계의 모발 변화가 감지되었습니다. 적절한 예방 관리와 전문의 상담을 통해 진행을 늦출 수 있습니다.',
            'advice': generate_advice(1)
        },
        2: {
            'title': '중등도 - 진행 중인 탈모',
            'description': '중등도의 탈모가 진행되고 있습니다. 전문적인 치료와 관리가 필요한 시점입니다.',
            'advice': generate_advice(2)
        },
        3: {
            'title': '심각 단계 - 진행된 탈모',
            'description': '상당히 진행된 탈모 상태입니다. 전문의와의 상담을 통한 적극적인 치료가 필요합니다.',
            'advice': generate_advice(3)
        }
    }
    return stage_info.get(stage, stage_info[0])

def generate_title_and_description(stage: int) -> tuple:
    """단계별 제목과 설명 생성 (하위 호환성 유지)"""
    result = generate_title_and_description_fallback(stage)
    return result['title'], result['description']

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
        final_confidence = fused_result['confidence']

        # LLM으로 결과 포장 (설문 데이터 포함)
        log_message("=" * 50)
        log_message("LLM으로 결과 포장 중...")
        log_message(f"입력 정보 - Stage: {final_stage}, Confidence: {final_confidence:.2%}")

        llm_result = enhance_with_llm(final_stage, final_confidence, survey_data)

        log_message(f"LLM 포장 결과:")
        log_message(f"  - 제목: {llm_result['title']}")
        log_message(f"  - 설명: {llm_result['description'][:50]}...")
        log_message(f"  - 조언 개수: {len(llm_result['advice'])}")
        for i, advice in enumerate(llm_result['advice'], 1):
            log_message(f"    [{i}] {advice}")
        log_message("=" * 50)

        # advice 배열을 하나의 텍스트로 합치기 (구분자: 줄바꿈)
        advice_text = "\n".join(llm_result['advice']) if isinstance(llm_result['advice'], list) else str(llm_result['advice'])
        
        result = {
            "stage": final_stage,
            "title": llm_result['title'],
            "description": llm_result['description'],
            "advice": advice_text,
            "confidence": final_confidence,
            "analysis_type": "hairloss"
        }

        log_message(f"✅ 분석 완료: Stage {final_stage}, 신뢰도 {final_confidence:.2%}")
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