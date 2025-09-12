
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

# 탈모 단계별 제품 데이터 구조
HAIR_LOSS_STAGE_PRODUCTS = {
    1: [  # 1단계: 초기 탈모 (예방 중심)
        {
            "productId": "stage1-1",
            "productName": "두피 건강 샴푸",
            "productPrice": 18000,
            "productRating": 4.5,
            "productReviewCount": 234,
            "productImage": "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&h=200&fit=crop&crop=center",
            "productUrl": "https://www.11st.co.kr/products/stage1-1",
            "mallName": "11번가",
            "maker": "헤어케어 전문",
            "brand": "두피케어",
            "category1": "헤어케어",
            "category2": "탈모샴푸",
            "category3": "예방용",
            "category4": "1단계",
            "description": "두피 건강을 위한 예방 중심 샴푸",
            "ingredients": ["케라틴", "비오틴", "판테놀"],
            "suitableStages": [1, 2]
        },
        {
            "productId": "stage1-2",
            "productName": "두피 토닉",
            "productPrice": 22000,
            "productRating": 4.3,
            "productReviewCount": 189,
            "productImage": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop&crop=center",
            "productUrl": "https://www.11st.co.kr/products/stage1-2",
            "mallName": "11번가",
            "maker": "헤어케어 전문",
            "brand": "두피케어",
            "category1": "헤어케어",
            "category2": "헤어토닉",
            "category3": "예방용",
            "category4": "1단계",
            "description": "두피 순환을 개선하는 토닉",
            "ingredients": ["민들레 추출물", "로즈마리", "멘톨"],
            "suitableStages": [1, 2]
        },
        {
            "productId": "stage1-3",
            "productName": "비오틴 영양제",
            "productPrice": 35000,
            "productRating": 4.7,
            "productReviewCount": 156,
            "productImage": "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=200&h=200&fit=crop&crop=center",
            "productUrl": "https://www.11st.co.kr/products/stage1-3",
            "mallName": "11번가",
            "maker": "헤어케어 전문",
            "brand": "두피케어",
            "category1": "헤어케어",
            "category2": "영양제",
            "category3": "비오틴",
            "category4": "1단계",
            "description": "모발 건강을 위한 비오틴 영양제",
            "ingredients": ["비오틴", "아연", "셀레늄"],
            "suitableStages": [1, 2, 3]
        }
    ],
    2: [  # 2단계: 경미한 탈모 (강화 중심)
        {
            "productId": "stage2-1",
            "productName": "탈모 방지 샴푸",
            "productPrice": 25000,
            "productRating": 4.6,
            "productReviewCount": 267,
            "productImage": "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&h=200&fit=crop&crop=center",
            "productUrl": "https://www.11st.co.kr/products/stage2-1",
            "mallName": "11번가",
            "maker": "헤어케어 전문",
            "brand": "탈모케어",
            "category1": "헤어케어",
            "category2": "탈모샴푸",
            "category3": "방지용",
            "category4": "2단계",
            "description": "경미한 탈모를 방지하는 샴푸",
            "ingredients": ["케라틴", "비오틴", "판테놀", "아르간 오일"],
            "suitableStages": [2, 3]
        },
        {
            "productId": "stage2-2",
            "productName": "모발 강화 세럼",
            "productPrice": 38000,
            "productRating": 4.4,
            "productReviewCount": 198,
            "productImage": "https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=200&h=200&fit=crop&crop=center",
            "productUrl": "https://www.11st.co.kr/products/stage2-2",
            "mallName": "11번가",
            "maker": "헤어케어 전문",
            "brand": "탈모케어",
            "category1": "헤어케어",
            "category2": "헤어세럼",
            "category3": "강화용",
            "category4": "2단계",
            "description": "모발 성장을 촉진하는 세럼",
            "ingredients": ["펩타이드", "케라틴", "비타민 E"],
            "suitableStages": [2, 3, 4]
        }
    ],
    3: [  # 3단계: 중등도 탈모 (치료 중심)
        {
            "productId": "stage3-1",
            "productName": "탈모 치료 샴푸",
            "productPrice": 35000,
            "productRating": 4.8,
            "productReviewCount": 312,
            "productImage": "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&h=200&fit=crop&crop=center",
            "productUrl": "https://www.11st.co.kr/products/stage3-1",
            "mallName": "11번가",
            "maker": "헤어케어 전문",
            "brand": "탈모치료",
            "category1": "헤어케어",
            "category2": "탈모샴푸",
            "category3": "치료용",
            "category4": "3단계",
            "description": "탈모 진행을 억제하는 치료 샴푸",
            "ingredients": ["케토코나졸", "케라틴", "아르간 오일"],
            "suitableStages": [3, 4]
        },
        {
            "productId": "stage3-2",
            "productName": "미녹시딜 토닉",
            "productPrice": 45000,
            "productRating": 4.9,
            "productReviewCount": 278,
            "productImage": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop&crop=center",
            "productUrl": "https://www.11st.co.kr/products/stage3-2",
            "mallName": "11번가",
            "maker": "헤어케어 전문",
            "brand": "탈모치료",
            "category1": "헤어케어",
            "category2": "헤어토닉",
            "category3": "치료용",
            "category4": "3단계",
            "description": "모발 성장을 촉진하는 미녹시딜 토닉",
            "ingredients": ["미녹시딜 5%", "케라틴", "아미노산"],
            "suitableStages": [3, 4, 5]
        }
    ],
    4: [  # 4단계: 심한 탈모 (집중 치료)
        {
            "productId": "stage4-1",
            "productName": "강력 탈모 치료 샴푸",
            "productPrice": 45000,
            "productRating": 4.9,
            "productReviewCount": 345,
            "productImage": "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&h=200&fit=crop&crop=center",
            "productUrl": "https://www.11st.co.kr/products/stage4-1",
            "mallName": "11번가",
            "maker": "헤어케어 전문",
            "brand": "강력탈모치료",
            "category1": "헤어케어",
            "category2": "탈모샴푸",
            "category3": "강력치료용",
            "category4": "4단계",
            "description": "심한 탈모를 위한 강력 치료 샴푸",
            "ingredients": ["케토코나졸 2%", "케라틴", "아르간 오일", "프로바이오틱스"],
            "suitableStages": [4, 5]
        },
        {
            "productId": "stage4-2",
            "productName": "고농도 미녹시딜 토닉",
            "productPrice": 65000,
            "productRating": 4.9,
            "productReviewCount": 298,
            "productImage": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop&crop=center",
            "productUrl": "https://www.11st.co.kr/products/stage4-2",
            "mallName": "11번가",
            "maker": "헤어케어 전문",
            "brand": "강력탈모치료",
            "category1": "헤어케어",
            "category2": "헤어토닉",
            "category3": "강력치료용",
            "category4": "4단계",
            "description": "고농도 미녹시딜로 모발 성장 촉진",
            "ingredients": ["미녹시딜 10%", "케라틴", "아미노산", "펩타이드"],
            "suitableStages": [4, 5, 6]
        }
    ],
    5: [  # 5단계: 매우 심한 탈모 (전문 치료)
        {
            "productId": "stage5-1",
            "productName": "프리미엄 탈모 치료 샴푸",
            "productPrice": 65000,
            "productRating": 4.9,
            "productReviewCount": 423,
            "productImage": "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&h=200&fit=crop&crop=center",
            "productUrl": "https://www.11st.co.kr/products/stage5-1",
            "mallName": "11번가",
            "maker": "헤어케어 전문",
            "brand": "프리미엄탈모치료",
            "category1": "헤어케어",
            "category2": "탈모샴푸",
            "category3": "프리미엄치료용",
            "category4": "5단계",
            "description": "매우 심한 탈모를 위한 프리미엄 치료 샴푸",
            "ingredients": ["케토코나졸 2%", "케라틴", "아르간 오일", "프로바이오틱스", "펩타이드"],
            "suitableStages": [5, 6]
        },
        {
            "productId": "stage5-2",
            "productName": "최고농도 미녹시딜 토닉",
            "productPrice": 85000,
            "productRating": 4.9,
            "productReviewCount": 356,
            "productImage": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop&crop=center",
            "productUrl": "https://www.11st.co.kr/products/stage5-2",
            "mallName": "11번가",
            "maker": "헤어케어 전문",
            "brand": "프리미엄탈모치료",
            "category1": "헤어케어",
            "category2": "헤어토닉",
            "category3": "프리미엄치료용",
            "category4": "5단계",
            "description": "최고농도 미녹시딜로 모발 성장 촉진",
            "ingredients": ["미녹시딜 15%", "케라틴", "아미노산", "펩타이드", "비타민 E"],
            "suitableStages": [5, 6]
        }
    ],
    6: [  # 6단계: 극심한 탈모 (의료진 상담 필수)
        {
            "productId": "stage6-1",
            "productName": "의료진 상담 필수 샴푸",
            "productPrice": 75000,
            "productRating": 4.8,
            "productReviewCount": 234,
            "productImage": "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=200&h=200&fit=crop&crop=center",
            "productUrl": "https://www.11st.co.kr/products/stage6-1",
            "mallName": "11번가",
            "maker": "헤어케어 전문",
            "brand": "의료진상담필수",
            "category1": "헤어케어",
            "category2": "탈모샴푸",
            "category3": "의료진상담용",
            "category4": "6단계",
            "description": "극심한 탈모를 위한 의료진 상담 필수 샴푸",
            "ingredients": ["케토코나졸 2%", "케라틴", "아르간 오일", "프로바이오틱스", "펩타이드", "의료용 성분"],
            "suitableStages": [6]
        },
        {
            "productId": "stage6-2",
            "productName": "의료진 처방 토닉",
            "productPrice": 95000,
            "productRating": 4.9,
            "productReviewCount": 189,
            "productImage": "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=200&h=200&fit=crop&crop=center",
            "productUrl": "https://www.11st.co.kr/products/stage6-2",
            "mallName": "11번가",
            "maker": "헤어케어 전문",
            "brand": "의료진상담필수",
            "category1": "헤어케어",
            "category2": "헤어토닉",
            "category3": "의료진처방용",
            "category4": "6단계",
            "description": "극심한 탈모를 위한 의료진 처방 토닉",
            "ingredients": ["미녹시딜 20%", "케라틴", "아미노산", "펩타이드", "비타민 E", "의료용 성분"],
            "suitableStages": [6]
        }
    ]
}

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
        
        # 단계별 제품 데이터 가져오기
        if stage not in HAIR_LOSS_STAGE_PRODUCTS:
            raise HTTPException(
                status_code=400, 
                detail=f"지원하지 않는 탈모 단계입니다. 1-6단계 중 선택해주세요."
            )
        
        products = HAIR_LOSS_STAGE_PRODUCTS[stage]
        
        # 단계별 설명 추가
        stage_descriptions = {
            1: "초기 탈모 (예방 중심)",
            2: "경미한 탈모 (강화 중심)", 
            3: "중등도 탈모 (치료 중심)",
            4: "심한 탈모 (집중 치료)",
            5: "매우 심한 탈모 (전문 치료)",
            6: "극심한 탈모 (의료진 상담 필수)"
        }
        
        result = {
            "products": products,
            "totalCount": len(products),
            "stage": stage,
            "stageDescription": stage_descriptions[stage],
            "recommendation": f"{stage}단계 탈모에 적합한 {len(products)}개 제품을 추천합니다.",
            "disclaimer": "본 추천은 참고용이며, 정확한 진단과 치료는 전문의 상담이 필요합니다."
        }
        
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