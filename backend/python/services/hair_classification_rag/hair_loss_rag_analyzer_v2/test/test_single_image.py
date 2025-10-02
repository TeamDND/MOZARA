#!/usr/bin/env python3
"""
v2 단일 이미지 테스트 (ROI BiSeNet)
테스터와 동일한 방식으로 단일 이미지 분류 테스트
"""

import sys
import os
from pathlib import Path

# v2 백엔드 경로 추가
V2_BACKEND_PATH = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(V2_BACKEND_PATH))

from PIL import Image
from app.services.image_processor import ImageProcessor
from app.services.dual_pinecone_manager import DualPineconeManager
from app.services.ensemble_manager import EnsembleManager
from app.config import settings

# 테스트 이미지 경로
TEST_IMAGE = r"C:\Users\301\Desktop\female_classification\test\selected_test\stage_1\4_Front_jpg.rf.6eb857312568cb17e6f9cd1745ee71a1.jpg"


def main():
    print("=" * 80)
    print("v2 단일 이미지 ROI BiSeNet 테스트")
    print("=" * 80)
    print(f"테스트 이미지: {TEST_IMAGE}")
    print(f"Gender Filter: {settings.DEFAULT_GENDER_FILTER}")
    print("=" * 80)

    # 서비스 초기화
    print("\n[1] 서비스 초기화 중...")
    try:
        image_processor = ImageProcessor()
        dual_manager = DualPineconeManager()
        ensemble_manager = EnsembleManager()
        print("[OK] Initialization complete")
    except Exception as e:
        print(f"[FAIL] Initialization failed: {e}")
        return

    # 이미지 로드
    print("\n[2] 이미지 로드 중...")
    try:
        image = Image.open(TEST_IMAGE).convert("RGB")
        print(f"[OK] Image size: {image.size}")
    except Exception as e:
        print(f"[FAIL] Image load failed: {e}")
        return

    # ROI 듀얼 임베딩 추출
    print("\n[3] ROI BiSeNet 세그멘테이션 + 듀얼 임베딩 추출 중...")
    try:
        conv_emb, vit_emb = image_processor.extract_roi_dual_embeddings(image)
        if conv_emb is None or vit_emb is None:
            print("[FAIL] Embedding extraction failed")
            return
        print(f"[OK] ConvNeXt embedding: {conv_emb.shape}")
        print(f"[OK] ViT embedding: {vit_emb.shape}")
    except Exception as e:
        print(f"[FAIL] Embedding extraction failed: {e}")
        import traceback
        traceback.print_exc()
        return

    # Pinecone 검색 (use_roi=True)
    print("\n[4] Pinecone ROI 검색 중 (gender=female, embedding_type=roi)...")
    try:
        conv_matches, vit_matches = dual_manager.dual_search(
            conv_emb, vit_emb, top_k=10, viewpoint=None, use_roi=True
        )
        print(f"[OK] ConvNeXt search results: {len(conv_matches)} matches")
        print(f"[OK] ViT search results: {len(vit_matches)} matches")

        if len(conv_matches) == 0 and len(vit_matches) == 0:
            print("\n⚠ 경고: 검색 결과가 0개입니다!")
            print("  - Pinecone에 ROI 임베딩이 없거나")
            print("  - 필터(gender=female, embedding_type=roi)가 맞지 않습니다")
            return

        # 상위 3개 결과 출력
        if conv_matches:
            print("\n  ConvNeXt Top 3:")
            for i, m in enumerate(conv_matches[:3], 1):
                md = m.get('metadata', {})
                print(f"    {i}. Stage {md.get('stage', '?')}, Score: {m['score']:.4f}, File: {md.get('filename', 'N/A')}")

        if vit_matches:
            print("\n  ViT Top 3:")
            for i, m in enumerate(vit_matches[:3], 1):
                md = m.get('metadata', {})
                print(f"    {i}. Stage {md.get('stage', '?')}, Score: {m['score']:.4f}, File: {md.get('filename', 'N/A')}")

    except Exception as e:
        print(f"✗ Pinecone 검색 실패: {e}")
        import traceback
        traceback.print_exc()
        return

    # 신뢰도 기반 앙상블 예측
    print("\n[5] 신뢰도 기반 동적 가중치 앙상블 예측 중...")
    try:
        result = ensemble_manager.predict_from_dual_results(conv_matches, vit_matches)

        if result['predicted_stage'] is None:
            print(f"[FAIL] Prediction failed: {result.get('error', 'Unknown error')}")
            return

        print(f"[OK] Prediction complete!")
        print("\n" + "=" * 80)
        print("Prediction Result")
        print("=" * 80)
        print(f"Predicted Stage: {result['predicted_stage']}")
        print(f"Confidence: {result['confidence']:.4f}")
        print(f"\nStage Scores:")
        for stage, score in sorted(result['stage_scores'].items()):
            print(f"  Stage {stage}: {score:.4f}")

        # 동적 가중치 정보
        weights = result['ensemble_details']['dynamic_weights']
        print(f"\nDynamic Weights:")
        print(f"  ConvNeXt: {weights['conv_weight']:.4f} (confidence: {weights['conv_confidence']:.4f})")
        print(f"  ViT: {weights['vit_weight']:.4f} (confidence: {weights['vit_confidence']:.4f})")

        print("=" * 80)
        print("[SUCCESS] Test passed!")

    except Exception as e:
        print(f"[FAIL] Ensemble prediction failed: {e}")
        import traceback
        traceback.print_exc()
        return


if __name__ == "__main__":
    main()
