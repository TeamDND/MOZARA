from fastapi import HTTPException
from pydantic import BaseModel
from typing import List

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
        """진행 정도 매핑"""
        if raw_score == 0:
            return "정상"
        elif raw_score <= 2:
            return "초기"
        elif raw_score <= 5:
            return "중등도"
        else:
            return "진행성"
    
    @staticmethod
    def get_hairline_description(hairline: str) -> str:
        """헤어라인 설명"""
        descriptions = {
            "A": "이마 라인 안정적",
            "M": "양측 이마 후퇴(M형 경향)",
            "C": "곡선형 후퇴(C형 경향)",
            "U": "넓은 이마 상승(U형 경향)"
        }
        return descriptions.get(hairline, "알 수 없음")
    
    @staticmethod
    def get_vertex_description(vertex: int) -> str:
        """정수리 설명"""
        descriptions = {
            0: "정수리 정상",
            1: "약간 감소",
            2: "감소",
            3: "넓은 감소"
        }
        return descriptions.get(vertex, "알 수 없음")
    
    @staticmethod
    def get_recommendations(stage_label: str, lifestyle: LifestyleData) -> List[str]:
        """권장사항 생성"""
        recommendations = [
            "본 도구는 의료 진단이 아닌 참고용입니다. 지속 시 전문의 상담 권장."
        ]
        
        if stage_label in ["정상", "초기"]:
            recommendations.extend([
                "순한 두피 전용 샴푸 사용",
                "수면 7~8시간 확보",
                "분기별 셀프 체크"
            ])
        else:
            recommendations.extend([
                "전문의 상담/치료 옵션 안내",
                "주간 관찰 리포트",
                "두피 관리 전문 제품 사용"
            ])
        
        if lifestyle.familyHistory:
            recommendations.append("가족력 있으므로 정기적 모니터링")
        
        return recommendations
    
    @classmethod
    def diagnose(cls, request: BaspRequest) -> BaspResponse:
        """BASP 진단 수행"""
        # 입력 검증
        if request.hairline not in ["A", "M", "C", "U"]:
            raise ValueError("잘못된 헤어라인 타입")
        if request.vertex not in [0, 1, 2, 3]:
            raise ValueError("잘못된 정수리 레벨")
        if request.density not in [0, 1, 2, 3]:
            raise ValueError("잘못된 밀도 레벨")
        
        # Lifestyle Risk 계산
        lifestyle_risk = cls.calculate_lifestyle_risk(request.lifestyle)
        
        # Raw Score 계산
        v = request.vertex
        d = request.density
        risk_bucket = min(2, lifestyle_risk // 3)
        raw_score = v + d + risk_bucket
        
        # 진행 정도 매핑
        stage_label = cls.get_stage_label(raw_score)
        
        # 설명 생성
        hairline_desc = cls.get_hairline_description(request.hairline)
        vertex_desc = cls.get_vertex_description(request.vertex)
        
        # 요약 텍스트
        summary_text = f"{hairline_desc}, {vertex_desc}. 생활습관 리스크 점수: {lifestyle_risk}"
        
        # 권장사항
        recommendations = cls.get_recommendations(stage_label, request.lifestyle)
        
        # 디스클레이머
        disclaimers = [
            "본 도구는 의료 진단이 아닌 참고용입니다.",
            "증상이 지속·악화되면 피부과 전문의 상담을 권장합니다."
        ]
        
        return BaspResponse(
            baspBasic=request.hairline,
            baspSpecific=f"V{request.vertex}",
            stageLabel=stage_label,
            summaryText=summary_text,
            recommendations=recommendations,
            disclaimers=disclaimers,
            rawScore=raw_score,
            lifestyleRisk=lifestyle_risk
        )
