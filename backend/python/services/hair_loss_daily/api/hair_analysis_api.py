"""
머리사진 분석 API 엔드포인트
"""
from fastapi import FastAPI, File, UploadFile, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import asyncio
from datetime import datetime

# 서비스 임포트
from ..services.rag_service import rag_service
from ..services.ai_analysis_service import ai_analysis_service
from ..services.pinecone_service import get_pinecone_service
# CNN 모델 서비스는 삭제됨 (CLIP 앙상블 사용)

# 모델 임포트
from ..models.hair_analysis_models import (
    HairAnalysisRequest, HairAnalysisResponse,
    CategorySearchRequest, CategorySearchResponse,
    HealthCheckResponse, HairCategory
)

# FastAPI 앱 생성
app = FastAPI(
    title="Hair Loss Daily Analysis API",
    description="CNN + RAG 기반 머리사진 분석 API",
    version="1.0.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/", response_model=dict)
async def root():
    """루트 엔드포인트"""
    return {
        "message": "Hair Loss Daily Analysis API",
        "version": "1.0.0",
        "status": "running"
    }

@app.get("/health", response_model=HealthCheckResponse)
async def health_check():
    """헬스체크 엔드포인트"""
    try:
        # 각 서비스 상태 확인
        services = {
            "pinecone": get_pinecone_service().health_check(),
            "ai_analysis": ai_analysis_service.health_check()
        }
        
        # 전체 상태 결정
        overall_status = "healthy"
        for service_name, service_status in services.items():
            if isinstance(service_status, dict) and service_status.get("status") == "error":
                overall_status = "degraded"
                break
        
        return HealthCheckResponse(
            status=overall_status,
            services=services,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        return HealthCheckResponse(
            status="error",
            services={"error": str(e)},
            timestamp=datetime.now().isoformat()
        )

@app.post("/analyze", response_model=HairAnalysisResponse)
async def analyze_hair_image(
    file: UploadFile = File(...),
    top_k: int = Query(default=10, ge=1, le=20, description="검색할 유사 케이스 수"),
    use_preprocessing: bool = Query(default=True, description="이미지 전처리 사용 여부 (빛 반사 처리 포함)")
):
    """
    머리사진 분석 (CNN + RAG + AI)
    
    - **file**: 분석할 머리사진 이미지 파일
    - **top_k**: 검색할 유사 케이스 수 (1-20)
    - **use_preprocessing**: 이미지 전처리 사용 여부 (기본값: True, 빛 반사 처리 포함)
    """
    try:
        # 파일 유효성 검사
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400, 
                detail="이미지 파일만 업로드 가능합니다."
            )
        
        # 이미지 데이터 읽기
        image_bytes = await file.read()
        
        if len(image_bytes) == 0:
            raise HTTPException(
                status_code=400,
                detail="빈 파일입니다."
            )
        
        print(f"📸 이미지 분석 요청: {file.filename}, 크기: {len(image_bytes)} bytes, 전처리: {use_preprocessing}")
        
        # RAG 분석 실행
        rag_result = rag_service.analyze_hair_image(image_bytes, top_k, use_preprocessing)
        
        if not rag_result.get("success", False):
            return HairAnalysisResponse(
                success=False,
                error=rag_result.get("error", "분석에 실패했습니다.")
            )
        
        # AI 고급 분석 실행
        ai_result = ai_analysis_service.generate_advanced_analysis(rag_result)
        
        # 응답 구성
        response = HairAnalysisResponse(
            success=True,
            analysis=rag_result.get("analysis"),
            ai_analysis=ai_result.get("ai_analysis"),
            similar_cases=rag_result.get("similar_cases", []),
            total_similar_cases=rag_result.get("total_similar_cases", 0),
            model_info=rag_result.get("model_info", {})
        )
        
        # 전처리 정보 추가
        from ..services.image_preprocessing_service import image_preprocessing_service
        response.model_info["preprocessing"] = image_preprocessing_service.get_preprocessing_info()
        response.model_info["preprocessing_used"] = use_preprocessing
        
        print(f"[OK] 분석 완료: {len(response.similar_cases)}개 유사 케이스 발견")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] 분석 오류: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"분석 중 오류가 발생했습니다: {str(e)}"
        )

@app.post("/search/category", response_model=CategorySearchResponse)
async def search_by_category(
    file: UploadFile = File(...),
    category: HairCategory = Query(..., description="검색할 카테고리"),
    top_k: int = Query(default=5, ge=1, le=10, description="검색할 케이스 수")
):
    """
    특정 카테고리로 필터링하여 검색
    
    - **file**: 분석할 머리사진 이미지 파일
    - **category**: 검색할 카테고리
    - **top_k**: 검색할 케이스 수 (1-10)
    """
    try:
        # 파일 유효성 검사
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400,
                detail="이미지 파일만 업로드 가능합니다."
            )
        
        # 이미지 데이터 읽기
        image_bytes = await file.read()
        
        if len(image_bytes) == 0:
            raise HTTPException(
                status_code=400,
                detail="빈 파일입니다."
            )
        
        print(f"🔍 카테고리별 검색: {category.value}, 파일: {file.filename}")
        
        # 카테고리별 검색 실행
        result = rag_service.search_by_specific_condition(
            image_bytes, category.value, top_k
        )
        
        if not result.get("success", False):
            return CategorySearchResponse(
                success=False,
                error=result.get("error", "검색에 실패했습니다.")
            )
        
        return CategorySearchResponse(
            success=True,
            category=category.value,
            similar_cases=result.get("similar_cases", []),
            total_cases=result.get("total_cases", 0)
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] 카테고리별 검색 오류: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"검색 중 오류가 발생했습니다: {str(e)}"
        )

@app.get("/stats")
async def get_database_stats():
    """데이터베이스 통계 정보 조회"""
    try:
        stats = get_pinecone_service().get_index_stats()
        return {
            "success": True,
            "stats": stats,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"통계 조회 중 오류가 발생했습니다: {str(e)}"
        )

@app.get("/model/info")
async def get_model_info():
    """모델 정보 조회"""
    try:
        from ..services.clip_ensemble_service import clip_ensemble_service
        
        return {
            "success": True,
            "clip_ensemble": clip_ensemble_service.get_model_info(),
            "ai_model": ai_analysis_service.health_check(),
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"모델 정보 조회 중 오류가 발생했습니다: {str(e)}"
        )

@app.post("/test/consistency")
async def test_similarity_consistency(
    file: UploadFile = File(...),
    test_rounds: int = Query(default=3, ge=2, le=10, description="테스트 반복 횟수")
):
    """유사도 일관성 테스트 (디버깅용)"""
    try:
        # 파일 유효성 검사
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400, 
                detail="이미지 파일만 업로드 가능합니다."
            )
        
        # 이미지 데이터 읽기
        image_bytes = await file.read()
        
        if len(image_bytes) == 0:
            raise HTTPException(
                status_code=400,
                detail="빈 파일입니다."
            )
        
        print(f"🧪 일관성 테스트: {file.filename}, {test_rounds}회 반복")
        
        # 일관성 테스트 실행
        result = rag_service.test_similarity_consistency(image_bytes, test_rounds)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] 일관성 테스트 오류: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"테스트 중 오류가 발생했습니다: {str(e)}"
        )

@app.post("/test/no-preprocessing")
async def test_without_preprocessing(
    file: UploadFile = File(...),
    top_k: int = Query(default=10, ge=1, le=20, description="검색할 유사 케이스 수")
):
    """전처리 없이 분석 테스트 (디버깅용)"""
    try:
        # 파일 유효성 검사
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400, 
                detail="이미지 파일만 업로드 가능합니다."
            )
        
        # 이미지 데이터 읽기
        image_bytes = await file.read()
        
        if len(image_bytes) == 0:
            raise HTTPException(
                status_code=400,
                detail="빈 파일입니다."
            )
        
        print(f"🔍 전처리 없이 분석: {file.filename}")
        
        # 전처리 없이 분석 실행
        result = rag_service.test_without_preprocessing(image_bytes, top_k)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] 전처리 없이 분석 오류: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"분석 중 오류가 발생했습니다: {str(e)}"
        )

@app.post("/test/weighted-ensemble")
async def test_weighted_ensemble(
    file: UploadFile = File(...),
    vit_b32_weight: float = Query(default=0.6, ge=0.0, le=1.0, description="ViT-B-32 모델 가중치"),
    vit_b16_weight: float = Query(default=0.2, ge=0.0, le=1.0, description="ViT-B-16 모델 가중치"),
    rn50_weight: float = Query(default=0.2, ge=0.0, le=1.0, description="RN50 모델 가중치"),
    top_k: int = Query(default=10, ge=1, le=20, description="검색할 유사 케이스 수")
):
    """가중치 조정된 앙상블 분석 테스트 (Pinecone 데이터 재업로드 없이)"""
    try:
        # 파일 유효성 검사
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400, 
                detail="이미지 파일만 업로드 가능합니다."
            )
        
        # 이미지 데이터 읽기
        image_bytes = await file.read()
        
        if len(image_bytes) == 0:
            raise HTTPException(
                status_code=400,
                detail="빈 파일입니다."
            )
        
        # 가중치 정규화
        total_weight = vit_b32_weight + vit_b16_weight + rn50_weight
        if total_weight == 0:
            raise HTTPException(
                status_code=400,
                detail="가중치 합계가 0이 될 수 없습니다."
            )
        
        model_weights = {
            "ViT-B-32": vit_b32_weight / total_weight,
            "ViT-B-16": vit_b16_weight / total_weight,
            "RN50": rn50_weight / total_weight
        }
        
        print(f"🔍 가중치 조정 앙상블 분석: {file.filename}, 가중치: {model_weights}")
        
        # 가중치 조정된 앙상블로 분석 실행
        result = rag_service.test_weighted_ensemble(image_bytes, model_weights, top_k)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] 가중치 조정 앙상블 분석 오류: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"분석 중 오류가 발생했습니다: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)