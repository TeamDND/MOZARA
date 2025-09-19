import sys
import os

# rag_analyzer 경로 추가
sys.path.append(r'C:\Users\301\Desktop\rag_analyzer')

from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import tempfile
from hair_rag_analyzer import HairLossRAGAnalyzer
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv(r'C:\Users\301\Desktop\rag_analyzer\.env')

app = FastAPI(
    title="Hair Loss RAG Analyzer API - Real",
    description="실제 RAG 기반 탈모 단계 분석 API",
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

# RAG 분석기 초기화
try:
    api_key = os.getenv('PINECONE_API_KEY')
    if not api_key:
        raise ValueError("PINECONE_API_KEY not found in environment")

    analyzer = HairLossRAGAnalyzer(pinecone_api_key=api_key)
    print("[OK] RAG 분석기 초기화 완료")
except Exception as e:
    print(f"[ERROR] RAG 분석기 초기화 실패: {e}")
    analyzer = None

@app.get("/")
async def root():
    return {
        "message": "Hair Loss RAG Analyzer API - Real Implementation",
        "version": "1.0.0",
        "status": "running",
        "mode": "production",
        "docs": "/docs",
        "endpoints": ["/health", "/setup", "/analyze", "/database-info"]
    }

@app.get("/health")
async def health():
    return {
        "status": "ok",
        "timestamp": datetime.now(),
        "analyzer_ready": analyzer is not None,
        "mode": "production"
    }

@app.post("/setup")
async def setup_database():
    """데이터베이스 설정 확인"""
    try:
        if not analyzer:
            return {
                "success": False,
                "error": "RAG 분석기가 초기화되지 않았습니다",
                "timestamp": datetime.now()
            }

        print("[INFO] 데이터베이스 상태 확인 중...")

        # 데이터베이스 정보 확인
        db_info = analyzer.get_database_info()

        if db_info['success']:
            return {
                "success": True,
                "message": "실제 Pinecone 인덱스 연결됨",
                "total_images": db_info['total_vectors'],
                "folder_info": {
                    "LEVEL_2": 141,
                    "LEVEL_3": 203,
                    "LEVEL_4": 202,
                    "LEVEL_5": 135
                },
                "timestamp": datetime.now()
            }
        else:
            return {
                "success": False,
                "error": "데이터베이스 연결 실패",
                "timestamp": datetime.now()
            }

    except Exception as e:
        print(f"[ERROR] 설정 확인 오류: {e}")
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.now()
        }

@app.post("/analyze")
async def analyze_image(file: UploadFile = File(...)):
    """실제 RAG 기반 이미지 분석"""
    try:
        if not analyzer:
            raise HTTPException(status_code=500, detail="RAG 분석기가 초기화되지 않았습니다")

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

        print(f"[ANALYZE] 실제 RAG 분석 시작: {file.filename} ({file_size} bytes)")

        # 임시 파일로 저장
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as tmp_file:
            tmp_file.write(contents)
            tmp_path = tmp_file.name

        try:
            # 실제 RAG 분석 수행
            result = analyzer.analyze_image(tmp_path)

            # 임시 파일 삭제
            os.unlink(tmp_path)

            if result['success']:
                # 설명 한국어로 변환
                descriptions = {
                    2: "경미한 탈모 - M자 탈모가 시작되거나 이마선이 약간 후퇴",
                    3: "초기 탈모 - M자 탈모가 뚜렷해지고 정수리 부분 모발 밀도 감소",
                    4: "중기 탈모 - M자 탈모 진행, 정수리 탈모 본격화",
                    5: "진행된 탈모 - 앞머리와 정수리 탈모가 연결되기 시작"
                }

                predicted_stage = result['predicted_stage']

                response = {
                    "success": True,
                    "predicted_stage": predicted_stage,
                    "confidence": result['confidence'],
                    "stage_description": descriptions.get(predicted_stage, f"Level {predicted_stage}"),
                    "stage_scores": result.get('stage_scores', {}),
                    "similar_images": result.get('similar_images', []),
                    "analysis_details": {
                        "filename": file.filename,
                        "file_size": file_size,
                        "mode": "production_rag"
                    },
                    "timestamp": datetime.now()
                }

                print(f"[OK] 실제 RAG 분석 완료: Level {predicted_stage} (신뢰도: {result['confidence']:.1%})")
                return response
            else:
                raise HTTPException(status_code=500, detail=result.get('error', '분석 실패'))

        except Exception as e:
            # 임시 파일 정리
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
            raise e

    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] 분석 오류: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/database-info")
async def get_database_info():
    """실제 데이터베이스 정보"""
    try:
        if not analyzer:
            return {
                "success": False,
                "error": "RAG 분석기가 초기화되지 않았습니다",
                "timestamp": datetime.now()
            }

        db_info = analyzer.get_database_info()

        if db_info['success']:
            return {
                "success": True,
                "mode": "production",
                "index_name": db_info.get('index_name', 'hair-loss-rag-analysis'),
                "total_vectors": db_info['total_vectors'],
                "dimension": db_info['dimension'],
                "message": "실제 Pinecone 인덱스 사용 중",
                "timestamp": datetime.now()
            }
        else:
            return {
                "success": False,
                "error": "데이터베이스 정보 조회 실패",
                "timestamp": datetime.now()
            }

    except Exception as e:
        print(f"[ERROR] 데이터베이스 정보 조회 오류: {e}")
        return {
            "success": False,
            "error": str(e),
            "timestamp": datetime.now()
        }

if __name__ == "__main__":
    import uvicorn
    print("Hair Loss RAG Analyzer API (Real Implementation) starting...")
    print("API docs: http://localhost:8000/docs")
    print("Frontend: http://localhost:3000")
    print("INFO: Using real Pinecone RAG implementation")
    uvicorn.run(app, host="0.0.0.0", port=8000)