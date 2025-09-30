#!/usr/bin/env python3
r"""
ConvNeXt + ViT-S/16 듀얼 이미지 Late Fusion 앙상블 테스터
두 장의 이미지(Top-down/Front + Right/Left)를 받아서 Late Fusion으로 결합

테스트 대상: C:\Users\301\Desktop\top_down_side_test
- 파일명 첫 숫자가 같으면 동일인
- Top-down or Front + Right or Left 각 1장씩

로그 출력: result_log/log/dual_fusion_test{N}/
"""

import os
import re
import json
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from collections import defaultdict

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

TEST_ROOT = Path(r"C:\Users\301\Desktop\top_down_side_test")  # 듀얼 이미지 테스트
ENV_PATH = r"C:\Users\301\Desktop\main_project\.env"

INDEX_CONV = "hair-loss-rag-analyzer"
INDEX_VIT = "hair-loss-vit-s16"

NUM_CLASSES = 7  # Level 1-7 (7 classes)
CLASS_OFFSET = 1  # Start from level 1
TOP_K = 10
T_CONV = 0.15
T_VIT = 0.20
USE_OVERRIDE = True


def extract_person_id_from_filename(filename: str) -> str:
    """파일명에서 인원 ID 추출 (첫 번째 숫자)"""
    match = re.search(r'^(\d+)', filename)
    return match.group(1) if match else 'unknown'


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


def is_primary_view(viewpoint: str) -> bool:
    """주 뷰포인트인지 확인 (Top-down, Front)"""
    return viewpoint in ['top-down', 'front']


def is_secondary_view(viewpoint: str) -> bool:
    """보조 뷰포인트인지 확인 (Right, Left)"""
    return viewpoint in ['right', 'left']


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


def predict_single(pc: Pinecone, idx_conv, idx_vit, img_path: Path, vit, conv, tf_v, tf_c) -> Tuple[np.ndarray, np.ndarray]:
    """단일 이미지 예측"""
    img = Image.open(img_path)
    vq = embed(img, vit, tf_v)
    cq = embed(img, conv, tf_c)
    r_v = idx_vit.query(vector=vq.tolist(), top_k=TOP_K, include_metadata=True)
    r_c = idx_conv.query(vector=cq.tolist(), top_k=TOP_K, include_metadata=True)
    p_v = knn_to_probs(r_v.get("matches", []), NUM_CLASSES, T=T_VIT)
    p_c = knn_to_probs(r_c.get("matches", []), NUM_CLASSES, T=T_CONV)
    return p_c, p_v


def collect_dual_image_pairs(root: Path) -> List[Dict]:
    """듀얼 이미지 페어 수집"""
    if not root.exists():
        return []

    # 인원별로 이미지 그룹화
    person_images = defaultdict(list)

    for child in sorted(root.iterdir()):
        if not child.is_dir():
            continue
        if child.name.lower().startswith("pick"):
            continue

        # 레벨 추출
        mm = re.search(r"level[_-]?(\d+)", child.name, re.IGNORECASE)
        if not mm:
            continue
        level = int(mm.group(1))
        if not (1 <= level <= 7):
            continue

        print(f"Processing {child.name} (level {level})")

        # 해당 레벨의 모든 이미지 수집
        for fp in child.iterdir():
            if fp.is_file() and fp.suffix.lower() in ['.jpg', '.jpeg', '.png']:
                if "pick" in fp.parts:
                    continue

                person_id = extract_person_id_from_filename(fp.name)
                viewpoint = detect_viewpoint_from_filename(fp.name)

                person_images[f"{level}_{person_id}"].append({
                    'path': fp,
                    'level': level,
                    'person_id': person_id,
                    'viewpoint': viewpoint,
                    'filename': fp.name
                })

    # 듀얼 이미지 페어 생성
    pairs = []
    for person_key, images in person_images.items():
        if len(images) < 2:
            print(f"  [WARNING] {person_key}: 이미지 부족 ({len(images)}장) - 스킵")
            continue

        # Primary와 Secondary 뷰 분리
        primary_images = [img for img in images if is_primary_view(img['viewpoint'])]
        secondary_images = [img for img in images if is_secondary_view(img['viewpoint'])]

        if len(primary_images) == 0 or len(secondary_images) == 0:
            print(f"  [WARNING] {person_key}: Primary/Secondary 뷰 부족 - 스킵")
            continue

        # 첫 번째 Primary와 첫 번째 Secondary로 페어 생성
        primary = primary_images[0]
        secondary = secondary_images[0]

        pairs.append({
            'person_key': person_key,
            'level': primary['level'],
            'person_id': primary['person_id'],
            'primary_image': primary,
            'secondary_image': secondary,
            'total_images': len(images)
        })

        print(f"  -> 페어 생성: {primary['filename']} + {secondary['filename']}")

    print(f"총 {len(pairs)}개 듀얼 이미지 페어 생성")
    return pairs


def apply_ensemble(p_conv: np.ndarray, p_vit: np.ndarray, cfg: Dict) -> Tuple[int, np.ndarray]:
    """앙상블 적용"""
    # Level 1-7에 해당하는 가중치 사용
    w_conv = np.array(cfg["weights"]["conv"], float)  # All 7 classes
    w_vit = np.array(cfg["weights"]["vit"], float)
    P_ens = w_conv * p_conv + w_vit * p_vit

    if USE_OVERRIDE:
        strong_c = np.array(cfg["strong"]["conv"], int)
        strong_v = np.array(cfg["strong"]["vit"], int)
        tau_c = np.array(cfg["tau"]["conv"], float)
        tau_v = np.array(cfg["tau"]["vit"], float)

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


def late_fusion_predict(p_conv1: np.ndarray, p_vit1: np.ndarray,
                       p_conv2: np.ndarray, p_vit2: np.ndarray,
                       cfg: Dict, fusion_weight: float = 0.5) -> Tuple[int, np.ndarray]:
    """Late Fusion으로 두 이미지 결합"""
    # 각 이미지별로 앙상블 확률 계산
    _, p_ens1 = apply_ensemble(p_conv1, p_vit1, cfg)
    _, p_ens2 = apply_ensemble(p_conv2, p_vit2, cfg)

    # Late Fusion: 가중 평균
    P_fused = fusion_weight * p_ens1 + (1 - fusion_weight) * p_ens2

    # 정규화
    s = P_fused.sum()
    if s > 0:
        P_fused = P_fused / s

    pred = int(np.argmax(P_fused)) + CLASS_OFFSET
    return pred, P_fused


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
                'person_key': result['person_key'],
                'person_id': result['person_id'],
                'primary_viewpoint': result['primary_viewpoint'],
                'secondary_viewpoint': result['secondary_viewpoint'],
                'true_level': true_level,
                'pred_level': pred_level,
                'deviation': deviation,
                'primary_filename': result['primary_filename'],
                'secondary_filename': result['secondary_filename'],
                'fusion_probs': result['fusion_probs']
            })

    # 편차별 통계
    deviation_stats = {}
    viewpoint_deviations = defaultdict(int)
    person_deviations = defaultdict(int)

    for dev in large_deviations:
        # 편차별 통계
        d = dev['deviation']
        if d not in deviation_stats:
            deviation_stats[d] = 0
        deviation_stats[d] += 1

        # 뷰포인트 조합별 큰 편차 통계
        vp_combo = f"{dev['primary_viewpoint']}+{dev['secondary_viewpoint']}"
        viewpoint_deviations[vp_combo] += 1

        # 인원별 큰 편차 통계
        person_deviations[dev['person_id']] += 1

    return {
        'large_deviations': large_deviations,
        'total_large_deviations': len(large_deviations),
        'deviation_stats': deviation_stats,
        'viewpoint_deviations': dict(viewpoint_deviations),
        'person_deviations': dict(person_deviations)
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
    prefix = "dual_fusion_test"
    test_no = next_test_number(LOG_BASE_PATH, prefix)
    folder_name = f"{prefix}{test_no}"
    log_dir = LOG_BASE_PATH / folder_name
    ensure_dir(log_dir)

    # per_class_config.py에서 가중치 로드
    config_path = Path(r"C:\Users\301\Desktop\main_project\backend\hair_classification\hair_loss_rag_analyzer_v1\backend\app\per_class_config.py")

    if config_path.exists():
        print(f"per_class_config.py에서 가중치 로드: {config_path}")
        # per_class_config 모듈 import
        import sys
        sys.path.insert(0, str(config_path.parent))
        from per_class_config import get_ensemble_config
        cfg = get_ensemble_config()
    else:
        print(f"[ERROR] 설정 파일을 찾을 수 없습니다: {config_path}")
        return

    # 듀얼 이미지 페어 수집
    image_pairs = collect_dual_image_pairs(TEST_ROOT)
    if not image_pairs:
        print(f"[ERROR] 듀얼 이미지 페어가 없습니다: {TEST_ROOT}")
        return

    print(f"\n총 {len(image_pairs)}개 듀얼 이미지 페어에서 테스트 시작")

    results = []
    y_true = []
    y_pred = []
    t0 = time.time()

    for pair in image_pairs:
        try:
            # Primary 이미지 예측
            p_c1, p_v1 = predict_single(pc, idx_conv, idx_vit, pair['primary_image']['path'], vit, conv, tf_v, tf_c)

            # Secondary 이미지 예측
            p_c2, p_v2 = predict_single(pc, idx_conv, idx_vit, pair['secondary_image']['path'], vit, conv, tf_v, tf_c)

            # Late Fusion
            pred, p_fused = late_fusion_predict(p_c1, p_v1, p_c2, p_v2, cfg, fusion_weight=0.5)

            results.append({
                "person_key": pair['person_key'],
                "person_id": pair['person_id'],
                "true_stage": pair['level'],
                "pred_stage": pred,
                "primary_filename": pair['primary_image']['filename'],
                "secondary_filename": pair['secondary_image']['filename'],
                "primary_viewpoint": pair['primary_image']['viewpoint'],
                "secondary_viewpoint": pair['secondary_image']['viewpoint'],
                "fusion_probs": p_fused.tolist(),
                "total_images": pair['total_images']
            })
            y_true.append(pair['level']-CLASS_OFFSET)  # level 1-7 -> 0-6
            y_pred.append(pred-CLASS_OFFSET)

            print(f"  {pair['person_key']}: L{pair['level']} -> L{pred} ({pair['primary_image']['viewpoint']}+{pair['secondary_image']['viewpoint']})")

        except Exception as e:
            print(f"[skip pair] {pair['person_key']}: {e}")

    dt = time.time()-t0
    print(f"\nDual Fusion inference done on {len(y_true)} pairs in {dt:.1f}s")

    if not y_true:
        print("[ERROR] No test predictions produced.")
        return

    acc = accuracy_score(y_true, y_pred)
    precision, recall, f1, support = precision_recall_fscore_support(y_true, y_pred, labels=list(range(NUM_CLASSES)), average='weighted', zero_division=0)

    # 편차 분석
    deviation_analysis = analyze_large_deviations(results)

    # 4단계 노우드 분류 성능 계산
    norwood_4stage_metrics = calculate_norwood_4stage_metrics(results)

    # 상세 리포트 저장
    with open(log_dir/"report.txt", "w", encoding="utf-8") as f:
        f.write("="*80+"\n")
        f.write(f"ConvNeXt+ViT 듀얼 이미지 Late Fusion 테스트 - Test #{test_no}\n")
        f.write("="*80+"\n")
        f.write(f"테스트 일시: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"테스트 데이터: {TEST_ROOT}\n")
        f.write(f"융합 방식: Late Fusion (가중치 0.5:0.5)\n")
        f.write(f"인덱스: ConvNeXt='{INDEX_CONV}', ViT='{INDEX_VIT}'\n")
        f.write(f"파라미터: top_k={TOP_K}, Tconv={T_CONV}, Tvit={T_VIT}, override={USE_OVERRIDE}\n\n")

        f.write("📊 전체 결과\n")
        f.write("-"*40+"\n")
        f.write(f"총 듀얼 페어 수: {len(y_true)}\n")
        f.write(f"정확도 (Accuracy): {acc:.3f}\n")
        f.write(f"정밀도 (Precision): {precision:.3f}\n")
        f.write(f"재현율 (Recall): {recall:.3f}\n")
        f.write(f"F1-Score: {f1:.3f}\n\n")

        # 레벨별 페어 수
        f.write("📁 레벨별 듀얼 페어 수\n")
        f.write("-"*40+"\n")
        level_counts = {}
        for result in results:
            level = result['true_stage']
            level_counts[level] = level_counts.get(level, 0) + 1
        for level in sorted(level_counts.keys()):
            f.write(f"레벨 {level}: {level_counts[level]}개 페어\n")
        f.write("\n")

        # 뷰포인트 조합별 통계
        f.write("📐 뷰포인트 조합별 통계\n")
        f.write("-"*40+"\n")
        viewpoint_combos = defaultdict(lambda: {'correct': 0, 'total': 0})
        for result in results:
            combo = f"{result['primary_viewpoint']}+{result['secondary_viewpoint']}"
            viewpoint_combos[combo]['total'] += 1
            if result['true_stage'] == result['pred_stage']:
                viewpoint_combos[combo]['correct'] += 1

        for combo, stats in sorted(viewpoint_combos.items()):
            acc_combo = stats['correct'] / stats['total'] if stats['total'] > 0 else 0
            f.write(f"{combo}: {stats['correct']}/{stats['total']} ({acc_combo:.3f})\n")
        f.write("\n")

        # 개별 인원별 상세 결과
        f.write("👤 인원별 상세 결과\n")
        f.write("-"*40+"\n")
        for i, result in enumerate(results, 1):
            status = "✓" if result['true_stage'] == result['pred_stage'] else "✗"
            f.write(f"{i:2d}. 인원{result['person_id']} {status}\n")
            f.write(f"    정답: Level {result['true_stage']} | 예측: Level {result['pred_stage']}\n")
            f.write(f"    Primary: {result['primary_filename']} ({result['primary_viewpoint']})\n")
            f.write(f"    Secondary: {result['secondary_filename']} ({result['secondary_viewpoint']})\n")
            f.write(f"    총 이미지: {result['total_images']}장\n")
            # 상위 3개 확률 표시
            probs = result['fusion_probs']
            top_3_idx = np.argsort(probs)[-3:][::-1]
            f.write(f"    예측 확률: ")
            for idx in top_3_idx:
                f.write(f"L{idx+1}({probs[idx]:.3f}) ")
            f.write("\n\n")

        # 2단계 이상 편차 분석
        f.write("🚨 2단계 이상 편차 분석\n")
        f.write("-"*40+"\n")
        f.write(f"총 큰 편차 케이스: {deviation_analysis['total_large_deviations']}개\n")
        if deviation_analysis['total_large_deviations'] > 0:
            f.write(f"전체 페어 대비 비율: {deviation_analysis['total_large_deviations']/len(results)*100:.1f}%\n")
            f.write("\n편차별 발생 건수:\n")
            for dev, count in sorted(deviation_analysis['deviation_stats'].items()):
                f.write(f"  {dev}단계 편차: {count}건\n")
            f.write("\n뷰포인트 조합별 큰 편차 발생:\n")
            for combo, count in sorted(deviation_analysis['viewpoint_deviations'].items()):
                f.write(f"  {combo}: {count}건\n")
            f.write("\n큰 편차 케이스 상세:\n")
            for i, case in enumerate(deviation_analysis['large_deviations'], 1):
                f.write(f"  {i}. 인원{case['person_id']} | 정답:L{case['true_level']} → 예측:L{case['pred_level']} (편차:{case['deviation']})\n")
                f.write(f"      {case['primary_viewpoint']}+{case['secondary_viewpoint']} | {case['primary_filename']}, {case['secondary_filename']}\n")

            f.write("\n🔍 큰 편차 발생 원인 분석:\n")
            f.write("  - 뷰포인트 조합의 한계: 특정 각도에서만 명확한 탈모 패턴\n")
            f.write("  - 개인차: 동일 레벨이라도 탈모 패턴의 개인적 변이\n")
            f.write("  - 헤어스타일 효과: 스타일링으로 인한 실제 상태 은폐\n")
            f.write("  - Late Fusion 가중치: 두 뷰의 신뢰도 차이 미반영\n")
        f.write("\n")

        # 4단계 노우드 분류 성능
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

        # 클래스별 성능
        f.write("🎯 7단계 클래스별 성능\n")
        f.write("-"*40+"\n")
        cls_dict = classification_report(y_true, y_pred, labels=list(range(NUM_CLASSES)), zero_division=0, output_dict=True)
        for c in range(NUM_CLASSES):
            level = c + CLASS_OFFSET
            key = str(c)
            if key in cls_dict:
                cr = cls_dict[key]
                f.write(f"레벨 {level}: 정밀도={cr['precision']:.3f}, 재현율={cr['recall']:.3f}, F1={cr['f1-score']:.3f}\n")
        f.write("\n")

    # Confusion Matrix (Level 1-7)
    cm = confusion_matrix(y_true, y_pred, labels=list(range(NUM_CLASSES)))
    plt.rcParams['font.family'] = ['DejaVu Sans', 'sans-serif']
    plt.rcParams['axes.unicode_minus'] = False
    plt.figure(figsize=(10,8))
    labels = [f"Level {i+CLASS_OFFSET}" for i in range(NUM_CLASSES)]
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=labels, yticklabels=labels)
    plt.title(f'듀얼 이미지 Late Fusion Confusion Matrix (Level 1-7)\nTest #{test_no}')
    plt.ylabel('True Level')
    plt.xlabel('Predicted Level')
    plt.tight_layout()
    plt.savefig(log_dir/"confusion_matrix.png", dpi=300, bbox_inches='tight')
    plt.close()

    # 4단계 노우드 컨퓨전 매트릭스
    cm_4stage = confusion_matrix(norwood_4stage_metrics['y_true_4stage'], norwood_4stage_metrics['y_pred_4stage'], labels=list(range(4)))
    plt.figure(figsize=(8,6))
    stage_labels = ['0단계\n(Lv1)', '1단계\n(Lv2-3)', '2단계\n(Lv4-5)', '3단계\n(Lv6-7)']
    sns.heatmap(cm_4stage, annot=True, fmt='d', cmap='Oranges', xticklabels=stage_labels, yticklabels=stage_labels)
    plt.title(f'듀얼 이미지 4단계 노우드 분류 Confusion Matrix\nTest #{test_no}')
    plt.ylabel('True Stage')
    plt.xlabel('Predicted Stage')
    plt.tight_layout()
    plt.savefig(log_dir/"confusion_matrix_4stage.png", dpi=300, bbox_inches='tight')
    plt.close()

    # Performance chart
    import pandas as pd
    pd.DataFrame(results).to_csv(log_dir/"results.csv", index=False, encoding="utf-8-sig")
    plt.figure(figsize=(10,6))
    names = ['Accuracy','Precision','Recall','F1-Score']
    vals = [acc, precision, recall, f1]
    bars = plt.bar(names, vals, color=['#1f77b4','#ff7f0e','#2ca02c','#d62728'])
    plt.ylim(0,1)
    for b,v in zip(bars, vals):
        plt.text(b.get_x()+b.get_width()/2, v+0.01, f"{v:.3f}", ha='center', va='bottom')
    plt.title(f'듀얼 이미지 Late Fusion 성능 - Test #{test_no}')
    plt.tight_layout()
    plt.savefig(log_dir/"performance_metrics.png", dpi=300, bbox_inches='tight')
    plt.close()

    # 설정 파일 저장
    cfg_out = log_dir / "dual_fusion_config.json"
    with open(cfg_out, "w", encoding="utf-8") as f:
        json.dump({
            "test_type": "dual_image_late_fusion",
            "fusion_weight": 0.5,
            "index_conv": INDEX_CONV,
            "index_vit": INDEX_VIT,
            "top_k": TOP_K,
            "Tconv": T_CONV,
            "Tvit": T_VIT,
            "override": USE_OVERRIDE,
            "config": cfg,
        }, f, ensure_ascii=False, indent=2)

    print(f"Saved logs under: {log_dir}")


if __name__ == "__main__":
    main()