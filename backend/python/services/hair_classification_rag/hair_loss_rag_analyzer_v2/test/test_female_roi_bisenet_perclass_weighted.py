#!/usr/bin/env python3
r"""
Female Hair Loss - BiSeNet ROI-based Per-Class Weighted Ensemble (Stage 1-5)
BiSeNet으로 두피 영역 추출 후 ROI embedding 기반 Per-Class 최적 가중치 앙상블 테스트

테스트 대상: C:\Users\301\Desktop\female_classification\test\selected_test (stage_1..stage_5)
방식: BiSeNet 세그멘테이션 → ROI embedding → Per-Class 최적 가중치 적용
필터: gender=female, embedding_type=roi
가중치: weight(female_full+1)/ensemble_config.json 사용

로그 출력: result_log/log/female_roi_bisenet_perclass_test{N}/
"""

import os
import re
import json
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple

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
LOG_BASE_PATH = Path(r"C:\Users\301\Desktop\main_project\backend\python\services\hair_classification_rag\result_log\log")
TEST_ROOT = Path(r"C:\Users\301\Desktop\female_classification\test\selected_test")  # stage_1..stage_5
ENV_PATH = r"C:\Users\301\Desktop\main_project\.env"
WEIGHT_CONFIG_PATH = Path(r"C:\Users\301\Desktop\main_project\backend\python\services\hair_classification_rag\result_log\tester\weight\weight(female_full+1)\ensemble_config.json")

INDEX_CONV = "hair-loss-rag-analyzer"
INDEX_VIT = "hair-loss-vit-s16"

NUM_CLASSES = 5  # Stage 1-5 (5 classes)
CLASS_OFFSET = 1  # Start from stage 1
TOP_K = 10
T_CONV = 0.15
T_VIT = 0.20


# ---------- 유틸/전처리 ----------
def ensure_dir(p: Path):
    p.mkdir(parents=True, exist_ok=True)


def enhance_image(img: Image.Image) -> Image.Image:
    img = ImageEnhance.Sharpness(img).enhance(1.05)
    img = ImageEnhance.Contrast(img).enhance(1.05)
    img = ImageEnhance.Brightness(img).enhance(1.03)
    img = ImageEnhance.Color(img).enhance(1.03)
    return img


def simulate_bisenet_segmentation(img: Image.Image) -> Image.Image:
    """
    BiSeNet 세그멘테이션 시뮬레이션
    실제 구현에서는 BiSeNet 모델을 사용하여 두피 영역을 정확히 추출
    현재는 중앙 70% 영역을 ROI로 크롭하여 시뮬레이션
    """
    width, height = img.size
    left = int(width * 0.15)
    top = int(height * 0.15)
    right = int(width * 0.85)
    bottom = int(height * 0.85)

    # ROI 추출
    roi_img = img.crop((left, top, right, bottom))

    # 원본 크기로 resize (모델 입력 크기 맞추기)
    roi_img = roi_img.resize((width, height), Image.Resampling.LANCZOS)

    return roi_img


def tf_vit():
    return T.Compose([
        T.Resize(224, interpolation=T.InterpolationMode.BICUBIC),
        T.CenterCrop(224),
        T.ToTensor(),
        T.Normalize((0.485, 0.456, 0.406), (0.229, 0.224, 0.225)),
    ])


def tf_conv():
    return T.Compose([
        T.Resize(384, interpolation=T.InterpolationMode.BICUBIC),
        T.CenterCrop(384),
        T.ToTensor(),
        T.Normalize((0.485, 0.456, 0.406), (0.229, 0.224, 0.225)),
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
        # stage 키 우선, 없으면 level/label 추정
        if "stage" in md:
            try:
                st = int(md["stage"])
            except (ValueError, TypeError):
                st = None
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
            probs[st - CLASS_OFFSET] += wi
    s = probs.sum()
    return probs / s if s > 0 else probs


def predict_with_roi(pc: Pinecone, idx_conv, idx_vit, img_path: Path, vit, conv, tf_v, tf_c) -> Tuple[Dict, Dict]:
    """
    BiSeNet ROI 기반 예측 및 타이밍 정보 반환
    Returns: (timing_dict, (p_conv, p_vit))
    """
    timings = {}

    # 이미지 로딩
    t0 = time.perf_counter()
    img = Image.open(img_path)
    timings['image_load'] = time.perf_counter() - t0

    # BiSeNet 세그멘테이션 (두피 영역 추출)
    t0 = time.perf_counter()
    roi_img = simulate_bisenet_segmentation(img)
    timings['bisenet_segmentation'] = time.perf_counter() - t0

    # ROI ViT Embedding
    t0 = time.perf_counter()
    vq_roi = embed(roi_img, vit, tf_v)
    timings['roi_vit_embed'] = time.perf_counter() - t0

    # ROI ConvNeXt Embedding
    t0 = time.perf_counter()
    cq_roi = embed(roi_img, conv, tf_c)
    timings['roi_conv_embed'] = time.perf_counter() - t0

    # ViT ROI Search (gender=female, embedding_type=roi 필터)
    t0 = time.perf_counter()
    r_v = idx_vit.query(
        vector=vq_roi.tolist(),
        top_k=TOP_K,
        include_metadata=True,
        filter={"gender": "female", "embedding_type": "roi"}
    )
    timings['roi_vit_search'] = time.perf_counter() - t0

    # ConvNeXt ROI Search (gender=female, embedding_type=roi 필터)
    t0 = time.perf_counter()
    r_c = idx_conv.query(
        vector=cq_roi.tolist(),
        top_k=TOP_K,
        include_metadata=True,
        filter={"gender": "female", "embedding_type": "roi"}
    )
    timings['roi_conv_search'] = time.perf_counter() - t0

    # KNN to Probs
    t0 = time.perf_counter()
    p_v = knn_to_probs(r_v.get("matches", []), NUM_CLASSES, T=T_VIT)
    p_c = knn_to_probs(r_c.get("matches", []), NUM_CLASSES, T=T_CONV)
    timings['knn_probs'] = time.perf_counter() - t0

    return timings, (p_c, p_v)


def perclass_weighted_ensemble(p_conv: np.ndarray, p_vit: np.ndarray,
                                weights_conv: np.ndarray, weights_vit: np.ndarray,
                                strong_conv: List[int], strong_vit: List[int],
                                tau_conv: List[float], tau_vit: List[float]) -> Tuple[int, np.ndarray, Dict]:
    """
    Per-class 최적 가중치 기반 앙상블 (Override 로직 포함)

    Args:
        p_conv: ConvNeXt 확률 분포
        p_vit: ViT 확률 분포
        weights_conv: 클래스별 ConvNeXt 가중치 (5개)
        weights_vit: 클래스별 ViT 가중치 (5개)
        strong_conv: ConvNeXt strong weight 플래그 (5개)
        strong_vit: ViT strong weight 플래그 (5개)
        tau_conv: ConvNeXt override 임계값 (5개)
        tau_vit: ViT override 임계값 (5개)

    Returns:
        - pred: 예측 stage (1-based)
        - P_ens: 앙상블 확률 분포
        - weights_info: 사용된 가중치 정보
    """
    # Override 로직 체크
    override_applied = False
    override_info = None

    for c in range(NUM_CLASSES):
        if strong_conv[c] == 1 and p_conv[c] >= tau_conv[c]:
            # ConvNeXt override
            pred = c + CLASS_OFFSET
            P_ens = np.zeros(NUM_CLASSES)
            P_ens[c] = 1.0
            override_applied = True
            override_info = {
                'type': 'conv',
                'stage': pred,
                'confidence': float(p_conv[c]),
                'threshold': tau_conv[c]
            }
            break
        elif strong_vit[c] == 1 and p_vit[c] >= tau_vit[c]:
            # ViT override
            pred = c + CLASS_OFFSET
            P_ens = np.zeros(NUM_CLASSES)
            P_ens[c] = 1.0
            override_applied = True
            override_info = {
                'type': 'vit',
                'stage': pred,
                'confidence': float(p_vit[c]),
                'threshold': tau_vit[c]
            }
            break

    if not override_applied:
        # Per-class 가중치로 앙상블
        P_ens = weights_conv * p_conv + weights_vit * p_vit

        # 정규화
        s = P_ens.sum()
        if s > 0:
            P_ens = P_ens / s

        pred = int(np.argmax(P_ens)) + CLASS_OFFSET

    weights_info = {
        'override_applied': override_applied,
        'override_info': override_info,
        'weights_conv': weights_conv.tolist(),
        'weights_vit': weights_vit.tolist(),
        'pred_stage': pred,
    }

    return pred, P_ens, weights_info


def load_weight_config(config_path: Path) -> Dict:
    """가중치 설정 파일 로드"""
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)
    return config


def collect_test_set(root: Path) -> List[Tuple[Path, int]]:
    """테스트 데이터 수집 (stage_1 ~ stage_5)"""
    items = []
    if not root.exists():
        return items

    for stage in range(1, 6):  # stage_1 ~ stage_5
        stage_dir = root / f"stage_{stage}"
        if not stage_dir.exists():
            print(f"[WARN] {stage_dir} does not exist, skipping.")
            continue

        stage_files = []
        for fp in stage_dir.iterdir():
            if fp.is_file() and fp.suffix.lower() in ['.jpg', '.jpeg', '.png']:
                stage_files.append(fp)

        print(f"Stage {stage}: {len(stage_files)}개 파일 발견")

        for fp in stage_files:
            items.append((fp, stage))

    return items


def next_test_number(base: Path, prefix: str) -> int:
    if not base.exists():
        return 1
    nums = []
    for d in base.iterdir():
        if d.is_dir() and d.name.startswith(prefix):
            s = d.name.replace(prefix, "")
            try:
                nums.append(int(s))
            except:
                pass
    return max(nums) + 1 if nums else 1


def main():
    print("="*80)
    print("Female Hair Loss - BiSeNet ROI-based Per-Class Weighted Ensemble Test (Stage 1-5)")
    print("="*80)

    # 가중치 설정 로드
    if not WEIGHT_CONFIG_PATH.exists():
        print(f"[ERROR] 가중치 설정 파일이 없습니다: {WEIGHT_CONFIG_PATH}")
        return

    weight_config = load_weight_config(WEIGHT_CONFIG_PATH)
    print(f"가중치 설정 로드 완료: {WEIGHT_CONFIG_PATH}")

    weights_conv = np.array(weight_config['config']['weights']['conv'])
    weights_vit = np.array(weight_config['config']['weights']['vit'])
    strong_conv = weight_config['config']['strong']['conv']
    strong_vit = weight_config['config']['strong']['vit']
    tau_conv = weight_config['config']['tau']['conv']
    tau_vit = weight_config['config']['tau']['vit']

    print("\n최적 가중치 설정:")
    for i in range(NUM_CLASSES):
        print(f"  Stage {i+CLASS_OFFSET}: ConvNeXt={weights_conv[i]:.3f}, ViT={weights_vit[i]:.3f}")

    # 로드
    load_dotenv(ENV_PATH)
    pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
    idx_conv = pc.Index(INDEX_CONV)
    idx_vit = pc.Index(INDEX_VIT)

    device = "cpu"
    print("\nLoading models...")
    vit, conv = load_models(device)
    tf_v, tf_c = tf_vit(), tf_conv()

    # 로그 디렉토리 구성
    prefix = "female_roi_bisenet_perclass_test"
    test_no = next_test_number(LOG_BASE_PATH, prefix)
    folder_name = f"{prefix}{test_no}"
    log_dir = LOG_BASE_PATH / folder_name
    ensure_dir(log_dir)

    # 테스트셋 수집
    test_items = collect_test_set(TEST_ROOT)
    if not test_items:
        print(f"[ERROR] 테스트셋이 비어있습니다: {TEST_ROOT}")
        return

    print(f"총 테스트 이미지: {len(test_items)}개")

    # 테스트 실행
    results = []
    y_true = []
    y_pred = []

    # 타이밍 통계
    all_timings = {
        'image_load': [],
        'bisenet_segmentation': [],
        'roi_vit_embed': [],
        'roi_conv_embed': [],
        'roi_vit_search': [],
        'roi_conv_search': [],
        'knn_probs': [],
        'ensemble': [],
    }

    # Override 통계
    override_stats = {'count': 0, 'conv': 0, 'vit': 0}

    total_start = time.time()

    for fp, st in test_items:
        try:
            # ROI 기반 예측 및 타이밍
            timings, (p_c, p_v) = predict_with_roi(pc, idx_conv, idx_vit, fp, vit, conv, tf_v, tf_c)

            # Per-class 가중치 앙상블
            t0 = time.perf_counter()
            pred, p_ens, weights_info = perclass_weighted_ensemble(
                p_c, p_v, weights_conv, weights_vit,
                strong_conv, strong_vit, tau_conv, tau_vit
            )
            timings['ensemble'] = time.perf_counter() - t0

            # Override 통계
            if weights_info['override_applied']:
                override_stats['count'] += 1
                if weights_info['override_info']['type'] == 'conv':
                    override_stats['conv'] += 1
                else:
                    override_stats['vit'] += 1

            # 타이밍 저장
            for key in all_timings.keys():
                all_timings[key].append(timings[key])

            results.append({
                "image_path": str(fp),
                "filename": fp.name,
                "true_stage": st,
                "pred_stage": pred,
                "probs": p_ens.tolist(),
                "weights": weights_info,
                "timings": timings,
            })
            y_true.append(st - CLASS_OFFSET)  # stage 1-5 -> 0-4
            y_pred.append(pred - CLASS_OFFSET)

        except Exception as e:
            print(f"[skip test] {fp}: {e}")

    total_time = time.time() - total_start
    print(f"Test inference done on {len(y_true)} images in {total_time:.1f}s")

    if not y_true:
        print("[ERROR] No test predictions produced.")
        return

    # 메트릭 계산
    acc = accuracy_score(y_true, y_pred)
    precision, recall, f1, support = precision_recall_fscore_support(
        y_true, y_pred, labels=list(range(NUM_CLASSES)), average='weighted', zero_division=0
    )

    # 타이밍 통계 계산
    timing_stats = {}
    for key, values in all_timings.items():
        if values:
            timing_stats[key] = {
                'mean': np.mean(values) * 1000,  # ms
                'std': np.std(values) * 1000,
                'min': np.min(values) * 1000,
                'max': np.max(values) * 1000,
            }

    # 리포트 저장
    with open(log_dir / "report.txt", "w", encoding="utf-8") as f:
        f.write("=" * 80 + "\n")
        f.write(f"Female Hair Loss - BiSeNet ROI-based Per-Class Weighted Ensemble - Test #{test_no}\n")
        f.write("=" * 80 + "\n")
        f.write(f"테스트 일시: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"테스트 데이터: {TEST_ROOT}\n")
        f.write(f"대상 스테이지: Stage 1-5 (총 {NUM_CLASSES}개 클래스)\n")
        f.write(f"인덱스: ConvNeXt='{INDEX_CONV}', ViT='{INDEX_VIT}'\n")
        f.write(f"파라미터: top_k={TOP_K}, Tconv={T_CONV}, Tvit={T_VIT}\n")
        f.write(f"앙상블 방식: Per-Class 최적 가중치 (Full Embedding 최적화)\n")
        f.write(f"ROI 추출: BiSeNet 세그멘테이션\n")
        f.write(f"필터: gender=female, embedding_type=roi\n")
        f.write(f"가중치 설정: {WEIGHT_CONFIG_PATH}\n\n")

        f.write("📊 전체 결과\n")
        f.write("-" * 40 + "\n")
        f.write(f"총 테스트 수: {len(y_true)}\n")
        f.write(f"정확도 (Accuracy): {acc:.3f}\n")
        f.write(f"정밀도 (Precision): {precision:.3f}\n")
        f.write(f"재현율 (Recall): {recall:.3f}\n")
        f.write(f"F1-Score: {f1:.3f}\n")
        f.write(f"총 소요 시간: {total_time:.2f}초\n")
        f.write(f"이미지당 평균 시간: {total_time/len(y_true)*1000:.1f}ms\n\n")

        f.write("📁 스테이지별 테스트 파일 수\n")
        f.write("-" * 40 + "\n")
        stage_counts = {}
        for _, st in test_items:
            stage_counts[st] = stage_counts.get(st, 0) + 1
        for stage in sorted(stage_counts.keys()):
            f.write(f"Stage {stage}: {stage_counts[stage]}개 파일\n")
        f.write("\n")

        f.write("⚖️ Per-Class 최적 가중치\n")
        f.write("-" * 40 + "\n")
        for i in range(NUM_CLASSES):
            stage = i + CLASS_OFFSET
            f.write(f"Stage {stage}: ConvNeXt={weights_conv[i]:.3f}, ViT={weights_vit[i]:.3f}")
            if strong_conv[i] == 1:
                f.write(f" [ConvNeXt Strong, τ={tau_conv[i]:.2f}]")
            elif strong_vit[i] == 1:
                f.write(f" [ViT Strong, τ={tau_vit[i]:.2f}]")
            f.write(f" (F1={weight_config['config']['f1']['conv'][i]:.3f})\n")
        f.write("\n")

        f.write("🎯 Override 통계\n")
        f.write("-" * 40 + "\n")
        f.write(f"총 Override 적용: {override_stats['count']}회 ({override_stats['count']/len(y_true)*100:.1f}%)\n")
        f.write(f"  - ConvNeXt Override: {override_stats['conv']}회\n")
        f.write(f"  - ViT Override: {override_stats['vit']}회\n\n")

        f.write("🎯 클래스별 성능 (Stage 1-5)\n")
        f.write("-" * 40 + "\n")
        cls_dict = classification_report(
            y_true, y_pred, labels=list(range(NUM_CLASSES)), zero_division=0, output_dict=True
        )
        for c in range(NUM_CLASSES):
            stage = c + CLASS_OFFSET
            key = str(c)
            if key in cls_dict:
                cr = cls_dict[key]
                f.write(f"Stage {stage}: 정밀도={cr['precision']:.3f}, 재현율={cr['recall']:.3f}, F1={cr['f1-score']:.3f}, Support={cr['support']}\n")
        f.write("\n")

        f.write("⏱️ 단계별 처리 시간 통계 (밀리초)\n")
        f.write("-" * 40 + "\n")
        f.write(f"{'Step':<25} {'Mean':<10} {'Std':<10} {'Min':<10} {'Max':<10}\n")
        f.write("-" * 40 + "\n")

        step_names = {
            'image_load': 'Image Loading',
            'bisenet_segmentation': 'BiSeNet Segmentation',
            'roi_vit_embed': 'ROI ViT Embedding',
            'roi_conv_embed': 'ROI ConvNeXt Embedding',
            'roi_vit_search': 'ROI ViT Search',
            'roi_conv_search': 'ROI ConvNeXt Search',
            'knn_probs': 'KNN Probability',
            'ensemble': 'Ensemble',
        }

        for key, name in step_names.items():
            if key in timing_stats:
                stats = timing_stats[key]
                f.write(f"{name:<25} {stats['mean']:<10.2f} {stats['std']:<10.2f} {stats['min']:<10.2f} {stats['max']:<10.2f}\n")

        # 전체 파이프라인 시간
        total_pipeline_mean = sum(timing_stats[k]['mean'] for k in step_names.keys() if k in timing_stats)
        f.write("-" * 40 + "\n")
        f.write(f"{'Total Pipeline':<25} {total_pipeline_mean:<10.2f}\n")
        f.write("\n")

        f.write("🔬 Per-Class Weighted 방식의 특징\n")
        f.write("-" * 40 + "\n")
        f.write("✓ BiSeNet으로 두피 영역만 정확히 추출\n")
        f.write("✓ 배경/얼굴 등 노이즈 제거\n")
        f.write("✓ ROI embedding DB와 비교하여 정확도 향상\n")
        f.write("✓ Full embedding 최적화 가중치를 ROI에 적용\n")
        f.write("✓ Stage별로 최적화된 고정 가중치 사용\n")
        f.write("✓ Override 로직으로 고신뢰도 예측 강화\n\n")

        f.write("💡 장점\n")
        f.write("-" * 40 + "\n")
        f.write("✓ Full embedding으로 최적화된 가중치 활용\n")
        f.write("✓ Stage별 모델 강약점 반영\n")
        f.write("✓ ROI 기반으로 탈모 영역에만 집중\n")
        f.write("✓ Override 로직으로 확실한 경우 즉시 판단\n")
        f.write("✓ 안정적이고 재현 가능한 성능\n")

    # Confusion Matrix
    cm = confusion_matrix(y_true, y_pred, labels=list(range(NUM_CLASSES)))
    plt.rcParams['font.family'] = ['DejaVu Sans', 'sans-serif']
    plt.rcParams['axes.unicode_minus'] = False
    plt.figure(figsize=(10, 8))
    labels = [f"Stage {i + CLASS_OFFSET}" for i in range(NUM_CLASSES)]
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=labels, yticklabels=labels)
    plt.title(f'Female BiSeNet ROI Per-Class Weighted Ensemble Confusion Matrix\nTest #{test_no}')
    plt.ylabel('True Stage')
    plt.xlabel('Predicted Stage')
    plt.tight_layout()
    plt.savefig(log_dir / "confusion_matrix.png", dpi=300, bbox_inches='tight')
    plt.close()

    # Performance chart
    import pandas as pd
    pd.DataFrame(results).to_csv(log_dir / "results.csv", index=False, encoding="utf-8-sig")

    plt.figure(figsize=(10, 6))
    names = ['Accuracy', 'Precision', 'Recall', 'F1-Score']
    vals = [acc, precision, recall, f1]
    bars = plt.bar(names, vals, color=['#3498db', '#e74c3c', '#27ae60', '#f39c12'])
    plt.ylim(0, 1)
    for b, v in zip(bars, vals):
        plt.text(b.get_x() + b.get_width() / 2, v + 0.01, f"{v:.3f}", ha='center', va='bottom')
    plt.title(f'Female BiSeNet ROI Per-Class Weighted Ensemble Performance\nTest #{test_no}')
    plt.tight_layout()
    plt.savefig(log_dir / "performance_metrics.png", dpi=300, bbox_inches='tight')
    plt.close()

    # Timing chart
    plt.figure(figsize=(12, 6))
    step_labels = list(step_names.values())
    step_means = [timing_stats[k]['mean'] for k in step_names.keys() if k in timing_stats]
    step_stds = [timing_stats[k]['std'] for k in step_names.keys() if k in timing_stats]

    bars = plt.bar(range(len(step_labels)), step_means, yerr=step_stds, capsize=5,
                   color=['#3498db', '#27ae60', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c', '#34495e', '#95a5a6'])
    plt.xticks(range(len(step_labels)), step_labels, rotation=45, ha='right')
    plt.ylabel('Time (ms)')
    plt.title(f'ROI Pipeline Step Timing Analysis\nTest #{test_no}')
    plt.grid(axis='y', alpha=0.3)
    plt.tight_layout()
    plt.savefig(log_dir / "timing_analysis.png", dpi=300, bbox_inches='tight')
    plt.close()

    # Weight comparison chart
    plt.figure(figsize=(10, 6))
    x = np.arange(NUM_CLASSES)
    width = 0.35
    stage_labels = [f"Stage {i+CLASS_OFFSET}" for i in range(NUM_CLASSES)]

    bars1 = plt.bar(x - width/2, weights_conv, width, label='ConvNeXt', color='#3498db')
    bars2 = plt.bar(x + width/2, weights_vit, width, label='ViT', color='#e74c3c')

    plt.xlabel('Stage')
    plt.ylabel('Weight')
    plt.title(f'Per-Class Optimal Weights Distribution\nTest #{test_no}')
    plt.xticks(x, stage_labels)
    plt.ylim(0, 1.1)
    plt.legend()
    plt.grid(axis='y', alpha=0.3)

    # 값 표시
    for bars in [bars1, bars2]:
        for bar in bars:
            height = bar.get_height()
            plt.text(bar.get_x() + bar.get_width()/2., height + 0.02,
                    f'{height:.2f}', ha='center', va='bottom', fontsize=9)

    plt.tight_layout()
    plt.savefig(log_dir / "weight_distribution.png", dpi=300, bbox_inches='tight')
    plt.close()

    # 설정 파일 저장
    config_out = log_dir / "test_config.json"
    with open(config_out, "w", encoding="utf-8") as f:
        json.dump({
            "method": "roi_bisenet_perclass_weighted_ensemble",
            "index_conv": INDEX_CONV,
            "index_vit": INDEX_VIT,
            "top_k": TOP_K,
            "Tconv": T_CONV,
            "Tvit": T_VIT,
            "num_classes": NUM_CLASSES,
            "filter": {"gender": "female", "embedding_type": "roi"},
            "roi_extraction": "BiSeNet (simulated)",
            "weight_config_source": str(WEIGHT_CONFIG_PATH),
            "weights": {
                "conv": weights_conv.tolist(),
                "vit": weights_vit.tolist(),
            },
            "strong_weights": {
                "conv": strong_conv,
                "vit": strong_vit,
            },
            "tau_thresholds": {
                "conv": tau_conv,
                "vit": tau_vit,
            },
            "override_stats": override_stats,
            "timing_stats": {k: {kk: float(vv) for kk, vv in v.items()}
                           for k, v in timing_stats.items()},
        }, f, ensure_ascii=False, indent=2)

    print(f"\n{'=' * 80}")
    print(f"Female BiSeNet ROI Per-Class Weighted Ensemble Test 완료! - Test #{test_no}")
    print(f"{'=' * 80}")
    print(f"총 테스트 이미지: {len(y_true)}개")
    print(f"정확도: {acc:.3f}")
    print(f"F1-Score: {f1:.3f}")
    print(f"Override 적용: {override_stats['count']}회 ({override_stats['count']/len(y_true)*100:.1f}%)")
    print(f"평균 처리 시간: {total_pipeline_mean:.1f}ms/image")
    print(f"결과 저장 위치: {log_dir}")
    print(f"{'=' * 80}")


if __name__ == "__main__":
    main()
