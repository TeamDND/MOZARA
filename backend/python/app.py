
"""
MOZARA Python Backend 통합 애플리케이션
"""
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv
import os

# .env 파일 로드 (상위 디렉토리의 .env 파일 사용)
load_dotenv("../../.env")

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
    index = None
    print("⚠️ Hair Damage Analysis 라우터 마운트 건너뜀")

# OpenAI setup
openai_api_key = os.getenv("OPENAI_API_KEY")
if openai_api_key:
    openai_client = OpenAI(api_key=openai_api_key)
    print("OpenAI 클라이언트 초기화 완료")
else:
    openai_client = None
    print("Warning: OPENAI_API_KEY가 설정되지 않았습니다. 일부 기능이 제한될 수 있습니다.")

from services.hair_loss_products import (
    HAIR_LOSS_STAGE_PRODUCTS,
    STAGE_DESCRIPTIONS,
    build_stage_response,
)

class SearchQuery(BaseModel):
    question: str
    max_results: Optional[int] = 5

class PaperCard(BaseModel):
    id: str
    title: str
    source: str
    summary_preview: str

class PaperDetail(BaseModel):
    id: str
    title: str
    source: str
    full_summary: str

class PaperAnalysis(BaseModel):
    id: str
    title: str
    source: str
    main_topics: List[str]
    key_conclusions: str
    section_summaries: List[dict]

class QnaQuery(BaseModel):
    paper_id: str
    question: str

class QnaResponse(BaseModel):
    answer: str

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

# --- YouTube API 프록시 (조건부) ---
@app.get("/api/youtube/search")
async def search_youtube_videos(q: str, order: str = "viewCount", max_results: int = 12):
    """YouTube API 프록시 - API 키를 백엔드에서 관리"""
    # URL 디코딩 처리
    import urllib.parse
    original_q = q
    q = urllib.parse.unquote(q)
    print(f"🔍 YouTube 검색 요청 - 원본: {original_q}, 디코딩: {q}, 정렬: {order}, 최대결과: {max_results}")
    
    try:
        import requests
        print("✅ requests 모듈 로드 성공")
    except ImportError:
        print("❌ requests 모듈 로드 실패")
        raise HTTPException(status_code=500, detail="requests 모듈이 설치되지 않았습니다. pip install requests를 실행하세요.")
    
    youtube_api_key = os.getenv("YOUTUBE_API_KEY")
    print(f"🔑 YouTube API 키 상태: {'설정됨' if youtube_api_key and youtube_api_key != 'your_youtube_api_key_here' else '설정되지 않음'}")
    
    try:
        api_url = f"https://www.googleapis.com/youtube/v3/search"
        params = {
            "part": "snippet",
            "q": q,
            "order": order,
            "type": "video",
            "maxResults": max_results,
            "key": youtube_api_key
        }
        
        print(f"🌐 YouTube API 호출: {api_url}")
        print(f"📋 파라미터: {params}")
        
        response = requests.get(api_url, params=params)
        print(f"📡 응답 상태: {response.status_code}")
        
        response.raise_for_status()
        
        result = response.json()
        print(f"✅ YouTube API 응답 성공: {len(result.get('items', []))}개 영상")
        return result
        
    except requests.exceptions.RequestException as e:
        print(f"❌ YouTube API 호출 실패: {str(e)}")
        raise HTTPException(status_code=500, detail=f"YouTube API 호출 실패: {str(e)}")
    except Exception as e:
        print(f"❌ 예상치 못한 오류: {str(e)}")
        raise HTTPException(status_code=500, detail=f"예상치 못한 오류: {str(e)}")

@app.post("/search", response_model=List[PaperCard])
async def search_papers(query: SearchQuery):
    if not index:
        raise HTTPException(status_code=503, detail="Thesis search service is not available")
    
    if not openai_client:
        raise HTTPException(status_code=503, detail="OpenAI service is not available")
    
    try:
        response = openai_client.embeddings.create(
            model="text-embedding-3-small",
            input=query.question
        )
        query_embedding = response.data[0].embedding
        
        results = index.query(
            vector=query_embedding,
            top_k=query.max_results,
            include_metadata=True
        )
        
        best_match_by_file = {}
        for match in results['matches']:
            metadata = match.get('metadata', {}) or {}
            file_path = metadata.get('file_path') or metadata.get('source') or metadata.get('title')
            if not file_path:
                file_path = match.get('id')
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"예상치 못한 오류: {str(e)}")
    return [PaperCard(**match) for match in best_match_by_file.values()]
    


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


@app.get("/api/products")
async def get_hair_loss_products(
    stage: int = Query(..., description="탈모 단계 (1-6)", ge=1, le=6)
):
    """탈모 단계별 제품 추천 API"""
    try:
        print(f"탈모 단계별 제품 요청: stage={stage}")
        
        # 서비스 계층에서 결과 구성
        result = build_stage_response(stage)
        
        print(f"성공: {stage}단계 제품 {len(products)}개 반환")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"탈모 단계별 제품 조회 중 오류: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500, 
            detail="제품 조회 중 오류가 발생했습니다."
        )

@app.get("/api/products/health")
async def products_health_check():
    """제품 추천 서비스 헬스체크"""
    return {
        "status": "healthy",
        "service": "hair-products-recommendation",
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)