"""
이미지 통계 처리 유틸리티
의료 데이터셋 통계를 활용한 이미지 정규화
"""
import json
import numpy as np
import cv2
from typing import Dict, Optional, Tuple
import os
from pathlib import Path

class ImageStatisticsProcessor:
    """이미지 통계 처리 클래스"""
    
    def __init__(self, stats_path: str = None):
        self.stats_path = stats_path or "data/medical_dataset_stats.json"
        self.medical_stats = None
        self._load_medical_stats()
    
    def _load_medical_stats(self) -> bool:
        """의료 데이터셋 통계 로드"""
        try:
            if os.path.exists(self.stats_path):
                with open(self.stats_path, 'r', encoding='utf-8') as f:
                    self.medical_stats = json.load(f)
                print(f"[OK] 의료 데이터셋 통계 로드 완료: {self.stats_path}")
                return True
            else:
                print(f"[WARN] 의료 데이터셋 통계 파일을 찾을 수 없습니다: {self.stats_path}")
                return False
        except Exception as e:
            print(f"[ERROR] 의료 데이터셋 통계 로드 실패: {str(e)}")
            return False
    
    def calculate_image_statistics(self, image: np.ndarray) -> Dict:
        """이미지의 통계 정보 계산"""
        try:
            # RGB 채널별 통계
            stats = {
                "mean": np.mean(image, axis=(0, 1)).tolist(),  # [R, G, B]
                "std": np.std(image, axis=(0, 1)).tolist(),    # [R, G, B]
                "min": np.min(image, axis=(0, 1)).tolist(),    # [R, G, B]
                "max": np.max(image, axis=(0, 1)).tolist(),    # [R, G, B]
            }
            
            # 조명 특성
            gray = cv2.cvtColor(image, cv2.COLOR_RGB2GRAY)
            stats["lighting"] = {
                "brightness_mean": float(np.mean(gray)),
                "brightness_std": float(np.std(gray)),
                "contrast": float(np.std(gray) / np.mean(gray)) if np.mean(gray) > 0 else 0
            }
            
            return stats
            
        except Exception as e:
            print(f"[ERROR] 이미지 통계 계산 실패: {str(e)}")
            return {}
    
    def apply_statistical_normalization(self, image: np.ndarray) -> np.ndarray:
        """통계적 정규화 적용"""
        if not self.medical_stats:
            print("[WARN] 의료 데이터셋 통계가 없어 통계적 정규화를 건너뜁니다.")
            return image
        
        try:
            # 의료 데이터셋 통계
            medical_mean = np.array(self.medical_stats["mean_rgb"])
            medical_std = np.array(self.medical_stats["std_rgb"])
            
            # 사용자 이미지 통계
            user_mean = np.mean(image, axis=(0, 1))
            user_std = np.std(image, axis=(0, 1))
            
            # 0으로 나누기 방지
            user_std = np.where(user_std == 0, 1, user_std)
            
            # 통계적 정규화: (x - user_mean) / user_std * medical_std + medical_mean
            normalized_image = image.astype(np.float32)
            
            for channel in range(3):
                normalized_image[:, :, channel] = (
                    (normalized_image[:, :, channel] - user_mean[channel]) / user_std[channel] * 
                    medical_std[channel] + medical_mean[channel]
                )
            
            # 0-255 범위로 클리핑
            normalized_image = np.clip(normalized_image, 0, 255).astype(np.uint8)
            
            print(f"🔧 통계적 정규화 완료: {user_mean} → {medical_mean}")
            return normalized_image
            
        except Exception as e:
            print(f"[ERROR] 통계적 정규화 실패: {str(e)}")
            return image
    
    def apply_histogram_matching(self, image: np.ndarray) -> np.ndarray:
        """히스토그램 매칭 적용"""
        if not self.medical_stats or "histogram_avg" not in self.medical_stats:
            print("[WARN] 의료 데이터셋 히스토그램이 없어 히스토그램 매칭을 건너뜁니다.")
            return image
        
        try:
            matched_image = image.copy()
            
            # 각 채널별 히스토그램 매칭
            for channel in range(3):
                channel_names = ['r', 'g', 'b']
                target_hist = np.array(self.medical_stats["histogram_avg"][channel_names[channel]])
                
                # 현재 이미지의 히스토그램
                current_hist = cv2.calcHist([image], [channel], None, [256], [0, 256])
                
                # 누적 분포 함수 계산
                current_cdf = np.cumsum(current_hist).astype(np.float64)
                target_cdf = np.cumsum(target_hist).astype(np.float64)
                
                # 정규화
                current_cdf = current_cdf / current_cdf[-1]
                target_cdf = target_cdf / target_cdf[-1]
                
                # 매핑 테이블 생성
                mapping = np.zeros(256, dtype=np.uint8)
                for i in range(256):
                    # 가장 가까운 target_cdf 값 찾기
                    diff = np.abs(target_cdf - current_cdf[i])
                    mapping[i] = np.argmin(diff)
                
                # 히스토그램 매칭 적용
                matched_image[:, :, channel] = mapping[image[:, :, channel]]
            
            print("🔧 히스토그램 매칭 완료")
            return matched_image
            
        except Exception as e:
            print(f"[ERROR] 히스토그램 매칭 실패: {str(e)}")
            return image
    
    def get_medical_lighting_target(self) -> Optional[Dict]:
        """의료 데이터셋의 조명 목표값 반환"""
        if not self.medical_stats:
            return None
        
        return self.medical_stats.get("lighting_overall", None)
    
    def is_stats_available(self) -> bool:
        """통계 데이터 사용 가능 여부"""
        return self.medical_stats is not None

# 전역 인스턴스
image_statistics_processor = ImageStatisticsProcessor()
