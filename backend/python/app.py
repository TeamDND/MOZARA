"""
MOZARA Python Backend 통합 애플리케이션
"""
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from pydantic import BaseModel
from typing import Optional

# MOZARA Hair Change 모듈
try:
    from services.hair_change.hair_change import generate_wig_style_service, get_wig_styles_service
    HAIR_CHANGE_AVAILABLE = True
    print("✅ Hair Change 모듈 로드 성공")
except ImportError as e:
    print(f"⚠️ Hair Change 모듈 로드 실패: {e}")
    HAIR_CHANGE_AVAILABLE = False

# Hair Damage Analysis 모듈 - services 폴더 내에 있다고 가정하고 경로 수정
try:
    # app 객체를 가져와 마운트하기 때문에, 이 파일에 uvicorn 실행 코드는 없어야 합니다.
    from services.hair_damage_analysis.api.hair_analysis_api import app as hair_analysis_app
    HAIR_ANALYSIS_AVAILABLE = True
    print("✅ Hair Damage Analysis 모듈 로드 성공")
except ImportError as e:
    print(f"⚠️ Hair Damage Analysis 모듈 로드 실패: {e}")
    HAIR_ANALYSIS_AVAILABLE = False
    hair_analysis_app = None

# BASP Hair Loss Diagnosis 모듈
try:
    from services.basp_selfcheck import (
        BaspRequest, BaspResponse, BaspDiagnosisEngine,
        RagRequest, RagResponse, rag_engine, LifestyleData
    )
    BASP_AVAILABLE = True
    print("✅ BASP Hair Loss Diagnosis 모듈 로드 성공")
except ImportError as e:
    print(f"⚠️ BASP Hair Loss Diagnosis 모듈 로드 실패: {e}")
    BASP_AVAILABLE = False


# Pydantic 모델 정의
class HairstyleResponse(BaseModel):
    result: str
    images: list
    message: str

class ErrorResponse(BaseModel):
    error: str

# 메인 앱 생성
app = FastAPI(title="MOZARA Python Backend 통합", version="1.0.0")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 마운트 (조건부)
if HAIR_ANALYSIS_AVAILABLE and hair_analysis_app:
    # 스프링부트 경로에 맞게 /api/hair-damage 로 마운트 경로 수정
    app.mount("/api/hair-damage", hair_analysis_app)
    print("✅ Hair Damage Analysis 라우터 마운트 완료")
else:
    print("⚠️ Hair Damage Analysis 라우터 마운트 건너뜀")

# API 엔드포인트 정의
@app.get("/")
def read_root():
    """루트 경로 - 서버 상태 확인"""
    return {
        "message": "MOZARA Python Backend 통합 서버",
        "status": "running",
        "modules": {
            "hair_damage_analysis": "/api/hair-damage" if HAIR_ANALYSIS_AVAILABLE else "unavailable",
            "hair_change": "/generate_hairstyle" if HAIR_CHANGE_AVAILABLE else "unavailable",
            "basp_diagnosis": "/api/basp/evaluate" if BASP_AVAILABLE else "unavailable"
        }
    }

@app.get("/health")
def health_check():
    """헬스 체크 엔드포인트"""
    return {"status": "healthy", "service": "python-backend-integrated"}


# --- Hair Change API (조건부) ---
if HAIR_CHANGE_AVAILABLE:
    @app.post('/generate_hairstyle', response_model=HairstyleResponse)
    async def generate_hairstyle(
        image: UploadFile = File(...),
        hairstyle: str = Form(...),
        custom_prompt: Optional[str] = Form(None)
    ):
        """가발 스타일 변경 API"""
        image_data = await image.read()
        result = await generate_wig_style_service(image_data, hairstyle, custom_prompt)
        return HairstyleResponse(**result)

    @app.get('/hairstyles')
    async def get_hairstyles():
        """사용 가능한 가발 스타일 목록 반환"""
        return get_wig_styles_service()


# --- BASP Hair Loss Diagnosis API (조건부) ---
if BASP_AVAILABLE:
    @app.get("/api/basp/evaluate")
    def evaluate_basp_get():
        """BASP 탈모 진단 API (GET 테스트용)"""
        sample_request = BaspRequest(
            hairline="M",
            vertex=1,
            density=1,
            lifestyle=LifestyleData(
                shedding6m=True,
                familyHistory=False,
                sleepHours="5to7",
                smoking=False,
                alcohol="light"
            )
        )
        try:
            result = BaspDiagnosisEngine.diagnose(sample_request)
            return result
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"진단 중 오류가 발생했습니다: {str(e)}")

    @app.post("/api/basp/evaluate", response_model=BaspResponse)
    def evaluate_basp(request: BaspRequest):
        """BASP 탈모 진단 API"""
        try:
            result = BaspDiagnosisEngine.diagnose(request)
            return result
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"진단 중 오류가 발생했습니다: {str(e)}")

    @app.post("/api/rag/answer", response_model=RagResponse)
    def rag_answer(request: RagRequest):
        """RAG 기반 진단 가이드 API"""
        try:
            print("=== RAG API 요청 받음 ===")
            print(f"BASP Basic: {request.baspBasic}")
            print(f"BASP Specific: {request.baspSpecific}")
            print(f"Stage Label: {request.stageLabel}")
            print(f"Risk Score: {request.riskScore}")

            result = rag_engine.answer(request)
            print(f"RAG 결과: {result}")

            return result
        except Exception as e:
            print(f"RAG API 오류: {e}")
            raise HTTPException(status_code=500, detail=f"RAG 답변 생성 중 오류가 발생했습니다: {str(e)}")


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)