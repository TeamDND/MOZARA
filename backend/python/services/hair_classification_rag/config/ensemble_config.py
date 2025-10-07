"""
ConvNeXt + ViT-S/16 앙상블 설정
신뢰도 기반 동적 가중치 방식 사용 (Per-class 가중치 미사용)
"""

import os

# Pinecone 인덱스 설정
INDEX_CONV = os.getenv("PINECONE_INDEX_NAME_RAG_CONV", "hair-loss-rag-analyzer")  # ConvNeXt용 인덱스
INDEX_VIT = os.getenv("PINECONE_INDEX_NAME_RAG_VIT", "hair-loss-vit-s16")        # ViT-S/16용 인덱스

# 검색 파라미터
TOP_K = 10           # Pinecone 검색 결과 개수
T_CONV = 0.15        # ConvNeXt 온도 파라미터 (더 sharp한 분포)
T_VIT = 0.20         # ViT 온도 파라미터 (더 smooth한 분포)

# 앙상블 설정
NUM_CLASSES = 5      # Sinclair Scale 5단계 (여성형 탈모)

def get_ensemble_config():
    """앙상블 설정 반환"""
    return {
        "index_conv": INDEX_CONV,
        "index_vit": INDEX_VIT,
        "top_k": TOP_K,
        "Tconv": T_CONV,
        "Tvit": T_VIT,
        "num_classes": NUM_CLASSES
    }
