"""
Hair Encyclopedia Paper API 서비스
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional, List
import json
import os
from datetime import datetime
from dotenv import load_dotenv

# .env 파일 로드 (프로젝트 루트의 .env 파일 사용)
load_dotenv("../../../.env")
load_dotenv("../../.env")
load_dotenv("../../../../.env")

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

# Pydantic Models
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

# FastAPI Router 생성
router = APIRouter()

@router.get("/paper")
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

@router.post("/paper/search", response_model=List[PaperCard])
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

@router.get("/paper/{paper_id}", response_model=PaperDetail)
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

@router.get("/papers/count")
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

@router.get("/paper/{paper_id}/analysis", response_model=PaperAnalysis)
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

@router.post("/paper/qna", response_model=QnaResponse)
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

@router.get("/pubmed/collect")
async def manual_collect_pubmed():
    """수동 PubMed 논문 수집 트리거 (백그라운드 실행)"""
    try:
        # 실제 구현에서는 PubMed 수집 서비스를 호출
        return {"message": "PubMed 논문 수집이 백그라운드에서 시작되었습니다.", "status": "started"}
    except Exception as e:
        print(f"PubMed 수집 트리거 중 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/admin/clear-index")
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
