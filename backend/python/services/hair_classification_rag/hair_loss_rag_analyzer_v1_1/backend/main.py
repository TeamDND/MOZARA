from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi import HTTPException
from app.routers.analysis import router as analysis_router
from app.config import settings
import os

app = FastAPI(title="Hair Loss RAG Analyzer v1_1", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:3002", "http://127.0.0.1:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analysis_router, prefix="/api")

@app.get("/api/healthz")
def healthz():
    return {"status": "ok"}

@app.get("/api/images/{file_path:path}")
async def serve_image(file_path: str):
    """참고 이미지 파일 서빙"""
    # 절대 경로로 변환
    if not file_path.startswith('C:'):
        file_path = f"C:\\{file_path}"

    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Image not found")

    return FileResponse(file_path)
