#!/usr/bin/env python3
"""
프론트엔드 → 백엔드 흐름 시뮬레이션
실제 프론트엔드가 보내는 것과 동일한 방식으로 분석
"""

import sys
import asyncio
from pathlib import Path
from PIL import Image

# v2 백엔드 경로 추가
V2_BACKEND_PATH = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(V2_BACKEND_PATH))

from app.services.hair_loss_analyzer import HairLossAnalyzer

# 테스트 이미지
TEST_IMAGE = r"C:\Users\301\Desktop\female_classification\test\selected_test\stage_3\data_117_png.rf.716a8a481b39dee43f68691a60ff47c8.jpg"


async def main():
    print("=" * 80)
    print("프론트엔드 → 백엔드 흐름 시뮬레이션")
    print("=" * 80)
    print(f"테스트 이미지: {TEST_IMAGE}")
    print("=" * 80)

    # HairLossAnalyzer 초기화 (프론트엔드가 /analyze-upload 호출 시와 동일)
    print("\n[1] HairLossAnalyzer 초기화 중...")
    try:
        analyzer = HairLossAnalyzer()
        print("[OK] Initialization complete")
    except Exception as e:
        print(f"[FAIL] Initialization failed: {e}")
        import traceback
        traceback.print_exc()
        return

    # 이미지 로드
    print("\n[2] 이미지 로드 중...")
    try:
        image = Image.open(TEST_IMAGE).convert("RGB")
        print(f"[OK] Image loaded: {image.size}")
    except Exception as e:
        print(f"[FAIL] Image load failed: {e}")
        return

    # analyze_image 호출 (프론트엔드가 보내는 것과 동일)
    print("\n[3] analyzer.analyze_image() 호출 중...")
    print("    Parameters: use_llm=False, use_roi=True")
    try:
        result = await analyzer.analyze_image(
            image=image,
            filename="data_117_png.rf.716a8a481b39dee43f68691a60ff47c8.jpg",
            top_k=10,
            use_llm=False,  # 프론트엔드는 보통 LLM 없이 먼저 테스트
            viewpoint=None,
            use_roi=True
        )

        print("\n[4] 결과 분석")
        print("-" * 80)
        print(f"Success: {result.get('success')}")

        if result.get('success'):
            print(f"Predicted Stage: {result.get('predicted_stage')}")
            print(f"Confidence: {result.get('confidence')}")
            print(f"Stage Description: {result.get('stage_description')}")
            print(f"\nStage Scores:")
            for stage, score in sorted(result.get('stage_scores', {}).items()):
                print(f"  Stage {stage}: {score}")

            analysis_details = result.get('analysis_details', {})
            print(f"\nAnalysis Method: {analysis_details.get('method')}")
            print(f"Search Parameters: {analysis_details.get('search_parameters')}")

            similar_count = len(result.get('similar_images', []))
            print(f"\nSimilar Images Found: {similar_count}")

            print("\n" + "=" * 80)
            print("[SUCCESS] Analysis completed successfully!")
            print("=" * 80)
        else:
            print(f"\n[FAIL] Analysis failed: {result.get('error')}")
            print("=" * 80)

    except Exception as e:
        print(f"\n[FAIL] analyze_image() raised exception: {e}")
        import traceback
        traceback.print_exc()
        return


if __name__ == "__main__":
    asyncio.run(main())
