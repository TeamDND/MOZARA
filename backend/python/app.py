"""
MOZARA Python Backend Main Application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Hair Damage Analysis 모듈 import
from hair_damage_analysis.api.hair_analysis_api import app as hair_analysis_app

# 메인 앱 생성
app = FastAPI(title="MOZARA Python Backend", version="1.0.0")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Hair Damage Analysis 라우터 마운트 (루트에 마운트)
app.mount("/", hair_analysis_app)

@app.get("/")
def read_root():
    """루트 경로 - 서버 상태 확인"""
    return {
        "message": "MOZARA Python Backend Server",
        "status": "running",
        "modules": {
            "hair_damage_analysis": "/hair-damage"
        }
    }

@app.get("/health")
def health_check():
    """헬스 체크 엔드포인트"""
    return {"status": "healthy", "service": "python-backend"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)