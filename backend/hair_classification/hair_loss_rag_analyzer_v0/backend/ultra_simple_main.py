from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
from datetime import datetime

app = FastAPI(
    title="Hair Loss RAG Analyzer API",
    description="초간단 탈모 단계 분석 API",
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

@app.get("/")
async def root():
    return {
        "message": "Hair Loss RAG Analyzer API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "endpoints": ["/health", "/setup", "/analyze", "/database-info"]
    }

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "timestamp": datetime.now(),
        "server": "running"
    }

@app.post("/setup")
async def setup_database():
    """데이터베이스 설정 (시뮬레이션)"""
    try:
        print("🔧 데이터베이스 설정 시뮬레이션...")

        # 데이터셋 경로 확인
        dataset_path = r"C:\Users\301\Desktop\hair_loss_rag\hair_rag_dataset_image\hair_rag_dataset_ragging"

        if not os.path.exists(dataset_path):
            return {
                "success": False,
                "error": f"데이터셋 경로를 찾을 수 없습니다: {dataset_path}",
                "timestamp": datetime.now()
            }

        # 폴더 확인
        folders = ["LEVEL_2", "LEVEL_3", "LEVEL_4", "LEVEL_5"]
        folder_info = {}

        for folder in folders:
            folder_path = os.path.join(dataset_path, folder)
            if os.path.exists(folder_path):
                file_count = len([f for f in os.listdir(folder_path) if f.lower().endswith(('.jpg', '.jpeg', '.png'))])
                folder_info[folder] = file_count
            else:
                folder_info[folder] = 0

        total_images = sum(folder_info.values())

        print(f"[OK] 설정 완료! 총 {total_images}개 이미지 발견")

        return {
            "success": True,
            "message": "데이터베이스 설정 완료 (시뮬레이션)",
            "total_images": total_images,
            "folder_info": folder_info,
            "timestamp": datetime.now()
        }

    except Exception as e:
        print(f"[ERROR] 설정 오류: {e}")
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.now()
        }

@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    """이미지 분석 (시뮬레이션)"""
    try:
        # 파일 검증
        if not file.filename:
            raise HTTPException(status_code=400, detail="파일명이 없습니다")

        if not file.filename.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp')):
            raise HTTPException(status_code=415, detail="지원하지 않는 파일 형식입니다")

        # 파일 크기 확인
        contents = await file.read()
        file_size = len(contents)

        if file_size > 10 * 1024 * 1024:  # 10MB
            raise HTTPException(status_code=413, detail="파일이 너무 큽니다 (최대 10MB)")

        print(f"🔍 이미지 분석 시뮬레이션: {file.filename} ({file_size} bytes)")

        # 시뮬레이션 결과 (파일명 기반)
        import random
        import hashlib

        # 파일명 기반으로 일관된 결과 생성
        file_hash = hashlib.md5(file.filename.encode()).hexdigest()
        random.seed(file_hash)

        predicted_stage = random.choice([2, 3, 4, 5])
        confidence = random.uniform(0.6, 0.95)

        # 단계별 점수 생성
        stage_scores = {}
        remaining = 1.0
        stages = [2, 3, 4, 5]

        for i, stage in enumerate(stages):
            if stage == predicted_stage:
                score = confidence
            else:
                if i == len(stages) - 1:
                    score = remaining
                else:
                    score = random.uniform(0.01, remaining * 0.3)
            stage_scores[str(stage)] = score
            remaining -= score

        # 정규화
        total = sum(stage_scores.values())
        stage_scores = {k: v/total for k, v in stage_scores.items()}

        # 설명
        descriptions = {
            2: "경미한 탈모 - M자 탈모가 시작되거나 이마선이 약간 후퇴",
            3: "초기 탈모 - M자 탈모가 뚜렷해지고 정수리 부분 모발 밀도 감소",
            4: "중기 탈모 - M자 탈모 진행, 정수리 탈모 본격화",
            5: "진행된 탈모 - 앞머리와 정수리 탈모가 연결되기 시작"
        }

        result = {
            "success": True,
            "predicted_stage": predicted_stage,
            "confidence": confidence,
            "stage_description": descriptions[predicted_stage],
            "stage_scores": stage_scores,
            "analysis_details": {
                "filename": file.filename,
                "file_size": file_size,
                "mode": "simulation"
            },
            "timestamp": datetime.now()
        }

        print(f"[OK] 분석 완료: Level {predicted_stage} (신뢰도: {confidence:.1%})")
        return result

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] 분석 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/database-info")
async def get_database_info():
    """데이터베이스 정보"""
    return {
        "success": True,
        "mode": "simulation",
        "index_name": "hair-loss-rag-analysis",
        "total_vectors": 682,
        "dimension": 512,
        "message": "시뮬레이션 모드입니다",
        "timestamp": datetime.now()
    }

if __name__ == "__main__":
    import uvicorn
    print("Hair Loss RAG Analyzer API (ultra simple) starting...")
    print("API docs: http://localhost:8000/docs")
    print("Frontend: http://localhost:3000")
    print("WARNING: Running in simulation mode")
    uvicorn.run(app, host="0.0.0.0", port=8000)