#!/usr/bin/env python3
r"""
FAISS 기반 RAG 모델 레벨 1-2 구분 테스트
Hair Loss RAG Analyzer v2.0 - ConvNext + CLIP + FAISS 사용

테스트 대상: C:\Users\301\Desktop\test_data_set\test (level 1, 2)
FAISS 인덱스: hair_loss_rag_analyzer_v0 기존 인덱스 사용

로그 출력: result_log/log/faiss_level1-2_test{N}/
"""

import os
import sys
import json
import time
import numpy as np
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple, Any

import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix, classification_report
import pandas as pd

# FAISS RAG 시스템 경로 추가
RAG_PROJECT_PATH = Path(r"C:\Users\301\Desktop\main_project\backend\hair_classification\hair_loss_rag_analyzer_v0\backend")
sys.path.append(str(RAG_PROJECT_PATH))

from improved_faiss_manager import ImprovedFAISSManager
from app.services.image_processor import ImageProcessor

# ---------- 경로/설정 ----------
THIS_DIR = Path(__file__).parent
LOG_BASE_PATH = Path(r"C:\Users\301\Desktop\main_project\backend\hair_classification\result_log\log")

TEST_ROOT = Path(r"C:\Users\301\Desktop\test_data_set\test")  # level 1, 2

# 테스트 설정
TARGET_LEVELS = [1, 2]  # 레벨 1, 2만 테스트
TOP_K_VALUES = [10, 20, 30, 50]  # 다양한 k 값으로 테스트
EXCLUDE_LEVEL_1_TEST = True  # 레벨 1 제외 테스트도 실행


def ensure_dir(p: Path):
    """디렉토리 생성"""
    p.mkdir(parents=True, exist_ok=True)


def collect_test_set(root: Path, target_levels: List[int]) -> List[Tuple[Path, int]]:
    """테스트셋 수집 (레벨 1, 2만)"""
    items = []
    seen_files = set()

    if not root.exists():
        print(f"[ERROR] 테스트 루트 경로가 존재하지 않습니다: {root}")
        return items

    for level in target_levels:
        level_dir = root / str(level)
        if not level_dir.exists():
            print(f"[WARNING] 레벨 {level} 디렉토리가 존재하지 않습니다: {level_dir}")
            continue

        print(f"Processing level {level} directory: {level_dir}")
        level_count = 0

        for fp in level_dir.iterdir():
            if fp.is_file() and fp.suffix.lower() in ['.jpg', '.jpeg', '.png']:
                if fp not in seen_files:
                    seen_files.add(fp)
                    items.append((fp, level))
                    level_count += 1

        print(f"  -> Level {level}: {level_count} files added")

    return items


def analyze_faiss_prediction(faiss_manager: ImprovedFAISSManager,
                           image_processor: ImageProcessor,
                           image_path: Path,
                           top_k: int = 20,
                           exclude_levels: List[int] = None) -> Dict[str, Any]:
    """FAISS 기반 예측 분석"""
    try:
        # 이미지 임베딩 추출
        embedding = image_processor.extract_clip_embedding_from_path(str(image_path))

        if embedding is None:
            raise ValueError("이미지 임베딩 추출 실패")

        # FAISS에서 유사 이미지 검색 및 예측
        if exclude_levels:
            result = faiss_manager.predict_hair_loss_stage_improved(
                embedding,
                top_k=top_k,
                exclude_levels=exclude_levels,
                use_distance_weighting=True
            )
        else:
            result = faiss_manager.predict_hair_loss_stage_improved(
                embedding,
                top_k=top_k,
                use_distance_weighting=True
            )

        predicted_stage = result.get('predicted_stage', 0)
        confidence = result.get('confidence', 0.0)
        similar_images = result.get('similar_images', [])
        stage_scores = result.get('stage_scores', {})

        # None 값 처리
        if predicted_stage is None:
            predicted_stage = 0

        return {
            'predicted_stage': predicted_stage,
            'confidence': confidence,
            'similar_images': similar_images,
            'stage_scores': stage_scores,
            'success': True
        }

    except Exception as e:
        print(f"[ERROR] 예측 실패 {image_path}: {e}")
        return {
            'predicted_stage': 0,
            'confidence': 0.0,
            'similar_images': [],
            'stage_scores': {},
            'success': False,
            'error': str(e)
        }


def calculate_detailed_metrics(y_true: List[int], y_pred: List[int],
                             target_levels: List[int]) -> Dict[str, Any]:
    """상세 메트릭 계산"""
    # 전체 정확도
    accuracy = accuracy_score(y_true, y_pred)

    # 레벨별 메트릭
    precision, recall, f1, support = precision_recall_fscore_support(
        y_true, y_pred, labels=target_levels, average=None, zero_division=0
    )

    # 가중 평균 메트릭
    precision_weighted, recall_weighted, f1_weighted, _ = precision_recall_fscore_support(
        y_true, y_pred, labels=target_levels, average='weighted', zero_division=0
    )

    # 혼동 행렬
    cm = confusion_matrix(y_true, y_pred, labels=target_levels)

    # 레벨별 상세 결과
    level_metrics = {}
    for i, level in enumerate(target_levels):
        level_metrics[level] = {
            'precision': precision[i],
            'recall': recall[i],
            'f1': f1[i],
            'support': support[i]
        }

    # 분류 리포트
    cls_report = classification_report(
        y_true, y_pred, labels=target_levels, zero_division=0, output_dict=True
    )

    return {
        'accuracy': accuracy,
        'precision_weighted': precision_weighted,
        'recall_weighted': recall_weighted,
        'f1_weighted': f1_weighted,
        'confusion_matrix': cm,
        'level_metrics': level_metrics,
        'classification_report': cls_report
    }


def analyze_misclassifications(results: List[Dict]) -> Dict[str, Any]:
    """오분류 분석"""
    misclassified = []
    level_1_as_2 = 0  # 레벨 1을 레벨 2로 잘못 예측
    level_2_as_1 = 0  # 레벨 2를 레벨 1로 잘못 예측

    for result in results:
        true_level = result['true_stage']
        pred_level = result['pred_stage']

        if true_level != pred_level:
            misclassified.append({
                'filename': result['filename'],
                'true_level': true_level,
                'pred_level': pred_level,
                'confidence': result['confidence'],
                'stage_scores': result.get('stage_scores', {})
            })

            if true_level == 1 and pred_level == 2:
                level_1_as_2 += 1
            elif true_level == 2 and pred_level == 1:
                level_2_as_1 += 1

    return {
        'misclassified_cases': misclassified,
        'total_misclassified': len(misclassified),
        'level_1_as_2': level_1_as_2,
        'level_2_as_1': level_2_as_1
    }


def next_test_number(base: Path, prefix: str) -> int:
    """다음 테스트 번호 계산"""
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


def save_confusion_matrix(cm: np.ndarray, labels: List[str],
                         title: str, save_path: Path):
    """혼동 행렬 시각화 및 저장"""
    plt.figure(figsize=(8, 6))
    sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                xticklabels=labels, yticklabels=labels)
    plt.title(title)
    plt.ylabel('True Level')
    plt.xlabel('Predicted Level')
    plt.tight_layout()
    plt.savefig(save_path, dpi=300, bbox_inches='tight')
    plt.close()


def save_performance_chart(metrics: Dict, title: str, save_path: Path):
    """성능 차트 저장"""
    plt.figure(figsize=(10, 6))
    names = ['Accuracy', 'Precision', 'Recall', 'F1-Score']
    vals = [
        metrics['accuracy'],
        metrics['precision_weighted'],
        metrics['recall_weighted'],
        metrics['f1_weighted']
    ]

    bars = plt.bar(names, vals, color=['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728'])
    plt.ylim(0, 1)

    for b, v in zip(bars, vals):
        plt.text(b.get_x() + b.get_width()/2, v + 0.01,
                f"{v:.3f}", ha='center', va='bottom')

    plt.title(title)
    plt.tight_layout()
    plt.savefig(save_path, dpi=300, bbox_inches='tight')
    plt.close()


def main():
    """메인 실행 함수"""
    print("="*80)
    print("FAISS 기반 RAG 모델 레벨 1-2 구분 테스트")
    print("="*80)

    # 로그 디렉토리 구성
    prefix = "faiss_level1-2_test"
    test_no = next_test_number(LOG_BASE_PATH, prefix)
    folder_name = f"{prefix}{test_no}"
    log_dir = LOG_BASE_PATH / folder_name
    ensure_dir(log_dir)

    print(f"테스트 번호: {test_no}")
    print(f"결과 저장 위치: {log_dir}")

    # FAISS 매니저 및 이미지 프로세서 초기화
    try:
        faiss_manager = ImprovedFAISSManager()
        image_processor = ImageProcessor()
        print("FAISS 매니저 및 이미지 프로세서 초기화 완료")
    except Exception as e:
        print(f"[ERROR] 초기화 실패: {e}")
        return

    # 테스트셋 수집
    test_items = collect_test_set(TEST_ROOT, TARGET_LEVELS)
    if not test_items:
        print(f"[ERROR] 테스트셋이 비어있습니다: {TEST_ROOT}")
        return

    print(f"총 테스트 이미지: {len(test_items)}개")

    # 테스트 결과 저장용
    all_results = {}

    # 간단한 테스트부터 시작 (처음 5개 이미지만)
    print("\n" + "="*50)
    print("1. 간단한 테스트 (처음 5개 이미지)")
    print("="*50)

    simple_test_items = test_items[:5]
    print(f"간단한 테스트 이미지: {len(simple_test_items)}개")

    for top_k in [10]:  # 하나의 k 값으로만 테스트
        print(f"\n--- TOP_K = {top_k} ---")
        results = []
        y_true = []
        y_pred = []

        start_time = time.time()
        print(f"TOP_K {top_k} 테스트 시작...")

        for i, (fp, true_level) in enumerate(simple_test_items):
            prediction = analyze_faiss_prediction(
                faiss_manager, image_processor, fp, top_k=top_k
            )

            if prediction['success']:
                pred_level = prediction['predicted_stage']
                confidence = prediction['confidence']

                # 유효한 예측값만 사용 (1 또는 2)
                if pred_level in TARGET_LEVELS:
                    results.append({
                        'filename': fp.name,
                        'true_stage': true_level,
                        'pred_stage': pred_level,
                        'confidence': confidence,
                        'stage_scores': prediction['stage_scores']
                    })

                    y_true.append(true_level)
                    y_pred.append(pred_level)
                else:
                    print(f"  유효하지 않은 예측: {fp.name} -> {pred_level}")

                if (i + 1) % 5 == 0:
                    print(f"  처리 완료: {i + 1}/{len(simple_test_items)}")
            else:
                print(f"  실패: {fp.name} - {prediction.get('error', 'Unknown error')}")

        elapsed_time = time.time() - start_time

        print(f"실제 레벨: {y_true}")
        print(f"예측 레벨: {y_pred}")
        print(f"예측 다양성: {set(y_pred) if y_pred else 'None'}")

        if y_true and len(set(y_pred)) > 1:  # 예측값이 다양해야 메트릭 계산 가능
            metrics = calculate_detailed_metrics(y_true, y_pred, TARGET_LEVELS)
            misclass_analysis = analyze_misclassifications(results)

            all_results[f'basic_top_k_{top_k}'] = {
                'metrics': metrics,
                'misclassification': misclass_analysis,
                'results': results,
                'elapsed_time': elapsed_time,
                'total_images': len(y_true)
            }

            print(f"정확도: {metrics['accuracy']:.3f}")
            print(f"F1-Score: {metrics['f1_weighted']:.3f}")
            print(f"레벨 1→2 오분류: {misclass_analysis['level_1_as_2']}개")
            print(f"레벨 2→1 오분류: {misclass_analysis['level_2_as_1']}개")
        else:
            print(f"메트릭 계산 불가 - 성공한 예측: {len(y_true)}개, 예측 다양성: {len(set(y_pred)) if y_pred else 0}")
            if y_pred:
                print(f"예측 결과: {set(y_pred)}")

    # 성공한 예측이 있으면 계속 진행, 없으면 종료
    if not y_true:
        print("모든 예측이 실패했습니다. 테스트를 종료합니다.")
        return

    # 2. 전체 테스트 (성공한 경우에만)
    print("\n" + "="*50)
    print("2. 전체 테스트 (모든 이미지)")
    print("="*50)

    for top_k in TOP_K_VALUES:
        print(f"\n--- TOP_K = {top_k} ---")
        results = []
        y_true_full = []
        y_pred_full = []

        start_time = time.time()
        print(f"TOP_K {top_k} 전체 테스트 시작...")

        for i, (fp, true_level) in enumerate(test_items):
            prediction = analyze_faiss_prediction(
                faiss_manager, image_processor, fp, top_k=top_k
            )

            if prediction['success']:
                pred_level = prediction['predicted_stage']
                confidence = prediction['confidence']

                results.append({
                    'filename': fp.name,
                    'true_stage': true_level,
                    'pred_stage': pred_level,
                    'confidence': confidence,
                    'stage_scores': prediction['stage_scores']
                })

                y_true_full.append(true_level)
                y_pred_full.append(pred_level)

                if (i + 1) % 10 == 0:
                    print(f"  처리 완료: {i + 1}/{len(test_items)}")

        elapsed_time = time.time() - start_time

        if y_true_full and len(set(y_pred_full)) > 1:
            metrics = calculate_detailed_metrics(y_true_full, y_pred_full, TARGET_LEVELS)
            misclass_analysis = analyze_misclassifications(results)

            all_results[f'full_top_k_{top_k}'] = {
                'metrics': metrics,
                'misclassification': misclass_analysis,
                'results': results,
                'elapsed_time': elapsed_time,
                'total_images': len(y_true_full)
            }

            print(f"정확도: {metrics['accuracy']:.3f}")
            print(f"F1-Score: {metrics['f1_weighted']:.3f}")
            print(f"레벨 1→2 오분류: {misclass_analysis['level_1_as_2']}개")
            print(f"레벨 2→1 오분류: {misclass_analysis['level_2_as_1']}개")
        else:
            print(f"메트릭 계산 불가 - 성공한 예측: {len(y_true_full)}개, 예측 다양성: {len(set(y_pred_full)) if y_pred_full else 0}")

    # 3. 레벨 1 제외 테스트
    if EXCLUDE_LEVEL_1_TEST:
        print("\n" + "="*50)
        print("2. 레벨 1 제외 테스트")
        print("="*50)

        for top_k in TOP_K_VALUES:
            print(f"\n--- TOP_K = {top_k} (레벨 1 제외) ---")
            results = []
            y_true = []
            y_pred = []

            start_time = time.time()

            for fp, true_level in test_items:
                prediction = analyze_faiss_prediction(
                    faiss_manager, image_processor, fp,
                    top_k=top_k, exclude_levels=[1]
                )

                if prediction['success']:
                    pred_level = prediction['predicted_stage']
                    confidence = prediction['confidence']

                    results.append({
                        'filename': fp.name,
                        'true_stage': true_level,
                        'pred_stage': pred_level,
                        'confidence': confidence,
                        'stage_scores': prediction['stage_scores']
                    })

                    y_true.append(true_level)
                    y_pred.append(pred_level)

            elapsed_time = time.time() - start_time

            if y_true and len(set(y_pred)) > 1:  # 예측값이 다양해야 메트릭 계산 가능
                metrics = calculate_detailed_metrics(y_true, y_pred, TARGET_LEVELS)
                misclass_analysis = analyze_misclassifications(results)

                all_results[f'exclude_lv1_top_k_{top_k}'] = {
                    'metrics': metrics,
                    'misclassification': misclass_analysis,
                    'results': results,
                    'elapsed_time': elapsed_time,
                    'total_images': len(y_true)
                }

                print(f"정확도: {metrics['accuracy']:.3f}")
                print(f"F1-Score: {metrics['f1_weighted']:.3f}")
                print(f"레벨 1→2 오분류: {misclass_analysis['level_1_as_2']}개")
                print(f"레벨 2→1 오분류: {misclass_analysis['level_2_as_1']}개")
            else:
                print(f"메트릭 계산 불가 - 성공한 예측: {len(y_true)}개, 예측 다양성: {len(set(y_pred)) if y_pred else 0}")
                if y_pred:
                    print(f"예측 결과: {set(y_pred)}")

    # 결과 저장
    print("\n" + "="*50)
    print("결과 저장 중...")
    print("="*50)

    # 상세 리포트 저장
    with open(log_dir / "report.txt", "w", encoding="utf-8") as f:
        f.write("="*80 + "\n")
        f.write(f"FAISS 기반 RAG 모델 레벨 1-2 구분 테스트 - Test #{test_no}\n")
        f.write("="*80 + "\n")
        f.write(f"테스트 일시: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write(f"테스트 데이터: {TEST_ROOT}\n")
        f.write(f"대상 레벨: Level 1-2\n")
        f.write(f"FAISS 인덱스: hair_loss_rag_analyzer_v0\n")
        f.write(f"모델: ConvNext + CLIP + FAISS\n\n")

        f.write("📊 테스트 데이터셋 정보\n")
        f.write("-"*40 + "\n")
        level_counts = {}
        for _, level in test_items:
            level_counts[level] = level_counts.get(level, 0) + 1
        for level in sorted(level_counts.keys()):
            f.write(f"레벨 {level}: {level_counts[level]}개 이미지\n")
        f.write(f"총 테스트 이미지: {len(test_items)}개\n\n")

        # 각 설정별 결과 상세 기록
        for test_name, test_data in all_results.items():
            f.write(f"🎯 {test_name} 결과\n")
            f.write("-"*40 + "\n")

            metrics = test_data['metrics']
            misclass = test_data['misclassification']

            f.write(f"처리 시간: {test_data['elapsed_time']:.2f}초\n")
            f.write(f"정확도: {metrics['accuracy']:.3f}\n")
            f.write(f"정밀도: {metrics['precision_weighted']:.3f}\n")
            f.write(f"재현율: {metrics['recall_weighted']:.3f}\n")
            f.write(f"F1-Score: {metrics['f1_weighted']:.3f}\n\n")

            f.write("레벨별 성능:\n")
            for level, level_metrics in metrics['level_metrics'].items():
                f.write(f"  레벨 {level}: 정밀도={level_metrics['precision']:.3f}, "
                       f"재현율={level_metrics['recall']:.3f}, F1={level_metrics['f1']:.3f}\n")

            f.write(f"\n오분류 분석:\n")
            f.write(f"  총 오분류: {misclass['total_misclassified']}개\n")
            f.write(f"  레벨 1→2 오분류: {misclass['level_1_as_2']}개\n")
            f.write(f"  레벨 2→1 오분류: {misclass['level_2_as_1']}개\n\n")

    # 최적 결과 찾기 및 시각화
    best_result = None
    best_accuracy = 0
    best_test_name = ""

    for test_name, test_data in all_results.items():
        if test_data['metrics']['accuracy'] > best_accuracy:
            best_accuracy = test_data['metrics']['accuracy']
            best_result = test_data
            best_test_name = test_name

    if best_result:
        print(f"최고 성능: {best_test_name} (정확도: {best_accuracy:.3f})")

        # 최고 성능 결과 시각화
        cm = best_result['metrics']['confusion_matrix']
        labels = [f"Level {level}" for level in TARGET_LEVELS]

        save_confusion_matrix(
            cm, labels,
            f"FAISS RAG Level 1-2 Confusion Matrix\n{best_test_name} (Test #{test_no})",
            log_dir / "confusion_matrix_best.png"
        )

        save_performance_chart(
            best_result['metrics'],
            f"FAISS RAG Level 1-2 Performance\n{best_test_name} (Test #{test_no})",
            log_dir / "performance_best.png"
        )

    # 전체 결과 JSON 저장
    results_json = {}
    for test_name, test_data in all_results.items():
        results_json[test_name] = {
            'metrics': {
                'accuracy': test_data['metrics']['accuracy'],
                'precision': test_data['metrics']['precision_weighted'],
                'recall': test_data['metrics']['recall_weighted'],
                'f1': test_data['metrics']['f1_weighted']
            },
            'misclassification': test_data['misclassification'],
            'elapsed_time': test_data['elapsed_time'],
            'total_images': test_data['total_images']
        }

    with open(log_dir / "results.json", "w", encoding="utf-8") as f:
        json.dump(results_json, f, ensure_ascii=False, indent=2)

    # CSV 저장 (최고 성능 결과)
    if best_result:
        df = pd.DataFrame(best_result['results'])
        df.to_csv(log_dir / "best_results.csv", index=False, encoding="utf-8-sig")

    print(f"\n{'='*80}")
    print(f"FAISS 기반 RAG 모델 레벨 1-2 구분 테스트 완료! - Test #{test_no}")
    print(f"{'='*80}")
    print(f"최고 성능: {best_test_name}")
    print(f"최고 정확도: {best_accuracy:.3f}")
    print(f"결과 저장 위치: {log_dir}")
    print(f"{'='*80}")


if __name__ == "__main__":
    main()