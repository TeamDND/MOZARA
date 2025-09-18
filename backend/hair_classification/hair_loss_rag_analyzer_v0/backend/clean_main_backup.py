from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import os
from datetime import datetime

app = FastAPI(
    title="Hair Loss RAG Analyzer API",
    description="Clean Hair Loss Analysis API",
    version="1.0.0"
)

# CORS
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
        "docs": "/docs"
    }

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "timestamp": datetime.now()
    }

@app.post("/setup")
async def setup_database():
    try:
        print("[SETUP] Starting database setup simulation...")

        dataset_path = r"C:\Users\301\Desktop\hair_loss_rag\hair_rag_dataset_image\hair_rag_dataset_ragging"

        if not os.path.exists(dataset_path):
            return {
                "success": False,
                "error": f"Dataset path not found: {dataset_path}",
                "timestamp": datetime.now()
            }

        folders = ["LEVEL_2", "LEVEL_3", "LEVEL_4", "LEVEL_5"]
        folder_info = {}

        for folder in folders:
            folder_path = os.path.join(dataset_path, folder)
            if os.path.exists(folder_path):
                file_count = len([f for f in os.listdir(folder_path)
                                if f.lower().endswith(('.jpg', '.jpeg', '.png'))])
                folder_info[folder] = file_count
            else:
                folder_info[folder] = 0

        total_images = sum(folder_info.values())
        print(f"[OK] Setup complete! Found {total_images} images")

        return {
            "success": True,
            "message": "Database setup complete (simulation)",
            "total_images": total_images,
            "folder_info": folder_info,
            "timestamp": datetime.now()
        }

    except Exception as e:
        print(f"[ERROR] Setup error: {e}")
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.now()
        }

@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    try:
        if not file.filename:
            raise HTTPException(status_code=400, detail="No filename")

        if not file.filename.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp')):
            raise HTTPException(status_code=415, detail="Unsupported file format")

        contents = await file.read()
        file_size = len(contents)

        if file_size > 10 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="File too large (max 10MB)")

        print(f"[ANALYZE] Processing: {file.filename} ({file_size} bytes)")

        # Simulation based on filename
        import random
        import hashlib

        file_hash = hashlib.md5(file.filename.encode()).hexdigest()
        random.seed(file_hash)

        predicted_stage = random.choice([2, 3, 4, 5])
        confidence = random.uniform(0.6, 0.95)

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

        # Normalize
        total = sum(stage_scores.values())
        stage_scores = {k: v/total for k, v in stage_scores.items()}

        descriptions = {
            2: "Mild hair loss - M-shaped hairline begins or forehead slightly recedes",
            3: "Early hair loss - M-shaped hairline becomes pronounced, crown density decreases",
            4: "Moderate hair loss - M-shaped progression, crown thinning becomes serious",
            5: "Advanced hair loss - Frontal and crown areas begin to connect"
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

        print(f"[OK] Analysis complete: Level {predicted_stage} (confidence: {confidence:.1%})")
        return result

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] Analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/database-info")
async def get_database_info():
    return {
        "success": True,
        "mode": "simulation",
        "index_name": "hair-loss-rag-analysis",
        "total_vectors": 682,
        "dimension": 512,
        "message": "Running in simulation mode",
        "timestamp": datetime.now()
    }

if __name__ == "__main__":
    import uvicorn
    print("Hair Loss RAG Analyzer API starting...")
    print("API docs: http://localhost:8000/docs")
    print("Frontend: http://localhost:3000")
    print("WARNING: Running in simulation mode")
    uvicorn.run(app, host="0.0.0.0", port=8000)