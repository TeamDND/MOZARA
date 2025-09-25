
"""
MOZARA Python Backend 통합 애플리케이션
"""
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from pydantic import BaseModel
from typing import Optional, List
import json
from typing import Annotated
import threading
from dotenv import load_dotenv
from datetime import datetime
import os
import urllib.parse
import hashlib
import json
from datetime import datetime, timedelta

# .env 파일 로드 (Docker 환경에서는 환경변수 직접 사용)
try:
    load_dotenv("../../.env")
    # load_dotenv(".env")
except:
    pass  # Docker 환경에서는 환경변수를 직접 사용

# 이미지 캐시 저장소 (메모리 기반)
image_cache = {}

def get_cache_key(place_name: str, address: str = None) -> str:
    """캐시 키 생성"""
    key_string = f"{place_name}_{address or ''}"
    return hashlib.md5(key_string.encode()).hexdigest()

def get_cached_image(place_name: str, address: str = None) -> str:
    """캐시된 이미지 URL 가져오기"""
    cache_key = get_cache_key(place_name, address)
    
    if cache_key in image_cache:
        cached_data = image_cache[cache_key]
        # 캐시 만료 시간 확인 (24시간)
        if datetime.now() - cached_data['timestamp'] < timedelta(hours=24):
            return cached_data['image_url']
        else:
            # 만료된 캐시 삭제
            del image_cache[cache_key]
    
    return None

def cache_image(place_name: str, address: str, image_url: str):
    """이미지 URL 캐시 저장"""
    cache_key = get_cache_key(place_name, address)
    image_cache[cache_key] = {
        'image_url': image_url,
        'timestamp': datetime.now()
    }

def generate_default_image_url(category: str, name: str) -> str:
    """카테고리와 이름을 기반으로 기본 이미지 URL 생성"""
    # 카테고리별 색상과 아이콘 매핑
    category_mapping = {
        '탈모병원': {'color': 'blue', 'icon': 'hospital', 'unsplash_query': 'hospital+medical'},
        '탈모미용실': {'color': 'purple', 'icon': 'scissors', 'unsplash_query': 'hair+salon'},
        '가발전문점': {'color': 'green', 'icon': 'wig', 'unsplash_query': 'wig+hair'},
        '두피문신': {'color': 'orange', 'icon': 'tattoo', 'unsplash_query': 'tattoo+studio'},
    }
    
    # 카테고리 분류
    category_lower = category.lower()
    name_lower = name.lower()
    
    if '문신' in category_lower or '문신' in name_lower or 'smp' in name_lower:
        selected_category = '두피문신'
    elif '가발' in category_lower or '가발' in name_lower or '증모술' in name_lower:
        selected_category = '가발전문점'
    elif '미용' in category_lower or '미용' in name_lower or '헤어' in name_lower or '살롱' in name_lower:
        selected_category = '탈모미용실'
    else:
        selected_category = '탈모병원'
    
    config = category_mapping.get(selected_category, category_mapping['탈모병원'])
    
    # 첫 글자 추출
    first_letter = name[0].upper() if name else 'H'
    
    # Unsplash API를 사용한 실제 이미지 URL 생성 (더 실제적인 이미지)
    # Unsplash Source API는 무료로 사용 가능하며, 300x200 크기의 이미지를 제공
    unsplash_url = f"https://source.unsplash.com/300x200/?{config['unsplash_query']}"
    
    # fallback으로 placeholder 사용
    placeholder_url = f"https://via.placeholder.com/300x200/{config['color']}/ffffff?text={urllib.parse.quote(first_letter)}"
    
    # 실제 이미지 URL을 우선 사용하되, 실패 시 placeholder 사용
    return unsplash_url

async def get_google_places_image(place_name: str, address: str = None) -> str:
    """Google Places API를 사용하여 실제 병원 이미지 가져오기"""
    # 캐시에서 먼저 확인
    cached_image = get_cached_image(place_name, address)
    if cached_image:
        return cached_image
    
    google_api_key = os.getenv("GOOGLE_PLACES_API_KEY")
    
    if not google_api_key:
        default_image = generate_default_image_url("", place_name)
        cache_image(place_name, address, default_image)
        return default_image
    
    try:
        import requests
        
        # Google Places Text Search API로 장소 검색
        search_url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
        search_params = {
            "query": f"{place_name} {address or ''}",
            "key": google_api_key,
            "type": "hospital|beauty_salon|hair_care"
        }
        
        search_response = requests.get(search_url, params=search_params)
        search_data = search_response.json()
        
        if search_data.get("status") == "OK" and search_data.get("results"):
            place_id = search_data["results"][0]["place_id"]
            
            # Place Details API로 상세 정보 및 사진 참조 가져오기
            details_url = "https://maps.googleapis.com/maps/api/place/details/json"
            details_params = {
                "place_id": place_id,
                "fields": "photos",
                "key": google_api_key
            }
            
            details_response = requests.get(details_url, params=details_params)
            details_data = details_response.json()
            
            if details_data.get("status") == "OK" and details_data.get("result", {}).get("photos"):
                # 첫 번째 사진 사용
                photo_reference = details_data["result"]["photos"][0]["photo_reference"]
                photo_url = f"https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference={photo_reference}&key={google_api_key}"
                # 캐시에 저장
                cache_image(place_name, address, photo_url)
                return photo_url
        
        # Google Places에서 이미지를 찾지 못한 경우 기본 이미지 반환
        default_image = generate_default_image_url("", place_name)
        cache_image(place_name, address, default_image)
        return default_image
        
    except Exception as e:
        print(f"Google Places API 오류: {e}")
        return generate_default_image_url("", place_name)

async def scrape_hospital_images(place_name: str, address: str = None) -> str:
    """웹 스크래핑을 통한 병원 이미지 수집"""
    try:
        import requests
        from bs4 import BeautifulSoup
        
        # 네이버 지도에서 병원 검색
        search_query = f"{place_name} {address or ''}"
        naver_map_url = f"https://map.naver.com/v5/search/{urllib.parse.quote(search_query)}"
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(naver_map_url, headers=headers, timeout=10)
        
        if response.status_code == 200:
            soup = BeautifulSoup(response.content, 'html.parser')
            
            # 네이버 지도에서 이미지 찾기
            img_tags = soup.find_all('img', {'class': ['place_thumb', 'photo']})
            
            for img in img_tags:
                src = img.get('src') or img.get('data-src')
                if src and ('place' in src or 'photo' in src):
                    # 상대 URL을 절대 URL로 변환
                    if src.startswith('//'):
                        src = 'https:' + src
                    elif src.startswith('/'):
                        src = 'https://map.naver.com' + src
                    
                    return src
        
        # 네이버에서 이미지를 찾지 못한 경우 기본 이미지 반환
        return generate_default_image_url("", place_name)
        
    except Exception as e:
        print(f"웹 스크래핑 오류: {e}")
        return generate_default_image_url("", place_name)

# MOZARA Hair Change 모듈
try:
    from services.hair_change.hair_change import generate_wig_style_service, get_wig_styles_service
    HAIR_CHANGE_AVAILABLE = True
    print("Hair Change 모듈 로드 성공")
except ImportError as e:
    print(f"Hair Change 모듈 로드 실패: {e}")
    HAIR_CHANGE_AVAILABLE = False

# Hair Loss Daily 모듈 - services 폴더 내에 있다고 가정하고 경로 수정
try:
    # app 객체를 가져와 마운트하기 때문에, 이 파일에 uvicorn 실행 코드는 없어야 합니다.
    from services.hair_loss_daily.api.hair_analysis_api import app as hair_analysis_app
    HAIR_ANALYSIS_AVAILABLE = True
    print("Hair Loss Daily 모듈 로드 성공")
except ImportError as e:
    print(f"Hair Loss Daily 모듈 로드 실패: {e}")
    HAIR_ANALYSIS_AVAILABLE = False
    hair_analysis_app = None



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
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 모든 응답에 CORS 헤더를 보강 (일부 환경에서 누락되는 경우 대비)
@app.middleware("http")
async def add_cors_headers(request, call_next):
    # 간단한 요청 로깅
    try:
        print(f"[REQ] {request.method} {request.url.path}")
    except Exception:
        pass
    response = await call_next(request)
    response.headers["Access-Control-Allow-Origin"] = request.headers.get("origin", "*") or "*"
    response.headers["Vary"] = "Origin"
    response.headers["Access-Control-Allow-Headers"] = request.headers.get("access-control-request-headers", "*") or "*"
    response.headers["Access-Control-Allow-Methods"] = request.headers.get("access-control-request-method", "GET,POST,PUT,PATCH,DELETE,OPTIONS") or "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    return response

# 라우터 마운트 (조건부)
if HAIR_ANALYSIS_AVAILABLE and hair_analysis_app:
    # Hair Loss Daily API를 /hair-loss-daily 경로에 마운트
    app.mount("/hair-loss-daily", hair_analysis_app)
    print("Hair Loss Daily 라우터 마운트 완료 (/hair-loss-daily)")
else:
    index = None
    print("Hair Loss Daily 라우터 마운트 건너뜀")

# OpenAI setup
openai_api_key = os.getenv("OPENAI_API_KEY")
if openai_api_key:
    from openai import OpenAI
    openai_client = OpenAI(api_key=openai_api_key)
    print("OpenAI 클라이언트 초기화 완료")
else:
    openai_client = None
    print("OPENAI_API_KEY가 설정되지 않았습니다. 일부 기능이 제한될 수 있습니다.")

# Google Gemini setup
gemini_api_key = os.getenv("GEMINI_API_KEY")
google_api_key = os.getenv("GOOGLE_API_KEY")

if gemini_api_key:
    import google.generativeai as genai
    genai.configure(api_key=gemini_api_key)
    print("Google Gemini 클라이언트 초기화 완료 (GEMINI_API_KEY 사용)")
elif google_api_key:
    import google.generativeai as genai
    genai.configure(api_key=google_api_key)
    print("Google Gemini 클라이언트 초기화 완료 (GOOGLE_API_KEY 사용)")
else:
    genai = None
    print("GEMINI_API_KEY 또는 GOOGLE_API_KEY가 설정되지 않았습니다. Gemini 기능이 제한될 수 있습니다.")

# Hair Encyclopedia 라우터 마운트
try:
    from services.hair_encyclopedia.paper_api import router as paper_router
    app.include_router(paper_router)
    print("Hair Encyclopedia Paper API 라우터 마운트 완료")
except ImportError as e:
    print(f"Hair Encyclopedia Paper API 라우터 마운트 실패: {e}")

# Gemini Hair Analysis Models
class HairAnalysisRequest(BaseModel):
    image_base64: str

class HairAnalysisResponse(BaseModel):
    stage: int
    title: str
    description: str
    advice: List[str]

# Gemini Hair Quiz Models
class QuizQuestion(BaseModel):
    question: str
    answer: str
    explanation: str

class QuizGenerateResponse(BaseModel):
    items: List[QuizQuestion]

from services.hair_loss_products import (
    build_stage_response,
    search_11st_products,
)

# Gemini 탈모 사진 분석 (퀴즈 모듈과 동일한 분석 로직 분리본)
try:
    from services.hair_gemini_check import analyze_hair_with_gemini
    GEMINI_HAIR_CHECK_AVAILABLE = True
except Exception as _e:
    GEMINI_HAIR_CHECK_AVAILABLE = False

# API 엔드포인트 정의
@app.get("/")
def read_root():
    """루트 경로 - 서버 상태 확인"""
    return {
        "message": "MOZARA Python Backend 통합 서버",
        "status": "running",
        "modules": {
            "hair_loss_daily": "/hair-loss-daily" if HAIR_ANALYSIS_AVAILABLE else "unavailable",
            "hair_change": "/generate_hairstyle" if HAIR_CHANGE_AVAILABLE else "unavailable",
            "hair_encyclopedia": "/paper" if openai_api_key else "unavailable",
            "gemini_hair_analysis": "/hair-analysis" if google_api_key else "unavailable"
        }
    }

@app.get("/health")

def health_check():
    """헬스 체크 엔드포인트"""
    return {"status": "healthy", "service": "python-backend-integrated"}

# --- Gemini 탈모 사진 분석 전용 엔드포인트 ---
@app.post("/hair_gemini_check")
async def api_hair_gemini_check(file: Annotated[UploadFile, File(...)]):
    """
    multipart/form-data로 전송된 이미지를 Gemini로 분석하여 표준 결과를 반환
    """
    if not GEMINI_HAIR_CHECK_AVAILABLE:
        raise HTTPException(status_code=503, detail="Gemini 분석 모듈이 활성화되지 않았습니다.")

    try:
        image_bytes = await file.read()
        print(f"--- [DEBUG] File received. Size: {len(image_bytes)} bytes ---")

        # bytes 데이터를 직접 전달
        result = analyze_hair_with_gemini(image_bytes)

        return result
    except Exception as e:
        print(f"--- [DEBUG] Main Error: {str(e)} ---")
        raise HTTPException(status_code=500, detail=str(e))

# 프리플라이트 요청 처리 (특정 브라우저/프록시 환경 대응)
# @app.options("/api/hair_gemini_check")
# def options_hair_gemini_check():
#     return {"ok": True}

# @app.get("/api/hair_gemini_check/ping")
# def get_hair_gemini_check_ping():
#     return {"status": "ok"}

# --- 네이버 지역 검색 API 프록시 ---
@app.get("/api/naver/local/search")
async def search_naver_local(query: str):
    """네이버 지역 검색 API 프록시"""
    naver_client_id = os.getenv("NAVER_CLIENT_ID") or os.getenv("REACT_APP_NAVER_CLIENT_ID")
    naver_client_secret = os.getenv("NAVER_CLIENT_SECRET") or os.getenv("REACT_APP_NAVER_CLIENT_SECRET")

    if not naver_client_id or not naver_client_secret:
        raise HTTPException(status_code=503, detail="네이버 API 키가 설정되지 않았습니다.")

    try:
        import requests
        # 카테고리별로 다른 검색어 전략 사용
        if "미용실" in query or "헤어살롱" in query or "탈모전용" in query:
            # 탈모미용실 검색 시 더 광범위한 미용실 검색
            search_query = "미용실 헤어살롱"
        elif "가발" in query or "증모술" in query:
            search_query = f"{query}"
        elif "문신" in query or "smp" in query.lower():
            search_query = f"{query} 문신"
        else:
            # 탈모병원 검색 시 더 광범위한 의료기관 검색
            if "탈모병원" in query or "탈모" in query or "병원" in query:
                search_query = "병원 의원 클리닉 피부과"
            else:
                search_query = f"{query} 병원"

        api_url = f"https://openapi.naver.com/v1/search/local.json"
        params = {
            "query": search_query,
            "display": 20,
            "sort": "comment"
        }

        headers = {
            "X-Naver-Client-Id": naver_client_id,
            "X-Naver-Client-Secret": naver_client_secret
        }

        response = requests.get(api_url, params=params, headers=headers)
        response.raise_for_status()

        data = response.json()
        
        # 각 항목에 이미지 URL 추가 (Google Places API 우선 사용)
        if 'items' in data:
            for item in data['items']:
                # Google Places API로 실제 이미지 시도, 실패 시 기본 이미지 사용
                import asyncio
                try:
                    # 동기 함수에서 비동기 함수 호출
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    image_url = loop.run_until_complete(
                        get_google_places_image(item.get('title', ''), item.get('address', ''))
                    )
                    loop.close()
                    item['imageUrl'] = image_url
                except:
                    # Google Places API 실패 시 기본 이미지 사용
                    item['imageUrl'] = generate_default_image_url(item.get('category', ''), item.get('title', ''))
        
        return data

    except Exception as e:
        print(f"네이버 지역 검색 API 오류: {e}")
        raise HTTPException(status_code=500, detail=f"네이버 API 호출 실패: {str(e)}")

# --- 카카오 지역 검색 API 프록시 ---
@app.get("/api/kakao/local/search")
async def search_kakao_local(
    query: str,
    x: Optional[float] = None,
    y: Optional[float] = None,
    radius: Optional[int] = 5000
):
    """카카오 지역 검색 API 프록시"""
    kakao_api_key = os.getenv("KAKAO_REST_API_KEY") or os.getenv("REACT_APP_KAKAO_REST_API_KEY")

    if not kakao_api_key:
        raise HTTPException(status_code=503, detail="카카오 API 키가 설정되지 않았습니다.")

    try:
        import requests
        # 카테고리별로 다른 검색어 전략 사용
        if "미용실" in query or "헤어살롱" in query or "탈모전용" in query:
            # 탈모미용실 검색 시 더 광범위한 미용실 검색
            search_query = "미용실 헤어살롱"
        elif "가발" in query or "증모술" in query:
            search_query = f"{query}"
        elif "문신" in query or "smp" in query.lower():
            search_query = f"{query} 문신"
        else:
            # 탈모병원 검색 시 더 광범위한 의료기관 검색
            if "탈모병원" in query or "탈모" in query or "병원" in query:
                search_query = "병원 의원 클리닉 피부과"
            else:
                search_query = f"{query} 병원"

        api_url = f"https://dapi.kakao.com/v2/local/search/keyword.json"
        params = {
            "query": search_query,
            "size": 15
        }

        if x is not None and y is not None:
            params["x"] = x
            params["y"] = y
            params["radius"] = radius

        headers = {
            "Authorization": f"KakaoAK {kakao_api_key}"
        }

        response = requests.get(api_url, params=params, headers=headers)
        response.raise_for_status()

        data = response.json()
        
        # 각 항목에 이미지 URL 추가 (Google Places API 우선 사용)
        if 'documents' in data:
            for doc in data['documents']:
                # Google Places API로 실제 이미지 시도, 실패 시 기본 이미지 사용
                import asyncio
                try:
                    # 동기 함수에서 비동기 함수 호출
                    loop = asyncio.new_event_loop()
                    asyncio.set_event_loop(loop)
                    image_url = loop.run_until_complete(
                        get_google_places_image(doc.get('place_name', ''), doc.get('address_name', ''))
                    )
                    loop.close()
                    doc['imageUrl'] = image_url
                except:
                    # Google Places API 실패 시 기본 이미지 사용
                    doc['imageUrl'] = generate_default_image_url(doc.get('category_name', ''), doc.get('place_name', ''))
        
        return data

    except Exception as e:
        print(f"카카오 지역 검색 API 오류: {e}")
        raise HTTPException(status_code=500, detail=f"카카오 API 호출 실패: {str(e)}")

# --- YouTube API 프록시 (조건부) ---
@app.get("/youtube/search")
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





@app.get("/products")
async def get_hair_loss_products(
    stage: int = Query(..., description="탈모 단계 (0-3)", ge=0, le=3)
):
    """탈모 단계별 제품 추천 API"""
    try:
        print(f"탈모 단계별 제품 요청: stage={stage}")
        
        # 서비스 계층에서 결과 구성
        result = build_stage_response(stage)
        
        print(f"성공: {stage}단계 제품 {result.get('totalCount', 0)}개 반환")
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"탈모 단계별 제품 조회 중 오류: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"제품 조회 중 오류가 발생했습니다: {str(e)}")

@app.get("/products/health")
async def products_health_check():
    """제품 추천 서비스 헬스체크"""
    return {
        "status": "healthy",
        "service": "hair-products-recommendation",
        "timestamp": datetime.now().isoformat()
    }


from services.hair_quiz.hair_quiz import (
    generate_hair_quiz_service,
)


@app.get("/11st/products")
async def get_11st_products(
    keyword: str = Query(..., description="검색 키워드"),
    page: int = Query(1, description="페이지 번호", ge=1),
    pageSize: int = Query(20, description="페이지 크기", ge=1, le=100)
):
    """11번가 제품 검색 API"""
    try:
        print(f"11번가 제품 검색 요청: keyword={keyword}, page={page}, pageSize={pageSize}")
        
        # 서비스 계층에서 11번가 제품 검색
        result = search_11st_products(keyword, page, pageSize)
        
        print(f"성공: 11번가에서 {len(result['products'])}개 제품 조회")
        return result
        
    except Exception as e:
        print(f"11번가 제품 검색 중 오류: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail="제품 검색 중 오류가 발생했습니다."
        )

@app.post("/refresh")
async def refresh_token():
    """토큰 갱신 API (임시 구현)"""
    try:
        # 실제 구현에서는 JWT 토큰 갱신 로직이 필요
        # 현재는 임시로 성공 응답 반환
        return {
            "message": "토큰 갱신 완료",
            "status": "success"
        }
    except Exception as e:
        print(f"토큰 갱신 중 오류: {e}")
        raise HTTPException(
            status_code=500,
            detail="토큰 갱신 중 오류가 발생했습니다."
        )

@app.get("/api/config")
async def get_config():
    """프론트엔드에서 필요한 환경변수 설정 조회"""
    try:
        youtube_api_key = os.getenv("YOUTUBE_API_KEY")
        eleven_st_api_key = os.getenv("ELEVEN_ST_API_KEY")
        api_base_url = os.getenv("API_BASE_URL", "http://localhost:8000/api")

        return {
            "apiBaseUrl": api_base_url,
            "youtubeApiKey": youtube_api_key if youtube_api_key else None,
            "hasYouTubeKey": bool(youtube_api_key),
            "elevenStApiKey": eleven_st_api_key if eleven_st_api_key else None,
            "hasElevenStKey": bool(eleven_st_api_key),
        }
    except Exception as e:
        print(f"설정 조회 중 오류: {e}")
        raise HTTPException(
            status_code=500,
            detail="설정 조회 중 오류가 발생했습니다."
        )

@app.get("/api/location/status")
async def get_location_status():
    """위치 서비스 상태 확인 API"""
    naver_client_id = os.getenv("NAVER_CLIENT_ID") or os.getenv("REACT_APP_NAVER_CLIENT_ID")
    naver_client_secret = os.getenv("NAVER_CLIENT_SECRET") or os.getenv("REACT_APP_NAVER_CLIENT_SECRET")
    kakao_api_key = os.getenv("KAKAO_REST_API_KEY") or os.getenv("REACT_APP_KAKAO_REST_API_KEY")

    return {
        "status": "ok",
        "message": "Location API 서버가 정상적으로 동작 중입니다.",
        "naverApiConfigured": bool(naver_client_id and naver_client_secret),
        "kakaoApiConfigured": bool(kakao_api_key),
    }


# --- Gemini Hair Analysis API ---
@app.post("/hair-analysis", response_model=HairAnalysisResponse)
async def analyze_hair_with_gemini_endpoint(request: HairAnalysisRequest):
    """Gemini API를 사용한 두피/탈모 분석 (서비스로 위임)"""
    try:
        # base64 문자열을 bytes로 변환하여 hair_gemini_check 함수 사용
        import base64
        image_bytes = base64.b64decode(request.image_base64)
        result = analyze_hair_with_gemini(image_bytes)
        return HairAnalysisResponse(**result)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        print(f"Gemini 분석 중 오류: {e}")
        raise HTTPException(status_code=500, detail=f"분석 중 오류가 발생했습니다: {str(e)}")

@app.get("/hair-analysis/health")
async def hair_analysis_health_check():
    """두피 분석 서비스 헬스체크"""
    return {
        "status": "healthy" if genai else "unavailable",
        "service": "gemini-hair-analysis",
        "timestamp": datetime.now().isoformat()
    }

# --- Gemini Hair Quiz API ---
@app.post("/hair-quiz/generate", response_model=QuizGenerateResponse)
async def generate_hair_quiz():
    """Gemini로 O/X 탈모 퀴즈 20문항 생성 (서비스로 위임)"""
    try:
        items = generate_hair_quiz_service()
        return {"items": items}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        print(f"Gemini 퀴즈 생성 오류: {e}")
        raise HTTPException(status_code=500, detail=f"퀴즈 생성 중 오류가 발생했습니다: {str(e)}")

@app.get("/hair-quiz/health")
async def hair_quiz_health_check():
    """퀴즈 생성 서비스 헬스체크"""
    return {
        "status": "healthy" if genai else "unavailable",
        "service": "gemini-hair-quiz",
        "timestamp": datetime.now().isoformat()
    }







if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)