#!/usr/bin/env python3
r"""
ConvNeXt + ViT-S/16 앙상블 with Medical Preprocessing (Level 2-7 전용)
의료용 전처리 (CLAHE + 화이트밸런스 + 선명화) + 뷰포인트 통계 분석

테스트 대상: C:\Users\301\Desktop\classification_test (level_2..level_7)
가중치 로드: 기존 저장된 ensemble_config.json 사용

로그 출력: result_log/log/ensemble_preprocessing_level2-7_test{N}/
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
import cv2

import torch
import torchvision.transforms as T
import timm
from dotenv import load_dotenv
from pinecone import Pinecone


# ---------- 경로/설정 ----------
THIS_DIR = Path(__file__).parent
LOG_BASE_PATH = Path(r"C:\Users\301\Desktop\main_project\backend\hair_classification\result_log\log")

TEST_ROOT = Path(r"C:\Users\301\Desktop\classification_test")  # level_2..level_7
ENV_PATH = r"C:\Users\301\Desktop\main_project\.env"

INDEX_CONV = "hair-loss-rag-analyzer"
INDEX_VIT = "hair-loss-vit-s16"

NUM_CLASSES = 6  # Level 2-7 only (6 classes)
CLASS_OFFSET = 2  # Start from level 2
TOP_K = 10
T_CONV = 0.15
T_VIT = 0.20
USE_OVERRIDE = True


# ---------- 의료용 전처리 함수 ----------
def medical_preprocess(image: Image.Image) -> Image.Image:
    """의료용 탈모 이미지 전처리 (CLAHE + 화이트밸런스 + 선명화)"""
    try:
        # PIL을 OpenCV로 변환
        img_array = np.array(image)
        img_bgr = cv2.cvtColor(img_array, cv2.COLOR_RGB2BGR)

        # 1. 화이트밸런스 보정
        img_balanced = white_balance_correction(img_bgr)

        # 2. CLAHE (Contrast Limited Adaptive Histogram Equalization)
        img_lab = cv2.cvtColor(img_balanced, cv2.COLOR_BGR2LAB)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        img_lab[:, :, 0] = clahe.apply(img_lab[:, :, 0])  # L 채널에만 적용
        img_clahe = cv2.cvtColor(img_lab, cv2.COLOR_LAB2BGR)

        # 3. 가우시안 블러 + 언샤프 마스킹 (선명화)
        blurred = cv2.GaussianBlur(img_clahe, (3, 3), 0)
        sharpened = cv2.addWeighted(img_clahe, 1.5, blurred, -0.5, 0)

        # OpenCV를 PIL로 변환
        img_rgb = cv2.cvtColor(sharpened, cv2.COLOR_BGR2RGB)
        return Image.fromarray(img_rgb)

    except Exception as e:
        print(f"의료용 전처리 실패: {e}")
        return image  # 실패 시 원본 반환


def white_balance_correction(img_bgr: np.ndarray) -> np.ndarray:
    """화이트밸런스 보정 (Gray World 알고리즘)"""
    try:
        result = img_bgr.astype(np.float64)
        for i in range(3):  # B, G, R 채널
            mean_val = np.mean(result[:, :, i])
            result[:, :, i] = result[:, :, i] * (128.0 / mean_val)
        result = np.clip(result, 0, 255)
        return result.astype(np.uint8)
    except:
        return img_bgr


def detect_viewpoint_from_filename(filename: str) -> str:
    """파일명에서 뷰포인트 추정"""
    filename_lower = filename.lower()
    if 'left' in filename_lower or '_l_' in filename_lower or '_left_' in filename_lower:
        return 'left'
    elif 'right' in filename_lower or '_r_' in filename_lower or '_right_' in filename_lower:
        return 'right'
    elif 'top' in filename_lower or 'down' in filename_lower or '_t_' in filename_lower:
        return 'top-down'
    elif 'front' in filename_lower or '_f_' in filename_lower or '_front_' in filename_lower:
        return 'front'
    elif 'back' in filename_lower or '_b_' in filename_lower or '_back_' in filename_lower:
        return 'back'
    else:
        return 'unknown'


# ---------- 유틸/전처리 ----------
def ensure_dir(p: Path):
    p.mkdir(parents=True, exist_ok=True)


def enhance_image(img: Image.Image) -> Image.Image:
    """기존 이미지 향상 (의료용 전처리 후 추가 적용)"""
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
        if 2 <= st <= 7:  # Only level 2-7
            probs[st-CLASS_OFFSET] += wi
    s = probs.sum()
    return probs / s if s > 0 else probs


def predict_with_preprocessing(pc: Pinecone, idx_conv, idx_vit, img_path: Path, vit, conv, tf_v, tf_c, cfg: Dict) -> Tuple[np.ndarray, Dict]:
    """의료용 전처리 기반 앙상블 예측"""
    try:
        img = Image.open(img_path)

        # 1. 의료용 전처리 적용
        processed_img = medical_preprocess(img)

        # 2. 뷰포인트 추정 (filename에서 추출)
        viewpoint = detect_viewpoint_from_filename(img_path.name)

        # 3. ConvNeXt + ViT 임베딩 추출
        vq = embed(processed_img, vit, tf_v)
        cq = embed(processed_img, conv, tf_c)

        # 4. Pinecone 검색
        r_v = idx_vit.query(vector=vq.tolist(), top_k=TOP_K, include_metadata=True)
        r_c = idx_conv.query(vector=cq.tolist(), top_k=TOP_K, include_metadata=True)

        # 5. 확률 계산
        p_v = knn_to_probs(r_v.get("matches", []), NUM_CLASSES, T=T_VIT)
        p_c = knn_to_probs(r_c.get("matches", []), NUM_CLASSES, T=T_CONV)

        # 6. 앙상블 적용
        pred, p_ens = apply_ensemble(p_c, p_v, cfg)

        return p_ens, {
            'method': 'preprocessing_only',
            'predicted_stage': pred,
            'viewpoint': viewpoint,
            'preprocessing_applied': True
        }

    except Exception as e:
        print(f"전처리 예측 실패 {img_path}: {e}")
        return np.zeros(NUM_CLASSES), {'error': str(e)}


def predict_both(pc: Pinecone, idx_conv, idx_vit, img_path: Path, vit, conv, tf_v, tf_c) -> Tuple[np.ndarray, np.ndarray]:
    """기존 방식 (ROI 없이)"""
    img = Image.open(img_path)
    # 의료용 전처리 적용
    img = medical_preprocess(img)

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
        if not (2 <= st <= 7):  # Only level 2-7
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
    # Level 2-7에 해당하는 가중치만 사용
    w_conv = np.array(cfg["weights"]["conv"][1:7], float)  # index 1-6 (level 2-7)
    w_vit = np.array(cfg["weights"]["vit"][1:7], float)
    P_ens = w_conv * p_conv + w_vit * p_vit

    if USE_OVERRIDE:
        strong_c = np.array(cfg["strong"]["conv"][1:7], int)
        strong_v = np.array(cfg["strong"]["vit"][1:7], int)
        tau_c = np.array(cfg["tau"]["conv"][1:7], float)
        tau_v = np.array(cfg["tau"]["vit"][1:7], float)

        for c in range(NUM_CLASSES):
            if strong_c[c] and p_conv[c] >= tau_c[c] and tau_c[c] > 0:
                P_ens[c] = p_conv[c]
            if strong_v[c] and p_vit[c] >= tau_v[c] and tau_v[c] > 0:
                P_ens[c] = p_vit[c]

    s = P_ens.sum()
    if s > 0:
        P_ens = P_ens / s
    pred = int(np.argmax(P_ens)) + CLASS_OFFSET  # level 2-7 indexing
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
    prefix = "ensemble_preprocessing_level2-7_test"
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

    # 테스트셋에서 최종 평가(level_2..level_7)
    test_items = collect_test_set(TEST_ROOT)
    if not test_items:
        print(f"[ERROR] 테스트셋이 비어있습니다: {TEST_ROOT}")
        return

    results = []
    y_true = []
    y_pred = []
    t0 = time.time()

    print(f"\n=== 전처리 기반 앙상블 테스트 시작 ===")
    print(f"총 {len(test_items)}개 이미지 처리 예정")

    for i, (fp, st) in enumerate(test_items, 1):
        try:
            # 전처리 기반 앙상블 예측
            p_ens, preprocess_info = predict_with_preprocessing(pc, idx_conv, idx_vit, fp, vit, conv, tf_v, tf_c, cfg)
            pred = preprocess_info.get('predicted_stage', int(np.argmax(p_ens)) + CLASS_OFFSET)

            results.append({
                "image_path": str(fp),
                "filename": fp.name,
                "true_stage": st,
                "pred_stage": pred,
                "probs": p_ens.tolist(),
                "preprocessing_method": preprocess_info.get('method', 'unknown'),
                "viewpoint": preprocess_info.get('viewpoint', 'unknown'),
            })
            y_true.append(st-CLASS_OFFSET)  # level 2-7 -> 0-5
            y_pred.append(pred-CLASS_OFFSET)

            if i % 50 == 0:
                print(f"진행률: {i}/{len(test_items)} ({i/len(test_items)*100:.1f}%)")

        except Exception as e:
            print(f"[skip test] {fp}: {e}")

    dt = time.time()-t0
    print(f"전처리 앙상블 테스트 완료: {len(y_true)}개 이미지, {dt:.1f}초 소요")

    if not y_true:
        print("[ERROR] No test predictions produced.")
        return

    acc = accuracy_score(y_true, y_pred)
    precision, recall, f1, support = precision_recall_fscore_support(y_true, y_pred, labels=list(range(NUM_CLASSES)), average='weighted', zero_division=0)

    # 뷰포인트별 통계 계산
    viewpoint_stats = calculate_viewpoint_stats(results)

    # 리포트 저장
    with open(log_dir/"report.txt", "w", encoding="utf-8") as f:
        f.write("="*80+"\n")
        f.write(f"ConvNeXt+ViT Medical Preprocessing Test (Level 2-7) - Test #{test_no}\n")
        f.write("="*80+"\n")
        f.write(f"테스트 일시: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"테스트 데이터: {TEST_ROOT}\n")
        f.write(f"대상 레벨: Level 2-7 (총 {NUM_CLASSES}개 클래스)\n")
        f.write(f"인덱스: ConvNeXt='{INDEX_CONV}', ViT='{INDEX_VIT}'\n")
        f.write(f"파라미터: top_k={TOP_K}, Tconv={T_CONV}, Tvit={T_VIT}, override={USE_OVERRIDE}\n")
        f.write(f"전처리: 의료용 전처리 (CLAHE + 화이트밸런스 + 선명화)\n\n")

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

        f.write("🎯 클래스별 성능 (Level 2-7)\n")
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

        f.write("🔬 전처리 통계\n")
        f.write("-"*40+"\n")
        preprocess_methods = {}
        for r in results:
            method = r.get('preprocessing_method', 'unknown')
            preprocess_methods[method] = preprocess_methods.get(method, 0) + 1
        for method, count in preprocess_methods.items():
            f.write(f"{method}: {count}개 ({count/len(results)*100:.1f}%)\n")

    # Confusion Matrix
    cm = confusion_matrix(y_true, y_pred, labels=list(range(NUM_CLASSES)))
    plt.rcParams['font.family'] = ['Malgun Gothic', 'DejaVu Sans']
    plt.rcParams['axes.unicode_minus'] = False
    plt.figure(figsize=(10,8))
    labels = [f"Level {i+CLASS_OFFSET}" for i in range(NUM_CLASSES)]  # Level 2-7
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=labels, yticklabels=labels)
    plt.title(f'ConvNeXt+ViT Preprocessing Ensemble Confusion Matrix (Level 2-7)\nTest #{test_no}')
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
    plt.title(f'ConvNeXt+ViT Preprocessing Ensemble Performance (Level 2-7) - Test #{test_no}')
    plt.tight_layout()
    plt.savefig(log_dir/"performance_metrics.png", dpi=300, bbox_inches='tight')
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
            "preprocessing_enabled": True,
            "config": cfg,
        }, f, ensure_ascii=False, indent=2)

    print(f"\n=== 전처리 앙상블 테스트 완료 ===")
    print(f"정확도: {acc:.3f}")
    print(f"로그 저장 경로: {log_dir}")


if __name__ == "__main__":
    main()