"""
Hair Damage Analysis Service
"""
import base64
from io import BytesIO
from PIL import Image
from transformers import CLIPProcessor, CLIPModel
import random
from typing import Optional, Dict, Any
import os
import google.generativeai as genai
import traceback
from dotenv import load_dotenv

# .env 파일 로드 (상위 디렉토리의 .env 파일 사용)
load_dotenv("../../../../../.env")

from ..data.pinecone_client import PineconeClient
from ..models.hair_analysis_result import HairAnalysisResult

class HairAnalysisService:
    def __init__(self):
        # CLIP 모델 로드
        self.clip_model = CLIPModel.from_pretrained("openai/clip-vit-large-patch14")
        self.clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-large-patch14")
        
        # Pinecone 클라이언트 초기화
        self.pinecone_client = PineconeClient()

        # Gemini API 설정
        gemini_api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        if gemini_api_key and gemini_api_key != "your_gemini_api_key_here":
            genai.configure(api_key=gemini_api_key)
            self.gemini_model = genai.GenerativeModel('gemini-1.5-flash')
            print("Gemini API 설정 완료")
        else:
            # API 키가 없어도 서비스 자체는 동작하도록 설정
            self.gemini_model = None
            print("경고: GEMINI_API_KEY가 설정되지 않았습니다. AI 요약 기능이 비활성화됩니다.")

    def _build_summary_prompt(self, context: str, result_count: int) -> str:
        """
        Gemini용 분석 요약 프롬프트 생성
        """
        return f"""
당신은 여러 모발 손상 사례 데이터를 분석하여, 사용자의 상태에 대한 정보를 제공하는 AI 전문가입니다. **절대로 의료적인 진단을 내려서는 안 됩니다.** 답변은 항상 정보 제공 목적으로만 사용되어야 하며, 전문적인 의료 상담을 대체할 수 없음을 명확히 해야 합니다.

아래는 사용자의 모발과 유사한 사례 목록입니다.
---
{context}
---

**위에서 제공된 {result_count}개의 사례에만 집중하여**, 사용자의 모발 상태에 대한 **종합 분석 정보**를 생성해주세요.

**답변 시 다음 사항을 고려해주세요:**
- '진단'이라는 단어 대신 '상태', '분석 결과' 등의 단어를 사용하세요.
- 경고 문구나 추가 조언은 포함하지 말고, 순수하게 분석된 사실에 대한 정보만 전달합니다.
"""

    def _build_context_for_summary(self, search_results) -> str:
        """
        요약 생성을 위한 컨텍스트 변환
        """
        if not search_results:
            return ""
        
        context = "다음은 유사한 모발 손상 사례들입니다:\n\n"
        for i, result in enumerate(search_results, 1):
            props = result.properties
            context += f"{i}. 상태: {props.get('diagnosis', 'N/A')}, 단계: {props.get('stage', 'N/A')}\n"
        
        return context

    async def analyze_hair_damage(self, image_base64: Optional[str], text_query: Optional[str]) -> Dict[str, Any]:
        """
        모발 손상 분석 (AI 요약 기능 추가)
        """
        try:
            query_vector = None
            
            print(f"[DEBUG] image_base64: {bool(image_base64)}, text_query: {bool(text_query)}")
            if image_base64 and image_base64.strip():
                print("[DEBUG] 이미지 벡터 생성 시도...")
                query_vector = self._process_image(image_base64)
                print(f"[DEBUG] 이미지 벡터 생성 완료. 길이: {len(query_vector) if query_vector else 0}")
            elif text_query and text_query.strip():
                print("[DEBUG] 텍스트 쿼리만 제공됨. 더미 벡터 생성...")
                query_vector = [random.random() for _ in range(768)]
                print("[DEBUG] 더미 벡터 생성 완료.")
            else:
                print("[DEBUG] 이미지 또는 텍스트 쿼리 없음. 오류 발생.")
                raise ValueError("이미지 또는 텍스트 쿼리가 필요합니다.")
            
            if query_vector is None:
                print("[DEBUG] query_vector가 None입니다. 오류 발생.")
                raise ValueError("query_vector 생성에 실패했습니다.")
            print(f"[DEBUG] 최종 query_vector 준비 완료. 길이: {len(query_vector)}")
            
            # Initialize search_results to an empty list
            search_results = []
            try:
                search_results = self.pinecone_client.search_similar_images(
                    vector=query_vector,
                    limit=3
                )
            except Exception as e:
                print(f"❌ Pinecone 유사 이미지 검색 중 오류 발생: {str(e)}")
                # Continue with empty search_results, AI summary will reflect this
            
            # 실제 이미지 분석 수행
            image_analysis = None
            if image_base64 and image_base64.strip():
                image_analysis = self._analyze_image_directly(image_base64)
            
            ai_summary = "AI 요약 기능을 사용할 수 없습니다. API 키를 확인해주세요."
            if self.gemini_model and search_results:
                # AI 요약을 위한 컨텍스트 및 프롬프트 생성
                summary_context = self._build_context_for_summary(search_results)
                summary_prompt = self._build_summary_prompt(summary_context, len(search_results))
                
                # Gemini 호출
                response = self.gemini_model.generate_content(summary_prompt)
                ai_summary = response.text

            formatted_results = []
            for result in search_results:
                formatted_results.append({
                    "uuid": str(result.uuid),
                    "properties": result.properties
                })
            
            # 이미지 분석 결과를 첫 번째 결과로 추가
            if image_analysis:
                formatted_results.insert(0, {
                    "uuid": "current_image_analysis",
                    "properties": image_analysis
                })
            
            return {
                "message": "이미지 및 텍스트 검색 성공",
                "summary": ai_summary,  # AI 요약 추가
                "results": formatted_results
            }
            
        except Exception as e:
            raise Exception(f"모발 손상 분석 중 오류: {str(e)}")
        except Exception as e:
            print(f"❌ 모발 손상 분석 중 치명적인 오류 발생: {str(e)}")
            traceback.print_exc() # <--- Add this line
            raise Exception(f"모발 손상 분석 중 오류: {str(e)}")
    
    def _process_image(self, image_base64: str) -> list:
        """
        이미지를 벡터로 변환
        """
        try:
            image_data = base64.b64decode(image_base64)
            image = Image.open(BytesIO(image_data))
            
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            inputs = self.clip_processor(images=image, return_tensors="pt")
            image_features = self.clip_model.get_image_features(**inputs)
            
            return image_features.squeeze().tolist()
            
        except Exception as e:
            raise Exception(f"이미지 처리 중 오류: {str(e)}")
    
    def _analyze_image_directly(self, image_base64: str) -> Dict[str, Any]:
        """
        이미지를 직접 분석하여 모발 상태를 판단
        """
        try:
            print("[DEBUG] 이미지 직접 분석 시작...")
            
            # 이미지를 벡터로 변환
            image_vector = self._process_image(image_base64)
            
            # Gemini를 사용한 이미지 분석
            if self.gemini_model:
                try:
                    # 이미지를 Gemini에 전달하여 분석
                    image_data = base64.b64decode(image_base64)
                    image = Image.open(BytesIO(image_data))
                    
                    # 이미지를 바이트로 변환
                    img_byte_arr = BytesIO()
                    image.save(img_byte_arr, format='JPEG')
                    img_byte_arr = img_byte_arr.getvalue()
                    
                    # Gemini에 이미지와 함께 분석 요청
                    analysis_prompt = """
                    이 두피/모발 이미지를 분석하여 다음 정보를 제공해주세요:
                    1. 두피 상태 (정상, 초기 탈모, 중등도 탈모, 심각한 탈모)
                    2. 탈모 진행 단계 (0-3단계만 사용, 0=정상, 1=초기, 2=중등도, 3=심각)
                    3. 신뢰도 (0.0-1.0)
                    
                    중요: 단계는 반드시 0, 1, 2, 3 중 하나만 사용하세요. 4 이상의 숫자는 사용하지 마세요.
                    
                    답변은 반드시 다음 JSON 형식으로만 제공해주세요:
                    {"diagnosis": "상태", "stage": 단계번호, "confidence": 신뢰도}
                    
                    다른 텍스트나 설명은 포함하지 마세요.
                    """
                    
                    # Gemini Vision API 호출
                    response = self.gemini_model.generate_content([
                        analysis_prompt,
                        {
                            "mime_type": "image/jpeg",
                            "data": img_byte_arr
                        }
                    ])
                    
                    print(f"[DEBUG] Gemini 원본 응답: {response.text}")
                    
                    # JSON 파싱 시도 (더 견고한 파싱)
                    import json
                    import re
                    try:
                        # 응답에서 JSON 부분만 추출
                        response_text = response.text.strip()
                        
                        # JSON 객체를 찾기 위한 정규식
                        json_match = re.search(r'\{[^}]*\}', response_text)
                        if json_match:
                            json_str = json_match.group()
                            result = json.loads(json_str)
                            print(f"[DEBUG] Gemini 이미지 분석 결과: {result}")
                            return {
                                "diagnosis": result.get("diagnosis", "분석 불가"),
                                "stage": int(result.get("stage", 1)),
                                "confidence": float(result.get("confidence", 0.5)),
                                "gender": "남성"  # 기본값
                            }
                        else:
                            # JSON이 없으면 텍스트에서 정보 추출
                            print("[DEBUG] JSON 형식이 아님, 텍스트에서 정보 추출 시도")
                            return self._parse_text_response(response_text)
                            
                    except (json.JSONDecodeError, ValueError) as e:
                        print(f"[DEBUG] Gemini 응답 파싱 실패: {e}")
                        print(f"[DEBUG] 원본 응답: {response.text}")
                        # 텍스트 응답에서 정보 추출 시도
                        return self._parse_text_response(response.text)
                        
                except Exception as e:
                    print(f"[DEBUG] Gemini 이미지 분석 실패: {e}")
                    pass
            
            # Gemini 분석 실패 시 기본 분석 로직
            print("[DEBUG] 기본 분석 로직 사용")
            return self._basic_image_analysis(image_vector)
            
        except Exception as e:
            print(f"[DEBUG] 이미지 분석 중 오류: {e}")
            return {
                "diagnosis": "분석 오류",
                "stage": 0,
                "confidence": 0.1,
                "gender": "남성"
            }
    
    def _parse_text_response(self, response_text: str) -> Dict[str, Any]:
        """
        Gemini의 텍스트 응답에서 정보를 추출
        """
        try:
            print(f"[DEBUG] 텍스트 응답 파싱: {response_text}")
            
            # 기본값 설정
            diagnosis = "분석 불가"
            stage = 0
            confidence = 0.5
            
            # 진단 상태 추출 (탈모 진행 단계 기준)
            if "정상" in response_text:
                diagnosis = "정상"
                stage = 0  # 정상 상태
                confidence = 0.8
            elif "초기" in response_text or "경미" in response_text:
                diagnosis = "초기 탈모"
                stage = 1  # 초기 탈모 단계
                confidence = 0.7
            elif "중등도" in response_text or "중간" in response_text:
                diagnosis = "중등도 탈모"
                stage = 2  # 중등도 탈모 단계
                confidence = 0.6
            elif "심각" in response_text or "고급" in response_text:
                diagnosis = "심각한 탈모"
                stage = 3  # 심각한 탈모 단계
                confidence = 0.5
            
            # 단계 번호 추출 시도 (0-3 범위로 제한)
            import re
            stage_match = re.search(r'(\d+)단계', response_text)
            if stage_match:
                extracted_stage = int(stage_match.group(1))
                # 0-3 범위로 제한
                stage = max(0, min(3, extracted_stage))
            
            # 신뢰도 추출 시도
            confidence_match = re.search(r'(\d+\.?\d*)', response_text)
            if confidence_match:
                conf_value = float(confidence_match.group(1))
                if conf_value > 1.0:  # 퍼센트로 표현된 경우
                    confidence = conf_value / 100.0
                else:
                    confidence = conf_value
            
            print(f"[DEBUG] 텍스트 파싱 결과: diagnosis={diagnosis}, stage={stage}, confidence={confidence}")
            
            return {
                "diagnosis": diagnosis,
                "stage": stage,
                "confidence": confidence,
                "gender": "남성"
            }
            
        except Exception as e:
            print(f"[DEBUG] 텍스트 파싱 중 오류: {e}")
            return {
                "diagnosis": "분석 불가",
                "stage": 0,
                "confidence": 0.1,
                "gender": "남성"
            }
    
    def _basic_image_analysis(self, image_vector: list) -> Dict[str, Any]:
        """
        기본 이미지 분석 로직 (벡터 기반)
        """
        try:
            # 벡터의 특성을 기반으로 간단한 분석
            vector_mean = sum(image_vector) / len(image_vector)
            vector_std = (sum((x - vector_mean) ** 2 for x in image_vector) / len(image_vector)) ** 0.5
            
            # 간단한 휴리스틱 분석 (탈모 진행 단계 기준)
            if vector_std < 0.1:
                diagnosis = "정상"
                stage = 0  # 정상 상태
                confidence = 0.8
            elif vector_std < 0.2:
                diagnosis = "초기 탈모"
                stage = 1  # 초기 탈모 단계
                confidence = 0.7
            elif vector_std < 0.3:
                diagnosis = "중등도 탈모"
                stage = 2  # 중등도 탈모 단계
                confidence = 0.6
            else:
                diagnosis = "심각한 탈모"
                stage = 3  # 심각한 탈모 단계
                confidence = 0.5
            
            return {
                "diagnosis": diagnosis,
                "stage": stage,
                "confidence": confidence,
                "gender": "남성"
            }
            
        except Exception as e:
            print(f"[DEBUG] 기본 분석 중 오류: {e}")
            return {
                "diagnosis": "분석 불가",
                "stage": 0,
                "confidence": 0.1,
                "gender": "남성"
            }
    
    async def save_analysis_result(self, analysis_result: Dict[str, Any]) -> Dict[str, Any]:
        """
        분석 결과를 Pinecone에 저장
        """
        try:
            vector_id = self.pinecone_client.insert_analysis_data(analysis_result)
            return {
                "message": "데이터 저장 성공",
                "pinecone_vector_id": vector_id
            }
        except Exception as e:
            raise Exception(f"분석 결과 저장 중 오류: {str(e)}")