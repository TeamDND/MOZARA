
"""
MOZARA Python Backend 통합 애플리케이션
"""
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from pydantic import BaseModel
from typing import Optional, List
import json
import threading
from dotenv import load_dotenv
from datetime import datetime
import os

# .env 파일 로드 (프로젝트 루트의 .env 파일 사용)
load_dotenv("../../.env")

# MOZARA Hair Change 모듈
try:
    from services.hair_change.hair_change import generate_wig_style_service, get_wig_styles_service
    HAIR_CHANGE_AVAILABLE = True
    print("Hair Change 모듈 로드 성공")
except ImportError as e:
    print(f"Hair Change 모듈 로드 실패: {e}")
    HAIR_CHANGE_AVAILABLE = False

# Hair Damage Analysis 모듈 - services 폴더 내에 있다고 가정하고 경로 수정
try:
    # app 객체를 가져와 마운트하기 때문에, 이 파일에 uvicorn 실행 코드는 없어야 합니다.
    from services.hair_damage_analysis.api.hair_analysis_api import app as hair_analysis_app
    HAIR_ANALYSIS_AVAILABLE = True
    print("Hair Damage Analysis 모듈 로드 성공")
except ImportError as e:
    print(f"Hair Damage Analysis 모듈 로드 실패: {e}")
    HAIR_ANALYSIS_AVAILABLE = False
    hair_analysis_app = None

# BASP Hair Loss Diagnosis 모듈
try:
    from services.basp_selfcheck import (
        BaspRequest, BaspResponse, BaspDiagnosisEngine, LifestyleData
    )
    BASP_AVAILABLE = True
    print("BASP Hair Loss Diagnosis 모듈 로드 성공")
except ImportError as e:
    print(f"BASP Hair Loss Diagnosis 모듈 로드 실패: {e}")
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
    print("Hair Damage Analysis 라우터 마운트 완료")
else:
    index = None
    print("Hair Damage Analysis 라우터 마운트 건너뜀")

# Pinecone setup
try:
    from pinecone import Pinecone
    pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
    index_name = os.getenv("PINECONE_INDEX_NAME")
    if index_name and index_name in pc.list_indexes().names():
        index = pc.Index(index_name)
        print("Pinecone index connection success")
    else:
        index = None
        print("Pinecone index not found. Hair Encyclopedia paper search disabled.")
except ImportError:
    print("Pinecone module not found. Please run pip install pinecone.")
    index = None
except Exception as e:
    print(f"Pinecone initialization error: {e}")
    index = None

# OpenAI setup
openai_api_key = os.getenv("OPENAI_API_KEY")
if openai_api_key:
    from openai import OpenAI
    openai_client = OpenAI(api_key=openai_api_key)
    print("OpenAI 클라이언트 초기화 완료")
else:
    openai_client = None
    print("OPENAI_API_KEY가 설정되지 않았습니다. 일부 기능이 제한될 수 있습니다.")

# Hair Encyclopedia Pydantic Models
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

from services.hair_loss_products import (
    build_stage_response,
    search_11st_products,
)

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
            "basp_diagnosis": "/api/basp/evaluate" if BASP_AVAILABLE else "unavailable",
            "hair_encyclopedia": "/api/paper" if openai_api_key else "unavailable"
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



@app.get("/api/products")
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

@app.get("/api/products/health")
async def products_health_check():
    """제품 추천 서비스 헬스체크"""
    return {
        "status": "healthy",
        "service": "hair-products-recommendation",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/11st/products")
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

@app.post("/api/refresh")
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




# --- Hair Encyclopedia API 엔드포인트 ---
@app.get("/api/paper")
async def paper_status():
    """Hair Encyclopedia 서비스 상태 및 논문 수 조회"""
    if not index:
        return {"message": "Hair Encyclopedia Service - Main Project", "papers_count": 0, "status": "thesis_search_disabled"}
    
    try:
        results = index.query(
            vector=[0.0] * 1536,
            top_k=10000,
            include_metadata=True
        )
        
        unique_papers = set()
        for match in results['matches']:
            metadata = match.get('metadata', {})
            file_path = metadata.get('file_path')
            title = metadata.get('title')
            identifier = file_path or title or match['id']
            unique_papers.add(identifier)
        
        unique_count = len(unique_papers)
    except Exception as e:
        print(f"논문 수 조회 중 오류: {e}")
        unique_count = 0
    
    return {"message": "Hair Encyclopedia Service - Main Project", "papers_count": unique_count}

@app.post("/api/paper/search", response_model=List[PaperCard])
async def search_papers(query: SearchQuery):
    """논문 검색"""
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
            top_k=query.max_results or 5,
            include_metadata=True
        )
        
        best_match_by_file = {}
        for match in results['matches']:
            metadata = match.get('metadata', {}) or {}
            file_path = metadata.get('file_path') or metadata.get('source') or metadata.get('title')
            if not file_path:
                file_path = match.get('id')

            current_best = best_match_by_file.get(file_path)
            if current_best is None:
                best_match_by_file[file_path] = match
            else:
                curr_idx = (current_best.get('metadata') or {}).get('chunk_index')
                new_idx = metadata.get('chunk_index')
                if curr_idx is None and new_idx is not None and new_idx == 0:
                    best_match_by_file[file_path] = match
                elif isinstance(curr_idx, int) and isinstance(new_idx, int) and new_idx == 0 and curr_idx != 0:
                    best_match_by_file[file_path] = match

        papers: List[PaperCard] = []
        for deduped_match in best_match_by_file.values():
            metadata = deduped_match.get('metadata', {}) or {}
            
            # Try to get key_conclusions from chunk_index=0 for better preview
            file_path = metadata.get('file_path')
            summary_preview = ""
            
            if file_path:
                try:
                    analysis_results = index.query(
                        vector=[0.0] * 1536,
                        top_k=1,
                        include_metadata=True,
                        filter={
                            "file_path": file_path,
                            "chunk_index": 0
                        }
                    )
                    
                    if analysis_results['matches']:
                        analysis_metadata = analysis_results['matches'][0].metadata
                        key_conclusions = analysis_metadata.get('key_conclusions', '')
                        if key_conclusions:
                            summary_preview = str(key_conclusions)[:200] + '...' if len(str(key_conclusions)) > 200 else str(key_conclusions)
                except Exception as e:
                    print(f"Error fetching key_conclusions for {file_path}: {e}")
            
            # Fallback to original logic if key_conclusions not found
            if not summary_preview:
                summary_preview = (
                    metadata.get('summary', '') or 
                    metadata.get('summary_preview', '') or 
                    (metadata.get('text', '')[:200] + '...' if metadata.get('text') else '')
                )
            
            title_safe = str(metadata.get('title', 'Unknown')).encode('utf-8', errors='ignore').decode('utf-8')
            source_safe = str(metadata.get('source', 'Unknown')).encode('utf-8', errors='ignore').decode('utf-8')
            summary_safe = str(summary_preview).encode('utf-8', errors='ignore').decode('utf-8')
            
            papers.append(PaperCard(
                id=deduped_match['id'],
                title=title_safe,
                source=source_safe,
                summary_preview=summary_safe
            ))

        return papers[: query.max_results or 5]
    except Exception as e:
        print(f"논문 검색 중 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/paper/{paper_id}", response_model=PaperDetail)
async def get_paper_detail(paper_id: str):
    """특정 논문 상세 정보 조회"""
    if not index:
        raise HTTPException(status_code=503, detail="Thesis search service is not available")
    
    try:
        results = index.fetch(ids=[paper_id])
        vectors = results.vectors
        if not vectors:
            raise HTTPException(status_code=404, detail="Paper not found")
        
        vector_obj = vectors.get(paper_id)
        if vector_obj is None:
            raise HTTPException(status_code=404, detail="Paper not found")
        
        metadata = getattr(vector_obj, 'metadata', None)
        if metadata is None and isinstance(vector_obj, dict):
            metadata = vector_obj.get('metadata', {})
        if metadata is None:
            metadata = {}
        
        full_summary = (
            metadata.get('summary') or
            metadata.get('full_summary') or
            metadata.get('text', '')
        )
        
        title_safe = str(metadata.get('title', 'Unknown')).encode('utf-8', errors='ignore').decode('utf-8')
        source_safe = str(metadata.get('source', 'Unknown')).encode('utf-8', errors='ignore').decode('utf-8')
        summary_safe = str(full_summary).encode('utf-8', errors='ignore').decode('utf-8')
        
        return PaperDetail(
            id=paper_id,
            title=title_safe,
            source=source_safe,
            full_summary=summary_safe
        )
    except Exception as e:
        print(f"논문 상세 조회 중 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/papers/count")
async def get_papers_count():
    """저장된 논문 수 조회"""
    if not index:
        return {"count": 0, "system": "service_disabled"}
    
    try:
        results = index.query(
            vector=[0.0] * 1536,
            top_k=10000,
            include_metadata=True
        )
        
        unique_papers = set()
        for match in results['matches']:
            metadata = match.get('metadata', {})
            file_path = metadata.get('file_path')
            if file_path:
                unique_papers.add(file_path)
        
        return {"count": len(unique_papers), "system": "pinecone_deduped"}
    except Exception as e:
        print(f"논문 수 조회 중 오류: {e}")
        return {"count": 0, "system": "error", "error": str(e)}

@app.get("/api/paper/{paper_id}/analysis", response_model=PaperAnalysis)
async def get_paper_analysis(paper_id: str):
    """특정 논문 분석 결과 조회"""
    if not index:
        raise HTTPException(status_code=503, detail="Thesis search service is not available")
    
    try:
        results = index.fetch(ids=[paper_id])
        vectors = results.vectors
        if not vectors:
            raise HTTPException(status_code=404, detail="Chunk not found")

        clicked_chunk_metadata = vectors[paper_id].metadata if paper_id in vectors else {}
        original_file_path = clicked_chunk_metadata.get('file_path')
        original_title = clicked_chunk_metadata.get('title')

        if not original_file_path:
            raise HTTPException(status_code=404, detail="Original paper path not found for this chunk.")

        analysis_results = index.query(
            vector=[0.0] * 1536,
            top_k=1,
            include_metadata=True,
            filter={
                "file_path": original_file_path,
                "chunk_index": 0
            }
        )

        if not analysis_results['matches']:
            raise HTTPException(status_code=404, detail="Structured analysis for paper not found.")

        paper_analysis_metadata = analysis_results['matches'][0].metadata

        main_topics_parsed = []
        raw_main_topics = paper_analysis_metadata.get('main_topics')
        if isinstance(raw_main_topics, list):
            main_topics_parsed = [str(t).encode('utf-8', errors='ignore').decode('utf-8') for t in raw_main_topics if isinstance(t, str)]
        elif isinstance(raw_main_topics, str):
            safe_topics = raw_main_topics.encode('utf-8', errors='ignore').decode('utf-8')
            main_topics_parsed = [safe_topics]

        raw_conclusions = paper_analysis_metadata.get('key_conclusions', '')
        key_conclusions_parsed = str(raw_conclusions).encode('utf-8', errors='ignore').decode('utf-8')

        section_summaries_parsed = []
        raw_section_summaries = paper_analysis_metadata.get('section_summaries')
        
        if isinstance(raw_section_summaries, str):
            try:
                safe_json_string = raw_section_summaries.encode('utf-8', errors='ignore').decode('utf-8')
                temp_parsed = json.loads(safe_json_string)
                if isinstance(temp_parsed, list):
                    section_summaries_parsed = []
                    for s in temp_parsed:
                        if isinstance(s, dict):
                            safe_section = {}
                            for key, value in s.items():
                                safe_key = str(key).encode('utf-8', errors='ignore').decode('utf-8')
                                safe_value = str(value).encode('utf-8', errors='ignore').decode('utf-8')
                                safe_section[safe_key] = safe_value
                            section_summaries_parsed.append(safe_section)
            except json.JSONDecodeError:
                pass
        elif isinstance(raw_section_summaries, list):
            section_summaries_parsed = []
            for s in raw_section_summaries:
                if isinstance(s, dict):
                    safe_section = {}
                    for key, value in s.items():
                        safe_key = str(key).encode('utf-8', errors='ignore').decode('utf-8')
                        safe_value = str(value).encode('utf-8', errors='ignore').decode('utf-8')
                        safe_section[safe_key] = safe_value
                    section_summaries_parsed.append(safe_section)
        
        if not section_summaries_parsed:
            section_summaries_parsed = []

        title_raw = paper_analysis_metadata.get('title', original_title or 'Unknown')
        title_safe = str(title_raw).encode('utf-8', errors='ignore').decode('utf-8')
        
        source_raw = paper_analysis_metadata.get('source', 'Unknown')
        source_safe = str(source_raw).encode('utf-8', errors='ignore').decode('utf-8')

        return PaperAnalysis(
            id=paper_id,
            title=title_safe,
            source=source_safe,
            main_topics=main_topics_parsed,
            key_conclusions=key_conclusions_parsed,
            section_summaries=section_summaries_parsed
        )

    except Exception as e:
        print(f"논문 분석 조회 중 오류: {e}")
        safe_detail = str(e).encode('utf-8', errors='ignore').decode('utf-8')
        raise HTTPException(status_code=500, detail=safe_detail)

@app.post("/api/paper/qna", response_model=QnaResponse)
async def answer_qna(query: QnaQuery):
    """논문 Q&A 기능"""
    if not index:
        raise HTTPException(status_code=503, detail="Thesis search service is not available")
    
    if not openai_client:
        raise HTTPException(status_code=503, detail="OpenAI service is not available")
    
    try:
        fetch_results = index.fetch(ids=[query.paper_id])
        vectors = fetch_results.vectors
        if not vectors or query.paper_id not in vectors:
            raise HTTPException(status_code=404, detail="Paper chunk not found.")

        clicked_chunk_metadata = vectors[query.paper_id].metadata
        original_file_path = clicked_chunk_metadata.get('file_path')

        if not original_file_path:
            original_title = clicked_chunk_metadata.get('title')
            if not original_title:
                raise HTTPException(status_code=404, detail="Original paper identifier (path or title) not found for this chunk.")
            
            filter_criteria = {"title": original_title}
        else:
            filter_criteria = {"file_path": original_file_path}

        query_response = index.query(
            vector=[0.0] * 1536,
            top_k=100,
            include_metadata=True,
            filter=filter_criteria
        )

        matches = query_response.get('matches', [])
        if not matches:
            context_text = clicked_chunk_metadata.get('text', '')
            if not context_text:
                 raise HTTPException(status_code=404, detail="No text found for this paper chunk.")
        else:
            sorted_chunks = sorted(matches, key=lambda m: m.get('metadata', {}).get('chunk_index', 0))
            context_text = "\n\n".join([chunk.get('metadata', {}).get('text', '') for chunk in sorted_chunks])

        def count_tokens(text):
            return len(text) // 4
        
        def split_context_into_chunks(text, max_tokens):
            max_chars = max_tokens * 4
            chunks = []
            
            paragraphs = text.split('\n\n')
            current_chunk = ""
            
            for paragraph in paragraphs:
                if len(current_chunk + paragraph) <= max_chars:
                    current_chunk += paragraph + "\n\n"
                else:
                    if current_chunk:
                        chunks.append(current_chunk.strip())
                        current_chunk = paragraph + "\n\n"
                    else:
                        chunks.append(paragraph[:max_chars])
                        
            if current_chunk:
                chunks.append(current_chunk.strip())
                
            return chunks
        
        system_prompt = (
            "You are a helpful AI assistant specializing in scientific papers. "
            "Answer the user's question based *only* on the provided context text from a research paper. "
            "If the answer is not found in the context, state that you cannot find the answer in the provided document. "
            "Do not use any external knowledge. "
            "Provide the answer in Korean."
        )
        
        system_tokens = count_tokens(system_prompt)
        question_tokens = count_tokens(f"Question: {query.question}")
        overhead_tokens = 500
        max_context_tokens = 12000 - system_tokens - question_tokens - overhead_tokens
        
        context_tokens = count_tokens(context_text)
        
        if context_tokens <= max_context_tokens:
            user_prompt = f"Context from the paper:\n\n---\n{context_text}\n---\n\nQuestion: {query.question}"
            
            completion_response = openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.0,
            )
            answer = completion_response.choices[0].message.content.strip()
        else:
            context_chunks = split_context_into_chunks(context_text, max_context_tokens)
            partial_answers = []
            
            for i, chunk in enumerate(context_chunks):
                chunk_system_prompt = (
                    f"You are a helpful AI assistant specializing in scientific papers. "
                    f"This is part {i+1} of {len(context_chunks)} from a research paper. "
                    f"Answer the user's question based *only* on this part. "
                    f"If the answer is not found in this part, say '이 부분에서는 답을 찾을 수 없습니다.' "
                    f"Do not use any external knowledge. Provide the answer in Korean."
                )
                
                user_prompt = f"Context (Part {i+1}/{len(context_chunks)}):\n\n---\n{chunk}\n---\n\nQuestion: {query.question}"
                
                completion_response = openai_client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": chunk_system_prompt},
                        {"role": "user", "content": user_prompt}
                    ],
                    temperature=0.0,
                )
                
                partial_answer = completion_response.choices[0].message.content.strip()
                partial_answers.append(f"[Part {i+1}] {partial_answer}")
            
            if len(partial_answers) > 1:
                final_system_prompt = (
                    "You are a helpful AI assistant. "
                    "Combine the following partial answers into a single, coherent answer. "
                    "Remove duplicates and contradictions. If parts say they cannot find the answer, ignore those parts. "
                    "Provide the final answer in Korean."
                )
                
                combined_prompt = f"Partial answers to combine:\n\n" + "\n\n".join(partial_answers) + f"\n\nOriginal question: {query.question}"
                
                final_response = openai_client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": final_system_prompt},
                        {"role": "user", "content": combined_prompt}
                    ],
                    temperature=0.0,
                )
                
                answer = final_response.choices[0].message.content.strip()
            else:
                answer = partial_answers[0].replace("[Part 1] ", "")

        return QnaResponse(answer=answer)

    except Exception as e:
        print(f"Q&A 처리 중 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/pubmed/collect")
async def manual_collect_pubmed():
    """수동 PubMed 논문 수집 트리거 (백그라운드 실행)"""
    try:
        # 실제 구현에서는 PubMed 수집 서비스를 호출
        return {"message": "PubMed 논문 수집이 백그라운드에서 시작되었습니다.", "status": "started"}
    except Exception as e:
        print(f"PubMed 수집 트리거 중 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/admin/clear-index")
async def clear_pinecone_index():
    """Pinecone 인덱스 초기화 (관리자 기능)"""
    if not index:
        raise HTTPException(status_code=503, detail="Index service not available")
    
    try:
        index.delete(delete_all=True)
        return {"message": "Pinecone 인덱스가 완전히 초기화되었습니다."}
    except Exception as e:
        print(f"인덱스 초기화 중 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)