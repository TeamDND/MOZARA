"""
연관 질문 생성 서비스
AI 응답을 기반으로 사용자가 궁금해할 만한 연관 질문들을 생성합니다.
"""
import os
import json
import re
import logging
from typing import List, Dict, Optional
from datetime import datetime
from dotenv import load_dotenv
from pathlib import Path

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 환경변수 로드
current_dir = Path(__file__).resolve().parent  # services/rag_chatbot/
project_root = current_dir.parent.parent.parent.parent  # MOZARA/
env_path = project_root / ".env"

if env_path.exists():
    load_dotenv(env_path)
    logger.info(f"환경변수 로드 완료: {env_path}")
else:
    logger.warning(f"환경변수 파일을 찾을 수 없습니다: {env_path}")

class RelatedQuestionsService:
    """연관 질문 생성 서비스"""
    
    def __init__(self):
        """서비스 초기화"""
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        self.model = None
        
        if self.gemini_api_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=self.gemini_api_key)
                self.model = genai.GenerativeModel('gemini-2.5-flash')
                logger.info("Gemini API 초기화 완료")
            except Exception as e:
                logger.error(f"Gemini API 초기화 실패: {e}")
                self.model = None
        else:
            logger.warning("GEMINI_API_KEY가 설정되지 않았습니다.")
    
    def generate_related_questions(self, response_text: str) -> List[str]:
        """
        AI 응답을 기반으로 연관 질문들을 생성합니다.
        
        Args:
            response_text (str): AI 응답 텍스트
            
        Returns:
            List[str]: 생성된 연관 질문들
        """
        try:
            if not response_text or not response_text.strip():
                return self._get_default_questions()
            
            # Gemini API를 사용해서 연관 질문 생성
            if self.model:
                questions = self._generate_with_gemini(response_text)
                if questions:
                    return questions
            
            # Gemini API 실패 시 키워드 기반 질문 생성
            return self._generate_by_keywords(response_text)
            
        except Exception as e:
            logger.error(f"연관 질문 생성 오류: {e}")
            return self._get_default_questions()
    
    def _generate_with_gemini(self, response_text: str) -> Optional[List[str]]:
        """Gemini API를 사용해서 연관 질문 생성"""
        try:
            prompt = f"""
다음 탈모 관련 AI 응답을 읽고, 사용자가 추가로 궁금해할 만한 연관 질문 4개를 한국어로 생성해주세요.
질문은 간결하고 구체적으로 만들어주세요.

AI 응답: {response_text}

연관 질문들을 JSON 배열 형태로 반환해주세요. 예시:
["질문1", "질문2", "질문3", "질문4"]
"""

            result = self.model.generate_content(prompt)
            questions_text = result.text.strip()
            
            # JSON 파싱
            json_match = re.search(r'\[.*?\]', questions_text, re.DOTALL)
            if json_match:
                questions = json.loads(json_match.group())
                if isinstance(questions, list) and len(questions) > 0:
                    return questions[:4]  # 최대 4개까지만
            
            return None
            
        except Exception as e:
            logger.error(f"Gemini API 호출 오류: {e}")
            return None
    
    def _generate_by_keywords(self, response_text: str) -> List[str]:
        """키워드 기반으로 연관 질문 생성"""
        response_lower = response_text.lower()
        
        # 남성형 탈모 관련
        if any(keyword in response_lower for keyword in ['남성형', 'aga', 'androgenetic', '남성']):
            return [
                "피나스테리드 부작용은?",
                "미녹시딜 사용법은?",
                "DHT 억제제 종류는?",
                "모발이식 시기는?"
            ]
        
        # 여성형 탈모 관련
        if any(keyword in response_lower for keyword in ['여성형', 'fphl', 'female', '여성']):
            return [
                "여성 탈모 치료법은?",
                "호르몬과 탈모의 관계는?",
                "여성용 미녹시딜은?",
                "임신 중 탈모 치료는?"
            ]
        
        # 피나스테리드 관련
        if any(keyword in response_lower for keyword in ['피나스테리드', 'finasteride']):
            return [
                "피나스테리드 복용량은?",
                "피나스테리드 부작용은?",
                "두타스테리드와 차이는?",
                "피나스테리드 효과 기간은?"
            ]
        
        # 미녹시딜 관련
        if any(keyword in response_lower for keyword in ['미녹시딜', 'minoxidil']):
            return [
                "미녹시딜 농도별 차이는?",
                "미녹시딜 사용법은?",
                "미녹시딜 부작용은?",
                "여성용 미녹시딜은?"
            ]
        
        # 모발이식 관련
        if any(keyword in response_lower for keyword in ['모발이식', 'hair transplant', '이식']):
            return [
                "FUE와 FUT 차이는?",
                "모발이식 비용은?",
                "모발이식 회복기간은?",
                "모발이식 부작용은?"
            ]
        
        # DHT 관련
        if any(keyword in response_lower for keyword in ['dht', '디에이치티']):
            return [
                "DHT 억제 방법은?",
                "DHT와 탈모 관계는?",
                "자연적 DHT 억제는?",
                "DHT 검사 방법은?"
            ]
        
        # PRP 관련
        if any(keyword in response_lower for keyword in ['prp', '플라즈마', '주사']):
            return [
                "PRP 치료 효과는?",
                "PRP 치료 횟수는?",
                "PRP 치료 비용은?",
                "PRP 치료 부작용은?"
            ]
        
        # 기본 연관 질문
        return self._get_default_questions()
    
    def _get_default_questions(self) -> List[str]:
        """기본 연관 질문들 반환"""
        return [
            "이 치료법의 부작용은?",
            "다른 치료법도 있나요?",
            "효과가 언제 나타나나요?",
            "주의사항이 있나요?"
        ]
    
    def get_service_status(self) -> Dict:
        """서비스 상태 확인"""
        return {
            "status": "ok",
            "message": "연관 질문 생성 서비스가 정상적으로 동작 중입니다.",
            "geminiConfigured": bool(self.gemini_api_key and self.model),
            "timestamp": datetime.now().isoformat()
        }


# 전역 인스턴스
related_questions_service = RelatedQuestionsService()


def generate_related_questions(response_text: str) -> List[str]:
    """
    연관 질문 생성 함수 (편의 함수)
    
    Args:
        response_text (str): AI 응답 텍스트
        
    Returns:
        List[str]: 생성된 연관 질문들
    """
    return related_questions_service.generate_related_questions(response_text)


def get_service_status() -> Dict:
    """서비스 상태 확인 함수 (편의 함수)"""
    return related_questions_service.get_service_status()
