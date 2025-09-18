from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import logging
import os
from datetime import datetime

from app.routers import analysis
from app.config import settings

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# FastAPI 앱 초기화
app = FastAPI(
    title="Hair Loss RAG Analyzer API",
    description="Pinecone과 CLIP 모델을 사용한 탈모 단계 분석 API",
    version="1.0.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.FRONTEND_URL,
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(analysis.router, prefix="/api")

@app.get("/")
async def root():
    """루트 엔드포인트"""
    return {
        "message": "Hair Loss RAG Analyzer API",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "docs": "/docs",
        "health": "/api/analysis/health"
    }

@app.get("/health")
async def health():
    """기본 헬스 체크"""
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat()
    }

# 예외 처리기
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Global exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc),
            "timestamp": datetime.now().isoformat()
        }
    )

# 업로드 디렉토리 생성
@app.on_event("startup")
async def startup_event():
    """앱 시작 시 초기화"""
    try:
        # 업로드 디렉토리 생성
        os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
        logger.info(f"업로드 디렉토리 생성: {settings.UPLOAD_DIR}")

        # 환경 변수 확인
        if not settings.PINECONE_API_KEY or settings.PINECONE_API_KEY == "your_pinecone_api_key_here":
            logger.warning("⚠️  Pinecone API 키가 설정되지 않았습니다!")

        if not os.path.exists(settings.DATASET_PATH):
            logger.warning(f"⚠️  데이터셋 경로를 찾을 수 없습니다: {settings.DATASET_PATH}")

        logger.info("🚀 Hair Loss RAG Analyzer API 시작 완료!")

    except Exception as e:
        logger.error(f"앱 시작 중 오류 발생: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )