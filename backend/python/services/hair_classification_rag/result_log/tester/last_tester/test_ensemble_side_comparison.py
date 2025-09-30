#!/usr/bin/env python3
r"""
사이드 뷰포인트 비교 테스트: 일반 앙상블 vs GeM 풀링 앙상블
- 일반 앙상블: 모든 이미지에 동일한 방식 적용
- GeM 앙상블: Left/Right 뷰포인트만 GeM pooling 적용

테스트 데이터: C:\Users\301\Desktop\classification_test_side (level_2..level_6)
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
import torch.nn as nn
import torch.nn.functional as F
import torchvision.transforms as T
import timm
from dotenv import load_dotenv

from pinecone import Pinecone


# ---------- 경로/설정 ----------
THIS_DIR = Path(__file__).parent
LOG_BASE_PATH = Path(r"C:\Users\301\Desktop\main_project\backend\hair_classification\result_log\log")

TEST_ROOT = Path(r"C:\Users\301\Desktop\classification_test_side")  # level_2..level_6 (사이드 뷰 전용)
ENV_PATH = r"C:\Users\301\Desktop\main_project\.env"

INDEX_CONV = "hair-loss-rag-analyzer"
INDEX_VIT = "hair-loss-vit-s16"

NUM_CLASSES = 5  # Level 2-6 only (5 classes)
CLASS_OFFSET = 2  # Start from level 2
TOP_K = 10
T_CONV = 0.15
T_VIT = 0.20
USE_OVERRIDE = True


class GeM(nn.Module):
    """GeM (Generalized Mean) Pooling Layer"""
    def __init__(self, p=3, eps=1e-6):
        super(GeM, self).__init__()
        self.p = nn.Parameter(torch.ones(1) * p)
        self.eps = eps

    def forward(self, x):
        # x: (batch_size, channels, height, width) or (batch_size, seq_len, channels)
        if len(x.shape) == 4:  # ConvNet features
            return self.gem_2d(x)
        elif len(x.shape) == 3:  # ViT features
            return self.gem_1d(x)
        else:
            return F.adaptive_avg_pool2d(x, 1).flatten(1)

    def gem_2d(self, x):
        # For ConvNet: (batch, channels, h, w)
        x = torch.clamp(x, min=self.eps)
        x = F.adaptive_avg_pool2d(x.pow(self.p), 1)
        x = x.pow(1./self.p)
        return x.flatten(1)

    def gem_1d(self, x):
        # For ViT: (batch, seq_len, channels) -> take mean over seq_len
        x = torch.clamp(x, min=self.eps)
        x = x.pow(self.p).mean(dim=1)  # Average over sequence length
        x = x.pow(1./self.p)
        return x


def detect_viewpoint_from_filename(filename: str) -> str:
    """파일명에서 뷰포인트 추정"""
    filename_upper = filename.upper()
    if 'LEFT' in filename_upper or '_L_' in filename_upper:
        return 'left'
    elif 'RIGHT' in filename_upper or '_R_' in filename_upper:
        return 'right'
    elif 'TOP' in filename_upper or 'DOWN' in filename_upper or '_T_' in filename_upper:
        return 'top-down'
    elif 'FRONT' in filename_upper or '_F_' in filename_upper:
        return 'front'
    elif 'BACK' in filename_upper or '_B_' in filename_upper:
        return 'back'
    else:
        return 'unknown'


def is_side_viewpoint(filename: str) -> bool:
    """사이드 뷰포인트 (Left/Right) 인지 확인"""
    viewpoint = detect_viewpoint_from_filename(filename)
    return viewpoint in ['left', 'right']


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


def load_models(device: str = "cpu", use_gem: bool = False):
    vit = timm.create_model("vit_small_patch16_224", pretrained=True, num_classes=0, global_pool="avg").eval().to(device)
    conv = timm.create_model("convnext_large.fb_in22k_ft_in1k_384", pretrained=True, num_classes=0, global_pool="avg").eval().to(device)

    gem_layer = None
    if use_gem:
        gem_layer = GeM(p=3).to(device).eval()

    return vit, conv, gem_layer


def embed_normal(img: Image.Image, model, transform) -> np.ndarray:
    """일반 임베딩 (Global Average Pooling)"""
    if img.mode != "RGB":
        img = img.convert("RGB")
    img = enhance_image(img)
    x = transform(img).unsqueeze(0)
    with torch.no_grad():
        z = model(x).cpu().numpy()[0]
    z = z / (np.linalg.norm(z) + 1e-12)
    return z


def embed_gem(img: Image.Image, model, transform, gem_layer) -> np.ndarray:
    """GeM 풀링 임베딩"""
    if img.mode != "RGB":
        img = img.convert("RGB")
    img = enhance_image(img)
    x = transform(img).unsqueeze(0)

    with torch.no_grad():
        # 모델별 특징 추출 방식
        if 'vit' in str(model.__class__).lower():
            # ViT의 경우 - 패치 토큰들을 얻기 위해 forward_features 사용
            if hasattr(model, 'forward_features'):
                features = model.forward_features(x)  # (batch, seq_len, channels)
                z = gem_layer(features).cpu().numpy()[0]
            else:
                # 기본 방식으로 폴백
                z = model(x).cpu().numpy()[0]
        else:
            # ConvNet의 경우 - feature map을 얻기 위해 forward_features 사용
            if hasattr(model, 'forward_features'):
                features = model.forward_features(x)  # (batch, channels, h, w)
                z = gem_layer(features).cpu().numpy()[0]
            else:
                # 기본 방식으로 폴백
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
        if 2 <= st <= 6:  # Only level 2-6
            probs[st-CLASS_OFFSET] += wi
    s = probs.sum()
    return probs / s if s > 0 else probs


def predict_normal(pc: Pinecone, idx_conv, idx_vit, img_path: Path, vit, conv, tf_v, tf_c) -> Tuple[np.ndarray, np.ndarray]:
    """일반 앙상블 예측"""
    img = Image.open(img_path)
    vq = embed_normal(img, vit, tf_v)
    cq = embed_normal(img, conv, tf_c)
    r_v = idx_vit.query(vector=vq.tolist(), top_k=TOP_K, include_metadata=True)
    r_c = idx_conv.query(vector=cq.tolist(), top_k=TOP_K, include_metadata=True)
    p_v = knn_to_probs(r_v.get("matches", []), NUM_CLASSES, T=T_VIT)
    p_c = knn_to_probs(r_c.get("matches", []), NUM_CLASSES, T=T_CONV)
    return p_c, p_v


def predict_gem_selective(pc: Pinecone, idx_conv, idx_vit, img_path: Path,
                         vit, conv, tf_v, tf_c, gem_layer) -> Tuple[np.ndarray, np.ndarray]:
    """선택적 GeM 앙상블 예측 (사이드 뷰포인트만 GeM 적용)"""
    img = Image.open(img_path)

    # 사이드 뷰포인트 여부 확인
    is_side = is_side_viewpoint(img_path.name)

    if is_side:
        # Left/Right는 GeM pooling 사용
        vq = embed_gem(img, vit, tf_v, gem_layer)
        cq = embed_gem(img, conv, tf_c, gem_layer)
    else:
        # 다른 뷰포인트는 일반 pooling 사용
        vq = embed_normal(img, vit, tf_v)
        cq = embed_normal(img, conv, tf_c)

    r_v = idx_vit.query(vector=vq.tolist(), top_k=TOP_K, include_metadata=True)
    r_c = idx_conv.query(vector=cq.tolist(), top_k=TOP_K, include_metadata=True)
    p_v = knn_to_probs(r_v.get("matches", []), NUM_CLASSES, T=T_VIT)
    p_c = knn_to_probs(r_c.get("matches", []), NUM_CLASSES, T=T_CONV)
    return p_c, p_v


def collect_test_set(root: Path) -> List[Tuple[Path, int]]:
    items = []
    seen_files = set()
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
        if not (2 <= st <= 6):  # Only level 2-6
            continue
        print(f"Processing {child.name} (level {st})")
        level_count = 0
        for fp in child.iterdir():
            if fp.is_file() and fp.suffix.lower() in ['.jpg', '.jpeg', '.png']:
                if "pick" in fp.parts:
                    continue
                if fp not in seen_files:
                    seen_files.add(fp)
                    items.append((fp, st))
                    level_count += 1
        print(f"  -> {level_count} files added")
    return items


def apply_ensemble(p_conv: np.ndarray, p_vit: np.ndarray, cfg: Dict) -> Tuple[int, np.ndarray]:
    # Level 2-6에 해당하는 가중치만 사용
    w_conv = np.array(cfg["weights"]["conv"][1:6], float)  # index 1-5 (level 2-6)
    w_vit = np.array(cfg["weights"]["vit"][1:6], float)
    P_ens = w_conv * p_conv + w_vit * p_vit

    if USE_OVERRIDE:
        strong_c = np.array(cfg["strong"]["conv"][1:6], int)
        strong_v = np.array(cfg["strong"]["vit"][1:6], int)
        tau_c = np.array(cfg["tau"]["conv"][1:6], float)
        tau_v = np.array(cfg["tau"]["vit"][1:6], float)

        for c in range(NUM_CLASSES):
            if strong_c[c] and p_conv[c] >= tau_c[c] and tau_c[c] > 0:
                P_ens[c] = p_conv[c]
            if strong_v[c] and p_vit[c] >= tau_v[c] and tau_v[c] > 0:
                P_ens[c] = p_vit[c]

    s = P_ens.sum()
    if s > 0:
        P_ens = P_ens / s
    pred = int(np.argmax(P_ens)) + CLASS_OFFSET  # level 2-6 indexing
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


def run_test(test_name: str, predict_func, models, cfg: Dict) -> Dict:
    """테스트 실행"""
    pc, idx_conv, idx_vit = models['pinecone']

    test_items = collect_test_set(TEST_ROOT)
    if not test_items:
        print(f"[ERROR] 테스트셋이 비어있습니다: {TEST_ROOT}")
        return {}

    results = []
    y_true = []
    y_pred = []
    t0 = time.time()

    for fp, st in test_items:
        try:
            if predict_func == predict_normal:
                p_c, p_v = predict_func(pc, idx_conv, idx_vit, fp, *models['normal'])
            else:  # predict_gem_selective
                p_c, p_v = predict_func(pc, idx_conv, idx_vit, fp, *models['gem'])

            pred, p_ens = apply_ensemble(p_c, p_v, cfg)
            viewpoint = detect_viewpoint_from_filename(fp.name)

            results.append({
                "image_path": str(fp),
                "filename": fp.name,
                "true_stage": st,
                "pred_stage": pred,
                "probs": p_ens.tolist(),
                "viewpoint": viewpoint,
                "is_side": is_side_viewpoint(fp.name)
            })
            y_true.append(st-CLASS_OFFSET)
            y_pred.append(pred-CLASS_OFFSET)
        except Exception as e:
            print(f"[skip test] {fp}: {e}")

    dt = time.time()-t0
    print(f"{test_name} inference done on {len(y_true)} images in {dt:.1f}s")

    if not y_true:
        return {
            'test_name': test_name,
            'results': [],
            'y_true': [],
            'y_pred': [],
            'accuracy': 0.0,
            'precision': 0.0,
            'recall': 0.0,
            'f1': 0.0,
            'viewpoint_stats': {},
            'test_time': dt
        }

    acc = accuracy_score(y_true, y_pred)
    precision, recall, f1, support = precision_recall_fscore_support(
        y_true, y_pred, labels=list(range(NUM_CLASSES)), average='weighted', zero_division=0)

    viewpoint_stats = calculate_viewpoint_stats(results)

    return {
        'test_name': test_name,
        'results': results,
        'y_true': y_true,
        'y_pred': y_pred,
        'accuracy': acc,
        'precision': precision,
        'recall': recall,
        'f1': f1,
        'viewpoint_stats': viewpoint_stats,
        'test_time': dt
    }


def main():
    # 로드
    load_dotenv(ENV_PATH)
    pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
    idx_conv = pc.Index(INDEX_CONV)
    idx_vit = pc.Index(INDEX_VIT)

    device = "cpu"

    # 일반 모델들
    vit_normal, conv_normal, _ = load_models(device, use_gem=False)
    tf_v, tf_c = tf_vit(), tf_conv()

    # GeM 모델들
    vit_gem, conv_gem, gem_layer = load_models(device, use_gem=True)

    models = {
        'pinecone': (pc, idx_conv, idx_vit),
        'normal': (vit_normal, conv_normal, tf_v, tf_c),
        'gem': (vit_gem, conv_gem, tf_v, tf_c, gem_layer)
    }

    # 로그 디렉토리 구성
    prefix = "side_comparison_test"
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

    print("="*80)
    print("사이드 뷰포인트 비교 테스트 시작")
    print("="*80)

    # 테스트 1: 일반 앙상블
    print("\n[Test 1] 일반 앙상블 테스트...")
    normal_results = run_test("Normal Ensemble", predict_normal, models, cfg)

    # 테스트 2: 선택적 GeM 앙상블
    print("\n[Test 2] 선택적 GeM 앙상블 테스트...")
    gem_results = run_test("Selective GeM Ensemble", predict_gem_selective, models, cfg)

    # 결과 비교 및 리포트 생성
    generate_comparison_report(normal_results, gem_results, log_dir, test_no, cfg)

    print(f"\nSaved logs under: {log_dir}")


def generate_comparison_report(normal_results: Dict, gem_results: Dict, log_dir: Path, test_no: int, cfg: Dict):
    """비교 리포트 생성"""

    # 리포트 파일 작성
    with open(log_dir/"comparison_report.txt", "w", encoding="utf-8") as f:
        f.write("="*80+"\n")
        f.write(f"사이드 뷰포인트 비교 테스트 - Test #{test_no}\n")
        f.write("="*80+"\n")
        f.write(f"테스트 일시: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"테스트 데이터: {TEST_ROOT}\n")
        f.write(f"대상 레벨: Level 2-6 (총 {NUM_CLASSES}개 클래스)\n")
        f.write(f"인덱스: ConvNeXt='{INDEX_CONV}', ViT='{INDEX_VIT}'\n")
        f.write(f"파라미터: top_k={TOP_K}, Tconv={T_CONV}, Tvit={T_VIT}, override={USE_OVERRIDE}\n\n")

        # Test 1 결과
        f.write("="*60+"\n")
        f.write("TEST 1: 일반 앙상블 (Global Average Pooling)\n")
        f.write("="*60+"\n")
        f.write("📊 전체 결과\n")
        f.write("-"*40+"\n")
        f.write(f"총 테스트 수: {len(normal_results['y_true'])}\n")
        f.write(f"정확도 (Accuracy): {normal_results['accuracy']:.3f}\n")
        f.write(f"정밀도 (Precision): {normal_results['precision']:.3f}\n")
        f.write(f"재현율 (Recall): {normal_results['recall']:.3f}\n")
        f.write(f"F1-Score: {normal_results['f1']:.3f}\n")
        f.write(f"처리 시간: {normal_results['test_time']:.1f}s\n\n")

        # 뷰포인트별 통계 (일반)
        f.write("📐 뷰포인트별 통계 (일반 앙상블)\n")
        f.write("-"*40+"\n")
        for vp, stats in normal_results['viewpoint_stats'].items():
            if stats['total'] > 0:
                f.write(f"{vp}: {stats['correct']}/{stats['total']} ({stats['accuracy']:.3f})\n")
        f.write("\n")

        # Test 2 결과
        f.write("="*60+"\n")
        f.write("TEST 2: 선택적 GeM 앙상블 (사이드 뷰만 GeM Pooling)\n")
        f.write("="*60+"\n")
        f.write("📊 전체 결과\n")
        f.write("-"*40+"\n")
        f.write(f"총 테스트 수: {len(gem_results['y_true'])}\n")
        f.write(f"정확도 (Accuracy): {gem_results['accuracy']:.3f}\n")
        f.write(f"정밀도 (Precision): {gem_results['precision']:.3f}\n")
        f.write(f"재현율 (Recall): {gem_results['recall']:.3f}\n")
        f.write(f"F1-Score: {gem_results['f1']:.3f}\n")
        f.write(f"처리 시간: {gem_results['test_time']:.1f}s\n\n")

        # 뷰포인트별 통계 (GeM)
        f.write("📐 뷰포인트별 통계 (GeM 앙상블)\n")
        f.write("-"*40+"\n")
        for vp, stats in gem_results['viewpoint_stats'].items():
            if stats['total'] > 0:
                f.write(f"{vp}: {stats['correct']}/{stats['total']} ({stats['accuracy']:.3f})\n")
        f.write("\n")

        # 비교 분석
        f.write("="*60+"\n")
        f.write("성능 비교 분석\n")
        f.write("="*60+"\n")

        acc_diff = gem_results['accuracy'] - normal_results['accuracy']
        f1_diff = gem_results['f1'] - normal_results['f1']

        f.write(f"정확도 변화: {normal_results['accuracy']:.3f} → {gem_results['accuracy']:.3f} ({acc_diff:+.3f})\n")
        f.write(f"F1-Score 변화: {normal_results['f1']:.3f} → {gem_results['f1']:.3f} ({f1_diff:+.3f})\n\n")

        # 사이드 뷰포인트별 상세 비교
        f.write("🎯 사이드 뷰포인트별 상세 비교\n")
        f.write("-"*40+"\n")

        side_viewpoints = ['left', 'right']
        for vp in side_viewpoints:
            if vp in normal_results['viewpoint_stats'] and vp in gem_results['viewpoint_stats']:
                normal_stats = normal_results['viewpoint_stats'][vp]
                gem_stats = gem_results['viewpoint_stats'][vp]

                if normal_stats['total'] > 0 and gem_stats['total'] > 0:
                    acc_diff_vp = gem_stats['accuracy'] - normal_stats['accuracy']
                    f1_diff_vp = gem_stats['f1'] - normal_stats['f1']

                    f.write(f"{vp.upper()} 뷰포인트:\n")
                    f.write(f"  정확도: {normal_stats['accuracy']:.3f} → {gem_stats['accuracy']:.3f} ({acc_diff_vp:+.3f})\n")
                    f.write(f"  F1-Score: {normal_stats['f1']:.3f} → {gem_stats['f1']:.3f} ({f1_diff_vp:+.3f})\n")
                    f.write(f"  테스트 수: {normal_stats['total']}개\n\n")

        # 결론
        f.write("🔍 결론 및 분석\n")
        f.write("-"*40+"\n")

        if f1_diff > 0.01:
            f.write("✅ GeM Pooling이 사이드 뷰포인트에서 성능 향상을 보였습니다.\n")
            f.write("이유: GeM pooling이 Left/Right 뷰의 공간적 특성을 더 잘 포착하여\n")
            f.write("      모발 손실 패턴의 미세한 차이를 구분하는 데 도움을 준 것으로 보입니다.\n\n")
        elif f1_diff < -0.01:
            f.write("❌ 일반 앙상블이 더 나은 성능을 보였습니다.\n")
            f.write("이유: 사이드 뷰포인트에서도 Global Average Pooling이 충분히 효과적이며,\n")
            f.write("      GeM pooling의 복잡성이 오히려 성능 저하를 일으킨 것으로 보입니다.\n\n")
        else:
            f.write("≈ 두 방법 간 성능 차이가 미미합니다.\n")
            f.write("이유: 현재 데이터셋에서는 풀링 방법의 선택이 크게 영향을 미치지 않으며,\n")
            f.write("      다른 요소들(앙상블 가중치, 데이터 품질 등)이 더 중요한 것으로 보입니다.\n\n")

        # 가중치 정보
        f.write("⚖️ 앙상블 가중치 설정\n")
        f.write("-"*40+"\n")
        f.write("Per-class weights (ConvNeXt/ViT):\n")
        for c in range(len(cfg['weights']['conv'])):
            level = c + 1
            if 2 <= level <= 6:  # Only show level 2-6
                f.write(f"  레벨 {level}: {cfg['weights']['conv'][c]:.3f} / {cfg['weights']['vit'][c]:.3f}\n")

    # Confusion Matrix 생성
    plt.rcParams['font.family'] = ['DejaVu Sans', 'sans-serif']
    plt.rcParams['axes.unicode_minus'] = False

    # 일반 앙상블 Confusion Matrix
    cm_normal = confusion_matrix(normal_results['y_true'], normal_results['y_pred'], labels=list(range(NUM_CLASSES)))
    plt.figure(figsize=(12,5))

    plt.subplot(1,2,1)
    labels = [f"Level {i+CLASS_OFFSET}" for i in range(NUM_CLASSES)]
    sns.heatmap(cm_normal, annot=True, fmt='d', cmap='Blues', xticklabels=labels, yticklabels=labels)
    plt.title(f'Normal Ensemble\nAccuracy: {normal_results["accuracy"]:.3f}')
    plt.ylabel('True Level')
    plt.xlabel('Predicted Level')

    # GeM 앙상블 Confusion Matrix
    cm_gem = confusion_matrix(gem_results['y_true'], gem_results['y_pred'], labels=list(range(NUM_CLASSES)))
    plt.subplot(1,2,2)
    sns.heatmap(cm_gem, annot=True, fmt='d', cmap='Greens', xticklabels=labels, yticklabels=labels)
    plt.title(f'Selective GeM Ensemble\nAccuracy: {gem_results["accuracy"]:.3f}')
    plt.ylabel('True Level')
    plt.xlabel('Predicted Level')

    plt.suptitle(f'Side Viewpoint Comparison - Test #{test_no}', fontsize=14)
    plt.tight_layout()
    plt.savefig(log_dir/"comparison_confusion_matrix.png", dpi=300, bbox_inches='tight')
    plt.close()

    # 성능 비교 차트
    plt.figure(figsize=(10,6))
    metrics = ['Accuracy', 'Precision', 'Recall', 'F1-Score']
    normal_vals = [normal_results['accuracy'], normal_results['precision'], normal_results['recall'], normal_results['f1']]
    gem_vals = [gem_results['accuracy'], gem_results['precision'], gem_results['recall'], gem_results['f1']]

    x = np.arange(len(metrics))
    width = 0.35

    bars1 = plt.bar(x - width/2, normal_vals, width, label='Normal Ensemble', color='skyblue', alpha=0.8)
    bars2 = plt.bar(x + width/2, gem_vals, width, label='GeM Ensemble', color='lightgreen', alpha=0.8)

    plt.ylim(0,1)
    for i, (b1, b2, v1, v2) in enumerate(zip(bars1, bars2, normal_vals, gem_vals)):
        plt.text(b1.get_x()+b1.get_width()/2, v1+0.01, f"{v1:.3f}", ha='center', va='bottom', fontsize=9)
        plt.text(b2.get_x()+b2.get_width()/2, v2+0.01, f"{v2:.3f}", ha='center', va='bottom', fontsize=9)

    plt.xlabel('Metrics')
    plt.ylabel('Score')
    plt.title(f'Side Viewpoint Comparison - Test #{test_no}')
    plt.xticks(x, metrics)
    plt.legend()
    plt.grid(True, alpha=0.3)
    plt.tight_layout()
    plt.savefig(log_dir/"comparison_performance.png", dpi=300, bbox_inches='tight')
    plt.close()

    # CSV 파일 저장
    import pandas as pd
    pd.DataFrame(normal_results['results']).to_csv(log_dir/"normal_results.csv", index=False, encoding="utf-8-sig")
    pd.DataFrame(gem_results['results']).to_csv(log_dir/"gem_results.csv", index=False, encoding="utf-8-sig")

    # 설정 파일 저장
    cfg_out = log_dir / "test_config.json"
    with open(cfg_out, "w", encoding="utf-8") as f:
        json.dump({
            "test_type": "side_viewpoint_comparison",
            "normal_results_summary": {
                "accuracy": normal_results['accuracy'],
                "f1": normal_results['f1'],
                "test_time": normal_results['test_time']
            },
            "gem_results_summary": {
                "accuracy": gem_results['accuracy'],
                "f1": gem_results['f1'],
                "test_time": gem_results['test_time']
            },
            "config": cfg,
        }, f, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()