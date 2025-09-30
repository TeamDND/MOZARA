from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.analysis import router as analysis_router
from app.config import settings

app = FastAPI(title="Hair Loss RAG Analyzer v1", version="1.0.0")

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
