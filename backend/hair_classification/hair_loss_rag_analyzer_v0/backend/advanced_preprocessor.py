#!/usr/bin/env python3
"""고급 전처리 기능 추가"""

import cv2
import numpy as np
from PIL import Image, ImageFilter, ImageStat
from typing import Tuple, Optional
import logging

class AdvancedPreprocessor:
    """고급 전처리 기능"""

    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def detect_face_and_crop_hair_region(self, image: Image.Image) -> Tuple[Image.Image, dict]:
        """
        얼굴 감지 후 헤어 영역 크롭
        (추후 OpenCV 얼굴 감지 적용 가능)
        """
        # 현재는 상단 60% 영역을 헤어 영역으로 가정
        width, height = image.size
        hair_region = image.crop((0, 0, width, int(height * 0.6)))

        metadata = {
            'face_detected': False,  # 실제 얼굴 감지 구현시 True
            'hair_region_ratio': 0.6,
            'processing_method': 'top_60_percent'
        }

        return hair_region, metadata

    def normalize_lighting(self, image: Image.Image) -> Image.Image:
        """조명 정규화 (히스토그램 평활화)"""
        # PIL을 OpenCV로 변환
        cv_image = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)

        # LAB 색공간으로 변환
        lab = cv2.cvtColor(cv_image, cv2.COLOR_BGR2LAB)

        # L 채널에 CLAHE 적용 (적응적 히스토그램 평활화)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        lab[:, :, 0] = clahe.apply(lab[:, :, 0])

        # BGR로 다시 변환
        normalized = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)

        # PIL로 다시 변환
        return Image.fromarray(cv2.cvtColor(normalized, cv2.COLOR_BGR2RGB))

    def remove_background_noise(self, image: Image.Image) -> Image.Image:
        """배경 노이즈 제거 (약간의 블러 + 선명화)"""
        # 1. 가우시안 블러로 노이즈 제거
        blurred = image.filter(ImageFilter.GaussianBlur(radius=0.5))

        # 2. 언샤프 마스크로 선명도 복원
        unsharp = image.filter(ImageFilter.UnsharpMask(radius=1, percent=120, threshold=3))

        # 3. 두 이미지를 블렌딩
        return Image.blend(blurred, unsharp, alpha=0.7)

    def check_image_quality(self, image: Image.Image) -> dict:
        """이미지 품질 평가"""
        # 통계 계산
        stat = ImageStat.Stat(image)

        # 밝기 (평균)
        brightness = sum(stat.mean) / len(stat.mean)

        # 대비 (표준편차)
        contrast = sum(stat.stddev) / len(stat.stddev)

        # 채도 계산을 위해 HSV로 변환
        hsv_image = image.convert('HSV')
        hsv_stat = ImageStat.Stat(hsv_image)
        saturation = hsv_stat.mean[1]  # S 채널

        # 품질 점수 계산 (0-100)
        quality_score = min(100, (contrast / 2.55) + (saturation / 2.55))

        return {
            'brightness': brightness,
            'contrast': contrast,
            'saturation': saturation,
            'quality_score': quality_score,
            'is_good_quality': quality_score > 40  # 임계값
        }

    def apply_hair_specific_enhancement(self, image: Image.Image) -> Image.Image:
        """탈모 분석에 특화된 이미지 개선"""
        # 1. 조명 정규화
        normalized = self.normalize_lighting(image)

        # 2. 배경 노이즈 제거
        denoised = self.remove_background_noise(normalized)

        # 3. 헤어 영역 크롭
        hair_cropped, _ = self.detect_face_and_crop_hair_region(denoised)

        return hair_cropped

    def data_augmentation_for_training(self, image: Image.Image) -> list:
        """학습용 데이터 증강 (파인콘 업로드 전 적용 가능)"""
        augmented_images = []

        # 원본
        augmented_images.append(('original', image))

        # 약간의 회전 (-5도 ~ +5도)
        for angle in [-3, 3]:
            rotated = image.rotate(angle, expand=False, fillcolor=(255, 255, 255))
            augmented_images.append((f'rotated_{angle}', rotated))

        # 밝기 조정
        from PIL import ImageEnhance
        for factor in [0.9, 1.1]:
            enhancer = ImageEnhance.Brightness(image)
            adjusted = enhancer.enhance(factor)
            augmented_images.append((f'brightness_{factor}', adjusted))

        return augmented_images


# 통합 전처리 파이프라인
class ComprehensivePreprocessor:
    """종합 전처리 파이프라인"""

    def __init__(self,
                 target_size: Tuple[int, int] = (224, 224),
                 apply_advanced: bool = True,
                 quality_threshold: float = 40.0):
        self.target_size = target_size
        self.apply_advanced = apply_advanced
        self.quality_threshold = quality_threshold
        self.advanced = AdvancedPreprocessor()

    def process_for_pinecone(self, image_path: str) -> Tuple[Image.Image, dict]:
        """파인콘용 종합 전처리"""
        # 1. 이미지 로드
        image = Image.open(image_path).convert('RGB')

        # 2. 품질 평가
        quality_info = self.advanced.check_image_quality(image)

        # 3. 고급 전처리 적용 (옵션)
        if self.apply_advanced:
            if quality_info['quality_score'] < self.quality_threshold:
                image = self.advanced.apply_hair_specific_enhancement(image)
                processing_applied = 'advanced_enhancement'
            else:
                # 기본 전처리만 적용
                image = self.advanced.normalize_lighting(image)
                processing_applied = 'basic_normalization'
        else:
            processing_applied = 'none'

        # 4. 크기 조정
        from PIL import ImageOps
        image = ImageOps.fit(image, self.target_size, Image.LANCZOS)

        # 5. 메타데이터 구성
        metadata = {
            'quality_info': quality_info,
            'processing_applied': processing_applied,
            'final_size': self.target_size,
            'ready_for_pinecone': True
        }

        return image, metadata


def test_advanced_preprocessing():
    """고급 전처리 테스트"""
    print("=== 고급 전처리 테스트 ===")

    # 종합 전처리기 생성
    processor = ComprehensivePreprocessor(
        target_size=(224, 224),
        apply_advanced=True,
        quality_threshold=40.0
    )

    # 테스트 이미지
    test_image = "C:/Users/301/Desktop/test1/male/stage_1/20231102125902gnLbcj_jpg.rf.653ed95656087444ae21c7e6d45bd469-top.jpg"

    if os.path.exists(test_image):
        processed_image, metadata = processor.process_for_pinecone(test_image)

        print("처리 결과:")
        print(f"품질 점수: {metadata['quality_info']['quality_score']:.1f}")
        print(f"적용된 처리: {metadata['processing_applied']}")
        print(f"최종 크기: {metadata['final_size']}")
        print(f"파인콘 준비 완료: {metadata['ready_for_pinecone']}")

        # 결과 이미지 저장 (옵션)
        output_path = "C:/Users/301/Desktop/test_advanced_output.jpg"
        processed_image.save(output_path)
        print(f"처리된 이미지 저장: {output_path}")
    else:
        print("테스트 이미지를 찾을 수 없습니다.")


if __name__ == "__main__":
    import os
    test_advanced_preprocessing()