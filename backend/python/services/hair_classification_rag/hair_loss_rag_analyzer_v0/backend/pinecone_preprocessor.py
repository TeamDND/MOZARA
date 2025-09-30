#!/usr/bin/env python3
"""파인콘 전환을 위한 데이터 전처리 파이프라인"""

import os
import re
import json
from PIL import Image, ImageOps, ImageEnhance
from typing import Dict, List, Tuple, Optional
import logging
from pathlib import Path

class PineconePreprocessor:
    """파인콘용 데이터 전처리 클래스"""

    def __init__(self,
                 target_size: Tuple[int, int] = (224, 224),
                 quality_enhancement: bool = True):
        """
        Args:
            target_size: 통일할 이미지 크기 (width, height)
            quality_enhancement: 품질 개선 적용 여부
        """
        self.target_size = target_size
        self.quality_enhancement = quality_enhancement
        self.logger = logging.getLogger(__name__)

        # 위치 지시자 패턴 정의
        self.pointview_patterns = {
            'top': r'top(?!-)',           # 'top'이지만 'top-down'은 제외
            'top-down': r'top-down',
            'left': r'left',
            'right': r'right',
            'front': r'front',
            'back': r'back',
            'side': r'side'
        }

    def extract_metadata_from_path(self, file_path: str) -> Dict:
        """파일 경로에서 메타데이터 추출"""
        path_parts = Path(file_path).parts
        filename = Path(file_path).stem.lower()

        # 기본 메타데이터
        metadata = {
            'gender': None,
            'stage': None,
            'pointview': None,
            'original_filename': Path(file_path).name
        }

        # 성별 추출 (폴더명에서)
        for part in path_parts:
            if part.lower() in ['male', 'female']:
                metadata['gender'] = part.lower()
                break

        # 탈모 단계 추출 (폴더명에서)
        for part in path_parts:
            if 'stage_' in part.lower():
                try:
                    stage_num = int(part.lower().replace('stage_', ''))
                    metadata['stage'] = stage_num
                except ValueError:
                    pass
                break

        # 위치 지시자 추출 (파일명에서)
        metadata['pointview'] = self._extract_pointview(filename)

        return metadata

    def _extract_pointview(self, filename: str) -> Optional[str]:
        """파일명에서 위치 지시자 추출"""
        # 우선순위 순서로 검사 (더 구체적인 것부터)
        priority_order = ['top-down', 'top', 'left', 'right', 'front', 'back', 'side']

        for pointview in priority_order:
            pattern = self.pointview_patterns[pointview]
            if re.search(pattern, filename, re.IGNORECASE):
                return pointview

        return None  # 위치 지시자가 없는 경우

    def preprocess_image(self, image_path: str, output_path: str = None) -> Tuple[Image.Image, Dict]:
        """
        이미지 전처리 수행

        Args:
            image_path: 원본 이미지 경로
            output_path: 저장할 경로 (None이면 저장하지 않음)

        Returns:
            (전처리된 이미지, 메타데이터)
        """
        try:
            # 1. 이미지 로드
            image = Image.open(image_path).convert('RGB')
            original_size = image.size

            # 2. 메타데이터 추출
            metadata = self.extract_metadata_from_path(image_path)
            metadata['original_size'] = original_size
            metadata['processed_size'] = self.target_size

            # 3. 이미지 전처리
            processed_image = self._apply_preprocessing(image)

            # 4. 저장 (옵션)
            if output_path:
                os.makedirs(os.path.dirname(output_path), exist_ok=True)
                processed_image.save(output_path, 'JPEG', quality=95)
                metadata['processed_path'] = output_path

            return processed_image, metadata

        except Exception as e:
            self.logger.error(f"이미지 전처리 실패 {image_path}: {e}")
            return None, None

    def _apply_preprocessing(self, image: Image.Image) -> Image.Image:
        """실제 이미지 전처리 적용"""

        # 1. 크기 조정 (비율 유지하며 리사이즈)
        image = ImageOps.fit(image, self.target_size, Image.LANCZOS)

        if self.quality_enhancement:
            # 2. 품질 개선

            # 2-1. 선명도 향상 (약간)
            enhancer = ImageEnhance.Sharpness(image)
            image = enhancer.enhance(1.1)

            # 2-2. 대비 조정 (약간)
            enhancer = ImageEnhance.Contrast(image)
            image = enhancer.enhance(1.05)

            # 2-3. 밝기 정규화 (매우 약간)
            enhancer = ImageEnhance.Brightness(image)
            image = enhancer.enhance(1.02)

            # 2-4. 색상 채도 조정 (약간)
            enhancer = ImageEnhance.Color(image)
            image = enhancer.enhance(1.02)

        return image

    def process_dataset(self,
                       dataset_path: str,
                       output_path: str = None,
                       save_metadata: bool = True) -> List[Dict]:
        """
        전체 데이터셋 처리

        Args:
            dataset_path: 데이터셋 루트 경로
            output_path: 전처리된 이미지 저장 경로
            save_metadata: 메타데이터 JSON 파일 저장 여부

        Returns:
            메타데이터 리스트
        """
        all_metadata = []
        processed_count = 0
        error_count = 0

        # 지원하는 이미지 확장자
        supported_extensions = ('.jpg', '.jpeg', '.png', '.bmp', '.tiff')

        print(f"데이터셋 처리 시작: {dataset_path}")

        # 모든 이미지 파일 찾기
        for root, dirs, files in os.walk(dataset_path):
            for file in files:
                if file.lower().endswith(supported_extensions):
                    image_path = os.path.join(root, file)

                    # 출력 경로 생성
                    if output_path:
                        rel_path = os.path.relpath(image_path, dataset_path)
                        output_image_path = os.path.join(output_path, rel_path)
                    else:
                        output_image_path = None

                    # 이미지 처리
                    processed_image, metadata = self.preprocess_image(
                        image_path, output_image_path
                    )

                    if metadata:
                        metadata['original_path'] = image_path
                        metadata['dataset_index'] = processed_count
                        all_metadata.append(metadata)
                        processed_count += 1

                        if processed_count % 50 == 0:
                            print(f"처리 완료: {processed_count}개")
                    else:
                        error_count += 1

        print(f"전체 처리 완료: 성공 {processed_count}개, 실패 {error_count}개")

        # 메타데이터 저장
        if save_metadata and output_path:
            metadata_file = os.path.join(output_path, 'metadata.json')
            with open(metadata_file, 'w', encoding='utf-8') as f:
                json.dump(all_metadata, f, ensure_ascii=False, indent=2)
            print(f"메타데이터 저장: {metadata_file}")

        return all_metadata

    def analyze_dataset_distribution(self, metadata_list: List[Dict]) -> Dict:
        """데이터셋 분포 분석"""
        analysis = {
            'total_images': len(metadata_list),
            'gender_distribution': {},
            'stage_distribution': {},
            'pointview_distribution': {},
            'gender_stage_matrix': {},
            'pointview_by_stage': {}
        }

        for meta in metadata_list:
            gender = meta.get('gender', 'unknown')
            stage = meta.get('stage', 'unknown')
            pointview = meta.get('pointview', 'none')

            # 성별 분포
            analysis['gender_distribution'][gender] = analysis['gender_distribution'].get(gender, 0) + 1

            # 단계별 분포
            analysis['stage_distribution'][stage] = analysis['stage_distribution'].get(stage, 0) + 1

            # 위치별 분포
            analysis['pointview_distribution'][pointview] = analysis['pointview_distribution'].get(pointview, 0) + 1

            # 성별-단계 매트릭스
            gender_stage_key = f"{gender}_stage_{stage}"
            analysis['gender_stage_matrix'][gender_stage_key] = analysis['gender_stage_matrix'].get(gender_stage_key, 0) + 1

            # 단계별 위치 분포
            if stage not in analysis['pointview_by_stage']:
                analysis['pointview_by_stage'][stage] = {}
            analysis['pointview_by_stage'][stage][pointview] = analysis['pointview_by_stage'][stage].get(pointview, 0) + 1

        return analysis


def main():
    """테스트 실행"""
    # 전처리기 초기화
    preprocessor = PineconePreprocessor(
        target_size=(224, 224),
        quality_enhancement=True
    )

    # 테스트 데이터셋 경로
    dataset_path = "C:/Users/301/Desktop/test1"
    output_path = "C:/Users/301/Desktop/test1_processed"

    print("=== 파인콘용 데이터 전처리 시작 ===")

    # 데이터셋 처리
    metadata_list = preprocessor.process_dataset(
        dataset_path=dataset_path,
        output_path=output_path,
        save_metadata=True
    )

    # 분포 분석
    analysis = preprocessor.analyze_dataset_distribution(metadata_list)

    print("\n=== 데이터셋 분석 결과 ===")
    print(f"총 이미지 수: {analysis['total_images']}")
    print(f"성별 분포: {analysis['gender_distribution']}")
    print(f"단계별 분포: {analysis['stage_distribution']}")
    print(f"위치별 분포: {analysis['pointview_distribution']}")

    print("\n=== 성별-단계 매트릭스 ===")
    for key, count in analysis['gender_stage_matrix'].items():
        print(f"{key}: {count}개")

    print("\n=== 단계별 위치 분포 ===")
    for stage, pointviews in analysis['pointview_by_stage'].items():
        print(f"Stage {stage}:")
        for pointview, count in pointviews.items():
            print(f"  {pointview}: {count}개")

    # 샘플 메타데이터 출력
    if metadata_list:
        print("\n=== 샘플 메타데이터 ===")
        print(json.dumps(metadata_list[0], ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()