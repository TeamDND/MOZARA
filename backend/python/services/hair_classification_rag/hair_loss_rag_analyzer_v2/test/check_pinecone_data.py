#!/usr/bin/env python3
"""
Pinecone 데이터 확인 스크립트
female ROI 임베딩이 실제로 있는지 확인
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from pinecone import Pinecone

# v2 .env 로드
V2_BACKEND_PATH = Path(__file__).parent.parent / "backend"
load_dotenv(V2_BACKEND_PATH / ".env")

# Pinecone 초기화
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
INDEX_CONV = "hair-loss-rag-analyzer"
INDEX_VIT = "hair-loss-vit-s16"

print("=" * 80)
print("Pinecone 데이터 확인")
print("=" * 80)
print(f"API Key: {PINECONE_API_KEY[:20]}...")
print(f"ConvNeXt Index: {INDEX_CONV}")
print(f"ViT Index: {INDEX_VIT}")
print("=" * 80)

try:
    pc = Pinecone(api_key=PINECONE_API_KEY)
    idx_conv = pc.Index(INDEX_CONV)
    idx_vit = pc.Index(INDEX_VIT)

    print("\n[1] 인덱스 통계")
    print("-" * 80)

    # ConvNeXt 통계
    conv_stats = idx_conv.describe_index_stats()
    print(f"ConvNeXt 총 벡터: {conv_stats.get('total_vector_count', 0)}")

    # ViT 통계
    vit_stats = idx_vit.describe_index_stats()
    print(f"ViT 총 벡터: {vit_stats.get('total_vector_count', 0)}")

    # gender=female 쿼리 (더미 벡터)
    print("\n[2] gender=female 필터 테스트")
    print("-" * 80)

    dummy_conv = [0.0] * 1536
    dummy_vit = [0.0] * 384

    # Female only
    res_conv_female = idx_conv.query(
        vector=dummy_conv,
        top_k=1,
        include_metadata=True,
        filter={"gender": "female"}
    )

    res_vit_female = idx_vit.query(
        vector=dummy_vit,
        top_k=1,
        include_metadata=True,
        filter={"gender": "female"}
    )

    conv_female_count = len(res_conv_female.get('matches', []))
    vit_female_count = len(res_vit_female.get('matches', []))

    print(f"ConvNeXt gender=female: {conv_female_count}개")
    print(f"ViT gender=female: {vit_female_count}개")

    if conv_female_count > 0:
        md = res_conv_female['matches'][0]['metadata']
        print(f"  샘플: stage={md.get('stage')}, embedding_type={md.get('embedding_type')}, file={md.get('filename', 'N/A')[:50]}")

    # gender=female, embedding_type=roi 쿼리
    print("\n[3] gender=female, embedding_type=roi 필터 테스트")
    print("-" * 80)

    res_conv_roi = idx_conv.query(
        vector=dummy_conv,
        top_k=1,
        include_metadata=True,
        filter={"gender": "female", "embedding_type": "roi"}
    )

    res_vit_roi = idx_vit.query(
        vector=dummy_vit,
        top_k=1,
        include_metadata=True,
        filter={"gender": "female", "embedding_type": "roi"}
    )

    conv_roi_count = len(res_conv_roi.get('matches', []))
    vit_roi_count = len(res_vit_roi.get('matches', []))

    print(f"ConvNeXt gender=female, embedding_type=roi: {conv_roi_count}개")
    print(f"ViT gender=female, embedding_type=roi: {vit_roi_count}개")

    if conv_roi_count > 0:
        md = res_conv_roi['matches'][0]['metadata']
        print(f"  샘플: stage={md.get('stage')}, embedding_type={md.get('embedding_type')}, file={md.get('filename', 'N/A')[:50]}")
    else:
        print("\n⚠ 경고: ROI 임베딩이 없습니다!")
        print("  - upload_female_data.py로 ROI 임베딩을 업로드해야 합니다")
        print("  - 또는 embedding_type 메타데이터가 누락되었을 수 있습니다")

    # embedding_type 없이 female만 검색
    print("\n[4] gender=female 데이터 샘플 (embedding_type 무시)")
    print("-" * 80)

    if conv_female_count > 0:
        res = idx_conv.query(
            vector=dummy_conv,
            top_k=5,
            include_metadata=True,
            filter={"gender": "female"}
        )

        for i, m in enumerate(res['matches'], 1):
            md = m['metadata']
            print(f"{i}. stage={md.get('stage')}, emb_type={md.get('embedding_type', 'NONE')}, "
                  f"file={md.get('filename', 'N/A')[:40]}")

    print("\n" + "=" * 80)
    print("확인 완료")
    print("=" * 80)

except Exception as e:
    print(f"\n오류 발생: {e}")
    import traceback
    traceback.print_exc()
