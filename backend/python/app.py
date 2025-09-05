from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from basp import BaspRequest, BaspResponse, BaspDiagnosisEngine

app = FastAPI(title="BASP Hair Loss Diagnosis API", version="1.0.0")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API 엔드포인트
@app.get("/")
def home():
    return {"message": "BASP Hair Loss Diagnosis API", "status": "running"}

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "basp-api"}

@app.post("/api/basp/evaluate", response_model=BaspResponse)
def evaluate_basp(request: BaspRequest):
    """BASP 탈모 진단 API"""
    try:
        result = BaspDiagnosisEngine.diagnose(request)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"진단 중 오류가 발생했습니다: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)