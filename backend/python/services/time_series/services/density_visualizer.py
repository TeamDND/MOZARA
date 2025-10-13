"""
밀도 변화 시각화 모듈
BiSeNet으로 분석한 밀도 데이터를 기반으로 저밀도 영역을 동그라미로 표시
"""

import cv2
import numpy as np
from typing import Dict, List, Tuple, Any
import logging
from PIL import Image
import io

logger = logging.getLogger(__name__)


class DensityVisualizer:
    """밀도 변화를 시각적으로 표시하는 클래스"""

    def __init__(self, threshold: float = 30.0, circle_color: Tuple[int, int, int] = (0, 255, 0)):
        """
        Args:
            threshold: 저밀도로 판단할 기준 (기본 30%)
            circle_color: 동그라미 색상 (기본 초록색, BGR)
        """
        self.threshold = threshold
        self.circle_color = circle_color

    def visualize_low_density_regions(
        self,
        image_bytes: bytes,
        density_result: Dict[str, Any],
        threshold: float = None
    ) -> bytes:
        """
        밀도가 낮은 영역에 초록색 동그라미/타원 표시

        Args:
            image_bytes: 원본 이미지 바이너리
            density_result: DensityAnalyzer의 결과 (distribution_map 포함)
            threshold: 저밀도 기준 (지정 안 하면 self.threshold 사용)

        Returns:
            동그라미가 그려진 이미지 바이너리
        """
        try:
            # 임계값 설정
            if threshold is None:
                threshold = self.threshold

            # 이미지 로드
            image = Image.open(io.BytesIO(image_bytes)).convert('RGB')
            image_np = np.array(image)
            original_h, original_w = image_np.shape[:2]

            # BGR 변환 (OpenCV 사용)
            image_bgr = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)

            # distribution_map 가져오기 (8x8 그리드)
            distribution_map = density_result.get('distribution_map', [])
            if not distribution_map:
                logger.warning("distribution_map이 없습니다")
                return image_bytes

            grid_size = len(distribution_map)  # 8
            cell_h = original_h // grid_size
            cell_w = original_w // grid_size

            logger.info(f"🎯 저밀도 영역 탐지 (임계값: {threshold}%)")
            low_density_count = 0

            # 각 그리드 셀 검사
            for i in range(grid_size):
                for j in range(grid_size):
                    density = distribution_map[i][j]

                    # 임계값 이하인 경우 표시
                    if density < threshold:
                        low_density_count += 1

                        # 셀의 중심 좌표 계산
                        center_y = i * cell_h + cell_h // 2
                        center_x = j * cell_w + cell_w // 2

                        # 타원 크기 (셀 크기의 80%)
                        radius_x = int(cell_w * 0.4)
                        radius_y = int(cell_h * 0.4)

                        # 타원 그리기 (텍스트 없음)
                        cv2.ellipse(
                            image_bgr,
                            (center_x, center_y),
                            (radius_x, radius_y),
                            0,  # 회전 각도
                            0, 360,  # 시작/끝 각도
                            self.circle_color,
                            2  # 선 두께
                        )

            logger.info(f"✅ {low_density_count}개 저밀도 영역 표시 완료")

            # RGB로 다시 변환
            image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
            result_image = Image.fromarray(image_rgb)

            # bytes로 변환
            output_buffer = io.BytesIO()
            result_image.save(output_buffer, format='JPEG', quality=95)
            output_buffer.seek(0)

            return output_buffer.read()

        except Exception as e:
            logger.error(f"❌ 시각화 실패: {e}")
            return image_bytes  # 실패 시 원본 반환

    def visualize_density_change(
        self,
        current_image_bytes: bytes,
        current_density: Dict[str, Any],
        past_densities: List[Dict[str, Any]]
    ) -> bytes:
        """
        과거 대비 밀도가 감소한 영역을 표시

        Args:
            current_image_bytes: 현재 이미지
            current_density: 현재 밀도 결과
            past_densities: 과거 밀도 결과 리스트

        Returns:
            변화 영역이 표시된 이미지
        """
        try:
            if not past_densities:
                logger.warning("과거 데이터가 없어 현재 저밀도만 표시")
                return self.visualize_low_density_regions(current_image_bytes, current_density)

            # 이미지 로드
            image = Image.open(io.BytesIO(current_image_bytes)).convert('RGB')
            image_np = np.array(image)
            original_h, original_w = image_np.shape[:2]
            image_bgr = cv2.cvtColor(image_np, cv2.COLOR_RGB2BGR)

            # 현재 밀도 맵
            current_map = current_density.get('distribution_map', [])
            if not current_map:
                return current_image_bytes

            # 과거 평균 밀도 계산
            grid_size = len(current_map)
            avg_past_map = np.zeros((grid_size, grid_size))
            valid_past_count = 0

            for past_density in past_densities:
                past_map = past_density.get('distribution_map', [])
                if past_map:
                    avg_past_map += np.array(past_map)
                    valid_past_count += 1

            # 유효한 과거 데이터가 없으면 현재 저밀도만 표시
            if valid_past_count == 0:
                logger.warning("유효한 과거 데이터가 없어 현재 저밀도만 표시")
                return self.visualize_low_density_regions(current_image_bytes, current_density)

            avg_past_map /= valid_past_count

            cell_h = original_h // grid_size
            cell_w = original_w // grid_size

            logger.info(f"🔍 밀도 변화 감지 중...")
            change_count = 0

            # 밀도 변화 영역 탐지 (감소 + 증가 모두)
            for i in range(grid_size):
                for j in range(grid_size):
                    current_val = current_map[i][j]
                    past_avg = avg_past_map[i][j]

                    # 변화량 계산 (절대값)
                    change = abs(past_avg - current_val)

                    # 10% 이상 변화한 경우 표시
                    if change > 10:
                        change_count += 1

                        center_y = i * cell_h + cell_h // 2
                        center_x = j * cell_w + cell_w // 2
                        radius_x = int(cell_w * 0.4)
                        radius_y = int(cell_h * 0.4)

                        # 타원 그리기 (텍스트 없음, 단일 색상)
                        cv2.ellipse(
                            image_bgr,
                            (center_x, center_y),
                            (radius_x, radius_y),
                            0, 0, 360,
                            self.circle_color,
                            2
                        )

            logger.info(f"✅ {change_count}개 변화 영역 표시 완료")

            # 결과 변환
            image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
            result_image = Image.fromarray(image_rgb)

            output_buffer = io.BytesIO()
            result_image.save(output_buffer, format='JPEG', quality=95)
            output_buffer.seek(0)

            return output_buffer.read()

        except Exception as e:
            logger.error(f"❌ 변화 시각화 실패: {e}")
            return current_image_bytes
