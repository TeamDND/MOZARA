"""
이미지 경로 관련 유틸리티 함수
"""
import os
from typing import Optional

# 데이터 경로 설정
DATA_BASE_PATH = "C:/Users/301/Desktop/data_all"

def get_image_path_from_metadata(metadata: dict) -> Optional[str]:
    """메타데이터에서 이미지 경로를 구성"""
    try:
        # 1. 이미 저장된 전체 경로가 있는지 확인
        if "image_path" in metadata:
            stored_path = metadata["image_path"]
            if os.path.exists(stored_path):
                return stored_path
        
        # 2. 파일명과 카테고리 정보로 경로 재구성
        image_file_name = metadata.get("image_file_name", "")
        category = metadata.get("category", "")
        severity = metadata.get("severity", "")
        
        if not all([image_file_name, category, severity]):
            return None
        
        # 경로 구성
        image_path = os.path.join(
            DATA_BASE_PATH, 
            "원천데이터", 
            category, 
            severity, 
            image_file_name
        )
        
        if os.path.exists(image_path):
            return image_path
        
        return None
        
    except Exception as e:
        print(f"[WARN] 이미지 경로 구성 오류: {str(e)}")
        return None

def validate_image_path(image_path: str) -> bool:
    """이미지 경로 유효성 검사"""
    try:
        return os.path.exists(image_path) and os.path.isfile(image_path)
    except Exception:
        return False

def get_available_image_paths(metadata_list: list) -> list:
    """메타데이터 리스트에서 사용 가능한 이미지 경로들 반환"""
    available_paths = []
    
    for metadata in metadata_list:
        image_path = get_image_path_from_metadata(metadata)
        if image_path and validate_image_path(image_path):
            available_paths.append({
                "metadata": metadata,
                "image_path": image_path
            })
    
    return available_paths
