from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form
from fastapi.responses import JSONResponse
from typing import Optional, List
import logging
import os
from datetime import datetime

from ..models import (
    AnalysisRequest, AnalysisResult, DatabaseSetupRequest,
    DatabaseSetupResponse, DatabaseInfo, UploadResponse,
    AddFolderRequest, AddFolderResponse
)
from ..services.hair_loss_analyzer import HairLossAnalyzer
from ..config import settings

router = APIRouter(prefix="/analysis", tags=["analysis"])

# 전역 분석기 인스턴스
analyzer = None

def get_analyzer():
    """분석기 인스턴스 가져오기"""
    global analyzer
    if analyzer is None:
        try:
            analyzer = HairLossAnalyzer()
        except Exception as e:
            logging.error(f"분석기 초기화 실패: {e}")
            raise HTTPException(status_code=500, detail=f"분석기 초기화 실패: {str(e)}")
    return analyzer

@router.post("/setup", response_model=DatabaseSetupResponse)
async def setup_database(request: DatabaseSetupRequest):
    """데이터베이스 설정 및 임베딩 업로드"""
    try:
        analyzer = get_analyzer()
        result = await analyzer.setup_database(recreate_index=request.recreate_index)

        if result['success']:
            return DatabaseSetupResponse(**result)
        else:
            raise HTTPException(status_code=500, detail=result['error'])

    except Exception as e:
        logging.error(f"데이터베이스 설정 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/database-info", response_model=DatabaseInfo)
async def get_database_info():
    """데이터베이스 정보 조회"""
    try:
        analyzer = get_analyzer()
        result = analyzer.get_database_info()

        return DatabaseInfo(**result)

    except Exception as e:
        logging.error(f"데이터베이스 정보 조회 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def health_check():
    """시스템 헬스 체크"""
    try:
        analyzer = get_analyzer()
        health_status = analyzer.get_health_status()

        if health_status['status'] == 'healthy':
            return JSONResponse(content=health_status)
        elif health_status['status'] == 'degraded':
            return JSONResponse(content=health_status, status_code=206)
        else:
            return JSONResponse(content=health_status, status_code=503)

    except Exception as e:
        logging.error(f"헬스 체크 실패: {e}")
        return JSONResponse(
            content={
                'status': 'unhealthy',
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            },
            status_code=503
        )

@router.post("/add-folder-data", response_model=AddFolderResponse)
async def add_folder_data(request: AddFolderRequest):
    """지정된 로컬 폴더 경로에서 데이터를 읽어와 데이터베이스에 추가합니다."""
    try:
        analyzer = get_analyzer()
        result = await analyzer.add_data_from_folder(
            folder_path=request.folder_path, 
            recreate_index=request.recreate_index
        )

        if result['success']:
            return AddFolderResponse(**result)
        else:
            raise HTTPException(status_code=500, detail=result['error'])

    except Exception as e:
        logging.error(f"폴더 데이터 추가 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze-dual-upload", response_model=AnalysisResult)
async def analyze_dual_uploaded_images(
    primary_file: UploadFile = File(..., description="Primary 이미지 (Top-down/Front)"),
    secondary_file: UploadFile = File(..., description="Secondary 이미지 (Right/Left)"),
    use_llm: bool = Form(default=True, description="LLM 분석 사용 여부")
):
    """듀얼 이미지 업로드 Late Fusion 분석"""
    try:
        # 파일 크기 확인
        for file in [primary_file, secondary_file]:
            if file.size > settings.MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=413,
                    detail=f"파일 크기가 너무 큽니다. 최대 {settings.MAX_FILE_SIZE // (1024*1024)}MB"
                )

            # 파일 확장자 확인
            file_extension = os.path.splitext(file.filename)[1].lower()
            if file_extension not in settings.ALLOWED_EXTENSIONS:
                raise HTTPException(
                    status_code=415,
                    detail=f"지원하지 않는 파일 형식입니다. 지원 형식: {settings.ALLOWED_EXTENSIONS}"
                )

        # 이미지 읽기
        from PIL import Image
        import io

        primary_contents = await primary_file.read()
        secondary_contents = await secondary_file.read()

        primary_image = Image.open(io.BytesIO(primary_contents)).convert('RGB')
        secondary_image = Image.open(io.BytesIO(secondary_contents)).convert('RGB')

        # 듀얼 이미지 분석 실행
        analyzer = get_analyzer()
        result = await analyzer.analyze_dual_images(
            primary_image, secondary_image,
            primary_file.filename, secondary_file.filename,
            use_llm=use_llm
        )

        if result['success']:
            return AnalysisResult(**result)
        else:
            raise HTTPException(status_code=400, detail=result['error'])

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"듀얼 이미지 분석 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))