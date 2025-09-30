#!/usr/bin/env python3
"""LLM 통합 테스트 스크립트"""

import asyncio
import os
import sys
from pathlib import Path
from PIL import Image

# 현재 디렉토리를 Python 경로에 추가
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

from app.services.llm_analyzer import LLMHairAnalyzer
from app.config import settings

async def test_llm_connection():
    """OpenAI API 연결 테스트"""
    print("[TEST] OpenAI LLM 연결 테스트 시작...")

    try:
        analyzer = LLMHairAnalyzer()

        # 간단한 테스트 이미지 생성 (흰색 배경)
        test_image = Image.new('RGB', (384, 384), color='white')

        # 가짜 FAISS 결과 생성
        fake_faiss_results = {
            'predicted_stage': 3,
            'confidence': 0.75,
            'stage_scores': {2: 0.2, 3: 0.5, 4: 0.3},
            'similar_images': [
                {'stage': 3, 'distance': 10.5, 'score': 0.8},
                {'stage': 2, 'distance': 15.2, 'score': 0.6},
                {'stage': 4, 'distance': 18.0, 'score': 0.5}
            ]
        }

        print("[PROMPT] 프롬프트 생성 테스트...")
        prompt = analyzer.create_analysis_prompt(fake_faiss_results)
        print("[SUCCESS] 프롬프트 생성 성공")
        print(f"[INFO] 프롬프트 길이: {len(prompt)} 문자")

        print("\n[API] OpenAI API 호출 테스트...")
        result = await analyzer.analyze_with_llm(test_image, fake_faiss_results)

        if result['success']:
            print("[SUCCESS] LLM 분석 성공!")
            print(f"[TOKEN] 토큰 사용량: {result.get('token_usage', {})}")
            print(f"[RESULT] 분석 결과: {result.get('llm_analysis', {}).get('final_stage', 'N/A')}")

            # 결과 결합 테스트
            print("\n[COMBINE] 결과 결합 테스트...")
            combined = analyzer.combine_results(fake_faiss_results, result)
            if combined['success']:
                print("[SUCCESS] 결과 결합 성공!")
                print(f"[FINAL] 최종 단계: {combined['predicted_stage']}")
                print(f"[CONFIDENCE] 신뢰도: {combined['confidence']:.3f}")
            else:
                print(f"[ERROR] 결과 결합 실패: {combined.get('error')}")
        else:
            print(f"[ERROR] LLM 분석 실패: {result.get('error')}")

    except Exception as e:
        print(f"[ERROR] 테스트 실패: {e}")
        import traceback
        traceback.print_exc()

async def test_with_config():
    """설정 확인 및 테스트"""
    print("\n[CONFIG] 설정 확인...")

    # API 키 확인
    api_key = os.getenv("OPENAI_API_KEY")
    if api_key:
        print(f"[SUCCESS] OpenAI API 키 설정됨 (길이: {len(api_key)} 문자)")
        # 키의 앞부분만 표시
        masked_key = f"{api_key[:10]}...{api_key[-5:]}" if len(api_key) > 15 else "짧은 키"
        print(f"[KEY] 키 (마스킹): {masked_key}")
    else:
        print("[ERROR] OpenAI API 키가 설정되지 않았습니다!")
        return

    # 기본 설정 확인
    print(f"[CONFIG] 업로드 디렉토리: {settings.UPLOAD_DIR}")
    print(f"[CONFIG] 임베딩 차원: {settings.EMBEDDING_DIMENSION}")

    await test_llm_connection()

if __name__ == "__main__":
    print("LLM+FAISS 통합 시스템 테스트")
    print("=" * 50)

    asyncio.run(test_with_config())

    print("\n" + "=" * 50)
    print("테스트 완료!")