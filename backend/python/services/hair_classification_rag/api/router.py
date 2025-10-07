from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form
from fastapi.responses import JSONResponse
from typing import Optional, List
import logging
import os
from datetime import datetime

from ..models.schemas import (
    AnalysisRequest, AnalysisResult, DatabaseSetupRequest,
    DatabaseSetupResponse, DatabaseInfo, UploadResponse,
    AddFolderRequest, AddFolderResponse
)
from ..services.analysis_service import HairLossAnalyzer
from ..config.settings import settings

router = APIRouter(prefix="/hair-classification-rag", tags=["hair-classification-rag"])

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

@router.post("/analyze-base64", response_model=AnalysisResult)
async def analyze_image_base64(request: AnalysisRequest):
    """Base64 인코딩된 이미지 분석"""
    try:
        analyzer = get_analyzer()
        result = await analyzer.analyze_image_from_base64(
            request.image_data,
            request.filename
        )

        if result['success']:
            # analysis_service에서 이미 grade로 변환 완료 (0-3)
            grade = result['grade']

            # 프론트엔드 하위 호환을 위해 stage도 함께 전송
            result['stage'] = grade

            logging.info(f"🔍 Router 응답 생성 - Grade {grade}단계")

            # stage_description 업데이트
            stage_map = {
                0: "Grade 0 (정상) - 정수리 모발 밀도 정상, 탈모 징후 없음",
                1: "Grade 1 (경증) - 가르마 부위 두피가 약간 보이기 시작, 모발 밀도 경미한 감소",
                2: "Grade 2 (중등도) - 가르마 부위 두피 노출 증가, 모발 밀도 중등도 감소",
                3: "Grade 3 (중증-최중증) - 가르마 부위 및 정수리 두피 노출 뚜렷, 모발 밀도 현저한 감소"
            }
            result['stage_description'] = stage_map.get(grade, result.get('stage_description', ''))

            analysis_result = AnalysisResult(**result)
            logging.info(f"🔍 AnalysisResult 생성 완료 - grade: {analysis_result.grade}")

            return analysis_result
        else:
            raise HTTPException(status_code=400, detail=result['error'])

    except Exception as e:
        logging.error(f"이미지 분석 실패: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/analyze-upload", response_model=AnalysisResult)
async def analyze_uploaded_image(
    file: UploadFile = File(...),
    use_llm: bool = True,
    use_roi: bool = True,
    age: Optional[str] = Form(None),
    gender: Optional[str] = Form(None),
    familyHistory: Optional[str] = Form(None),
    recentHairLoss: Optional[str] = Form(None),
    stress: Optional[str] = Form(None)
):
    """업로드된 이미지 파일 분석 (ROI 기반, 설문 데이터 포함)"""
    try:
        # 파일 크기 확인
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

        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert('RGB')

        # 설문 데이터 구성
        survey_data = None
        if age or gender or familyHistory or recentHairLoss or stress:
            survey_data = {
                'age': age,
                'gender': gender,
                'familyHistory': familyHistory,
                'recentHairLoss': recentHairLoss,
                'stress': stress
            }
            logging.info(f"설문 데이터 수신: {survey_data}")

        # 분석 실행 (ROI 기반, 설문 데이터 포함)
        analyzer = get_analyzer()
        result = await analyzer.analyze_image(image, file.filename, use_llm=use_llm, use_roi=use_roi, survey_data=survey_data)

        if result['success']:
            # analysis_service에서 이미 grade로 변환 완료 (0-3)
            grade = result['grade']

            # 프론트엔드 하위 호환을 위해 stage도 함께 전송
            result['stage'] = grade

            logging.info(f"🔍 Router 응답 생성 - Grade {grade}단계")

            # stage_description 업데이트
            stage_map = {
                0: "Grade 0 (정상) - 정수리 모발 밀도 정상, 탈모 징후 없음",
                1: "Grade 1 (경증) - 가르마 부위 두피가 약간 보이기 시작, 모발 밀도 경미한 감소",
                2: "Grade 2 (중등도) - 가르마 부위 두피 노출 증가, 모발 밀도 중등도 감소",
                3: "Grade 3 (중증-최중증) - 가르마 부위 및 정수리 두피 노출 뚜렷, 모발 밀도 현저한 감소"
            }
            result['stage_description'] = stage_map.get(grade, result.get('stage_description', ''))

            analysis_result = AnalysisResult(**result)
            logging.info(f"🔍 AnalysisResult 생성 완료 - grade: {analysis_result.grade}")

            return analysis_result
        else:
            raise HTTPException(status_code=400, detail=result['error'])

    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"업로드 이미지 분석 실패: {e}")
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
