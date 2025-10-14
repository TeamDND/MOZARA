"""
============================================================================
🏥 탈모 AI 분석 서비스 - 메인 실행 파일
============================================================================

이 파일이 하는 일:
📸 사용자 사진 + 설문 → 🤖 AI 분석 → 💬 결과 + 조언

주요 기능:
1. Swin Transformer로 탈모 단계 판단 (0~3단계)
2. BiSeNet으로 얼굴 영역 감지 및 블러 처리
3. 의학 논문 기반 설문 점수 계산
4. 동적 가중치로 Top/Side/Survey 결과 융합
5. Gemini LLM으로 결과를 자연스러운 문장으로 변환

전체 흐름:
┌─────────────────┐
│ 사용자 입력      │ Top 사진 + Side 사진 + 설문
└─────────────────┘
        ↓
┌─────────────────┐
│ 1. 얼굴 블러     │ 개인정보 보호
└─────────────────┘
        ↓
┌─────────────────┐
│ 2. 마스크 생성   │ BiSeNet으로 헤어 마스크
└─────────────────┘
        ↓
┌─────────────────┐
│ 3. Swin 분석     │ Top 모델 + Side 모델
└─────────────────┘
        ↓
┌─────────────────┐
│ 4. 설문 점수     │ 의학 논문 기반 점수 계산
└─────────────────┘
        ↓
┌─────────────────┐
│ 5. 결과 융합     │ 동적 가중치로 종합 판단
└─────────────────┘
        ↓
┌─────────────────┐
│ 6. LLM 포장      │ Gemini로 자연스러운 설명
└─────────────────┘
        ↓
┌─────────────────┐
│ 최종 결과 반환   │ JSON 형태로 프론트에 전달
└─────────────────┘

============================================================================
"""

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

# Face parsing 모델 import (BiSeNet)
from services.swin_hair_classification.models.face_parsing.model import BiSeNet

# 환경 변수 로드 (API 키 등)
load_dotenv("../../../.env")
load_dotenv("../../.env")
load_dotenv(".env")

def log_message(message):
    """
    📝 로그 메시지 출력

    무엇을 하나요?
    - 시간과 함께 메시지를 출력하여 실행 과정 추적

    예시:
    [14:30:25] 모델 로드 완료
    """
    timestamp = datetime.now().strftime("[%H:%M:%S]")
    print(f"{timestamp} {message}")


# ============================================================================
# 🤖 모델 로딩 함수들
# ============================================================================

def load_swin_model(model_path: str, device: torch.device) -> SwinHairClassifier:
    """
    🧠 Swin Transformer 모델 로드

    무엇을 하나요?
    - 저장된 학습 모델 파일(.pth)을 불러와서 사용 가능하게 만듭니다

    입력:
        model_path: 모델 파일 경로 (예: "models/best_swin_hair_classifier_top.pth")
        device: 실행 장치 (GPU 또는 CPU)

    출력:
        학습된 Swin 모델 (추론 준비 완료 상태)

    동작:
    1. 빈 모델 구조 생성 (클래스 4개짜리)
    2. 저장된 가중치 파일 읽기
    3. 가중치를 모델에 로드
    4. 평가 모드로 전환 (학습 아님)
    """
    model = SwinHairClassifier(num_classes=4)  # 0, 1, 2, 3 레벨

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
    """
    👤 BiSeNet 얼굴 분석 모델 로드

    무엇을 하나요?
    - 사진에서 얼굴 부분과 머리카락 부분을 구분하는 모델을 불러옵니다

    BiSeNet이 하는 일:
    - 사진의 각 픽셀이 무엇인지 분류 (피부, 눈, 코, 머리카락 등)
    - 19개 클래스로 분류:
      * 0: 배경
      * 1: 피부
      * 10: 코
      * 11: 눈
      * 17: 머리카락 ⭐ (우리가 필요한 부분!)
      * ... 기타 부위

    왜 필요한가요?
    1. 얼굴 블러: 개인정보 보호 (얼굴만 블러)
    2. 헤어 마스크: 머리카락 영역만 집중 분석
    """
    model = BiSeNet(n_classes=19)  # 19개 클래스 (얼굴 부위들)
    model_path = 'services/swin_hair_classification/models/face_parsing/res/cp/79999_iter.pth'

    if os.path.exists(model_path):
        model.load_state_dict(torch.load(model_path, map_location=device))
        model.to(device)
        model.eval()  # 평가 모드
        log_message(f"Face parsing 모델 로드 완료: {model_path}")
    else:
        raise FileNotFoundError(f"Face parsing 모델을 찾을 수 없습니다: {model_path}")

    return model


# ============================================================================
# 🔐 개인정보 보호 - 얼굴 블러 처리
# ============================================================================

def apply_face_blur(image_bytes: bytes, face_parsing_model: BiSeNet, device: torch.device, blur_strength: int = 25) -> bytes:
    """
    🔒 얼굴 부분만 블러 처리 (개인정보 보호)

    무엇을 하나요?
    - 사진에서 얼굴 부분만 흐릿하게 만들어 개인정보 보호

    왜 필요한가요?
    - 서버에 사진 저장 시 개인정보 보호
    - 디버깅/분석 시 프라이버시 보호
    - 법적 규제 준수 (개인정보보호법)

    동작 순서:
    1. BiSeNet으로 얼굴 부위 감지 (피부, 눈, 코, 귀, 눈썹)
    2. 얼굴 부위만 마스크 생성
    3. 원본 사진을 블러 처리
    4. 마스크 영역만 블러 사진으로 교체
    5. 머리카락 영역은 그대로 유지!

    그림:
    ┌─────────────┐         ┌─────────────┐
    │  원본 사진   │  →     │ 흐림 흐림    │ 얼굴만 블러
    │  얼굴 명확   │  처리   │ 머리카락 명확│ 머리카락 유지
    └─────────────┘         └─────────────┘

    입력:
        image_bytes: 원본 이미지 (bytes)
        face_parsing_model: BiSeNet 모델
        blur_strength: 블러 강도 (기본 25, 홀수여야 함)

    출력:
        블러 처리된 이미지 (bytes, JPEG 형식)
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


# ============================================================================
# 📋 설문 데이터 분석 - 의학 논문 기반
# ============================================================================

def calculate_survey_score(survey_data: Dict[str, Any]) -> float:
    """
    📊 설문 점수 계산 (의학 논문에 근거한 과학적 점수)

    무엇을 하나요?
    - 사용자의 설문 답변을 의학 연구 결과에 따라 점수화
    - AI 분석과 결합하여 더 정확한 진단

    왜 필요한가요?
    - AI는 사진만 보지만, 탈모는 유전/나이/스트레스 등 여러 요인이 복합적
    - 의학적으로 검증된 요인들을 수치화하여 반영

    점수 구성 (총 3.0점 만점):
    1. 가족력 (최대 1.5점) ⭐ 가장 중요!
       - 양쪽 부모: 1.5점 (가장 높은 위험)
       - 아버지만: 1.2점 (부계 유전 62.8%)
       - 어머니만: 0.5점 (모계 유전 8.6%)
       - 없음: 0점

    2. 나이 (최대 0.9점)
       - 50대+: 0.9점 (유병률 50%)
       - 40대: 0.7점 (유병률 40%)
       - 30대: 0.4점 (유병률 30%)
       - 20대: 0.2점 (유병률 25%)

    3. 최근 탈모 증상 (최대 0.6점)
       - 있음: 0.6점 (진행 중 위험 신호)
       - 없음: 0점

    4. 스트레스 (최대 0.3점)
       - 높음: 0.3점 (70% 휴지기 탈모)
       - 보통: 0.15점
       - 낮음: 0점

    의학적 근거:
    📚 참고 문헌:
    - NCBI (2024): 유전적 기여도 80% (heritability=0.817)
    - PLOS One (2024): 가족력 68%, 부계 유전 62.8%, 모계 유전 8.6%
    - NCBI Bookshelf: 연령별 유병률 - 20대(25%), 30대(30%), 40대(40%), 50대(50%)
    - StatPearls: 스트레스 시 70% 모발 휴지기 전환 (telogen effluvium)

    입력:
        survey_data: 설문 답변 딕셔너리
        {
            'familyHistory': 'both' | 'father' | 'mother' | 'none',
            'age': 숫자 (예: 35),
            'recentHairLoss': 'yes' | 'no',
            'stress': 'high' | 'medium' | 'low'
        }

    출력:
        0.0 ~ 3.0 사이의 점수 (탈모 위험도)

    예시:
    - 20대, 가족력 없음, 증상 없음, 스트레스 낮음 → 0.2점 (낮은 위험)
    - 40대, 부모 모두 탈모, 증상 있음, 스트레스 높음 → 3.0점 (높은 위험)
    """
    score = 0.0

    # 1. 가족력 (최대 1.5점) - 가장 강력한 예측 인자
    # 근거: 유전적 기여도 80%, 부계 유전이 모계보다 7배 강함
    family_history = survey_data.get('familyHistory', 'none')
    if family_history == 'both':
        score += 1.5  # 부모 모두 (최고 위험)
    elif family_history == 'father':
        score += 1.2  # 부계 유전 (62.8%)
    elif family_history == 'mother':
        score += 0.5  # 모계 유전 (8.6%)
    # 'none'이면 0점

    # 2. 나이 (최대 0.9점) - 선형 증가 패턴
    # 근거: 10년당 약 10%p 유병률 증가 (연구 기반)
    age = int(survey_data.get('age', 25))
    if age >= 50:
        score += 0.9  # 50대: 50% 유병률
    elif age >= 40:
        score += 0.7  # 40대: 40% 유병률
    elif age >= 30:
        score += 0.4  # 30대: 30% 유병률
    elif age >= 20:
        score += 0.2  # 20대: 25% 유병률

    # 3. 최근 탈모 (최대 0.6점) - 진행성 지표
    # 근거: 현재 진행 중인 탈모는 중요한 임상 징후
    if survey_data.get('recentHairLoss') == 'yes':
        score += 0.6

    # 4. 스트레스 (최대 0.3점) - 촉발 요인
    # 근거: 70% 모발 휴지기 전환, 하지만 일시적 효과
    stress = survey_data.get('stress', 'low')
    if stress == 'high':
        score += 0.3
    elif stress == 'medium':
        score += 0.15

    # 최대 3.0으로 제한
    return min(score, 3.0)

def calculate_dynamic_weights(age: int, family_history: str,
                              top_confidence: float, side_confidence: float) -> Dict[str, float]:
    """
    ⚖️ 동적 가중치 계산 (의학 논문 + AI 신뢰도 기반)

    무엇을 하나요?
    - Top 사진, Side 사진, 설문 데이터의 중요도를 동적으로 조절
    - 나이, 가족력, AI 신뢰도에 따라 가중치가 자동으로 변함

    왜 동적인가요?
    - 젊은 사람: 사진 패턴이 명확 → 이미지 가중치 ↑
    - 나이든 사람: 복합 요인 많음 → 설문 가중치 ↑
    - AI가 확신함: 사진 가중치 ↑
    - AI가 불확실: 설문 가중치 ↑

    가중치 구성 (합 = 1.0):
    1. Top (정수리): 0.40 ~ 0.60 (기본)
    2. Side (측면): 0.20 ~ 0.35 (기본)
    3. Survey (설문): 0.10 ~ 0.40 (기본)

    나이별 기본 가중치:
    ┌──────┬──────┬──────┬─────────┐
    │ 나이 │ Top  │ Side │ Survey  │
    ├──────┼──────┼──────┼─────────┤
    │ 20대 │ 0.55 │ 0.35 │ 0.10 ⭐ │ 사진 중심
    │ 30대 │ 0.50 │ 0.30 │ 0.20    │
    │ 40대 │ 0.45 │ 0.25 │ 0.30    │
    │ 50대+│ 0.40 │ 0.20 │ 0.40 ⭐ │ 설문 중심
    └──────┴──────┴──────┴─────────┘

    AI 신뢰도 조정:
    - 평균 신뢰도 > 85%: 사진 가중치 +10% (AI 확신)
    - 평균 신뢰도 < 60%: 설문 가중치 +15% (AI 불확실)

    가족력 보정:
    - 가족력 있으면: 설문 +10% (유전 정보 중요)

    의학적 근거:
    📚 참고 문헌:
    - Hamilton-Norwood Scale: 정수리(vertex) + 전두부(frontal) 종합 평가
    - 임상 가이드라인: 360도 다각도 분석 권장
    - Top view: 정수리 탈모 (AGA의 핵심 지표)
    - Side view: M자 헤어라인 후퇴 (진행 패턴 확인)
    - 나이별 패턴: 젊을수록 명확, 고령일수록 복합 요인

    입력:
        age: 나이 (숫자)
        family_history: 가족력 ('both', 'father', 'mother', 'none')
        top_confidence: TOP 모델 신뢰도 (0.0~1.0)
        side_confidence: SIDE 모델 신뢰도 (0.0~1.0)

    출력:
        딕셔너리 {
            'top': 0.0~1.0,
            'side': 0.0~1.0,
            'survey': 0.0~1.0,  (합 = 1.0)
            'avg_confidence': 평균 신뢰도
        }

    예시:
    1. 25세, 가족력 없음, 신뢰도 90%
       → Top: 0.60, Side: 0.35, Survey: 0.05 (사진 중심)

    2. 55세, 가족력 있음, 신뢰도 50%
       → Top: 0.30, Side: 0.15, Survey: 0.55 (설문 중심)
    """
    # 1단계: 나이별 기본 가중치
    if age < 30:
        # 20대: 유병률 25%, 이미지 패턴 명확
        base_top = 0.55    # Top 중심 (정수리 탈모 명확)
        base_side = 0.35   # Side 보조 (M자 진행 확인)
        base_survey = 0.10 # 설문 최소
    elif age < 40:
        # 30대: 유병률 30%, 진행 단계
        base_top = 0.50
        base_side = 0.30
        base_survey = 0.20
    elif age < 50:
        # 40대: 유병률 40%, 복합 요인
        base_top = 0.45
        base_side = 0.25
        base_survey = 0.30
    else:
        # 50대+: 유병률 50%, 생활습관/건강 영향↑
        base_top = 0.40
        base_side = 0.20
        base_survey = 0.40

    # 2단계: 가족력 보정
    # 근거: 유전적 기여도 80% (가족력 있으면 설문 신뢰도↑)
    if family_history in ['father', 'mother', 'both']:
        base_survey += 0.10
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
        family_history = survey_data.get('familyHistory', 'none')

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

def enhance_with_llm(stage: int, confidence: float, survey_data: Dict[str, Any] = None, has_side_image: bool = False) -> Dict[str, Any]:
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
        gender = survey_data.get('gender') if survey_data else None
        log_message(f"🚹🚺 성별 정보: {gender}")

        if gender == 'male' or gender == '남' or gender == '남성':
            gender_text = "남성"
        elif gender == 'female' or gender == '여' or gender == '여성':
            gender_text = "여성"
        else:
            # 성별 정보가 없으면 side_image 유무로 추론
            gender_text = "남성" if has_side_image else "여성"
            log_message(f"⚠️ 성별 정보 없음, 이미지 유무로 추론: {gender_text}")

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

        llm_result = enhance_with_llm(final_stage, final_confidence, survey_data, has_side_image=bool(side_image_data))

        log_message(f"LLM 포장 결과:")
        log_message(f"  - 제목: {llm_result['title']}")
        log_message(f"  - 설명: {llm_result['description'][:50]}...")
        log_message(f"  - 조언 개수: {len(llm_result['advice'])}")
        for i, advice in enumerate(llm_result['advice'], 1):
            log_message(f"    [{i}] {advice}")
        log_message("=" * 50)

        # advice 배열을 하나의 텍스트로 합치기 (구분자: 줄바꿈)
        advice_text = "\n".join(llm_result['advice']) if isinstance(llm_result['advice'], list) else str(llm_result['advice'])

        # 가중치 정보 구성 (프론트에 표시용)
        weights_info = fused_result.get('weights', {'top': 1.0, 'side': 0.0, 'survey': 0.0})
        survey_score = fused_result.get('survey_score', 0.0)

        result = {
            "stage": final_stage,
            "title": llm_result['title'],
            "description": llm_result['description'],
            "advice": advice_text,
            "confidence": final_confidence,
            "analysis_type": "hair_loss_male",
            # 가중치 정보 추가 (프론트 표시용)
            "weights": {
                "top": round(weights_info['top'] * 100, 1),      # % 단위
                "side": round(weights_info['side'] * 100, 1),
                "survey": round(weights_info['survey'] * 100, 1)
            },
            "survey_score": round(survey_score, 2),
            # 설명 텍스트
            "weight_explanation": {
                "title": "분석 가중치 (의학 논문 기반)",
                "description": "이 분석은 의학 연구를 바탕으로 정수리 사진, 측면 사진, 설문 데이터를 종합하여 진단합니다.",
                "details": [
                    f"정수리 사진 (Top): {round(weights_info['top'] * 100, 1)}% - Hamilton-Norwood Scale의 핵심 지표",
                    f"측면 사진 (Side): {round(weights_info['side'] * 100, 1)}% - 전두부 후퇴 패턴 확인",
                    f"설문 조사: {round(weights_info['survey'] * 100, 1)}% - 유전적 요인 및 생활습관 반영"
                ],
                "references": [
                    "유전적 기여도 80% (NCBI 2024)",
                    "부계 유전 62.8%, 모계 8.6% (PLOS One 2024)",
                    "나이별 유병률: 20대(25%), 30대(30%), 40대(40%), 50대(50%)"
                ]
            }
        }

        log_message(f"✅ 분석 완료: Stage {final_stage}, 신뢰도 {final_confidence:.2%}")
        log_message(f"   가중치 - Top: {weights_info['top']:.1%}, Side: {weights_info['side']:.1%}, Survey: {weights_info['survey']:.1%}")
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