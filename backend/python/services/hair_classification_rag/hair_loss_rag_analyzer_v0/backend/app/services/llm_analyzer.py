import os
import base64
import logging
from typing import Dict, List, Optional, Any
from openai import OpenAI
from PIL import Image
import io
import json
from ..config import settings

class LLMHairAnalyzer:
    def __init__(self):
        """OpenAI LLM 기반 탈모 분석기"""
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.logger = logging.getLogger(__name__)

        # 노우드 분류 기준 정의
        self.norwood_descriptions = {
            1: "정상 또는 극히 경미한 탈모 - 탈모 징후가 거의 없거나 전혀 없음. 헤어라인이 자연스럽고 밀도가 충분함.",
            2: "경미한 탈모 - M자 탈모가 시작되거나 이마선이 약간 후퇴. 측두부에서 약간의 후퇴 시작.",
            3: "초기 탈모 - M자 탈모가 뚜렷해지고 정수리 부분 모발 밀도 감소. 헤어라인 후퇴가 명확함.",
            4: "중기 탈모 - M자 탈모 진행, 정수리 탈모 본격화. 앞머리와 정수리 두 부위 모두 영향.",
            5: "진행된 탈모 - 앞머리와 정수리 탈모가 연결되기 시작. 상당한 모발 손실.",
            6: "심한 탈모 - 앞머리와 정수리가 완전히 연결되어 하나의 큰 탈모 영역 형성.",
            7: "매우 심한 탈모 - 측면과 뒷머리를 제외한 대부분의 모발 손실. 거의 대머리 상태."
        }

    def encode_image_to_base64(self, image: Image.Image) -> str:
        """PIL Image를 base64로 인코딩"""
        try:
            # 이미지 크기 최적화 (비용 절약)
            max_size = 512
            if image.width > max_size or image.height > max_size:
                image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)

            buffer = io.BytesIO()
            image.save(buffer, format="JPEG", quality=85)
            img_data = buffer.getvalue()
            return base64.b64encode(img_data).decode('utf-8')
        except Exception as e:
            self.logger.error(f"이미지 base64 인코딩 실패: {e}")
            return None

    def create_analysis_prompt(self, faiss_results: Dict) -> str:
        """FAISS 결과를 바탕으로 분석 프롬프트 생성"""

        # FAISS 검색 결과 요약
        stage_scores = faiss_results.get('stage_scores', {})
        similar_images = faiss_results.get('similar_images', [])
        predicted_stage = faiss_results.get('predicted_stage')
        confidence = faiss_results.get('confidence', 0)

        # 단계별 분포 정보
        stage_distribution = ""
        if stage_scores:
            for stage, score in sorted(stage_scores.items()):
                percentage = score * 100
                stage_distribution += f"- Level {stage}: {percentage:.1f}%\n"

        # 유사 이미지 정보
        similar_info = ""
        if similar_images:
            for i, img in enumerate(similar_images[:3]):  # 상위 3개만
                similar_info += f"- 유사도 {i+1}: Level {img['stage']} (거리: {img['distance']:.2f})\n"

        prompt = f"""
당신은 남성 탈모 전문 AI 분석가입니다. 노우드 분류법(Norwood Scale)을 기준으로 정확한 탈모 단계를 분석해주세요.

## 노우드 분류 기준:
{chr(10).join([f"Level {k}: {v}" for k, v in self.norwood_descriptions.items()])}

## ConvNeXt 모델 + FAISS 검색 결과:
- 예측 단계: Level {predicted_stage}
- 신뢰도: {confidence:.1f}%

### 단계별 유사도 분포:
{stage_distribution}

### 가장 유사한 이미지들:
{similar_info}

## 분석 요청:
1. 업로드된 이미지를 노우드 분류 기준으로 세밀하게 분석해주세요
2. 헤어라인 패턴, M자 탈모 정도, 정수리 상태, 전체적인 모발 밀도를 종합적으로 평가해주세요
3. FAISS 검색 결과를 참고하되, 시각적 분석을 우선으로 최종 판단해주세요
4. ConvNeXt 모델이 Level 1(정상)과 Level 2(경미한 탈모) 구분에 어려움이 있다는 점을 고려해주세요

## 응답 형식:
반드시 아래 정확한 JSON 형식으로만 응답해주세요. 다른 텍스트는 절대 포함하지 마세요.

{{
    "final_stage": 2,
    "confidence": 0.75,
    "analysis_details": {{
        "hairline_pattern": "헤어라인 패턴 설명",
        "crown_condition": "정수리 상태 설명",
        "overall_density": "전체 모발 밀도 평가",
        "key_indicators": ["주요 탈모 징후 1", "주요 탈모 징후 2"]
    }},
    "faiss_comparison": "FAISS 결과와의 비교 분석",
    "reasoning": "최종 판단 근거"
}}

중요: final_stage는 반드시 2~7 사이의 정수여야 합니다. JSON 형식만 응답하세요.
"""
        return prompt

    async def analyze_with_llm(self, image: Image.Image, faiss_results: Dict) -> Dict:
        """LLM을 사용한 탈모 분석"""
        try:
            # 이미지를 base64로 인코딩
            base64_image = self.encode_image_to_base64(image)
            if not base64_image:
                return {
                    'success': False,
                    'error': '이미지 인코딩 실패'
                }

            # 프롬프트 생성
            prompt = self.create_analysis_prompt(faiss_results)

            # OpenAI API 호출
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",  # 경제적인 모델 사용
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": prompt
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{base64_image}",
                                    "detail": "high"
                                }
                            }
                        ]
                    }
                ],
                max_tokens=1000,
                temperature=0.1  # 일관성을 위해 낮은 temperature
            )

            # 응답 처리
            content = response.choices[0].message.content

            # JSON 파싱 시도
            try:
                # JSON 부분만 추출 (마크다운 코드 블록 제거)
                if "```json" in content:
                    json_start = content.find("```json") + 7
                    json_end = content.find("```", json_start)
                    json_content = content[json_start:json_end].strip()
                elif "{" in content and "}" in content:
                    json_start = content.find("{")
                    json_end = content.rfind("}") + 1
                    json_content = content[json_start:json_end]
                else:
                    json_content = content

                llm_result = json.loads(json_content)

                return {
                    'success': True,
                    'llm_analysis': llm_result,
                    'raw_response': content,
                    'token_usage': {
                        'prompt_tokens': response.usage.prompt_tokens,
                        'completion_tokens': response.usage.completion_tokens,
                        'total_tokens': response.usage.total_tokens
                    }
                }

            except json.JSONDecodeError as e:
                self.logger.warning(f"JSON 파싱 실패, 원본 응답 반환: {e}")
                return {
                    'success': True,
                    'llm_analysis': {
                        'final_stage': faiss_results.get('predicted_stage', 3),
                        'confidence': 0.5,
                        'analysis_details': {
                            'parsing_error': True,
                            'raw_response': content
                        },
                        'reasoning': 'JSON 파싱 실패로 인해 FAISS 결과 사용'
                    },
                    'raw_response': content,
                    'token_usage': {
                        'prompt_tokens': response.usage.prompt_tokens,
                        'completion_tokens': response.usage.completion_tokens,
                        'total_tokens': response.usage.total_tokens
                    }
                }

        except Exception as e:
            self.logger.error(f"LLM 분석 실패: {e}")
            return {
                'success': False,
                'error': str(e),
                'fallback_to_faiss': True
            }

    def combine_results(self, faiss_results: Dict, llm_results: Dict) -> Dict:
        """FAISS와 LLM 결과를 결합하여 최종 결과 생성"""
        try:
            if not llm_results.get('success'):
                # LLM 실패 시 FAISS 결과 사용
                return {
                    'success': True,
                    'method': 'faiss_only',
                    'predicted_stage': faiss_results.get('predicted_stage'),
                    'confidence': faiss_results.get('confidence', 0),
                    'stage_description': self.norwood_descriptions.get(
                        faiss_results.get('predicted_stage'), "알 수 없는 단계"
                    ),
                    'analysis_details': {
                        'source': 'FAISS 검색 결과 (LLM 분석 실패)',
                        'llm_error': llm_results.get('error', 'Unknown error')
                    },
                    'similar_images': faiss_results.get('similar_images', []),
                    'stage_scores': faiss_results.get('stage_scores', {})
                }

            llm_analysis = llm_results.get('llm_analysis', {})

            # LLM 결과를 우선으로 하되, FAISS 결과도 포함
            final_stage = llm_analysis.get('final_stage', faiss_results.get('predicted_stage'))
            # 단계 값 안전 보정: 2~7로 클램프
            try:
                final_stage = int(final_stage)
            except Exception:
                final_stage = int(faiss_results.get('predicted_stage', 2) or 2)
            final_stage = max(2, min(7, final_stage))
            final_confidence = llm_analysis.get('confidence', faiss_results.get('confidence', 0))

            return {
                'success': True,
                'method': 'llm_enhanced',
                'predicted_stage': final_stage,
                'confidence': final_confidence,
                'stage_description': self.norwood_descriptions.get(final_stage, "알 수 없는 단계"),
                'analysis_details': {
                    'llm_analysis': llm_analysis.get('analysis_details', {}),
                    'llm_reasoning': llm_analysis.get('reasoning', ''),
                    'faiss_comparison': llm_analysis.get('faiss_comparison', ''),
                    'token_usage': llm_results.get('token_usage', {})
                },
                'faiss_results': {
                    'predicted_stage': faiss_results.get('predicted_stage'),
                    'confidence': faiss_results.get('confidence'),
                    'stage_scores': faiss_results.get('stage_scores', {}),
                    'similar_images': faiss_results.get('similar_images', [])[:3]  # 상위 3개만
                },
                'raw_llm_response': llm_results.get('raw_response', '')
            }

        except Exception as e:
            self.logger.error(f"결과 결합 실패: {e}")
            return {
                'success': False,
                'error': f'결과 결합 실패: {str(e)}'
            }
