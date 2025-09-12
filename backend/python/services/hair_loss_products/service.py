from datetime import datetime
from typing import Dict, Any

from .products_data import HAIR_LOSS_STAGE_PRODUCTS, STAGE_DESCRIPTIONS


def get_products_by_stage(stage: int) -> list:
    if stage not in HAIR_LOSS_STAGE_PRODUCTS:
        raise ValueError("지원하지 않는 탈모 단계입니다. 1-6단계 중 선택해주세요.")
    return HAIR_LOSS_STAGE_PRODUCTS[stage]


def build_stage_response(stage: int) -> Dict[str, Any]:
    products = get_products_by_stage(stage)
    return {
        "products": products,
        "totalCount": len(products),
        "stage": stage,
        "stageDescription": STAGE_DESCRIPTIONS[stage],
        "recommendation": f"{stage}단계 탈모에 적합한 {len(products)}개 제품을 추천합니다.",
        "disclaimer": "본 추천은 참고용이며, 정확한 진단과 치료는 전문의 상담이 필요합니다.",
        "timestamp": datetime.now().isoformat(),
    }


