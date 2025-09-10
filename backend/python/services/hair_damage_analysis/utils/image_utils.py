"""
Image Processing Utilities
"""
import base64
from io import BytesIO
from PIL import Image
from typing import Optional

def encode_image_to_base64(image_path: str) -> str:
    """
    이미지 파일을 base64로 인코딩
    """
    try:
        with open(image_path, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read()).decode('utf-8')
        return encoded_string
    except Exception as e:
        raise Exception(f"이미지 인코딩 오류: {str(e)}")

def decode_base64_to_image(base64_string: str) -> Image.Image:
    """
    base64 문자열을 이미지로 디코딩
    """
    try:
        image_data = base64.b64decode(base64_string)
        image = Image.open(BytesIO(image_data))
        return image
    except Exception as e:
        raise Exception(f"이미지 디코딩 오류: {str(e)}")

def resize_image(image: Image.Image, max_size: tuple = (512, 512)) -> Image.Image:
    """
    이미지 크기 조정
    """
    try:
        image.thumbnail(max_size, Image.Resampling.LANCZOS)
        return image
    except Exception as e:
        raise Exception(f"이미지 리사이징 오류: {str(e)}")

def validate_image_format(image: Image.Image) -> bool:
    """
    이미지 포맷 검증
    """
    supported_formats = ['RGB', 'RGBA', 'L']
    return image.mode in supported_formats
