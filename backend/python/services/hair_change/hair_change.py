import google.generativeai as genai
from PIL import Image, ExifTags
import io
import base64
import os
from dotenv import load_dotenv
from fastapi import HTTPException
from typing import Optional

# 환경변수 로드 (상위 디렉토리의 .env 파일 사용)
load_dotenv("../../../../.env")

# Gemini API 설정
genai.configure(api_key=os.getenv('GEMINI_API_KEY'))

# 사용 가능한 가발 스타일
WIG_STYLES = {
    "short": "짧은 가발 스타일",
    "medium": "중간 길이 가발 스타일",
    "long": "긴 가발 스타일",
    "undercut": "울프컷 가발 스타일",
    "pompadour": "포마드 가발 스타일",
    "quiff": "퀴프 가발 스타일",
    "slick_back": "슬릭백 가발 스타일",
    "textured": "텍스처드 가발 스타일",
    "buzz_cut": "버즈컷 가발 스타일",
    "fade": "페이드 가발 스타일",
    "curtain": "커튼 가발 스타일",
    "mullet": "멀렛 가발 스타일",
    "fill_bald": "빈머리 매꾸기"
}

async def generate_wig_style_service(image_data: bytes, wig_style: str, custom_prompt: Optional[str] = None):
    """가발 스타일 변경 서비스 함수"""
    try:
        if not image_data or not wig_style:
            raise HTTPException(status_code=400, detail='이미지와 가발 스타일을 모두 선택해주세요')

        # 이미지 처리
        pil_image = Image.open(io.BytesIO(image_data))
        try:
            exif = pil_image._getexif()
            if exif is not None:
                for tag, value in exif.items():
                    if ExifTags.TAGS.get(tag) == 'Orientation':
                        if value == 3:
                            pil_image = pil_image.rotate(180, expand=True)
                        elif value == 6:
                            pil_image = pil_image.rotate(270, expand=True)
                        elif value == 8:
                            pil_image = pil_image.rotate(90, expand=True)
                        break
        except (AttributeError, KeyError, IndexError):
            # EXIF 정보가 없거나 오류 발생 시 무시
            pass
        
        # Gemini 모델 설정
        model = genai.GenerativeModel('gemini-2.5-flash-image-preview')

        # 프롬프트 생성
        if custom_prompt:
            prompt = custom_prompt
        else:
            if wig_style == "fill_bald":
                # 빈머리 매꾸기 특별 프롬프트
                prompt = f"""
                이 사진의 인물에게 자연스러운 머리카락을 생성해줘. 탈모나 대머리 부분을 완전히 제거하고 건강한 머리카락으로 채워줘.
                
                상황별 처리:
                1. 기존 머리카락이 있는 경우: 기존 머리카락의 색상, 질감, 굵기를 분석하여 탈모 부위에 동일하게 적용
                2. 완전 대머리인 경우: 인물의 나이, 성별, 인종에 맞는 자연스러운 머리카락을 생성
                3. 부분 탈모인 경우: 남은 머리카락을 기준으로 탈모 부위를 자연스럽게 복원
                
                중요 지시사항:
                - 두피가 보이는 모든 부분을 머리카락으로 완전히 덮어줘
                - 이마가 보이면 앞머리로 자연스럽게 덮어줘
                - 머리카락의 색상은 인물의 눈썹, 수염 색상과 조화롭게 맞춰줘
                - 머리카락의 길이는 나이와 성별에 적합하게 설정해줘
                - 머리라인을 자연스럽고 완전하게 복원해줘
                - 머리 전체의 밀도를 균일하고 풍성하게 만들어줘
                
                금지사항:
                - 두피가 보이면 안됨
                - 탈모 흔적이 남으면 안됨
                - 부자연스러운 가발처럼 보이면 안됨
                
                얼굴, 표정, 피부 톤, 옷차림은 절대 변경하지 말고, 오직 머리카락만 완전히 복원해줘.
                반드시 이미지로만 응답해줘.
                """
            else:
                # 일반 가발 스타일 변경 프롬프트
                prompt = f"""
                이 사진 속 인물의 헤어스타일을 {WIG_STYLES.get(wig_style, wig_style)}로 바꿔줘.
                - 얼굴과 표정, 피부 톤은 그대로 유지해줘.
                - 요청된 가발 스타일을 자연스럽고 사실적으로 적용해줘.
                - 사람이 아니면 잘못 된 이미지라고 해줘.
                - 머리에 모자나 손 같은게 무언가가 있다면 자연스럽게 변경해줘.
                - 반드시 이미지로만 응답해줘. 텍스트 설명은 하지 마세요.
                """

        # 이미지 생성 요청
        response = model.generate_content([prompt, pil_image])

        # 응답 처리
        if response.candidates and response.candidates[0].content and response.candidates[0].content.parts:
            # 모든 파트를 확인하여 이미지 찾기
            for part in response.candidates[0].content.parts:
                if hasattr(part, 'inline_data') and part.inline_data.mime_type.startswith('image/'):
                    image_data = part.inline_data.data
                    image_base64 = base64.b64encode(image_data).decode('utf-8')
                    mime_type = part.inline_data.mime_type
                    
                    return {
                        'result': 'Success',
                        'images': [{
                            'data': f"data:{mime_type};base64,{image_base64}",
                            'mime_type': mime_type
                        }],
                        'message': '가발 스타일 변경이 완료되었습니다.'
                    }
            
            # 이미지를 찾지 못한 경우, 텍스트 응답이 있는지 확인
            text_response = ""
            for part in response.candidates[0].content.parts:
                if hasattr(part, 'text'):
                    text_response += part.text
            
            if text_response:
                print(f"Gemini 텍스트 응답: {text_response}")
                raise HTTPException(status_code=500, detail=f'이미지 생성에 실패했습니다. 다시 시도해 보세요. (응답: {text_response[:100]}...)')
            else:
                raise HTTPException(status_code=500, detail='응답이 이미지가 아닙니다. 다른 프롬프트를 시도해 보세요.')
        else:
            # 응답이 없거나 예기치 않은 경우
            raise HTTPException(status_code=500, detail='모델 응답을 처리할 수 없습니다. 다시 시도해 보세요.')
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f'오류가 발생했습니다: {str(e)}')

def get_wig_styles_service():
    """사용 가능한 가발 스타일 목록 반환"""
    return WIG_STYLES