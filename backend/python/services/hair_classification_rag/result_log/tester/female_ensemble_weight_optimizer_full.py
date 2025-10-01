#!/usr/bin/env python3
r"""
Female Hair Loss Ensemble Weight Optimizer (Full-only)
테스트 데이터: C:\Users\301\Desktop\female_classification\valid\selected_test
방식: Full embedding만 사용한 앙상블

저장 위치: weight(female_full) 폴더
"""

import os
import re
import json
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple
import itertools
from concurrent.futures import ThreadPoolExecutor, as_completed

import numpy as np
from PIL import Image, ImageEnhance
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix, classification_report

import torch
import torchvision.transforms as T
import timm
from dotenv import load_dotenv
from pinecone import Pinecone

# ---------- 경로/설정 ----------
ENV_PATH = r"C:\Users\301\Desktop\main_project\.env"
TEST_ROOT = Path(r"C:\Users\301\Desktop\female_classification\valid\selected_test")
WEIGHT_SAVE_PATH = Path(r"C:\Users\301\Desktop\main_project\backend\python\services\hair_classification_rag\result_log\tester\weight\weight(female_full+1)")

INDEX_CONV = "hair-loss-rag-analyzer"
INDEX_VIT = "hair-loss-vit-s16"

NUM_CLASSES = 5  # Stage 1-5
CLASS_OFFSET = 1  # Start from stage 1
TOP_K = 10
T_CONV = 0.15
T_VIT = 0.20

# 최적화 설정
WEIGHT_SEARCH_POINTS = 5  # 0.0, 0.25, 0.5, 0.75, 1.0
F1_THRESHOLD = 0.80  # Strong weight 임계값
TAU_THRESHOLD = 0.70  # Override 임계값


def ensure_dir(p: Path):
    p.mkdir(parents=True, exist_ok=True)


def enhance_image(img: Image.Image) -> Image.Image:
    img = ImageEnhance.Sharpness(img).enhance(1.05)
    img = ImageEnhance.Contrast(img).enhance(1.05)
    img = ImageEnhance.Brightness(img).enhance(1.03)
    img = ImageEnhance.Color(img).enhance(1.03)
    return img


def tf_vit():
    return T.Compose([
        T.Resize(224, interpolation=T.InterpolationMode.BICUBIC),
        T.CenterCrop(224),
        T.ToTensor(),
        T.Normalize((0.485,0.456,0.406),(0.229,0.224,0.225)),
    ])


def tf_conv():
    return T.Compose([
        T.Resize(384, interpolation=T.InterpolationMode.BICUBIC),
        T.CenterCrop(384),
        T.ToTensor(),
        T.Normalize((0.485,0.456,0.406),(0.229,0.224,0.225)),
    ])


def load_models(device: str = "cpu"):
    vit = timm.create_model("vit_small_patch16_224", pretrained=True, num_classes=0, global_pool="avg").eval().to(device)
    conv = timm.create_model("convnext_large.fb_in22k_ft_in1k_384", pretrained=True, num_classes=0, global_pool="avg").eval().to(device)
    return vit, conv


def embed(img: Image.Image, model, transform) -> np.ndarray:
    if img.mode != "RGB":
        img = img.convert("RGB")
    img = enhance_image(img)
    x = transform(img).unsqueeze(0)
    with torch.no_grad():
        z = model(x).cpu().numpy()[0]
    z = z / (np.linalg.norm(z) + 1e-12)
    return z


def knn_to_probs(matches: List[Dict], num_classes=NUM_CLASSES, T=0.20) -> np.ndarray:
    if not matches:
        return np.zeros(num_classes, dtype=float)
    sims = np.array([m["score"] for m in matches], float)
    w = np.exp(sims / T)
    w = w / (w.sum() + 1e-12)
    probs = np.zeros(num_classes, float)
    for wi, m in zip(w, matches):
        md = m.get("metadata", {})
        if "stage" in md:
            st = int(md["stage"])
        else:
            st = None
            for k in ("level", "class", "label"):
                v = md.get(k)
                if isinstance(v, str):
                    mm = re.search(r"(\d+)", v)
                    if mm:
                        st = int(mm.group(1))
                        break
            if st is None:
                src = m.get("id") or ""
                mm = re.search(r"(\d+)", str(src))
                st = int(mm.group(1)) if mm else 0
        if 1 <= st <= 5:  # Stage 1-5
            probs[st-CLASS_OFFSET] += wi
    s = probs.sum()
    return probs / s if s > 0 else probs


def predict_full_only(pc: Pinecone, idx_conv, idx_vit, img_path: Path, vit, conv, tf_v, tf_c) -> Tuple[np.ndarray, np.ndarray]:
    """Full embedding만 사용한 예측"""
    img = Image.open(img_path)
    vq = embed(img, vit, tf_v)
    cq = embed(img, conv, tf_c)

    # Full embedding으로 검색 (embedding_type="full" 필터링)
    r_v = idx_vit.query(
        vector=vq.tolist(),
        top_k=TOP_K,
        include_metadata=True,
        filter={"embedding_type": "full"}
    )
    r_c = idx_conv.query(
        vector=cq.tolist(),
        top_k=TOP_K,
        include_metadata=True,
        filter={"embedding_type": "full"}
    )

    p_v = knn_to_probs(r_v.get("matches", []), NUM_CLASSES, T=T_VIT)
    p_c = knn_to_probs(r_c.get("matches", []), NUM_CLASSES, T=T_CONV)
    return p_c, p_v


def collect_test_set(root: Path) -> List[Tuple[Path, int]]:
    """테스트 데이터 수집 (각 stage당 20개씩)"""
    items = []
    if not root.exists():
        return items

    for stage in range(1, 6):  # stage_1 ~ stage_5
        stage_dir = root / f"stage_{stage}"
        if not stage_dir.exists():
            continue

        stage_files = []
        for fp in stage_dir.iterdir():
            if fp.is_file() and fp.suffix.lower() in ['.jpg', '.jpeg', '.png']:
                stage_files.append(fp)

        # 각 stage당 20개씩 선택
        if len(stage_files) >= 20:
            selected = stage_files[:20]
        else:
            selected = stage_files

        for fp in selected:
            items.append((fp, stage))

        print(f"Stage {stage}: {len(selected)}개 선택")

    return items


def process_single_image(args):
    """단일 이미지 처리 (병렬 처리용)"""
    fp, stage, w_conv, w_vit, idx_conv, idx_vit, vit, conv, tf_v, tf_c = args
    try:
        p_c, p_v = predict_full_only(None, idx_conv, idx_vit, fp, vit, conv, tf_v, tf_c)

        # 앙상블 결합
        P_ens = w_conv * p_c + w_vit * p_v
        pred = int(np.argmax(P_ens)) + CLASS_OFFSET

        class_idx = stage - CLASS_OFFSET

        return {
            "success": True,
            "y_true": stage - CLASS_OFFSET,
            "y_pred": pred - CLASS_OFFSET,
            "class_idx": class_idx,
            "p_c": p_c[class_idx],
            "p_v": p_v[class_idx]
        }
    except Exception as e:
        return {"success": False, "error": str(e), "fp": fp}


def evaluate_ensemble(items: List[Tuple[Path, int]], w_conv: np.ndarray, w_vit: np.ndarray,
                     pc: Pinecone, idx_conv, idx_vit, vit, conv, tf_v, tf_c) -> Dict:
    """앙상블 성능 평가 (병렬 처리)"""
    y_true = []
    y_pred = []
    stage_probs = {i: {"conv": [], "vit": [], "true": []} for i in range(NUM_CLASSES)}

    # 병렬 처리를 위한 인자 준비
    args_list = [(fp, stage, w_conv, w_vit, idx_conv, idx_vit, vit, conv, tf_v, tf_c)
                 for fp, stage in items]

    # 병렬 처리 실행 (max_workers=10으로 동시에 10개 처리)
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(process_single_image, args) for args in args_list]

        for future in as_completed(futures):
            result = future.result()
            if result["success"]:
                y_true.append(result["y_true"])
                y_pred.append(result["y_pred"])

                class_idx = result["class_idx"]
                stage_probs[class_idx]["conv"].append(result["p_c"])
                stage_probs[class_idx]["vit"].append(result["p_v"])
                stage_probs[class_idx]["true"].append(1)
            else:
                print(f"Error processing {result.get('fp')}: {result.get('error')}")

    if not y_true:
        return {"accuracy": 0, "f1": 0, "stage_metrics": {}}

    accuracy = accuracy_score(y_true, y_pred)
    _, _, f1_weighted, _ = precision_recall_fscore_support(y_true, y_pred, average='weighted', zero_division=0)

    # 클래스별 F1 스코어 계산
    _, _, f1_per_class, _ = precision_recall_fscore_support(y_true, y_pred, labels=list(range(NUM_CLASSES)), average=None, zero_division=0)

    return {
        "accuracy": accuracy,
        "f1": f1_weighted,
        "f1_per_class": f1_per_class.tolist(),
        "stage_probs": stage_probs,
        "y_true": y_true,
        "y_pred": y_pred
    }


def optimize_weights(items: List[Tuple[Path, int]], pc: Pinecone, idx_conv, idx_vit, vit, conv, tf_v, tf_c) -> Dict:
    """Per-class 가중치 최적화"""
    print("Per-class 가중치 최적화 시작...")

    best_weights = {"conv": [0.5] * NUM_CLASSES, "vit": [0.5] * NUM_CLASSES}
    best_f1 = {"conv": [0.0] * NUM_CLASSES, "vit": [0.0] * NUM_CLASSES}
    best_strong = {"conv": [0] * NUM_CLASSES, "vit": [0] * NUM_CLASSES}
    best_tau = {"conv": [0.0] * NUM_CLASSES, "vit": [0.0] * NUM_CLASSES}

    search_points = np.linspace(0.0, 1.0, WEIGHT_SEARCH_POINTS)

    for class_idx in range(NUM_CLASSES):
        print(f"\nStage {class_idx + CLASS_OFFSET} 최적화 중...")
        best_class_f1 = 0.0
        best_conv_w = 0.5
        best_vit_w = 0.5

        # 그리드 서치
        for conv_w in search_points:
            vit_w = 1.0 - conv_w

            # 임시 가중치 설정
            temp_w_conv = np.array(best_weights["conv"])
            temp_w_vit = np.array(best_weights["vit"])
            temp_w_conv[class_idx] = conv_w
            temp_w_vit[class_idx] = vit_w

            # 평가
            result = evaluate_ensemble(items, temp_w_conv, temp_w_vit, pc, idx_conv, idx_vit, vit, conv, tf_v, tf_c)
            class_f1 = result["f1_per_class"][class_idx]

            if class_f1 > best_class_f1:
                best_class_f1 = class_f1
                best_conv_w = conv_w
                best_vit_w = vit_w

        # 최적 가중치 저장
        best_weights["conv"][class_idx] = best_conv_w
        best_weights["vit"][class_idx] = best_vit_w
        best_f1["conv"][class_idx] = best_class_f1
        best_f1["vit"][class_idx] = best_class_f1

        # Strong weight 및 tau 값 결정
        if best_class_f1 >= F1_THRESHOLD:
            if best_conv_w > best_vit_w:
                best_strong["conv"][class_idx] = 1
                best_tau["conv"][class_idx] = TAU_THRESHOLD
            else:
                best_strong["vit"][class_idx] = 1
                best_tau["vit"][class_idx] = TAU_THRESHOLD

        print(f"  Stage {class_idx + CLASS_OFFSET}: conv={best_conv_w:.3f}, vit={best_vit_w:.3f}, F1={best_class_f1:.3f}")

    return {
        "weights": best_weights,
        "f1": best_f1,
        "strong": best_strong,
        "tau": best_tau
    }


def main():
    import sys
    print("Female Hair Loss Ensemble Weight Optimizer (Full-only)")
    sys.stdout.flush()
    print("=" * 60)
    sys.stdout.flush()

    # 환경 설정
    print("Loading .env...")
    sys.stdout.flush()
    load_dotenv(ENV_PATH)
    print("Connecting to Pinecone...")
    sys.stdout.flush()
    pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
    print("Accessing indexes...")
    sys.stdout.flush()
    idx_conv = pc.Index(INDEX_CONV)
    idx_vit = pc.Index(INDEX_VIT)

    print("Loading models (this will take time)...")
    sys.stdout.flush()
    device = "cpu"
    vit, conv = load_models(device)
    print("Models loaded!")
    sys.stdout.flush()
    tf_v, tf_c = tf_vit(), tf_conv()

    # 테스트 데이터 수집
    print("Collecting test data...")
    sys.stdout.flush()
    test_items = collect_test_set(TEST_ROOT)
    if not test_items:
        print(f"[ERROR] 테스트 데이터가 없습니다: {TEST_ROOT}")
        return

    print(f"총 테스트 이미지: {len(test_items)}개")
    sys.stdout.flush()

    # 가중치 최적화
    start_time = time.time()
    config = optimize_weights(test_items, pc, idx_conv, idx_vit, vit, conv, tf_v, tf_c)
    optimization_time = time.time() - start_time

    # 최종 평가
    print("\n최종 앙상블 성능 평가...")
    final_result = evaluate_ensemble(
        test_items,
        np.array(config["weights"]["conv"]),
        np.array(config["weights"]["vit"]),
        pc, idx_conv, idx_vit, vit, conv, tf_v, tf_c
    )

    # 결과 저장
    ensure_dir(WEIGHT_SAVE_PATH)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    # 가중치 설정 파일 저장
    ensemble_config = {
        "index_conv": INDEX_CONV,
        "index_vit": INDEX_VIT,
        "top_k": TOP_K,
        "Tconv": T_CONV,
        "Tvit": T_VIT,
        "override": True,
        "method": "full_only",
        "config": config
    }

    config_path = WEIGHT_SAVE_PATH / "ensemble_config.json"
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(ensemble_config, f, ensure_ascii=False, indent=2)

    # 상세 보고서 생성
    report_dir = WEIGHT_SAVE_PATH / f"report_{timestamp}"
    ensure_dir(report_dir)

    # 보고서 작성
    with open(report_dir / "optimization_report.txt", "w", encoding="utf-8") as f:
        f.write("=" * 80 + "\n")
        f.write("Female Hair Loss Ensemble Weight Optimization Report (Full-only)\n")
        f.write("=" * 80 + "\n")
        f.write(f"생성 일시: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"테스트 데이터: {TEST_ROOT}\n")
        f.write(f"방법: Full embedding만 사용\n")
        f.write(f"최적화 시간: {optimization_time:.1f}초\n\n")

        f.write("📊 최종 성능\n")
        f.write("-" * 40 + "\n")
        f.write(f"전체 정확도: {final_result['accuracy']:.3f}\n")
        f.write(f"가중 F1-Score: {final_result['f1']:.3f}\n\n")

        f.write("⚖️ 최적화된 가중치\n")
        f.write("-" * 40 + "\n")
        for i in range(NUM_CLASSES):
            stage = i + CLASS_OFFSET
            conv_w = config["weights"]["conv"][i]
            vit_w = config["weights"]["vit"][i]
            stage_f1 = config["f1"]["conv"][i]
            f.write(f"Stage {stage}: ConvNeXt={conv_w:.3f}, ViT={vit_w:.3f}, F1={stage_f1:.3f}\n")

        f.write("\n🎯 Strong Weight 설정\n")
        f.write("-" * 40 + "\n")
        strong_conv = [i+1 for i, x in enumerate(config["strong"]["conv"]) if x]
        strong_vit = [i+1 for i, x in enumerate(config["strong"]["vit"]) if x]
        f.write(f"ConvNeXt 강점 Stage: {strong_conv}\n")
        f.write(f"ViT 강점 Stage: {strong_vit}\n")

        f.write("\n🔧 Override 임계값 (τ)\n")
        f.write("-" * 40 + "\n")
        conv_thresholds = [f"Stage{i+1}:{config['tau']['conv'][i]:.2f}" for i in range(NUM_CLASSES) if config['tau']['conv'][i] > 0]
        vit_thresholds = [f"Stage{i+1}:{config['tau']['vit'][i]:.2f}" for i in range(NUM_CLASSES) if config['tau']['vit'][i] > 0]
        f.write(f"ConvNeXt: {conv_thresholds if conv_thresholds else 'None'}\n")
        f.write(f"ViT: {vit_thresholds if vit_thresholds else 'None'}\n")

        f.write("\n📈 Stage별 상세 성능\n")
        f.write("-" * 40 + "\n")
        for i in range(NUM_CLASSES):
            stage = i + CLASS_OFFSET
            stage_f1 = final_result["f1_per_class"][i]
            f.write(f"Stage {stage}: F1-Score = {stage_f1:.3f}\n")

    # 혼동 행렬 생성
    cm = confusion_matrix(final_result["y_true"], final_result["y_pred"], labels=list(range(NUM_CLASSES)))
    plt.figure(figsize=(10, 8))
    labels = [f"Stage {i+CLASS_OFFSET}" for i in range(NUM_CLASSES)]
    sns.heatmap(cm, annot=True, fmt='d', cmap='Greens', xticklabels=labels, yticklabels=labels)
    plt.title('Female Hair Loss Ensemble Confusion Matrix (Full-only)')
    plt.ylabel('True Stage')
    plt.xlabel('Predicted Stage')
    plt.tight_layout()
    plt.savefig(report_dir / "confusion_matrix.png", dpi=300, bbox_inches='tight')
    plt.close()

    # 성능 차트
    plt.figure(figsize=(10, 6))
    stage_f1s = final_result["f1_per_class"]
    stages = [f"Stage {i+CLASS_OFFSET}" for i in range(NUM_CLASSES)]
    bars = plt.bar(stages, stage_f1s, color='lightgreen')
    plt.ylim(0, 1)
    for bar, f1 in zip(bars, stage_f1s):
        plt.text(bar.get_x() + bar.get_width()/2, f1 + 0.01, f"{f1:.3f}", ha='center', va='bottom')
    plt.title('Female Hair Loss Per-Stage F1-Scores (Full-only)')
    plt.ylabel('F1-Score')
    plt.tight_layout()
    plt.savefig(report_dir / "stage_performance.png", dpi=300, bbox_inches='tight')
    plt.close()

    print(f"\n{'='*60}")
    print("Full 전용 앙상블 가중치 최적화 완료!")
    print(f"{'='*60}")
    print(f"최종 정확도: {final_result['accuracy']:.3f}")
    print(f"가중 F1-Score: {final_result['f1']:.3f}")
    print(f"가중치 저장: {config_path}")
    print(f"보고서 저장: {report_dir}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()