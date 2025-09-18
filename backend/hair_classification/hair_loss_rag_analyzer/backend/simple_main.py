from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
import sys
from datetime import datetime
from PIL import Image
import io

# 기존 모듈 import
sys.path.append(r"C:\Users\301\Desktop\rag_analyzer")
try:
    from hair_rag_analyzer import HairLossRAGAnalyzer
except ImportError:
    print("❌ hair_rag_analyzer 모듈을 찾을 수 없습니다.")
    print("경로를 확인하세요: C:\\Users\\301\\Desktop\\rag_analyzer")
    sys.exit(1)

app = FastAPI(
    title="Hair Loss RAG Analyzer API",
    description="간단한 탈모 단계 분석 API",
    version="1.0.0"
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 전역 분석기
analyzer = None

@app.on_event("startup")
async def startup_event():
    global analyzer
    try:
        print("🔧 분석기 초기화 중...")
        analyzer = HairLossRAGAnalyzer()
        print("✅ 분석기 초기화 완료")
    except Exception as e:
        print(f"❌ 분석기 초기화 실패: {e}")

@app.get("/")
async def root():
    return {
        "message": "Hair Loss RAG Analyzer API",
        "version": "1.0.0",
        "docs": "/docs",
        "endpoints": ["/health", "/setup", "/analyze", "/database-info"]
    }

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "timestamp": datetime.now(),
        "analyzer_ready": analyzer is not None
    }

@app.post("/setup")
async def setup_database():
    """데이터베이스 설정"""
    try:
        if not analyzer:
            raise HTTPException(status_code=500, detail="분석기가 초기화되지 않았습니다")

        print("🔧 데이터베이스 설정 시작...")
        dataset_path = r"C:\Users\301\Desktop\hair_loss_rag\hair_rag_dataset_image\hair_rag_dataset_ragging"

        if not os.path.exists(dataset_path):
            raise HTTPException(status_code=404, detail=f"데이터셋 경로를 찾을 수 없습니다: {dataset_path}")

        success = analyzer.setup_database(dataset_path, recreate_index=False)

        if success:
            print("✅ 데이터베이스 설정 완료!")
            return {
                "success": True,
                "message": "데이터베이스 설정 완료",
                "timestamp": datetime.now()
            }
        else:
            raise HTTPException(status_code=500, detail="데이터베이스 설정 실패")

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 설정 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    """이미지 분석"""
    try:
        if not analyzer:
            raise HTTPException(status_code=500, detail="분석기가 초기화되지 않았습니다")

        # 파일 크기 확인 (10MB)
        if file.size and file.size > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="파일이 너무 큽니다 (최대 10MB)")

        # 파일 형식 확인
        if not file.filename or not file.filename.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp')):
            raise HTTPException(status_code=415, detail="지원하지 않는 파일 형식입니다")

        print(f"🔍 이미지 분석 시작: {file.filename}")

        # 이미지 읽기
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert('RGB')

        # 임시 파일로 저장
        os.makedirs("temp", exist_ok=True)
        temp_path = f"temp/temp_{file.filename}"
        image.save(temp_path)

        try:
            # 분석 실행
            result = analyzer.analyze_image(temp_path)
            print(f"✅ 분석 완료: {result.get('predicted_stage', 'Unknown')}")
            return result
        finally:
            # 임시 파일 삭제
            if os.path.exists(temp_path):
                os.remove(temp_path)

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ 분석 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/database-info")
async def get_database_info():
    """데이터베이스 정보"""
    try:
        if not analyzer:
            raise HTTPException(status_code=500, detail="분석기가 초기화되지 않았습니다")

        info = analyzer.get_database_info()
        return info

    except Exception as e:
        print(f"❌ DB 정보 조회 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    print("🚀 Hair Loss RAG Analyzer API 시작...")
    print("📖 API 문서: http://localhost:8000/docs")
    print("🌐 프론트엔드: http://localhost:3000")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)