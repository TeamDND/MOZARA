from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pinecone import Pinecone
import os
from dotenv import load_dotenv
from openai import OpenAI
from typing import List, Optional
import uvicorn
import json
import schedule
import threading
import time
import logging
from datetime import datetime

load_dotenv()

app = FastAPI(title="Hair Encyclopedia Service - Main Project", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001", 
        "http://localhost:3004",
        "http://localhost:3005",
        "http://localhost:5173", 
        "http://localhost:5174"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Pinecone setup
pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
index_name = os.getenv("PINECONE_INDEX_NAME")
if index_name and index_name in pc.list_indexes().names():
    index = pc.Index(index_name)
else:
    index = None
    print("Warning: Pinecone index not found. Thesis search will be disabled.")

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

@app.get("/")
async def root():
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
        unique_count = 0
    
    return {"message": "Hair Encyclopedia Service - Main Project", "papers_count": unique_count}

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
                    # Query for chunk_index=0 to get key_conclusions
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
                            # Use first 200 characters of key_conclusions as preview
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
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/paper/{paper_id}", response_model=PaperDetail)
async def get_paper_detail(paper_id: str):
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
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/papers/count")
async def get_papers_count():
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
        return {"count": 0, "system": "error", "error": str(e)}

@app.get("/paper/{paper_id}/analysis", response_model=PaperAnalysis)
async def get_paper_analysis(paper_id: str):
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
        safe_detail = str(e).encode('utf-8', errors='ignore').decode('utf-8')
        raise HTTPException(status_code=500, detail=safe_detail)

@app.post("/qna", response_model=QnaResponse)
async def answer_qna(query: QnaQuery):
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
        print(f"Error in /qna endpoint: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# PubMed 자동 수집 서비스
from services.hair_encyclopedia.hair_papers.pubmed_scheduler_service import PubMedSchedulerService

pubmed_service = PubMedSchedulerService()

@app.on_event("startup")
async def startup_event():
    print("Hair Encyclopedia Service - Main Project 서버 시작")
    if index:
        print("PubMed 자동 수집 스케줄러 활성화 중...")
        pubmed_service.start_scheduler()
    print("Hair Encyclopedia Service - Main Project 준비 완료")

@app.get("/pubmed/collect")
async def manual_collect_pubmed():
    try:
        def run_collection():
            pubmed_service.weekly_collection_job()
        
        collection_thread = threading.Thread(target=run_collection, daemon=True)
        collection_thread.start()
        
        return {"message": "PubMed 논문 수집이 백그라운드에서 시작되었습니다."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/admin/clear-index")
async def clear_pinecone_index():
    if not index:
        raise HTTPException(status_code=503, detail="Index service not available")
    
    try:
        index.delete(delete_all=True)
        return {"message": "Pinecone 인덱스가 완전히 초기화되었습니다."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
    print("=" * 60)
    print("Hair Encyclopedia Service - Main Project 시작")
    print("Pinecone 벡터 DB 연동")
    print("PubMed 자동 수집 활성화")
    print("탈모 제품 추천 API 활성화")
    print("=" * 60)
    uvicorn.run(app, host="0.0.0.0", port=8000)