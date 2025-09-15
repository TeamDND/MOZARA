import os
import json
import base64
from typing import List, Dict, Any
from dotenv import load_dotenv


# 환경 변수 로드 (루트 및 현재 디렉토리 모두 시도)
load_dotenv("../../../.env")
load_dotenv(".env")


def _get_genai_client():
    """google-generativeai 클라이언트를 구성하여 반환."""
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("GOOGLE_API_KEY가 설정되지 않았습니다.")
    import google.generativeai as genai
    genai.configure(api_key=api_key)
    return genai


def analyze_hair_with_gemini_service(image_base64: str) -> Dict[str, Any]:
    """Gemini로 이미지 분석을 수행하고 표준 결과를 반환.

    Returns: {"stage": int, "title": str, "description": str, "advice": List[str]}
    """
    genai = _get_genai_client()
    model = genai.GenerativeModel('gemini-2.0-flash-exp')

    prompt = (
        "당신은 두피 및 탈모 분석 전문가입니다. 주어진 이미지를 분석하여 탈모 진행 단계를 1~7단계로 진단하고, "
        "결과를 반드시 다음 JSON 형식으로만 응답해주세요: "
        '{"stage": <1-7>, "title": "<진단명>", "description": "<상세 설명>", "advice": ["<가이드 1>", "<가이드 2>"]}'
        "\n\n단계별 기준:\n1-2단계: 정상 또는 초기 탈모\n3-4단계: 중간 단계 탈모\n5-7단계: 심각한 탈모"
    )

    image_data = base64.b64decode(image_base64)

    response = model.generate_content([prompt, {"mime_type": "image/jpeg", "data": image_data}])
    response_text = response.text or ""

    import re
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

    return {
        "stage": int(result["stage"]),
        "title": str(result["title"]),
        "description": str(result["description"]),
        "advice": [str(a) for a in result["advice"]],
    }


def generate_hair_quiz_service() -> List[Dict[str, str]]:
    """Gemini로 O/X 퀴즈 20문항 생성하여 리스트로 반환."""
    genai = _get_genai_client()
    model = genai.GenerativeModel('gemini-2.0-flash-exp')

    prompt = (
        "당신은 탈모 전문가이자 재치있는 퀴즈 출제자입니다. "
        "탈모와 관련된 전문적 지식과 재미있는 상식을 섞어서, O/X 퀴즈 20개를 생성해주세요. "
        "답변(answer)은 반드시 'O' 또는 'X'로만 해주세요. "
        "결과를 반드시 다음의 JSON 배열 형식으로만 응답해주세요. 다른 설명은 일절 추가하지 마세요. "
        "[{\"question\": \"<질문>\", \"answer\": \"<O 또는 X>\", \"explanation\": \"<정답에 대한 상세하고 친절한 설명>\"}, ...20개]"
    )

    response = model.generate_content(prompt)
    text = response.text or ""

    import re
    match = re.search(r"\[[\s\S]*\]", text)
    if not match:
        raise ValueError("JSON 배열 형식의 응답을 찾을 수 없습니다.")

    items_raw = json.loads(match.group())

    normalized = []
    for it in items_raw:
        q = str(it.get('question', '')).strip()
        a = str(it.get('answer', '')).strip().upper()
        e = str(it.get('explanation', '')).strip()
        if a not in ('O', 'X'):
            continue
        if not q or not e:
            continue
        normalized.append({"question": q, "answer": a, "explanation": e})

    if not normalized:
        raise ValueError("유효한 퀴즈 항목을 생성하지 못했습니다.")

    return normalized[:20]


