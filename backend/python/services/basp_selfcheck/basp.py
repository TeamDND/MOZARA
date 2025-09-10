from fastapi import HTTPException
from pydantic import BaseModel
from typing import List, Optional

# 요청 모델
class LifestyleData(BaseModel):
    shedding6m: bool
    familyHistory: bool
    sleepHours: str  # lt4, 5to7, ge8
    smoking: bool
    alcohol: str  # none, light, heavy

class BaspRequest(BaseModel):
    hairline: str  # A, M, C, U
    vertex: int    # 0, 1, 2, 3
    density: int   # 0, 1, 2, 3
    lifestyle: LifestyleData

# 응답 모델
class BaspResponse(BaseModel):
    baspBasic: str
    baspSpecific: str
    stageLabel: str
    summaryText: str
    recommendations: List[str]
    disclaimers: List[str]
    rawScore: int
    lifestyleRisk: int

# BASP 진단 로직
class BaspDiagnosisEngine:
    @staticmethod
    def calculate_lifestyle_risk(lifestyle: LifestyleData) -> int:
        """생활습관 리스크 계산 (0~8)"""
        risk = 0
        
        if lifestyle.shedding6m:
            risk += 2
        if lifestyle.familyHistory:
            risk += 2
            
        if lifestyle.sleepHours == "lt4":
            risk += 2
        elif lifestyle.sleepHours == "5to7":
            risk += 1
        elif lifestyle.sleepHours == "ge8":
            risk += 0
            
        if lifestyle.smoking:
            risk += 1
        if lifestyle.alcohol == "heavy":
            risk += 1
            
        return min(8, risk)
    
    @staticmethod
    def get_stage_label(raw_score: int) -> str:
        """원점수에 따른 단계 라벨"""
        if raw_score <= 2:
            return "정상"
        elif raw_score <= 4:
            return "경증"
        elif raw_score <= 6:
            return "중등도"
        else:
            return "중증"
    
    @staticmethod
    def get_hairline_description(hairline: str) -> str:
        """헤어라인 코드에 따른 설명"""
        descriptions = {
            "A": "정상 헤어라인",
            "M": "M자형 헤어라인",
            "C": "C자형 헤어라인", 
            "U": "U자형 헤어라인"
        }
        return descriptions.get(hairline, "알 수 없는 헤어라인")
    
    @staticmethod
    def get_vertex_description(vertex: int) -> str:
        """정수리 등급에 따른 설명"""
        descriptions = {
            0: "정상",
            1: "경미한 탈모",
            2: "중등도 탈모",
            3: "심한 탈모"
        }
        return descriptions.get(vertex, "알 수 없는 상태")
    
    @staticmethod
    def get_recommendations(stage_label: str, lifestyle: LifestyleData) -> List[str]:
        """단계별 권장사항"""
        recommendations = []
        
        if stage_label == "정상":
            recommendations.extend([
                "현재 상태를 유지하기 위해 건강한 생활습관을 계속 유지하세요.",
                "정기적인 두피 관리와 적절한 샴푸를 사용하세요."
            ])
        elif stage_label == "경증":
            recommendations.extend([
                "두피 마사지를 통해 혈액순환을 개선하세요.",
                "스트레스 관리를 위해 충분한 휴식을 취하세요.",
                "균형 잡힌 식단을 유지하세요."
            ])
        elif stage_label == "중등도":
            recommendations.extend([
                "전문의 상담을 받아보시기 바랍니다.",
                "두피 건강에 도움이 되는 영양제를 고려해보세요.",
                "과도한 스타일링 제품 사용을 피하세요."
            ])
        else:  # 중증
            recommendations.extend([
                "즉시 전문의 상담을 받으시기 바랍니다.",
                "의학적 치료를 고려해보세요.",
                "두피에 무리를 주는 행동을 피하세요."
            ])
        
        # 생활습관별 추가 권장사항
        if lifestyle.smoking:
            recommendations.append("흡연은 탈모에 악영향을 줄 수 있으므로 금연을 권장합니다.")
        if lifestyle.alcohol == "heavy":
            recommendations.append("과도한 음주는 탈모를 악화시킬 수 있으므로 절주하세요.")
        if lifestyle.sleepHours == "lt4":
            recommendations.append("충분한 수면은 모발 건강에 중요합니다. 7-8시간 수면을 권장합니다.")
            
        return recommendations
    
    @classmethod
    def diagnose(cls, request: BaspRequest) -> BaspResponse:
        """BASP 진단 수행"""
        try:
            # 헤어라인 점수 계산
            hairline_scores = {"A": 0, "M": 1, "C": 2, "U": 3}
            hairline_score = hairline_scores.get(request.hairline, 0)
            
            # 정수리 점수
            vertex_score = request.vertex
            
            # 밀도 점수
            density_score = request.density
            
            # 원점수 계산
            raw_score = hairline_score + vertex_score + density_score
            
            # 생활습관 리스크 계산
            lifestyle_risk = cls.calculate_lifestyle_risk(request.lifestyle)
            
            # 단계 라벨 결정
            stage_label = cls.get_stage_label(raw_score)
            
            # 설명 생성
            hairline_desc = cls.get_hairline_description(request.hairline)
            vertex_desc = cls.get_vertex_description(request.vertex)
            
            basp_basic = f"헤어라인: {hairline_desc}, 정수리: {vertex_desc}"
            basp_specific = f"원점수: {raw_score}, 생활습관 리스크: {lifestyle_risk}"
            
            # 요약 텍스트
            summary_text = f"현재 탈모 상태는 '{stage_label}' 단계입니다. 원점수 {raw_score}점으로 평가되며, 생활습관 리스크는 {lifestyle_risk}점입니다."
            
            # 권장사항
            recommendations = cls.get_recommendations(stage_label, request.lifestyle)
            
            # 면책조항
            disclaimers = [
                "이 진단은 참고용이며, 정확한 진단을 위해서는 전문의 상담이 필요합니다.",
                "개인차에 따라 결과가 다를 수 있습니다.",
                "의학적 치료가 필요한 경우 전문의와 상담하시기 바랍니다."
            ]
            
            return BaspResponse(
                baspBasic=basp_basic,
                baspSpecific=basp_specific,
                stageLabel=stage_label,
                summaryText=summary_text,
                recommendations=recommendations,
                disclaimers=disclaimers,
                rawScore=raw_score,
                lifestyleRisk=lifestyle_risk
            )
            
        except Exception as e:
            raise ValueError(f"진단 중 오류가 발생했습니다: {str(e)}")

# 간단한 RAG 응답 모델 (기능 준비 중)
class RagRequest(BaseModel):
    baspBasic: str
    baspSpecific: str
    stageLabel: str
    riskScore: int

class RagResponse(BaseModel):
    answer: List[str]
    citations: List[dict] = []

# 간단한 RAG 엔진 (기능 준비 중)
class SimpleRagEngine:
    @staticmethod
    def answer(request: RagRequest) -> RagResponse:
        """기능 준비 중 메시지 반환"""
        return RagResponse(
            answer=[
                "🚧 기능 준비 중입니다.",
                "탈모 진단 가이드 기능이 준비 중입니다.",
                "곧 더 자세한 정보를 제공할 예정입니다."
            ],
            citations=[]
        )

# 전역 RAG 엔진 인스턴스
rag_engine = SimpleRagEngine()