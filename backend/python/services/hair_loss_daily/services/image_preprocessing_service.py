"""
사용자 이미지 전처리 서비스
의료용 이미지 수준으로 일반 사진을 전처리하여 도메인 갭 해결
"""
import cv2
import numpy as np
from PIL import Image
import io
from typing import Tuple, Optional
import logging
from ..utils.image_statistics import image_statistics_processor

logger = logging.getLogger(__name__)

class ImagePreprocessingService:
    """사용자 이미지 전처리 서비스"""
    
    def __init__(self):
        self.medical_resolution = (512, 512)  # 의료 이미지 해상도 (더 높게)
        self.target_contrast = 1.05  # 의료 이미지 수준 대비 (약하게)
        self.reflection_threshold = 120  # 빛 반사 감지 임계값 (매우 엄격하게)
        
        # 도메인 적응 설정 (과적합 방지)
        self.enable_statistical_normalization = False  # 통계적 정규화 비활성화
        self.enable_enhanced_lighting = True  # 조명 정규화 유지 (빛 반사 처리용)
        self.enable_light_reflection_handling = True  # 빛 반사 처리 활성화
        self.lighting_strength = 0.1  # 조명 정규화 강도 10%로 더 감소
        self.medical_stats_path = "data/medical_dataset_stats.json"
        
    def preprocess_for_medical_analysis(self, image_bytes: bytes) -> bytes:
        """의료용 이미지 수준으로 전처리 (확대 중심)"""
        try:
            print("🔧 전처리 시작: 원본 이미지 크기", len(image_bytes), "bytes")
            
            # 1. 이미지 로드
            image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
            image_array = np.array(image)
            print(f"🔧 이미지 로드 완료: {image_array.shape}")
            
            # 2. 해상도 업스케일링 (의료용 고해상도)
            original_shape = image_array.shape
            image_array = self._upscale_to_medical_resolution(image_array)
            print(f"🔧 해상도 업스케일링: {original_shape} → {image_array.shape}")
            
            # 3. 통계적 정규화 (도메인 적응)
            if self.enable_statistical_normalization:
                image_array = self._apply_statistical_normalization(image_array)
            
            # 4. 빛 반사 처리 (비듬 오인 방지)
            if self.enable_light_reflection_handling:
                image_array = self._handle_light_reflection(image_array)
            
            # 5. 이미지 품질 향상 (의료용 수준)
            image_array = self._enhance_medical_quality(image_array)
            
            # 6. 최종 정규화 (0-255 범위 보장)
            image_array = self._final_normalization(image_array)
            
            # 6. PIL Image로 변환 후 bytes 반환
            processed_image = Image.fromarray(image_array.astype(np.uint8))
            output_buffer = io.BytesIO()
            processed_image.save(output_buffer, format='JPEG', quality=95)
            
            processed_bytes = output_buffer.getvalue()
            print(f"🔧 전처리 완료: {len(processed_bytes)} bytes")
            
            return processed_bytes
            
        except Exception as e:
            logger.error(f"이미지 전처리 실패: {str(e)}")
            return image_bytes  # 실패 시 원본 반환
    
    def _upscale_to_medical_resolution(self, image: np.ndarray) -> np.ndarray:
        """의료 이미지 수준으로 해상도 조정"""
        try:
            # 현재 해상도 확인
            current_height, current_width = image.shape[:2]
            print(f"🔧 현재 해상도: {current_width}x{current_height}")
            
            # 의료 이미지 수준으로 조정 (512x512)
            target_width, target_height = self.medical_resolution
            
            # 비율 유지하면서 리사이징
            scale_factor = min(
                target_width / current_width,
                target_height / current_height
            )
            
            new_width = int(current_width * scale_factor)
            new_height = int(current_height * scale_factor)
            
            print(f"🔧 리사이징: {current_width}x{current_height} → {new_width}x{new_height} (스케일: {scale_factor:.2f})")
            
            # 고품질 리사이징 (LANCZOS4)
            image = cv2.resize(image, (new_width, new_height), interpolation=cv2.INTER_LANCZOS4)
            
            return image
            
        except Exception as e:
            logger.warning(f"해상도 조정 실패: {str(e)}")
            return image
    
    def _apply_statistical_normalization(self, image: np.ndarray) -> np.ndarray:
        """통계적 정규화 적용 (도메인 적응)"""
        try:
            print("🔧 통계적 정규화 시작...")
            
            # 통계적 정규화 적용
            normalized_image = image_statistics_processor.apply_statistical_normalization(image)
            
            # 히스토그램 매칭도 적용
            matched_image = image_statistics_processor.apply_histogram_matching(normalized_image)
            
            print("🔧 통계적 정규화 완료")
            return matched_image
            
        except Exception as e:
            logger.warning(f"통계적 정규화 실패: {str(e)}")
            return image
    
    def _normalize_lighting(self, image: np.ndarray) -> np.ndarray:
        """조명 정규화 (과적합 방지 - 약한 적용)"""
        try:
            if not self.enable_enhanced_lighting:
                # 기본 CLAHE만 적용
                return self._apply_basic_clahe(image)
            
            print("🔧 조명 정규화 시작 (약한 적용)...")
            
            # 기본 CLAHE 적용
            image = self._apply_basic_clahe(image)
            
            # 조명 강도에 따라 선택적 적용
            if self.lighting_strength > 0.5:
                # 1. Retinex 이론 기반 조명 분리 (약하게)
                image = self._apply_retinex_lighting_weak(image)
            
            if self.lighting_strength > 0.7:
                # 2. 의료용 조명 조건 시뮬레이션 (약하게)
                image = self._simulate_medical_lighting_weak(image)
            
            print("🔧 조명 정규화 완료 (약한 적용)")
            return image
            
        except Exception as e:
            logger.warning(f"조명 정규화 실패: {str(e)}")
            return self._apply_basic_clahe(image)
    
    def _apply_basic_clahe(self, image: np.ndarray) -> np.ndarray:
        """기본 CLAHE 적용"""
        try:
            # LAB 색공간으로 변환
            lab = cv2.cvtColor(image, cv2.COLOR_RGB2LAB)
            l, a, b = cv2.split(lab)
            
            # CLAHE 적용
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            l = clahe.apply(l)
            
            # LAB 색공간으로 다시 결합
            lab = cv2.merge([l, a, b])
            return cv2.cvtColor(lab, cv2.COLOR_LAB2RGB)
            
        except Exception as e:
            logger.warning(f"기본 CLAHE 실패: {str(e)}")
            return image
    
    def _apply_retinex_lighting(self, image: np.ndarray) -> np.ndarray:
        """Retinex 이론 기반 조명 분리"""
        try:
            # 단순한 Retinex 구현 (Gaussian blur 기반)
            # 조명 성분 추출
            illumination = cv2.GaussianBlur(image, (15, 15), 0)
            illumination = illumination.astype(np.float32) + 1e-8  # 0으로 나누기 방지
            
            # 반사 성분 계산 (원본 / 조명)
            reflectance = image.astype(np.float32) / illumination
            
            # 조명 성분 정규화
            illumination_normalized = cv2.normalize(illumination, None, 0, 255, cv2.NORM_MINMAX)
            
            # 정규화된 조명과 반사 성분 결합
            enhanced = reflectance * illumination_normalized
            
            return np.clip(enhanced, 0, 255).astype(np.uint8)
            
        except Exception as e:
            logger.warning(f"Retinex 조명 분리 실패: {str(e)}")
            return image
    
    def _apply_retinex_lighting_weak(self, image: np.ndarray) -> np.ndarray:
        """약한 Retinex 조명 분리 (과적합 방지)"""
        try:
            # 더 약한 Gaussian blur 적용
            illumination = cv2.GaussianBlur(image, (9, 9), 0)  # 15 → 9로 감소
            illumination = illumination.astype(np.float32) + 1e-8
            
            # 반사 성분 계산
            reflectance = image.astype(np.float32) / illumination
            
            # 조명 성분 정규화 (약하게)
            illumination_normalized = cv2.normalize(illumination, None, 0, 255, cv2.NORM_MINMAX)
            
            # 원본과 블렌딩 (50%만 적용)
            enhanced = reflectance * illumination_normalized
            result = 0.5 * image.astype(np.float32) + 0.5 * enhanced
            
            return np.clip(result, 0, 255).astype(np.uint8)
            
        except Exception as e:
            logger.warning(f"약한 Retinex 조명 분리 실패: {str(e)}")
            return image
    
    def _simulate_medical_lighting(self, image: np.ndarray) -> np.ndarray:
        """의료용 조명 조건 시뮬레이션"""
        try:
            # 의료 데이터셋의 조명 특성 가져오기
            medical_lighting = image_statistics_processor.get_medical_lighting_target()
            if not medical_lighting:
                return image
            
            # 현재 이미지의 조명 특성
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            current_brightness = np.mean(gray)
            target_brightness = medical_lighting["brightness_mean"]
            
            # 밝기 조정
            brightness_ratio = target_brightness / current_brightness if current_brightness > 0 else 1.0
            adjusted_image = image.astype(np.float32) * brightness_ratio
            
            # 대비 조정
            current_contrast = np.std(gray) / np.mean(gray) if np.mean(gray) > 0 else 0
            target_contrast = medical_lighting["contrast"]
            
            if current_contrast > 0:
                contrast_ratio = target_contrast / current_contrast
                # 대비 조정 (중앙값 기준)
                mean_val = np.mean(adjusted_image)
                adjusted_image = (adjusted_image - mean_val) * contrast_ratio + mean_val
            
            return np.clip(adjusted_image, 0, 255).astype(np.uint8)
            
        except Exception as e:
            logger.warning(f"의료용 조명 시뮬레이션 실패: {str(e)}")
            return image
    
    def _simulate_medical_lighting_weak(self, image: np.ndarray) -> np.ndarray:
        """약한 의료용 조명 시뮬레이션 (과적합 방지)"""
        try:
            # 의료 데이터셋의 조명 특성 가져오기
            medical_lighting = image_statistics_processor.get_medical_lighting_target()
            if not medical_lighting:
                return image
            
            # 현재 이미지의 조명 특성
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            current_brightness = np.mean(gray)
            target_brightness = medical_lighting["brightness_mean"]
            
            # 밝기 조정 (약하게 - 30%만 적용)
            brightness_ratio = target_brightness / current_brightness if current_brightness > 0 else 1.0
            brightness_ratio = 1.0 + (brightness_ratio - 1.0) * 0.3  # 30%만 적용
            
            adjusted_image = image.astype(np.float32) * brightness_ratio
            
            # 대비 조정 (약하게 - 20%만 적용)
            current_contrast = np.std(gray) / np.mean(gray) if np.mean(gray) > 0 else 0
            target_contrast = medical_lighting["contrast"]
            
            if current_contrast > 0:
                contrast_ratio = target_contrast / current_contrast
                contrast_ratio = 1.0 + (contrast_ratio - 1.0) * 0.2  # 20%만 적용
                
                # 대비 조정 (중앙값 기준)
                mean_val = np.mean(adjusted_image)
                adjusted_image = (adjusted_image - mean_val) * contrast_ratio + mean_val
            
            # 원본과 블렌딩 (70% 원본 + 30% 조정된 이미지)
            result = 0.7 * image.astype(np.float32) + 0.3 * adjusted_image
            
            return np.clip(result, 0, 255).astype(np.uint8)
            
        except Exception as e:
            logger.warning(f"약한 의료용 조명 시뮬레이션 실패: {str(e)}")
            return image
    
    def _remove_shadows_uniform_lighting(self, image: np.ndarray) -> np.ndarray:
        """그림자 제거 및 균일 조명"""
        try:
            # LAB 색공간으로 변환
            lab = cv2.cvtColor(image, cv2.COLOR_RGB2LAB)
            l, a, b = cv2.split(lab)
            
            # L 채널에서 그림자 감지 및 제거
            # Morphological opening으로 그림자 영역 감지
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
            opening = cv2.morphologyEx(l, cv2.MORPH_OPEN, kernel)
            
            # 그림자 마스크 생성 (어두운 영역)
            shadow_threshold = np.mean(l) * 0.7
            shadow_mask = l < shadow_threshold
            
            # 그림자 영역 밝기 조정
            l_corrected = l.copy()
            l_corrected[shadow_mask] = l_corrected[shadow_mask] * 1.3  # 30% 밝게
            
            # CLAHE로 균일 조명
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
            l_corrected = clahe.apply(l_corrected)
            
            # LAB 색공간으로 다시 결합
            lab_corrected = cv2.merge([l_corrected, a, b])
            return cv2.cvtColor(lab_corrected, cv2.COLOR_LAB2RGB)
            
        except Exception as e:
            logger.warning(f"그림자 제거 실패: {str(e)}")
            return image
    
    def _handle_light_reflection(self, image: np.ndarray) -> np.ndarray:
        """빛 반사 처리 (비듬 오인 방지 - 약한 적용)"""
        try:
            # 그레이스케일로 변환
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            
            # 1차: 기본 임계값으로 빛 반사 영역 감지 (더 높은 임계값)
            reflection_mask = gray > 150  # 120 → 150으로 높여서 더 엄격하게
            
            # 2차: 더 정교한 감지 (주변과의 대비가 큰 밝은 영역)
            if np.any(reflection_mask):
                # 주변 평균과의 차이가 큰 영역 추가 감지 (더 엄격하게)
                kernel = np.ones((5, 5), np.float32) / 25
                local_mean = cv2.filter2D(gray.astype(np.float32), -1, kernel)
                contrast_mask = (gray.astype(np.float32) - local_mean) > 30  # 20 → 30으로 더 엄격하게
                
                # 3차: 추가 빛 반사 감지 (더 높은 임계값)
                bright_mask = gray > 140  # 100 → 140으로 높여서 더 엄격하게
                
                # 모든 마스크 결합
                combined_mask = reflection_mask | contrast_mask | bright_mask
                
                if np.any(combined_mask):
                    # 빛 반사 영역을 주변 픽셀의 평균으로 보정
                    image_corrected = image.copy()
                    
                    # 각 채널별로 보정
                    for channel in range(3):
                        channel_data = image[:, :, channel]
                        
                        # 빛 반사 영역의 값을 주변 평균으로 대체
                        if np.any(combined_mask):
                            # 주변 픽셀의 평균값 계산 (더 큰 커널로 더 자연스럽게)
                            kernel = np.ones((9, 9), np.float32) / 81  # 7x7 → 9x9로 더 크게
                            blurred = cv2.filter2D(channel_data.astype(np.float32), -1, kernel)
                            
                            # 빛 반사 영역만 보정 (약하게)
                            channel_data[combined_mask] = blurred[combined_mask] * 0.1  # 0.3 → 0.1로 약하게
                            image_corrected[:, :, channel] = channel_data
                    
                    logger.info(f"빛 반사 영역 {np.sum(combined_mask)}개 픽셀 보정 완료 (약한 적용)")
                    return image_corrected
            
            return image
            
        except Exception as e:
            logger.warning(f"빛 반사 처리 실패: {str(e)}")
            return image
    
    def _enhance_medical_quality(self, image: np.ndarray) -> np.ndarray:
        """의료용 이미지 품질 향상 (확대 중심)"""
        try:
            # 1. 조명 정규화 (의료용 조명 조건으로)
            image = self._normalize_lighting(image)
            
            # 2. 대비 강화 (의료용 수준)
            image = self._enhance_contrast(image)
            
            # 3. 선명도 향상 (의료용 수준)
            image = self._enhance_sharpness(image)
            
            return image
            
        except Exception as e:
            logger.warning(f"의료용 품질 향상 실패: {str(e)}")
            return image
    
    def _enhance_sharpness(self, image: np.ndarray) -> np.ndarray:
        """선명도 향상 (의료용 수준)"""
        try:
            # Unsharp Mask 필터 적용
            kernel = np.array([[-1,-1,-1],
                              [-1, 9,-1],
                              [-1,-1,-1]])
            
            # 각 채널별로 선명도 향상
            enhanced_image = image.copy()
            for channel in range(3):
                enhanced_image[:, :, channel] = cv2.filter2D(
                    image[:, :, channel].astype(np.float32), -1, kernel
                )
            
            # 원본과 블렌딩 (자연스럽게)
            alpha = 0.1  # 선명도 강도 (0.3 → 0.1로 감소)
            enhanced_image = (1 - alpha) * image + alpha * enhanced_image
            
            return np.clip(enhanced_image, 0, 255).astype(np.uint8)
            
        except Exception as e:
            logger.warning(f"선명도 향상 실패: {str(e)}")
            return image
    
    def _enhance_contrast(self, image: np.ndarray) -> np.ndarray:
        """대비 강화 (의료용 수준)"""
        try:
            # 의료용 대비 강화
            image = cv2.convertScaleAbs(image, alpha=self.target_contrast, beta=0)
            
            return image
            
        except Exception as e:
            logger.warning(f"대비 강화 실패: {str(e)}")
            return image
    
    def _denoise_image(self, image: np.ndarray) -> np.ndarray:
        """노이즈 제거 (최소화)"""
        try:
            # 노이즈 제거 최소화 (거의 원본 유지)
            return image
            
        except Exception as e:
            logger.warning(f"노이즈 제거 실패: {str(e)}")
            return image
    
    def _final_normalization(self, image: np.ndarray) -> np.ndarray:
        """최종 정규화 (최소화)"""
        try:
            # 0-255 범위로 정규화만 수행 (선명도 향상 제거)
            image = np.clip(image, 0, 255)
            
            return image
            
        except Exception as e:
            logger.warning(f"최종 정규화 실패: {str(e)}")
            return image
    
    def get_preprocessing_info(self) -> dict:
        """전처리 설정 정보 반환"""
        return {
            "medical_resolution": self.medical_resolution,
            "target_contrast": self.target_contrast,
            "reflection_threshold": self.reflection_threshold,
            "statistical_normalization": {
                "enabled": self.enable_statistical_normalization,
                "medical_stats_loaded": image_statistics_processor.is_stats_available(),
                "description": "의료 데이터셋 통계로 정규화"
            },
            "enhanced_lighting": {
                "enabled": self.enable_enhanced_lighting,
                "method": "Retinex + 의료용 조명 시뮬레이션 + 그림자 제거",
                "description": "의료용 조명 조건으로 정규화"
            },
            "description": "의료용 이미지 수준으로 일반 사진 전처리 (도메인 적응)",
            "features": [
                "해상도 조정 (512x512, 비율 유지)",
                "통계적 정규화 (도메인 적응)",
                "조명 정규화 (의료용 - 강화)",
                "대비 강화 (의료용)",
                "선명도 향상 (의료용)",
                "최종 정규화"
            ],
            "medical_enhancement": {
                "resolution": "512x512",
                "contrast_alpha": self.target_contrast,
                "sharpness_alpha": 0.3,
                "lighting_normalization": "Retinex + CLAHE + 그림자 제거",
                "domain_adaptation": "통계적 정규화 + 히스토그램 매칭",
                "description": "의료용 이미지 품질 향상 (도메인 적응)"
            }
        }

# 전역 인스턴스
image_preprocessing_service = ImagePreprocessingService()
