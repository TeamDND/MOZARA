"""
AI 분석 서비스 - Gemini를 사용한 고급 분석
"""
import os
import google.generativeai as genai
from typing import Dict, List, Any, Optional
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv("../../../../.env")

class AIAnalysisService:
    """AI 기반 고급 분석 서비스"""
    
    def __init__(self):
        self.model = None
        self._initialize_gemini()
    
    def _initialize_gemini(self):
        """Gemini 모델 초기화"""
        try:
            # API 키 확인
            gemini_api_key = os.getenv("GEMINI_API_KEY")
            google_api_key = os.getenv("GOOGLE_API_KEY")
            
            api_key = gemini_api_key or google_api_key
            if not api_key:
                print("[WARN] GEMINI_API_KEY 또는 GOOGLE_API_KEY가 설정되지 않았습니다.")
                return
            
            # Gemini 설정
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-2.5-flash')
            
            print("[OK] Gemini AI 모델 초기화 완료")
            
        except Exception as e:
            print(f"[ERROR] Gemini 모델 초기화 실패: {str(e)}")
            self.model = None
    
    def generate_advanced_analysis(self, rag_result: Dict[str, Any]) -> Dict[str, Any]:
        """RAG 결과를 바탕으로 고급 AI 분석 생성"""
        try:
            if not self.model:
                return self._generate_fallback_analysis(rag_result)
            
            # RAG 결과에서 정보 추출
            analysis = rag_result.get("analysis", {})
            similar_cases = rag_result.get("similar_cases", [])
            
            # AI 프롬프트 구성
            prompt = self._build_analysis_prompt(analysis, similar_cases)
            
            # Gemini로 분석 생성
            response = self.model.generate_content(prompt)
            
            # 응답 파싱
            ai_analysis = self._parse_ai_response(response.text)
            
            return {
                "success": True,
                "ai_analysis": ai_analysis,
                "rag_analysis": analysis,
                "model_used": "gemini-2.5-flash"
            }
            
        except Exception as e:
            print(f"[WARN] AI 분석 오류: {str(e)}")
            return {
                "success": False,
                "error": str(e),
                "fallback_analysis": self._generate_fallback_analysis(rag_result)
            }
    
    def _build_analysis_prompt(self, analysis: Dict, similar_cases: List[Dict]) -> str:
        """AI 분석을 위한 프롬프트 구성"""
        prompt = f"""
당신은 두피/모발 전문가입니다. 다음 분석 결과를 바탕으로 종합적인 진단과 조언을 제공해주세요.

## 분석 결과:
- 주요 카테고리: {analysis.get('primary_category', 'N/A')}
- 주요 심각도: {analysis.get('primary_severity', 'N/A')}
- 평균 신뢰도: {analysis.get('average_confidence', 0):.2f}

## 진단 점수:
{self._format_diagnosis_scores(analysis.get('diagnosis_scores', {}))}

## 유사 케이스 (상위 3개):
{self._format_similar_cases(similar_cases[:3])}

## 요청사항:
1. 종합적인 두피 상태 진단 (탈모, 비듬 제외)
2. 주요 문제점과 원인 분석 (탈모, 비듬 제외)
3. 개인화된 관리 방법 제안
4. 주의사항 및 의료진 상담 필요성 판단
5. 예방 방법 제안

**중요: 탈모 및 비듬 관련 진단이나 조언은 제공하지 마세요. (비듬은 빛반사 오인 문제로 제외)**

다음 JSON 형식으로 응답해주세요:
{{
    "diagnosis": "종합 진단 결과",
    "main_issues": ["주요 문제점 1", "주요 문제점 2"],
    "causes": ["원인 1", "원인 2"],
    "management_plan": ["관리 방법 1", "관리 방법 2"],
    "precautions": ["주의사항 1", "주의사항 2"],
    "medical_consultation": true/false,
    "prevention_tips": ["예방 팁 1", "예방 팁 2"],
    "confidence_level": "high/medium/low"
}}
"""
        return prompt
    
    def _format_diagnosis_scores(self, scores: Dict[str, float]) -> str:
        """진단 점수를 포맷팅"""
        if not scores:
            return "진단 점수 정보 없음"
        
        formatted = []
        for category, score in scores.items():
            severity = self._get_severity_text(score)
            formatted.append(f"- {category}: {score:.1f} ({severity})")
        
        return "\n".join(formatted)
    
    def _format_similar_cases(self, cases: List[Dict]) -> str:
        """유사 케이스를 포맷팅"""
        if not cases:
            return "유사 케이스 없음"
        
        formatted = []
        for i, case in enumerate(cases, 1):
            metadata = case.get("metadata", {})
            score = case.get("score", 0)
            formatted.append(
                f"{i}. 카테고리: {metadata.get('category', 'N/A')}, "
                f"심각도: {metadata.get('severity', 'N/A')}, "
                f"유사도: {score:.3f}"
            )
        
        return "\n".join(formatted)
    
    def _get_severity_text(self, score: float) -> str:
        """점수를 심각도 텍스트로 변환"""
        if score < 0.5:
            return "양호"
        elif score < 1.5:
            return "경증"
        elif score < 2.5:
            return "중등도"
        else:
            return "중증"
    
    def _parse_ai_response(self, response_text: str) -> Dict[str, Any]:
        """AI 응답을 파싱하여 구조화된 데이터로 변환"""
        try:
            # JSON 부분만 추출 (```json ... ``` 형태일 수 있음)
            if "```json" in response_text:
                start = response_text.find("```json") + 7
                end = response_text.find("```", start)
                json_text = response_text[start:end].strip()
            elif "{" in response_text and "}" in response_text:
                start = response_text.find("{")
                end = response_text.rfind("}") + 1
                json_text = response_text[start:end]
            else:
                # JSON이 아닌 경우 텍스트로 처리
                return {
                    "diagnosis": response_text,
                    "main_issues": [],
                    "causes": [],
                    "management_plan": [],
                    "precautions": [],
                    "medical_consultation": False,
                    "prevention_tips": [],
                    "confidence_level": "medium"
                }
            
            import json
            return json.loads(json_text)
            
        except Exception as e:
            print(f"[WARN] AI 응답 파싱 오류: {str(e)}")
            return {
                "diagnosis": response_text,
                "main_issues": [],
                "causes": [],
                "management_plan": [],
                "precautions": [],
                "medical_consultation": False,
                "prevention_tips": [],
                "confidence_level": "medium"
            }
    
    def _generate_fallback_analysis(self, rag_result: Dict[str, Any]) -> Dict[str, Any]:
        """AI 모델이 없을 때 대체 분석 생성"""
        analysis = rag_result.get("analysis", {})
        
        primary_category = analysis.get("primary_category", "알 수 없음")
        primary_severity = analysis.get("primary_severity", "알 수 없음")
        diagnosis_scores = analysis.get("diagnosis_scores", {})
        recommendations = analysis.get("recommendations", [])
        
        # 기본 진단 생성
        diagnosis = f"{primary_category} {primary_severity} 상태로 진단됩니다."
        
        # 주요 문제점 추출
        main_issues = []
        for category, score in diagnosis_scores.items():
            if score > 1.0:  # 중등도 이상
                severity_text = self._get_severity_text(score)
                main_issues.append(f"{category} {severity_text}")
        
        return {
            "success": True,
            "ai_analysis": {
                "diagnosis": diagnosis,
                "main_issues": main_issues,
                "causes": ["유전적 요인", "환경적 요인", "생활습관"],
                "management_plan": recommendations,
                "precautions": ["과도한 자극 피하기", "규칙적인 관리"],
                "medical_consultation": any(score > 2.0 for score in diagnosis_scores.values()),
                "prevention_tips": ["건강한 생활습관", "적절한 두피 관리"],
                "confidence_level": "medium"
            },
            "rag_analysis": analysis,
            "model_used": "fallback"
        }
    
    def health_check(self) -> Dict[str, Any]:
        """AI 서비스 상태 확인"""
        return {
            "status": "healthy" if self.model else "unavailable",
            "model": "gemini-2.5-flash" if self.model else None,
            "api_key_configured": bool(os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY"))
        }

# 전역 인스턴스
ai_analysis_service = AIAnalysisService()
