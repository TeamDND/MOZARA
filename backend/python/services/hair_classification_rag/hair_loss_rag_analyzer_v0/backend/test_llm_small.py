#!/usr/bin/env python3
"""
LLM 소규모 테스트 (각 레벨별 1개씩)
"""

import os
import sys
import json
import time
import asyncio
from datetime import datetime
from pathlib import Path
from PIL import Image

# config 설정
class HardcodedSettings:
    UPLOAD_DIR = "C:/Users/301/Desktop/main_project/backend/hair_classification/hair_loss_rag_analyzer_v0/backend/uploads"
    EMBEDDING_DIMENSION = 1536
    MODEL_NAME = "convnext_large.fb_in22k_ft_in1k_384"
    DATASET_PATH = "C:/Users/301/Desktop/hair_loss_rag/hair_rag_dataset_image/hair_rag_dataset_ragging"
    FAISS_INDEX_PATH = "C:/Users/301/Desktop/main_project/backend/hair_classification/hair_loss_rag_analyzer_v0/backend/data/vector_index.faiss"
    STAGE_DESCRIPTIONS = {
        2: "경미한 탈모", 3: "초기 탈모", 4: "중기 탈모",
        5: "진행된 탈모", 6: "심한 탈모", 7: "매우 심한 탈모"
    }

# config를 직접 덮어쓰기
import app.config
app.config.settings = HardcodedSettings()

from app.services.hair_loss_analyzer import HairLossAnalyzer

async def test_llm_small():
    """각 레벨별 1개씩 LLM 테스트"""
    print("=" * 60)
    print("LLM 소규모 테스트 (각 레벨별 1개)")
    print("=" * 60)

    test_data_path = Path("C:/Users/301/Desktop/test_data_set/test")

    if not test_data_path.exists():
        print(f"[ERROR] 테스트 데이터 경로를 찾을 수 없습니다: {test_data_path}")
        return

    # 애널라이저 초기화
    try:
        analyzer = HairLossAnalyzer()
        print("HairLossAnalyzer 초기화 완료")
    except Exception as e:
        print(f"[ERROR] 초기화 실패: {e}")
        return

    total_tokens = 0
    results = []

    # 각 레벨별로 1개씩 테스트
    for level in range(2, 8):  # 레벨 2-7
        print(f"\n--- 레벨 {level} 테스트 ---")

        # 레벨 폴더 찾기
        level_patterns = [f"LEVEL_{level}", f"{level}", f"level_{level}"]
        level_path = None

        for pattern in level_patterns:
            candidate = test_data_path / pattern
            if candidate.exists():
                level_path = candidate
                break

        if not level_path:
            print(f"[WARNING] 레벨 {level} 폴더 없음")
            continue

        # 첫 번째 이미지 찾기
        image_files = []
        for ext in ['.jpg', '.jpeg', '.png']:
            image_files.extend(list(level_path.glob(f"*{ext}")))
            if image_files:
                break

        if not image_files:
            print(f"[WARNING] 레벨 {level} 이미지 없음")
            continue

        test_image = image_files[0]
        print(f"테스트 이미지: {test_image.name}")

        try:
            image = Image.open(test_image).convert('RGB')

            # LLM 분석
            start_time = time.time()
            result = await analyzer.analyze_image(image, test_image.name, use_llm=True)
            analysis_time = time.time() - start_time

            print(f"분석 시간: {analysis_time:.2f}초")
            print(f"성공 여부: {result.get('success')}")
            print(f"분석 방법: {result.get('method')}")
            print(f"예측 레벨: {result.get('predicted_stage')}")
            print(f"신뢰도: {result.get('confidence')}")

            # 토큰 사용량 상세 확인
            analysis_details = result.get('analysis_details', {})
            print(f"analysis_details 키: {list(analysis_details.keys())}")

            token_usage = analysis_details.get('token_usage', {})
            print(f"token_usage: {token_usage}")

            if token_usage:
                image_tokens = token_usage.get('total_tokens', 0)
                total_tokens += image_tokens
                print(f"이미지 토큰: {image_tokens}")
            else:
                print("토큰 정보 없음")

            # LLM 추론 확인
            llm_reasoning = analysis_details.get('llm_reasoning', '')
            if llm_reasoning:
                print(f"LLM 추론: {llm_reasoning[:100]}...")

            # 파싱 에러 확인
            llm_analysis = analysis_details.get('llm_analysis', {})
            parsing_error = llm_analysis.get('parsing_error', False)
            print(f"파싱 에러: {parsing_error}")

            if parsing_error and 'raw_response' in llm_analysis:
                print(f"원시 응답 미리보기: {llm_analysis['raw_response'][:200]}...")

            results.append({
                'level': level,
                'predicted': result.get('predicted_stage'),
                'confidence': result.get('confidence'),
                'tokens': token_usage.get('total_tokens', 0),
                'parsing_error': parsing_error,
                'success': result.get('success')
            })

        except Exception as e:
            print(f"[ERROR] 레벨 {level} 테스트 실패: {e}")

    # 최종 요약
    print("\n" + "=" * 60)
    print("테스트 요약")
    print("=" * 60)

    for r in results:
        status = "OK" if r['success'] and not r['parsing_error'] else "FAIL"
        print(f"레벨 {r['level']}: 예측={r['predicted']}, 토큰={r['tokens']}, 상태={status}")

    print(f"\n총 토큰 사용량: {total_tokens}")
    print(f"예상 비용: ${total_tokens * 0.000001 * 1.5:.5f}")

if __name__ == "__main__":
    asyncio.run(test_llm_small())