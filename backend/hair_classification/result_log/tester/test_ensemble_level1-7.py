#!/usr/bin/env python3
r"""
ConvNeXt + ViT-S/16 앙상블 (Level 1-7 전용)
Per-class 가중 소프트보팅 + 선택적 오버라이드

테스트 대상: C:\Users\301\Desktop\classification_test (level_1..level_7)
가중치 로드: 기존 저장된 ensemble_config.json 사용

로그 출력: result_log/log/ensemble_level1-7_test{N}/
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
THIS_DIR = Path(__file__).parent
LOG_BASE_PATH = Path(r"C:\Users\301\Desktop\main_project\backend\hair_classification\result_log\log")

TEST_ROOT = Path(r"C:\Users\301\Desktop\classification_test")  # level_1..level_7
ENV_PATH = r"C:\Users\301\Desktop\main_project\.env"

INDEX_CONV = "hair-loss-rag-analyzer"
INDEX_VIT = "hair-loss-vit-s16"

NUM_CLASSES = 7  # Level 1-7 (7 classes)
CLASS_OFFSET = 1  # Start from level 1
TOP_K = 10
T_CONV = 0.15
T_VIT = 0.20
USE_OVERRIDE = True


def detect_viewpoint_from_filename(filename: str) -> str:
    """파일명에서 뷰포인트 추정 (개선된 하이픈 패턴 인식)"""
    filename_lower = filename.lower()
    # 하이픈 패턴 우선 확인
    if '-left' in filename_lower or '_left_' in filename_lower:
        return 'left'
    elif '-right' in filename_lower or '_right_' in filename_lower:
        return 'right'
    elif '-top' in filename_lower or 'top-down' in filename_lower or '_t_' in filename_lower:
        return 'top-down'
    elif '-front' in filename_lower or '_front_' in filename_lower:
        return 'front'
    elif '-back' in filename_lower or '_back_' in filename_lower:
        return 'back'
    # 기존 일반 패턴 (하이픈 없는 경우)
    elif 'left' in filename_lower or '_l_' in filename_lower:
        return 'left'
    elif 'right' in filename_lower or '_r_' in filename_lower:
        return 'right'
    elif 'top' in filename_lower or 'down' in filename_lower:
        return 'top-down'
    elif 'front' in filename_lower or '_f_' in filename_lower:
        return 'front'
    elif 'back' in filename_lower or '_b_' in filename_lower:
        return 'back'
    else:
        return 'unknown'


# ---------- 유틸/전처리 ----------
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
        # stage 키 우선, 없으면 level/label 추정
        if "stage" in md:
            st = int(md["stage"])  # 1..7
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
        if 1 <= st <= 7:  # Level 1-7
            probs[st-CLASS_OFFSET] += wi
    s = probs.sum()
    return probs / s if s > 0 else probs


def predict_both(pc: Pinecone, idx_conv, idx_vit, img_path: Path, vit, conv, tf_v, tf_c) -> Tuple[np.ndarray, np.ndarray]:
    img = Image.open(img_path)
    vq = embed(img, vit, tf_v)
    cq = embed(img, conv, tf_c)
    r_v = idx_vit.query(vector=vq.tolist(), top_k=TOP_K, include_metadata=True)
    r_c = idx_conv.query(vector=cq.tolist(), top_k=TOP_K, include_metadata=True)
    p_v = knn_to_probs(r_v.get("matches", []), NUM_CLASSES, T=T_VIT)
    p_c = knn_to_probs(r_c.get("matches", []), NUM_CLASSES, T=T_CONV)
    return p_c, p_v


def collect_test_set(root: Path) -> List[Tuple[Path, int]]:
    items = []
    seen_files = set()  # 중복 제거용
    if not root.exists():
        return items
    for child in sorted(root.iterdir()):
        if not child.is_dir():
            continue
        if child.name.lower().startswith("pick"):
            continue
        mm = re.search(r"level[_-]?(\d+)", child.name, re.IGNORECASE)
        if not mm:
            continue
        st = int(mm.group(1))
        if not (1 <= st <= 7):  # Level 1-7
            continue
        print(f"Processing {child.name} (level {st})")
        level_count = 0
        # 모든 이미지 파일 찾기 (한 번에)
        for fp in child.iterdir():
            if fp.is_file() and fp.suffix.lower() in ['.jpg', '.jpeg', '.png']:
                if "pick" in fp.parts:
                    continue
                # 중복 제거
                if fp not in seen_files:
                    seen_files.add(fp)
                    items.append((fp, st))
                    level_count += 1
        print(f"  -> {level_count} files added")
    return items


def apply_ensemble(p_conv: np.ndarray, p_vit: np.ndarray, cfg: Dict) -> Tuple[int, np.ndarray]:
    # Level 1-7에 해당하는 가중치 모두 사용
    w_conv = np.array(cfg["weights"]["conv"][0:7], float)  # index 0-6 (level 1-7)
    w_vit = np.array(cfg["weights"]["vit"][0:7], float)
    P_ens = w_conv * p_conv + w_vit * p_vit

    if USE_OVERRIDE:
        strong_c = np.array(cfg["strong"]["conv"][0:7], int)
        strong_v = np.array(cfg["strong"]["vit"][0:7], int)
        tau_c = np.array(cfg["tau"]["conv"][0:7], float)
        tau_v = np.array(cfg["tau"]["vit"][0:7], float)

        for c in range(NUM_CLASSES):
            if strong_c[c] and p_conv[c] >= tau_c[c] and tau_c[c] > 0:
                P_ens[c] = p_conv[c]
            if strong_v[c] and p_vit[c] >= tau_v[c] and tau_v[c] > 0:
                P_ens[c] = p_vit[c]

    s = P_ens.sum()
    if s > 0:
        P_ens = P_ens / s
    pred = int(np.argmax(P_ens)) + CLASS_OFFSET  # level 1-7 indexing
    return pred, P_ens


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


def analyze_large_deviations(results: List[Dict]) -> Dict:
    """2단계 이상 벗어난 테스트 분석"""
    large_deviations = []

    for result in results:
        true_level = result['true_stage']
        pred_level = result['pred_stage']
        deviation = abs(true_level - pred_level)

        if deviation >= 2:
            large_deviations.append({
                'filename': result['filename'],
                'true_level': true_level,
                'pred_level': pred_level,
                'deviation': deviation,
                'viewpoint': result.get('viewpoint', 'unknown'),
                'probs': result['probs']
            })

    # 편차별 통계
    deviation_stats = {}
    viewpoint_deviations = {}

    for dev in large_deviations:
        # 편차별 통계
        d = dev['deviation']
        if d not in deviation_stats:
            deviation_stats[d] = 0
        deviation_stats[d] += 1

        # 뷰포인트별 큰 편차 통계
        vp = dev['viewpoint']
        if vp not in viewpoint_deviations:
            viewpoint_deviations[vp] = 0
        viewpoint_deviations[vp] += 1

    return {
        'large_deviations': large_deviations,
        'total_large_deviations': len(large_deviations),
        'deviation_stats': deviation_stats,
        'viewpoint_deviations': viewpoint_deviations
    }


def map_to_norwood_4stage(level: int) -> int:
    """7단계 레벨을 4단계 노우드 스케일로 변환"""
    if level == 1:
        return 0  # 0단계: 노우드 1레벨
    elif 2 <= level <= 3:
        return 1  # 1단계: 노우드 2~3레벨
    elif 4 <= level <= 5:
        return 2  # 2단계: 노우드 4~5레벨
    elif 6 <= level <= 7:
        return 3  # 3단계: 노우드 6~7레벨
    else:
        return 0


def calculate_norwood_4stage_metrics(results: List[Dict]) -> Dict:
    """4단계 노우드 분류 성능 계산"""
    y_true_4stage = []
    y_pred_4stage = []

    for result in results:
        true_4stage = map_to_norwood_4stage(result['true_stage'])
        pred_4stage = map_to_norwood_4stage(result['pred_stage'])
        y_true_4stage.append(true_4stage)
        y_pred_4stage.append(pred_4stage)

    acc_4stage = accuracy_score(y_true_4stage, y_pred_4stage)
    precision_4stage, recall_4stage, f1_4stage, _ = precision_recall_fscore_support(
        y_true_4stage, y_pred_4stage, labels=list(range(4)), average='weighted', zero_division=0
    )

    # 4단계별 상세 성능
    cls_report_4stage = classification_report(
        y_true_4stage, y_pred_4stage, labels=list(range(4)), zero_division=0, output_dict=True
    )

    return {
        'y_true_4stage': y_true_4stage,
        'y_pred_4stage': y_pred_4stage,
        'accuracy': acc_4stage,
        'precision': precision_4stage,
        'recall': recall_4stage,
        'f1': f1_4stage,
        'classification_report': cls_report_4stage
    }


def calculate_viewpoint_stats(results: List[Dict]) -> Dict:
    """뷰포인트별 통계 계산"""
    viewpoint_stats = {}

    for result in results:
        vp = result.get('viewpoint', 'unknown')
        if vp not in viewpoint_stats:
            viewpoint_stats[vp] = {'correct': 0, 'total': 0, 'true_stages': [], 'pred_stages': []}

        viewpoint_stats[vp]['total'] += 1
        viewpoint_stats[vp]['true_stages'].append(result['true_stage'] - CLASS_OFFSET)
        viewpoint_stats[vp]['pred_stages'].append(result['pred_stage'] - CLASS_OFFSET)

        if result['true_stage'] == result['pred_stage']:
            viewpoint_stats[vp]['correct'] += 1

    # 각 뷰포인트별 메트릭 계산
    for vp in viewpoint_stats:
        if viewpoint_stats[vp]['total'] > 0:
            y_true = viewpoint_stats[vp]['true_stages']
            y_pred = viewpoint_stats[vp]['pred_stages']

            accuracy = viewpoint_stats[vp]['correct'] / viewpoint_stats[vp]['total']
            precision, recall, f1, _ = precision_recall_fscore_support(
                y_true, y_pred, labels=list(range(NUM_CLASSES)), average='weighted', zero_division=0
            )

            viewpoint_stats[vp].update({
                'accuracy': accuracy,
                'precision': precision,
                'recall': recall,
                'f1': f1
            })

    return viewpoint_stats


def main():
    # 로드
    load_dotenv(ENV_PATH)
    pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
    idx_conv = pc.Index(INDEX_CONV)
    idx_vit = pc.Index(INDEX_VIT)

    device = "cpu"
    vit, conv = load_models(device)
    tf_v, tf_c = tf_vit(), tf_conv()

    # 로그 디렉토리 구성
    prefix = "ensemble_level1-7_test"
    test_no = next_test_number(LOG_BASE_PATH, prefix)
    folder_name = f"{prefix}{test_no}"
    log_dir = LOG_BASE_PATH / folder_name
    ensure_dir(log_dir)

    # 기존 저장된 가중치 로드
    weight_config_path = Path(r"C:\Users\301\Desktop\main_project\backend\hair_classification\result_log\tester\weight\weight1(ensemble_per_class1_vit_s_16)\ensemble_config.json")

    if weight_config_path.exists():
        print(f"기존 가중치 로드: {weight_config_path}")
        with open(weight_config_path, "r", encoding="utf-8") as f:
            saved_config = json.load(f)
        cfg = saved_config["config"]
    else:
        print(f"[ERROR] 가중치 파일을 찾을 수 없습니다: {weight_config_path}")
        return

    # 테스트셋에서 최종 평가(level_1..level_7)
    test_items = collect_test_set(TEST_ROOT)
    if not test_items:
        print(f"[ERROR] 테스트셋이 비어있습니다: {TEST_ROOT}")
        return

    results = []
    y_true = []
    y_pred = []
    t0 = time.time()
    for fp, st in test_items:
        try:
            p_c, p_v = predict_both(pc, idx_conv, idx_vit, fp, vit, conv, tf_v, tf_c)
            pred, p_ens = apply_ensemble(p_c, p_v, cfg)

            # 뷰포인트 추정
            viewpoint = detect_viewpoint_from_filename(fp.name)

            results.append({
                "image_path": str(fp),
                "filename": fp.name,
                "true_stage": st,
                "pred_stage": pred,
                "probs": p_ens.tolist(),
                "viewpoint": viewpoint,
            })
            y_true.append(st-CLASS_OFFSET)  # level 1-7 -> 0-6
            y_pred.append(pred-CLASS_OFFSET)
        except Exception as e:
            print(f"[skip test] {fp}: {e}")
    dt = time.time()-t0
    print(f"Test inference done on {len(y_true)} images in {dt:.1f}s")

    if not y_true:
        print("[ERROR] No test predictions produced.")
        return

    acc = accuracy_score(y_true, y_pred)
    precision, recall, f1, support = precision_recall_fscore_support(y_true, y_pred, labels=list(range(NUM_CLASSES)), average='weighted', zero_division=0)

    # 뷰포인트별 통계 계산
    viewpoint_stats = calculate_viewpoint_stats(results)

    # 2단계 이상 편차 분석
    deviation_analysis = analyze_large_deviations(results)

    # 4단계 노우드 분류 성능 계산
    norwood_4stage_metrics = calculate_norwood_4stage_metrics(results)

    # 리포트 저장 (다른 테스터와 동일한 형식)
    with open(log_dir/"report.txt", "w", encoding="utf-8") as f:
        f.write("="*80+"\n")
        f.write(f"ConvNeXt+ViT Ensemble Test (Level 1-7) - Test #{test_no}\n")
        f.write("="*80+"\n")
        f.write(f"테스트 일시: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"테스트 데이터: {TEST_ROOT}\n")
        f.write(f"대상 레벨: Level 1-7 (총 {NUM_CLASSES}개 클래스)\n")
        f.write(f"인덱스: ConvNeXt='{INDEX_CONV}', ViT='{INDEX_VIT}'\n")
        f.write(f"파라미터: top_k={TOP_K}, Tconv={T_CONV}, Tvit={T_VIT}, override={USE_OVERRIDE}\n\n")

        f.write("📊 전체 결과\n")
        f.write("-"*40+"\n")
        f.write(f"총 테스트 수: {len(y_true)}\n")
        f.write(f"정확도 (Accuracy): {acc:.3f}\n")
        f.write(f"정밀도 (Precision): {precision:.3f}\n")
        f.write(f"재현율 (Recall): {recall:.3f}\n")
        f.write(f"F1-Score: {f1:.3f}\n\n")

        f.write("📁 레벨별 테스트 파일 수\n")
        f.write("-"*40+"\n")
        level_counts = {}
        for _, st in test_items:
            level_counts[st] = level_counts.get(st, 0) + 1
        for level in sorted(level_counts.keys()):
            f.write(f"레벨 {level}: {level_counts[level]}개 파일\n")
        f.write("\n")

        f.write("🎯 클래스별 성능 (Level 1-7)\n")
        f.write("-"*40+"\n")
        cls_dict = classification_report(y_true, y_pred, labels=list(range(NUM_CLASSES)), zero_division=0, output_dict=True)
        for c in range(NUM_CLASSES):
            level = c + CLASS_OFFSET
            key = str(c)
            if key in cls_dict:
                cr = cls_dict[key]
                f.write(f"레벨 {level}: 정밀도={cr['precision']:.3f}, 재현율={cr['recall']:.3f}, F1={cr['f1-score']:.3f}\n")
        f.write("\n")

        f.write("📐 뷰포인트별 통계 (전체)\n")
        f.write("-"*40+"\n")
        for vp, stats in viewpoint_stats.items():
            if stats['total'] > 0:
                f.write(f"{vp}: {stats['correct']}/{stats['total']} ({stats['accuracy']:.3f})\n")
        f.write("\n")

        f.write("🎯 주요 뷰포인트 상세 성능 (Right, Left, Top-down, Front, Back)\n")
        f.write("-"*40+"\n")
        for vp in ['right', 'left', 'top-down', 'front', 'back']:
            if vp in viewpoint_stats and viewpoint_stats[vp]['total'] > 0:
                stats = viewpoint_stats[vp]
                f.write(f"{vp.upper()}:\n")
                f.write(f"  정확도 (Accuracy): {stats['accuracy']:.3f}\n")
                f.write(f"  정밀도 (Precision): {stats['precision']:.3f}\n")
                f.write(f"  재현율 (Recall): {stats['recall']:.3f}\n")
                f.write(f"  F1-Score: {stats['f1']:.3f}\n")
                f.write(f"  테스트 수: {stats['total']}개\n\n")

        f.write("🚨 2단계 이상 편차 분석\n")
        f.write("-"*40+"\n")
        f.write(f"총 큰 편차 케이스: {deviation_analysis['total_large_deviations']}개\n")
        if deviation_analysis['total_large_deviations'] > 0:
            f.write(f"전체 테스트 대비 비율: {deviation_analysis['total_large_deviations']/len(results)*100:.1f}%\n")
            f.write("\n편차별 발생 건수:\n")
            for dev, count in sorted(deviation_analysis['deviation_stats'].items()):
                f.write(f"  {dev}단계 편차: {count}건\n")
            f.write("\n뷰포인트별 큰 편차 발생:\n")
            for vp, count in sorted(deviation_analysis['viewpoint_deviations'].items()):
                f.write(f"  {vp}: {count}건\n")
            f.write("\n큰 편차 케이스 상세 (편차 >= 2):\n")
            for i, case in enumerate(deviation_analysis['large_deviations'][:10], 1):  # 상위 10개만 표시
                f.write(f"  {i}. {case['filename']} | 정답:{case['true_level']} → 예측:{case['pred_level']} (편차:{case['deviation']}) | {case['viewpoint']}\n")
            if len(deviation_analysis['large_deviations']) > 10:
                f.write(f"  ... 외 {len(deviation_analysis['large_deviations'])-10}건\n")

            f.write("\n🔍 큰 편차 발생 원인 분석:\n")
            f.write("  - Front 뷰포인트: 정면 촬영시 헤어라인 판단의 어려움\n")
            f.write("  - 조명/각도: 그림자나 각도로 인한 탈모 정도 오인식\n")
            f.write("  - 헤어스타일: 스타일링으로 인한 실제 탈모 정도 은폐\n")
            f.write("  - 이미지 품질: 해상도나 선명도 부족으로 인한 오판\n")
        f.write("\n")

        f.write("📊 4단계 노우드 분류 성능\n")
        f.write("-"*40+"\n")
        f.write(f"4단계 정확도: {norwood_4stage_metrics['accuracy']:.3f}\n")
        f.write(f"4단계 정밀도: {norwood_4stage_metrics['precision']:.3f}\n")
        f.write(f"4단계 재현율: {norwood_4stage_metrics['recall']:.3f}\n")
        f.write(f"4단계 F1-Score: {norwood_4stage_metrics['f1']:.3f}\n")
        f.write("\n4단계별 상세 성능:\n")
        stage_names = ['0단계(Lv1)', '1단계(Lv2-3)', '2단계(Lv4-5)', '3단계(Lv6-7)']
        for i in range(4):
            key = str(i)
            if key in norwood_4stage_metrics['classification_report']:
                cr = norwood_4stage_metrics['classification_report'][key]
                f.write(f"  {stage_names[i]}: 정밀도={cr['precision']:.3f}, 재현율={cr['recall']:.3f}, F1={cr['f1-score']:.3f}\n")
        f.write("\n")

        f.write("⚖️ 앙상블 가중치 설정\n")
        f.write("-"*40+"\n")
        f.write("Per-class weights (ConvNeXt/ViT):\n")
        for c in range(NUM_CLASSES):
            level = c + CLASS_OFFSET
            f.write(f"  레벨 {level}: {cfg['weights']['conv'][c]:.3f} / {cfg['weights']['vit'][c]:.3f}\n")
        f.write("\n강점 모델 마스크:\n")
        f.write(f"  ConvNeXt 강점: {[i+1 for i, x in enumerate(cfg['strong']['conv']) if x]}\n")
        f.write(f"  ViT 강점: {[i+1 for i, x in enumerate(cfg['strong']['vit']) if x]}\n")
        f.write("\n오버라이드 임계값 (τ):\n")
        conv_thresholds = [f"레벨{i+1}:{cfg['tau']['conv'][i]:.2f}" for i in range(len(cfg['tau']['conv'])) if cfg['tau']['conv'][i] > 0]
        vit_thresholds = [f"레벨{i+1}:{cfg['tau']['vit'][i]:.2f}" for i in range(len(cfg['tau']['vit'])) if cfg['tau']['vit'][i] > 0]
        f.write(f"  ConvNeXt: {conv_thresholds if conv_thresholds else 'None'}\n")
        f.write(f"  ViT: {vit_thresholds if vit_thresholds else 'None'}\n")

    # Confusion Matrix (Level 1-7)
    cm = confusion_matrix(y_true, y_pred, labels=list(range(NUM_CLASSES)))
    plt.rcParams['font.family'] = ['DejaVu Sans', 'sans-serif']
    plt.rcParams['axes.unicode_minus'] = False
    plt.figure(figsize=(12,10))
    labels = [f"Level {i+CLASS_OFFSET}" for i in range(NUM_CLASSES)]  # Level 1-7
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=labels, yticklabels=labels)
    plt.title(f'ConvNeXt+ViT Ensemble Confusion Matrix (Level 1-7)\nTest #{test_no}')
    plt.ylabel('True Level')
    plt.xlabel('Predicted Level')
    plt.tight_layout()
    plt.savefig(log_dir/"confusion_matrix.png", dpi=300, bbox_inches='tight')
    plt.close()

    # Performance chart + CSV
    import pandas as pd
    pd.DataFrame(results).to_csv(log_dir/"results.csv", index=False, encoding="utf-8-sig")
    plt.figure(figsize=(10,6))
    names = ['Accuracy','Precision','Recall','F1-Score']
    vals = [acc, precision, recall, f1]
    bars = plt.bar(names, vals, color=['#1f77b4','#ff7f0e','#2ca02c','#d62728'])
    plt.ylim(0,1)
    for b,v in zip(bars, vals):
        plt.text(b.get_x()+b.get_width()/2, v+0.01, f"{v:.3f}", ha='center', va='bottom')
    plt.title(f'ConvNeXt+ViT Ensemble Performance (Level 1-7) - Test #{test_no}')
    plt.tight_layout()
    plt.savefig(log_dir/"performance_metrics.png", dpi=300, bbox_inches='tight')
    plt.close()

    # 4단계 노우드 컨퓨전 매트릭스
    cm_4stage = confusion_matrix(norwood_4stage_metrics['y_true_4stage'], norwood_4stage_metrics['y_pred_4stage'], labels=list(range(4)))
    plt.figure(figsize=(8,6))
    stage_labels = ['0단계\n(Lv1)', '1단계\n(Lv2-3)', '2단계\n(Lv4-5)', '3단계\n(Lv6-7)']
    sns.heatmap(cm_4stage, annot=True, fmt='d', cmap='Oranges', xticklabels=stage_labels, yticklabels=stage_labels)
    plt.title(f'4단계 노우드 분류 Confusion Matrix\nTest #{test_no}')
    plt.ylabel('True Stage')
    plt.xlabel('Predicted Stage')
    plt.tight_layout()
    plt.savefig(log_dir/"confusion_matrix_4stage.png", dpi=300, bbox_inches='tight')
    plt.close()

    # 4단계 성능 차트
    plt.figure(figsize=(10,6))
    names_4stage = ['4-Stage Accuracy','4-Stage Precision','4-Stage Recall','4-Stage F1']
    vals_4stage = [norwood_4stage_metrics['accuracy'], norwood_4stage_metrics['precision'],
                   norwood_4stage_metrics['recall'], norwood_4stage_metrics['f1']]
    bars_4stage = plt.bar(names_4stage, vals_4stage, color=['#ff7f0e','#2ca02c','#d62728','#9467bd'])
    plt.ylim(0,1)
    for b,v in zip(bars_4stage, vals_4stage):
        plt.text(b.get_x()+b.get_width()/2, v+0.01, f"{v:.3f}", ha='center', va='bottom')
    plt.title(f'4단계 노우드 분류 성능 - Test #{test_no}')
    plt.tight_layout()
    plt.savefig(log_dir/"performance_4stage.png", dpi=300, bbox_inches='tight')
    plt.close()

    # 설정 파일 저장
    cfg_out = log_dir / "ensemble_config.json"
    with open(cfg_out, "w", encoding="utf-8") as f:
        json.dump({
            "index_conv": INDEX_CONV,
            "index_vit": INDEX_VIT,
            "top_k": TOP_K,
            "Tconv": T_CONV,
            "Tvit": T_VIT,
            "override": USE_OVERRIDE,
            "config": cfg,
        }, f, ensure_ascii=False, indent=2)

    print(f"\n{'='*80}")
    print(f"ConvNeXt+ViT Ensemble Test (Level 1-7) 완료! - Test #{test_no}")
    print(f"{'='*80}")
    print(f"총 테스트 이미지: {len(y_true)}개")
    print(f"정확도: {acc:.3f}")
    print(f"F1-Score: {f1:.3f}")
    print(f"결과 저장 위치: {log_dir}")
    print(f"{'='*80}")


if __name__ == "__main__":
    main()