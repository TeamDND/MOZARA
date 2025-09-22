#!/usr/bin/env python3
"""
빠른 백엔드 테스트
"""

import os
import sys
import asyncio
from pathlib import Path

# 백엔드 모듈 import를 위한 경로 추가
backend_path = Path("C:/Users/301/Desktop/main_project/backend/hair_classification/hair_loss_rag_analyzer_v0/backend")
sys.path.append(str(backend_path))

from app.services.hair_loss_analyzer import HairLossAnalyzer
from app.config import settings
from PIL import Image

async def quick_test():
    print("=== 빠른 백엔드 테스트 ===")

    print(f"UPLOAD_DIR: {settings.UPLOAD_DIR}")

    # 테스트 이미지 경로
    test_image = "C:/Users/301/Desktop/test_data_set/test/2/20231109103954UbVvLx_jpg.rf.08bf8f0253ff6ec4a392e60407a7ca05.jpg"

    if not os.path.exists(test_image):
        print(f"테스트 이미지를 찾을 수 없습니다: {test_image}")
        return

    print(f"테스트 이미지: {os.path.basename(test_image)}")

    # HairLossAnalyzer 초기화
    analyzer = HairLossAnalyzer()

    # 인덱스 상태 확인
    print(f"인덱스 벡터 수: {analyzer.vector_manager.index.ntotal if analyzer.vector_manager.index else 0}")
    print(f"메타데이터 수: {len(analyzer.vector_manager.metadata)}")

    # 이미지 분석
    print("\n이미지 분석 중...")
    image = Image.open(test_image).convert('RGB')
    result = await analyzer.analyze_image(image, os.path.basename(test_image))

    print(f"분석 결과: {result}")

if __name__ == "__main__":
    asyncio.run(quick_test())