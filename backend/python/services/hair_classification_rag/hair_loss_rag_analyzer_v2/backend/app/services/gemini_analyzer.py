import os
import base64
import logging
import json
import re
from typing import Dict, List, Optional, Any
from PIL import Image
import io
import google.generativeai as genai
from ..config import settings


class GeminiHairAnalyzer:
    def __init__(self):
        """Gemini LLM 기반 탈모 분석기 (Swin과 동일한 형식)"""
        api_key = os.getenv("GEMINI_API_KEY_1")
        if not api_key:
            raise ValueError("GEMINI_API_KEY_1 환경변수가 설정되지 않았습니다.")

        genai.configure(api_key=api_key)
        self.logger = logging.getLogger(__name__)

        # 사용 가능한 모델명 시도
        model_names = [
            'gemini-2.0-flash-exp',
            'gemini-1.5-pro',
            'gemini-pro',
            'models/gemini-pro'
        ]

        self.model = None
        for model_name in model_names:
            try:
                self.model = genai.GenerativeModel(model_name)
                self.logger.info(f"Gemini 모델 로드 성공: {model_name}")
                break
            except Exception as e:
                self.logger.warning(f"{model_name} 로드 실패: {str(e)[:100]}")
                continue

        if self.model is None:
            raise ValueError("모든 Gemini 모델 로드 실패")

        # Sinclair Scale 분류 기준 정의 (여성형 탈모, 5단계)
        self.sinclair_descriptions = {
            1: "Sinclair Scale Stage 1 (정상/탈모 없음) - 정수리 모발 밀도 정상, 가르마 부위 두피 노출 없음, 탈모 징후 관찰되지 않음",
            2: "Sinclair Scale Stage 2 (초기/경증 탈모) - 가르마 부위 두피가 약간 보이기 시작, 모발 밀도 경미한 감소",
            3: "Sinclair Scale Stage 3 (중등도 탈모) - 가르마 부위 두피 노출 증가, 모발 밀도 중등도 감소",
            4: "Sinclair Scale Stage 4 (중증 탈모) - 가르마 부위 및 정수리 두피 노출 뚜렷, 모발 밀도 현저한 감소",
            5: "Sinclair Scale Stage 5 (최중증 탈모) - 정수리 전체 두피 노출, 모발 밀도 심각한 감소"
        }

    def encode_image_to_base64(self, image: Image.Image) -> str:
        """PIL Image를 base64로 인코딩"""
        try:
            # 이미지 크기 최적화
            max_size = 1024
            if image.width > max_size or image.height > max_size:
                image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)

            buffer = io.BytesIO()
            image.save(buffer, format="JPEG", quality=85)
            buffer.seek(0)
            return base64.b64encode(buffer.getvalue()).decode('utf-8')
        except Exception as e:
            self.logger.error(f"이미지 base64 인코딩 실패: {e}")
            return None

    def create_analysis_prompt(self, rag_results: Dict, survey_data: Dict = None) -> str:
        """RAG 결과와 설문 데이터를 바탕으로 분석 프롬프트 생성 (Swin 스타일)"""

        # RAG 검색 결과 요약
        stage_scores = rag_results.get('stage_scores', {})
        similar_images = rag_results.get('similar_images', [])
        predicted_stage = rag_results.get('predicted_stage', 0)
        confidence = rag_results.get('confidence', 0)
        ensemble_details = rag_results.get('ensemble_details', {})

        # 단계별 분포 정보
        stage_distribution = ""
        if stage_scores:
            for stage, score in sorted(stage_scores.items()):
                percentage = score * 100
                stage_distribution += f"- Stage {stage}: {percentage:.1f}%\n"

        # 유사 이미지 정보 (Sinclair Scale 명시)
        similar_info = ""
        if similar_images:
            for i, img in enumerate(similar_images[:5]):  # 상위 5개
                source = img.get('source', 'unknown')
                similar_info += f"- 유사도 {i+1}: Sinclair Scale Stage {img['stage']} (유사도: {img['similarity']:.3f}, 모델: {source})\n"

        # 앙상블 정보
        ensemble_info = ""
        if ensemble_details:
            method = ensemble_details.get('method', 'unknown')
            weights = ensemble_details.get('dynamic_weights', {})
            if weights:
                ensemble_info = f"""
### 앙상블 분석 정보:
- 방식: {method}
- ConvNeXt 가중치: {weights.get('conv_weight', 0):.2f} (신뢰도: {weights.get('conv_confidence', 0):.2f})
- ViT 가중치: {weights.get('vit_weight', 0):.2f} (신뢰도: {weights.get('vit_confidence', 0):.2f})
"""

        # 설문 데이터 정보 추가
        survey_context = ""
        if survey_data:
            age = survey_data.get('age', '알 수 없음')
            family_history = "있음" if survey_data.get('familyHistory') == 'yes' else "없음"
            recent_loss = "있음" if survey_data.get('recentHairLoss') == 'yes' else "없음"
            stress = survey_data.get('stress', 'low')
            stress_level = {"low": "낮음", "medium": "보통", "high": "높음"}.get(stress, "보통")
            gender = survey_data.get('gender', 'female')
            gender_text = "여성" if gender in ['여', 'female'] else "남성"

            survey_context = f"""

### 사용자 설문 정보:
- 성별: {gender_text}
- 나이: {age}세
- 가족력: {family_history}
- 최근 탈모 증상: {recent_loss}
- 스트레스 수준: {stress_level}
"""

        prompt = f"""당신은 경험이 풍부한 여성 탈모 전문의입니다. AI 분석 결과와 환자의 설문조사 정보를 종합하여, 일반인도 쉽게 이해할 수 있는 친절한 설명과 조언을 제공해주세요.

## 여성 탈모 단계 기준:
여성 탈모는 가르마 부위와 정수리의 모발 밀도 감소 정도에 따라 5단계로 나뉩니다.

**핵심 평가 요소:**
- 가르마 부위의 확장 정도
- 가르마 주변 모발 볼륨
- 정수리 모발 밀도

## 단계별 설명 (5단계 기준):
1. 1단계 (정상) - 탈모 징후 없음, 모발 밀도 정상
2. 2단계 (초기) - 가르마 부위 약간 넓어짐, 모발 밀도 경미한 감소
3. 3단계 (중등도) - 가르마 부위 뚜렷하게 넓어짐, 모발 밀도 중등도 감소
4. 4단계 (중증) - 가르마 부위 및 정수리 두피 노출, 모발 밀도 현저한 감소
5. 5단계 (최중증) - 정수리 전체 두피 노출, 모발 밀도 심각한 감소

## AI 모델 분석 결과:
- 예측 단계: Stage {predicted_stage}
- 분석 신뢰도: {confidence:.1%}

### 단계별 확률 분포:
{stage_distribution}

### 참고한 유사 사례들:
{similar_info}
{ensemble_info}
{survey_context}

## ⚠️ 중요 작성 지침:
- **1단계 = 정상 상태 (탈모 없음)**
- 2단계부터 탈모 시작 (초기)
- 예측이 1단계이면 "정상", "건강한 상태"로 설명
- 예측이 2단계이면 "초기 단계"로 설명

## 분석 요청:
1. 업로드된 두피 이미지를 단계 기준으로 세밀하게 분석해주세요
2. 가르마 부위와 정수리 모발 상태를 종합적으로 평가해주세요
3. AI 분석 결과와 유사 사례를 참고하여 현재 상태를 판단해주세요
4. 설문조사 정보(나이, 가족력, 최근 탈모 증상, 스트레스 수준)를 적극 활용하여 개인 맞춤형 설명을 작성해주세요
5. **예측 단계({predicted_stage}단계)에 맞는 설명을 작성하세요**

## 설명 작성 시 주의사항 (필수):
- **전문 용어 사용 금지**: "Sinclair Scale", "RAG", "앙상블" 같은 용어를 사용하지 마세요
- **쉬운 표현 사용**: "유사한 사례", "분석 결과", "단계" 등 일반인이 이해하기 쉬운 용어 사용
- **예측 단계보다 2단계 이상 높은 단계는 언급 금지**
- 예측 단계 ±1단계 범위 내에서만 설명
- 환자에게 불안감을 주지 않도록 희망적이고 관리 가능한 톤으로 작성
- "~일 수 있습니다" 같은 추측 표현보다는 "~로 보입니다" 확정적 표현 사용

## 중요 요구사항:
1. **설문조사 정보를 적극적으로 활용**하여 개인 맞춤형 설명 작성
   - 나이대별 특성 언급 (예: "30대 초반으로 탈모가 시작되기 쉬운 시기입니다")
   - 가족력이 있으면 유전적 요인 강조
   - 스트레스 수준이 높으면 스트레스 관리의 중요성 언급
   - 최근 탈모 증상이 있으면 진행 속도 주의사항 설명

2. **description은 최소 100자 이상**으로 자세하게 작성
   - 현재 상태 분석
   - 설문조사 정보와의 연관성
   - 향후 전망 및 관리 필요성

3. **advice는 환자의 상황에 맞는 구체적인 행동 지침** 제공
   - 일반적인 조언이 아닌 개인화된 조언
   - 실천 가능한 구체적인 방법 제시 (3개)

4. 친절하고 희망적인 톤 유지하되, 정확한 정보 전달

## 응답 형식:
반드시 아래 정확한 JSON 형식으로만 응답해주세요. 다른 텍스트는 절대 포함하지 마세요.

{{
  "title": "환자 상태를 쉽게 표현하는 진단명 (15자 이내, 예: '초기 단계 모발 변화')",
  "description": "현재 상태에 대한 쉽고 친절한 설명 (100-200자). 전문 용어 없이 일반인이 이해하기 쉬운 표현 사용. 반드시 설문조사 정보(나이, 가족력, 스트레스 등)를 언급하며 환자의 상황을 구체적으로 분석. '~단계'라는 표현만 사용하고 'Sinclair Scale', 'RAG', '앙상블' 같은 전문 용어는 절대 사용 금지",
  "advice": [
    "설문조사 결과를 반영한 구체적이고 실천 가능한 조언 1 (30-50자)",
    "환자 맞춤형 조언 2 (30-50자)",
    "단계별 필수 관리 방법 조언 3 (30-50자)"
  ]
}}

중요: JSON 형식만 응답하세요. 마크다운 코드 블록(```)이나 추가 설명을 포함하지 마세요.
"""
        return prompt

    async def analyze_with_llm(self, image: Image.Image, rag_results: Dict, survey_data: Dict = None) -> Dict:
        """Gemini를 사용한 탈모 분석 (Swin과 동일한 응답 형식)"""
        try:
            self.logger.info("Gemini LLM 분석 시작")

            # 이미지를 PIL Image로 준비 (Gemini는 PIL Image 직접 지원)
            # 크기 최적화
            max_size = 1024
            if image.width > max_size or image.height > max_size:
                image.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)

            # 프롬프트 생성
            prompt = self.create_analysis_prompt(rag_results, survey_data)

            # Gemini API 호출 (이미지 + 텍스트)
            self.logger.info("Gemini API 호출 중...")
            response = self.model.generate_content([prompt, image])
            content = response.text.strip()

            self.logger.info(f"Gemini 응답 수신 완료 (길이: {len(content)})")

            # JSON 추출 (마크다운 코드 블록 제거)
            json_match = re.search(r'\{[\s\S]*\}', content)
            if not json_match:
                self.logger.error(f"JSON 추출 실패 - 응답: {content[:200]}")
                return self._generate_fallback_result(rag_results, survey_data)

            result = json.loads(json_match.group())

            # 필드 검증
            if not all(key in result for key in ['title', 'description', 'advice']):
                self.logger.error(f"필수 필드 누락 - 응답: {result}")
                return self._generate_fallback_result(rag_results, survey_data)

            # advice를 문자열로 변환 (리스트인 경우)
            if isinstance(result['advice'], list):
                result['advice'] = "\n".join(result['advice'])

            self.logger.info(f"✅ Gemini 분석 완료: {result['title']}")

            return {
                'success': True,
                'title': result['title'],
                'description': result['description'],
                'advice': result['advice'],
                'llm_analysis': {
                    'model': 'gemini',
                    'raw_response_length': len(content)
                }
            }

        except Exception as e:
            self.logger.error(f"Gemini 분석 실패: {e}")
            return self._generate_fallback_result(rag_results, survey_data)

    def _generate_fallback_result(self, rag_results: Dict, survey_data: Dict = None) -> Dict:
        """LLM 실패 시 기본 템플릿 생성 (Swin 스타일)"""
        stage = rag_results.get('predicted_stage', 0)

        # 5단계 기준 템플릿
        stage_info = {
            1: {
                'title': '정상 - 건강한 모발 상태',
                'description': '현재 탈모 징후가 관찰되지 않는 건강한 모발 상태입니다. 지속적인 관리를 통해 현재 상태를 유지하시기 바랍니다.',
                'advice': "현재 건강한 모발 상태를 유지하고 있습니다.\n예방 차원에서 규칙적인 두피 마사지를 권장합니다.\n균형 잡힌 영양 섭취와 충분한 수면을 유지하세요."
            },
            2: {
                'title': '초기 단계 - 경미한 모발 변화',
                'description': '초기 단계의 모발 변화가 감지되었습니다. 적절한 예방 관리와 전문의 상담을 통해 진행을 늦출 수 있습니다.',
                'advice': "초기 단계의 모발 변화가 감지되었습니다.\n전문의 상담을 통한 정확한 진단을 받아보세요.\n탈모 예방 샴푸 사용과 두피 케어를 시작하세요."
            },
            3: {
                'title': '중등도 - 진행 중인 탈모',
                'description': '중등도의 탈모가 진행되고 있습니다. 전문적인 치료와 관리가 필요한 시점입니다.',
                'advice': "중등도의 탈모 진행이 확인되었습니다.\n피부과 전문의 방문을 강력히 권장합니다.\n미녹시딜 등의 치료제 사용을 고려해보세요."
            },
            4: {
                'title': '중증 단계 - 뚜렷한 탈모',
                'description': '중증 단계의 탈모가 진행되고 있습니다. 적극적인 전문의 상담과 치료가 필요합니다.',
                'advice': "중증 단계의 탈모 상태입니다.\n즉시 전문의 진료를 받으시기 바랍니다.\n약물 치료 및 전문 케어를 시작하세요."
            },
            5: {
                'title': '심각 단계 - 진행된 탈모',
                'description': '상당히 진행된 탈모 상태입니다. 전문의와의 상담을 통한 적극적인 치료가 필요합니다.',
                'advice': "진행된 탈모 상태입니다.\n즉시 전문의 진료를 받으시기 바랍니다.\n모발이식이나 기타 치료 옵션을 상담받아보세요."
            }
        }

        info = stage_info.get(stage, stage_info[1])

        return {
            'success': True,
            'title': info['title'],
            'description': info['description'],
            'advice': info['advice'],
            'llm_analysis': {
                'model': 'fallback_template',
                'reason': 'LLM 분석 실패로 기본 템플릿 사용'
            }
        }

    def combine_results(self, rag_results: Dict, llm_result: Dict) -> Dict:
        """RAG 결과와 LLM 결과를 결합 (Swin 형식)"""
        if not llm_result.get('success'):
            # LLM 실패 시 RAG 결과만 사용
            return {
                'success': True,
                'predicted_stage': rag_results.get('predicted_stage', 0),
                'confidence': rag_results.get('confidence', 0.0),
                'stage_description': settings.STAGE_DESCRIPTIONS.get(
                    rag_results.get('predicted_stage', 1),
                    "알 수 없는 단계"
                ),
                'title': f"Stage {rag_results.get('predicted_stage', 0)} 분석 완료",
                'description': settings.STAGE_DESCRIPTIONS.get(
                    rag_results.get('predicted_stage', 1),
                    "분석 결과를 확인하세요."
                ),
                'advice': "전문의와 상담하시기 바랍니다.",
                'method': 'rag_only',
                'rag_results': rag_results
            }

        # LLM 성공 시 통합 결과 생성 (Swin과 동일한 구조)
        return {
            'success': True,
            'predicted_stage': rag_results.get('predicted_stage', 0),
            'confidence': rag_results.get('confidence', 0.0),
            'stage_description': llm_result['description'],
            'title': llm_result['title'],
            'description': llm_result['description'],
            'advice': llm_result['advice'],
            'detailed_explanation': llm_result['advice'],
            'method': 'gemini_llm_enhanced',
            'analysis_details': {
                'llm_analysis': llm_result.get('llm_analysis', {}),
                'llm_reasoning': llm_result.get('description', ''),
                'rag_confidence': rag_results.get('confidence', 0.0),
                'ensemble_method': rag_results.get('ensemble_details', {}).get('method', 'unknown')
            },
            'rag_results': rag_results
        }
