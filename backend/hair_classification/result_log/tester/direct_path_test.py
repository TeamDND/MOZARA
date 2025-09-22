#!/usr/bin/env python3
"""
하드코딩된 경로로 FAISS 직접 테스트
"""

import os
import sys
import asyncio
from pathlib import Path
from PIL import Image

# 백엔드 모듈 import를 위한 경로 추가
backend_path = Path("C:/Users/301/Desktop/main_project/backend/hair_classification/hair_loss_rag_analyzer_v0/backend")
sys.path.append(str(backend_path))

# 하드코딩된 경로로 config 우회
class HardcodedSettings:
    UPLOAD_DIR = "C:/Users/301/Desktop/main_project/backend/hair_classification/hair_loss_rag_analyzer_v0/backend/uploads"
    INDEX_NAME = "hair-loss-rag-analysis-convnext"
    EMBEDDING_DIMENSION = 1536
    MODEL_NAME = "convnext_large.fb_in22k_ft_in1k_384"

    # 탈모 단계 설명
    STAGE_DESCRIPTIONS = {
        2: "경미한 탈모 - M자 탈모가 시작되거나 이마선이 약간 후퇴",
        3: "초기 탈모 - M자 탈모가 뚜렷해지고 정수리 부분 모발 밀도 감소",
        4: "중기 탈모 - M자 탈모 진행, 정수리 탈모 본격화",
        5: "진행된 탈모 - 앞머리와 정수리 탈모가 연결되기 시작",
        6: "심한 탈모 - 앞머리와 정수리가 완전히 연결되어 하나의 큰 탈모 영역 형성",
        7: "매우 심한 탈모 - 측면과 뒷머리를 제외한 대부분의 모발 손실"
    }

# config를 직접 덮어쓰기
import app.config
app.config.settings = HardcodedSettings()

from app.services.hair_loss_analyzer import HairLossAnalyzer

async def direct_test():
    print("=== 하드코딩된 경로로 직접 테스트 ===")

    # 인덱스 파일 확인
    index_file = os.path.join(HardcodedSettings.UPLOAD_DIR, "hair_loss_faiss.index")
    metadata_file = os.path.join(HardcodedSettings.UPLOAD_DIR, "hair_loss_metadata.pkl")

    print(f"인덱스 파일 존재: {os.path.exists(index_file)}")
    print(f"메타데이터 파일 존재: {os.path.exists(metadata_file)}")

    if os.path.exists(index_file):
        print(f"인덱스 파일 크기: {os.path.getsize(index_file)} bytes")
    if os.path.exists(metadata_file):
        print(f"메타데이터 파일 크기: {os.path.getsize(metadata_file)} bytes")

    # HairLossAnalyzer 초기화
    print("\n애널라이저 초기화...")
    analyzer = HairLossAnalyzer()

    # 인덱스 상태 확인
    print(f"벡터 매니저 인덱스: {analyzer.vector_manager.index}")
    if analyzer.vector_manager.index:
        print(f"인덱스 벡터 수: {analyzer.vector_manager.index.ntotal}")
        print(f"메타데이터 수: {len(analyzer.vector_manager.metadata)}")
    else:
        print("인덱스가 로드되지 않았습니다!")
        return

    # 테스트 이미지로 분석
    test_image = "C:/Users/301/Desktop/test_data_set/test/2/20231109103954UbVvLx_jpg.rf.08bf8f0253ff6ec4a392e60407a7ca05.jpg"

    if os.path.exists(test_image):
        print(f"\n테스트 이미지 분석: {os.path.basename(test_image)}")
        image = Image.open(test_image).convert('RGB')
        result = await analyzer.analyze_image(image, os.path.basename(test_image))
        print(f"분석 결과: {result}")
    else:
        print(f"테스트 이미지를 찾을 수 없습니다: {test_image}")

if __name__ == "__main__":
    asyncio.run(direct_test())