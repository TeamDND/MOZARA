"""
Hair Damage Analysis API Endpoints
"""
from fastapi import FastAPI, HTTPException, Body, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import os
from typing import Optional
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

# Services import
from ..services.hair_analysis_service import HairAnalysisService

app = FastAPI(title="Hair Damage Analysis API", version="1.0.0")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Services 초기화
hair_analysis_service = HairAnalysisService()

# 엔드포인트 경로에서 /hair-damage 제거
@app.get("/")
def read_root():
    """Hair Damage Analysis 모듈 루트 경로"""
    return {"message": "Hair Damage Analysis API Server", "module": "hair_damage_analysis"}

# 엔드포인트 경로에서 /hair-damage 제거
@app.post("/search/image-and-text")
async def search_image_and_text(
    image_base64: Optional[str] = Body(None),
    text_query: Optional[str] = Body(None)
):
    """
    이미지와 텍스트를 통한 모발 손상 검색
    """
    try:
        result = await hair_analysis_service.analyze_hair_damage(image_base64, text_query)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 엔드포인트 경로에서 /hair-damage 제거
@app.post("/add-analysis-result")
async def add_analysis_result(analysis_result: dict = Body(...)):
    """
    분석 결과를 Pinecone에 저장
    """
    try:
        result = await hair_analysis_service.save_analysis_result(analysis_result)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 이 파일은 app.py에 의해 import 되는 모듈이므로, 직접 실행 코드를 제거합니다.
# if __name__ == "__main__":
#     uvicorn.run(app, host="0.0.0.0", port=8000)
