"""
ConvNeXt + ViT-S/16 앙상블 매니저
Per-class 가중 소프트보팅 + 선택적 오버라이드
"""

import numpy as np
import re
from typing import List, Dict, Tuple, Optional
import logging
from ..per_class_config import get_ensemble_config


class EnsembleManager:
    def __init__(self):
        """앙상블 매니저 초기화"""
        self.config = get_ensemble_config()
        self.logger = logging.getLogger(__name__)

    def knn_to_probs(self, matches: List[Dict], num_classes: int = 7, T: float = 0.20) -> np.ndarray:
        """KNN 결과를 확률 분포로 변환"""
        if not matches:
            return np.zeros(num_classes, dtype=float)

        sims = np.array([m["score"] for m in matches], float)
        w = np.exp(sims / T)
        w = w / (w.sum() + 1e-12)

        probs = np.zeros(num_classes, float)
        for wi, m in zip(w, matches):
            md = m.get("metadata", {})

            # stage 키 우선, 없으면 level/label 추정
            if "stage" in md:
                st = int(md["stage"])  # 1..7
            else:
                # level_2..7 형태 추출 시도
                st = None
                for k in ("level", "class", "label"):
                    v = md.get(k)
                    if isinstance(v, str):
                        mm = re.search(r"(\d+)", v)
                        if mm:
                            st = int(mm.group(1))
                            break
                if st is None:
                    # id/from/filepath에서 추정
                    src = m.get("id") or ""
                    mm = re.search(r"(\d+)", str(src))
                    st = int(mm.group(1)) if mm else 0

            if 1 <= st <= num_classes:
                probs[st-1] += wi

        s = probs.sum()
        return probs / s if s > 0 else probs

    def apply_ensemble(self, p_conv: np.ndarray, p_vit: np.ndarray) -> Tuple[int, np.ndarray]:
        """앙상블 예측 적용"""
        # Per-class 가중치 적용 (self.config에서 직접 접근)
        w_conv = np.array(self.config["weights"]["conv"], float)
        w_vit = np.array(self.config["weights"]["vit"], float)
        P_ens = w_conv * p_conv + w_vit * p_vit

        # 오버라이드 적용 (USE_OVERRIDE가 True인 경우)
        if self.config["override"]:
            strong_c = np.array(self.config["strong"]["conv"], int)
            strong_v = np.array(self.config["strong"]["vit"], int)
            tau_c = np.array(self.config["tau"]["conv"], float)
            tau_v = np.array(self.config["tau"]["vit"], float)

            # Hard override per class if strong and threshold satisfied
            for c in range(self.config["num_classes"]):
                if strong_c[c] and p_conv[c] >= tau_c[c] and tau_c[c] > 0:
                    P_ens[c] = p_conv[c]
                if strong_v[c] and p_vit[c] >= tau_v[c] and tau_v[c] > 0:
                    P_ens[c] = p_vit[c]

        # 정규화 (선택적)
        s = P_ens.sum()
        if s > 0:
            P_ens = P_ens / s

        pred = int(np.argmax(P_ens)) + 1  # 1-based indexing
        return pred, P_ens

    def predict_from_dual_results(self, conv_matches: List[Dict], vit_matches: List[Dict]) -> Dict:
        """ConvNeXt + ViT 검색 결과로부터 앙상블 예측"""
        try:
            # 각 모델의 확률 분포 계산
            p_conv = self.knn_to_probs(conv_matches, self.config["num_classes"], self.config["Tconv"])
            p_vit = self.knn_to_probs(vit_matches, self.config["num_classes"], self.config["Tvit"])

            # 앙상블 예측
            pred_stage, p_ensemble = self.apply_ensemble(p_conv, p_vit)

            # 신뢰도 계산 (최대 확률값)
            confidence = float(np.max(p_ensemble))

            # Stage별 점수 생성
            stage_scores = {i+1: float(p_ensemble[i]) for i in range(self.config["num_classes"])}

            # 유사 이미지 결합 (ConvNeXt와 ViT 결과 섞기)
            similar_images = []

            # ConvNeXt 결과 추가
            for i, match in enumerate(conv_matches[:5]):  # 상위 5개
                if "metadata" in match:
                    similar_images.append({
                        "filename": match["metadata"].get("filename", f"conv_image_{i}"),
                        "stage": self._extract_stage_from_metadata(match["metadata"]),
                        "similarity": round(match["score"], 3),
                        "source": "convnext"
                    })

            # ViT 결과 추가
            for i, match in enumerate(vit_matches[:5]):  # 상위 5개
                if "metadata" in match:
                    similar_images.append({
                        "filename": match["metadata"].get("filename", f"vit_image_{i}"),
                        "stage": self._extract_stage_from_metadata(match["metadata"]),
                        "similarity": round(match["score"], 3),
                        "source": "vit"
                    })

            return {
                "predicted_stage": pred_stage,
                "confidence": confidence,
                "stage_scores": stage_scores,
                "similar_images": similar_images,
                "ensemble_details": {
                    "conv_probs": p_conv.tolist(),
                    "vit_probs": p_vit.tolist(),
                    "ensemble_probs": p_ensemble.tolist(),
                    "weights_used": {
                        "conv": self.config["weights"]["conv"],
                        "vit": self.config["weights"]["vit"]
                    },
                    "override_applied": self.config["override"]
                }
            }

        except Exception as e:
            self.logger.error(f"앙상블 예측 실패: {e}")
            return {
                "predicted_stage": None,
                "confidence": 0.0,
                "stage_scores": {},
                "similar_images": [],
                "error": str(e)
            }

    def _extract_stage_from_metadata(self, metadata: Dict) -> int:
        """메타데이터에서 스테이지 추출"""
        if "stage" in metadata:
            return int(metadata["stage"])

        # level_X 형태에서 추출
        for key in ("level", "class", "label"):
            value = metadata.get(key, "")
            if isinstance(value, str):
                match = re.search(r"(\d+)", value)
                if match:
                    return int(match.group(1))

        return 0  # 기본값