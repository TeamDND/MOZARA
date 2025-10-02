"""
Per-class 앙상블 설정 (ConvNeXt + ViT-S/16)
검증셋에서 산출된 per-class 가중치 및 오버라이드 설정
"""

# Pinecone 인덱스 설정
import os
INDEX_CONV = os.getenv("PINECONE_INDEX_NAME_RAG_CONV", "hair-loss-rag-analyzer")  # ConvNeXt용 인덱스
INDEX_VIT = os.getenv("PINECONE_INDEX_NAME_RAG_VIT", "hair-loss-vit-s16")        # ViT-S/16용 인덱스

# 검색 파라미터
TOP_K = 10
T_CONV = 0.15  # ConvNeXt 온도 파라미터
T_VIT = 0.20   # ViT 온도 파라미터

# 앙상블 설정 (여성형 탈모 - Sinclair 5단계)
USE_OVERRIDE = False  # 신뢰도 기반 동적 가중치 사용 중
NUM_CLASSES = 5  # Stage 1-5

# 검증셋에서 산출된 per-class 가중치
PER_CLASS_WEIGHTS = {
    "conv": [
        0.5024154589371981,   # class 1
        0.5290697674418604,   # class 2
        0.5078909612625537,   # class 3
        0.49780509218612823,  # class 4
        0.5,                  # class 5
        0.5221843003412969,   # class 6
        0.5                   # class 7
    ],
    "vit": [
        0.497584541062802,    # class 1
        0.47093023255813954,  # class 2
        0.49210903873744616,  # class 3
        0.5021949078138719,   # class 4
        0.5,                  # class 5
        0.477815699658703,    # class 6
        0.5                   # class 7
    ]
}

# 각 모델의 per-class F1 스코어
PER_CLASS_F1 = {
    "conv": [
        0.8155339805825242,   # class 1
        0.6666666666666666,   # class 2
        0.8571428571428571,   # class 3
        0.8076923076923077,   # class 4
        0.9090909090909091,   # class 5
        0.9,                  # class 6
        0.9743589743589743    # class 7
    ],
    "vit": [
        0.8076923076923077,   # class 1
        0.5934065934065934,   # class 2
        0.8305084745762712,   # class 3
        0.8148148148148148,   # class 4
        0.9090909090909091,   # class 5
        0.8235294117647058,   # class 6
        0.9743589743589743    # class 7
    ]
}

# 강점 모델 마스크 (1: 해당 모델이 강점, 0: 아님)
STRONG_MASK = {
    "conv": [0, 1, 0, 0, 0, 1, 0],  # class 2, 6에서 ConvNeXt가 강점
    "vit": [0, 0, 0, 0, 0, 0, 0]    # ViT가 강점인 클래스 없음
}

# 오버라이드 임계값 (τ)
TAU_THRESHOLDS = {
    "conv": [0.0, 0.7, 0.0, 0.0, 0.0, 0.55, 0.0],  # class 2: 0.7, class 6: 0.55
    "vit": [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]     # ViT 오버라이드 없음
}

def get_ensemble_config():
    """앙상블 설정 반환"""
    return {
        "index_conv": INDEX_CONV,
        "index_vit": INDEX_VIT,
        "top_k": TOP_K,
        "Tconv": T_CONV,
        "Tvit": T_VIT,
        "override": USE_OVERRIDE,
        "num_classes": NUM_CLASSES,
        "weights": PER_CLASS_WEIGHTS,
        "f1": PER_CLASS_F1,
        "strong": STRONG_MASK,
        "tau": TAU_THRESHOLDS
    }