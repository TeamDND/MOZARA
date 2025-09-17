import os
import json
import base64
from typing import Dict, Any, List
from dotenv import load_dotenv
import google.generativeai as genai
import re


# 환경 변수 로드 (여러 경로 시도: 프로젝트 루트, backend, 현재 디렉터리)
load_dotenv("../../../.env")
load_dotenv("../../.env")
load_dotenv(".env")


def _get_genai_client():
    """google-generativeai 클라이언트를 구성하여 반환."""
    api_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GOOGLE_API_KEY/GEMINI_API_KEY가 설정되지 않았습니다.")
    genai.configure(api_key=api_key)
    return genai


# 함수를 동기 함수로 변경
def analyze_hair_with_gemini(image_data: bytes) -> Dict[str, Any]:
    """
    Gemini로 이미지 분석을 수행하고 표준 결과를 반환합니다.
    Args:
        image_data: 이미지의 이진(bytes) 데이터
    Returns: {"stage": int, "title": str, "description": str, "advice": List[str]}
    """
    genai = _get_genai_client()
    model = genai.GenerativeModel('gemini-2.0-flash-exp')

    # 0~3 스케일로 강제하는 프롬프트
    prompt = (
        "당신은 두피 및 탈모 분석 전문가입니다. 주어진 이미지를 분석하여 탈모 진행 단계를 '0~3단계'로만 판단하세요. "
        "반드시 아래 JSON 형식으로만 답변하세요 (추가 텍스트 금지): "
        '{"stage": <0|1|2|3>, "title": "<진단명>", "description": "<상세 설명>", "advice": ["<가이드 1>", "<가이드 2>"]}'
        "\n\n단계 정의:\n0단계: 정상\n1단계: 초기 탈모\n2단계: 중등도 탈모\n3단계: 심각한 탈모"
    )

    # image_data는 이미 이진(bytes) 데이터이므로, 바로 사용
    # 제미니 API 호출을 동기 버전으로 변경
    response = model.generate_content([prompt, {"mime_type": "image/jpeg", "data": image_data}])
    response_text = response.text or ""

    json_match = re.search(r'\{[\s\S]*\}', response_text)
    if not json_match:
        raise ValueError("JSON 형식의 응답을 찾을 수 없습니다.")

    result = json.loads(json_match.group())

    # 검증 및 정규화
    required_fields = ['stage', 'title', 'description', 'advice']
    for field in required_fields:
        if field not in result:
            raise ValueError(f"필수 필드 '{field}'가 누락되었습니다.")

    if not isinstance(result.get('advice'), list):
        result['advice'] = [str(result.get('advice', ''))]

    # 단계 정규화
    def _normalize_stage(stage_value: Any) -> int:
        try:
            s = int(stage_value)
        except Exception:
            return 1
        if 0 <= s <= 3:
            return s
        if 1 <= s <= 7:
            if s <= 1:
                return 0
            if s == 2:
                return 1
            if s in (3, 4):
                return 2
            return 3
        return max(0, min(3, s))

    normalized_stage = _normalize_stage(result.get("stage"))

    normalized: Dict[str, Any] = {
        "stage": normalized_stage,
        "title": str(result["title"]),
        "description": str(result["description"]),
        "advice": [str(a) for a in result["advice"]],
    }

    return normalized