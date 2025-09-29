#!/usr/bin/env python3
"""
다양한 Viewpoint를 포함한 Hair Loss Analyzer 성능 테스트 스크립트
각 레벨당 20건씩 랜덤 샘플링하여 테스트
"""

import os
import sys
import json
import time
import asyncio
import random
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple
import numpy as np
import pandas as pd
from PIL import Image
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    confusion_matrix, classification_report,
    accuracy_score, precision_recall_fscore_support
)

# 백엔드 모듈 import를 위한 경로 추가
backend_path = Path("C:/Users/301/Desktop/main_project/backend/hair_classification/hair_loss_rag_analyzer_v1/backend")
sys.path.append(str(backend_path))

# 하드코딩된 경로로 config 우회
class HardcodedSettings:
    UPLOAD_DIR = "C:/Users/301/Desktop/main_project/backend/hair_classification/hair_loss_rag_analyzer_v1/backend/uploads"
    INDEX_NAME = "hair-loss-rag-analysis-convnext"
    EMBEDDING_DIMENSION = 1536
    MODEL_NAME = "convnext_large.fb_in22k_ft_in1k_384"

    # 탈모 단계 설명
    STAGE_DESCRIPTIONS = {
        2: "경미한 탈모 - M자 탈모가 시작되거나 이마선이 약간 후퇴",
        3: "초기 탈모 - M자 탈모가 뚜렷해지고 정수리 부분 모발 밀도 감소",
        4: "중기 탈모 - M자 탈모 진행, 정수리 탈모 본격화",
        5: "진행된 탈모 - 앞머리와 정수리 탈모가 연결되기 시작",
        6: "심한 탈모 - 앞머리와 정수리가 완전히 연결되어 하나의 큰 탈모 영역 형성",
        7: "매우 심한 탈모 - 측면과 뒷머리를 제외한 대부분의 모발 손실"
    }

# config를 직접 덮어쓰기
from app.services.hair_loss_analyzer import HairLossAnalyzer


def get_next_test_number(base_log_path: Path) -> int:
    """다음 테스트 번호 결정"""
    if not base_log_path.exists():
        return 1

    existing_tests = [d for d in base_log_path.iterdir() if d.is_dir() and d.name.startswith('test_viewpoint')]
    if not existing_tests:
        return 1

    test_numbers = []
    for test_dir in existing_tests:
        try:
            num = int(test_dir.name.replace('test_viewpoint', ''))
            test_numbers.append(num)
        except ValueError:
            continue

    return max(test_numbers) + 1 if test_numbers else 1


class VariousViewpointTester:
    def __init__(self, test_data_path: str, base_log_path: str, samples_per_level: int = 20):
        """
        다양한 Viewpoint 테스터 초기화

        Args:
            test_data_path: 테스트 데이터셋 경로
            base_log_path: 기본 로그 저장 경로
            samples_per_level: 레벨당 샘플 개수
        """
        self.test_data_path = Path(test_data_path)
        self.base_log_path = Path(base_log_path)
        self.samples_per_level = samples_per_level

        # 다음 테스트 번호 결정
        self.test_number = get_next_test_number(self.base_log_path)
        self.result_log_path = self.base_log_path / f"test_viewpoint{self.test_number}"

        self.analyzer = None
        self.test_results = []

        # 결과 로그 디렉터리 생성
        self.result_log_path.mkdir(parents=True, exist_ok=True)

        print(f"테스트 번호: viewpoint{self.test_number}")
        print(f"테스트 데이터 경로: {self.test_data_path}")
        print(f"레벨당 샘플 개수: {self.samples_per_level}")
        print(f"결과 로그 경로: {self.result_log_path}")

    async def initialize_analyzer(self):
        """HairLossAnalyzer 초기화"""
        try:
            print("HairLossAnalyzer 초기화 중...")
            self.analyzer = HairLossAnalyzer()
            print("HairLossAnalyzer 초기화 완료")
            return True
        except Exception as e:
            print(f"HairLossAnalyzer 초기화 실패: {e}")
            return False

    def load_test_data(self) -> Dict[int, List[Path]]:
        """
        테스트 데이터 로드 및 샘플링 (레벨 2-7)

        Returns:
            Dict[int, List[Path]]: {레벨: [이미지_경로_리스트]}
        """
        test_data = {}

        for level in range(2, 8):  # 레벨 2-7 테스트
            level_path = self.test_data_path / f"level_{level}" / f"LEVEL_{level}"

            if not level_path.exists():
                print(f"경고: 레벨 {level} 폴더가 존재하지 않습니다: {level_path}")
                continue

            # 이미지 파일 찾기
            image_files = []
            for ext in ['.jpg', '.jpeg', '.png', '.bmp']:
                image_files.extend(list(level_path.glob(f"*{ext}")))
                image_files.extend(list(level_path.glob(f"*{ext.upper()}")))

            # 중복 제거
            image_files = list(set(image_files))

            # 랜덤 샘플링
            if len(image_files) > self.samples_per_level:
                random.seed(42)  # 재현 가능한 결과를 위해
                sampled_files = random.sample(image_files, self.samples_per_level)
            else:
                sampled_files = image_files
                print(f"경고: 레벨 {level}에 {len(image_files)}개 이미지만 있어서 모두 사용합니다.")

            test_data[level] = sampled_files
            print(f"레벨 {level}: {len(sampled_files)}개 이미지 파일 (전체 {len(image_files)}개 중)")

            # 뷰포인트 분석
            viewpoint_counts = {}
            for img_path in sampled_files:
                filename = img_path.name.lower()
                if 'top-down' in filename or 'top_down' in filename:
                    viewpoint = 'top-down'
                elif 'front' in filename:
                    viewpoint = 'front'
                elif 'left' in filename:
                    viewpoint = 'left'
                elif 'right' in filename:
                    viewpoint = 'right'
                elif 'back' in filename:
                    viewpoint = 'back'
                else:
                    viewpoint = 'unknown'

                viewpoint_counts[viewpoint] = viewpoint_counts.get(viewpoint, 0) + 1

            print(f"  뷰포인트 분포: {viewpoint_counts}")

        total_images = sum(len(files) for files in test_data.values())
        print(f"총 테스트 이미지: {total_images}개")

        return test_data

    async def test_single_image(self, image_path: Path, true_level: int) -> Dict:
        """
        단일 이미지 테스트

        Args:
            image_path: 이미지 파일 경로
            true_level: 실제 탈모 레벨

        Returns:
            Dict: 테스트 결과
        """
        try:
            # 뷰포인트 추출
            filename = image_path.name.lower()
            if 'top-down' in filename or 'top_down' in filename:
                viewpoint = 'top-down'
            elif 'front' in filename:
                viewpoint = 'front'
            elif 'left' in filename:
                viewpoint = 'left'
            elif 'right' in filename:
                viewpoint = 'right'
            elif 'back' in filename:
                viewpoint = 'back'
            else:
                viewpoint = 'unknown'

            # 이미지 로드
            image = Image.open(image_path).convert('RGB')

            # 분석 시작 시간
            start_time = time.time()

            # 분석 실행 (LLM 비활성화: ConvNeXt+RAG 전용 성능 측정, 뷰포인트 필터 적용)
            result = await self.analyzer.analyze_image(image, image_path.name, use_llm=False, viewpoint=viewpoint)

            # 분석 종료 시간
            end_time = time.time()
            analysis_time = end_time - start_time

            if result['success']:
                return {
                    'image_path': str(image_path),
                    'filename': image_path.name,
                    'viewpoint': viewpoint,
                    'true_level': true_level,
                    'predicted_level': result['predicted_stage'],
                    'confidence': result['confidence'],
                    'analysis_time': analysis_time,
                    'stage_scores': result.get('stage_scores', {}),
                    'success': True,
                    'error': None
                }
            else:
                return {
                    'image_path': str(image_path),
                    'filename': image_path.name,
                    'viewpoint': viewpoint,
                    'true_level': true_level,
                    'predicted_level': None,
                    'confidence': 0.0,
                    'analysis_time': analysis_time,
                    'stage_scores': {},
                    'success': False,
                    'error': result.get('error', 'Unknown error')
                }

        except Exception as e:
            return {
                'image_path': str(image_path),
                'filename': image_path.name,
                'viewpoint': 'unknown',
                'true_level': true_level,
                'predicted_level': None,
                'confidence': 0.0,
                'analysis_time': 0.0,
                'stage_scores': {},
                'success': False,
                'error': str(e)
            }

    async def run_tests(self):
        """전체 테스트 실행"""
        print("다양한 Viewpoint Hair Loss Analyzer 성능 테스트 시작")

        # 테스트 데이터 로드
        test_data = self.load_test_data()

        if not test_data:
            print("테스트 데이터가 없습니다.")
            return

        # 애널라이저 초기화
        if not await self.initialize_analyzer():
            return

        # 각 레벨별 테스트 실행
        for level, image_files in test_data.items():
            print(f"\n레벨 {level} 테스트 중... ({len(image_files)}개 이미지)")

            for i, image_path in enumerate(image_files):
                print(f"  {i+1}/{len(image_files)}: {image_path.name}")

                result = await self.test_single_image(image_path, level)
                self.test_results.append(result)

                if not result['success']:
                    print(f"    실패: {result['error']}")
                else:
                    print(f"    예측: {result['predicted_level']} (신뢰도: {result['confidence']:.3f}, 뷰: {result['viewpoint']})")

        print(f"\n총 {len(self.test_results)}개 이미지 테스트 완료")

    def calculate_metrics(self) -> Dict:
        """성능 지표 계산"""
        print("\n성능 지표 계산 중...")

        # 성공한 테스트만 필터링
        successful_results = [r for r in self.test_results if r['success'] and r['predicted_level'] is not None]

        if not successful_results:
            print("성공한 테스트 결과가 없습니다.")
            return {}

        # 실제 레벨과 예측 레벨 추출
        y_true = [r['true_level'] for r in successful_results]
        y_pred = [r['predicted_level'] for r in successful_results]

        # 기본 지표 계산
        accuracy = accuracy_score(y_true, y_pred)
        precision, recall, f1, support = precision_recall_fscore_support(y_true, y_pred, average='weighted')

        # 클래스별 지표
        class_report = classification_report(y_true, y_pred, output_dict=True)

        # 컨퓨전 메트릭스
        cm = confusion_matrix(y_true, y_pred, labels=[2,3,4,5,6,7])

        # 평균 분석 시간
        avg_analysis_time = np.mean([r['analysis_time'] for r in successful_results])

        # 신뢰도 통계
        confidences = [r['confidence'] for r in successful_results]
        avg_confidence = np.mean(confidences)

        # 뷰포인트별 정확도
        viewpoint_accuracy = {}
        for viewpoint in ['top-down', 'front', 'left', 'right', 'back', 'unknown']:
            viewpoint_results = [r for r in successful_results if r['viewpoint'] == viewpoint]
            if viewpoint_results:
                vp_y_true = [r['true_level'] for r in viewpoint_results]
                vp_y_pred = [r['predicted_level'] for r in viewpoint_results]
                vp_accuracy = accuracy_score(vp_y_true, vp_y_pred)
                viewpoint_accuracy[viewpoint] = {
                    'accuracy': vp_accuracy,
                    'count': len(viewpoint_results)
                }

        metrics = {
            'total_tests': len(self.test_results),
            'successful_tests': len(successful_results),
            'failed_tests': len(self.test_results) - len(successful_results),
            'success_rate': len(successful_results) / len(self.test_results),
            'accuracy': accuracy,
            'precision': precision,
            'recall': recall,
            'f1_score': f1,
            'avg_analysis_time': avg_analysis_time,
            'avg_confidence': avg_confidence,
            'confusion_matrix': cm.tolist(),
            'class_report': class_report,
            'unique_labels': sorted(list(set(y_true + y_pred))),
            'viewpoint_accuracy': viewpoint_accuracy
        }

        return metrics

    def create_visualizations(self, metrics: Dict):
        """시각화 생성"""
        print("\n시각화 생성 중...")

        # 1. 컨퓨전 메트릭스 히트맵
        plt.figure(figsize=(10, 8))
        cm = np.array(metrics['confusion_matrix'])
        labels = metrics['unique_labels']

        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                    xticklabels=labels, yticklabels=labels)
        plt.title(f'Various Viewpoint Test{self.test_number} - Confusion Matrix')
        plt.xlabel('Predicted Level')
        plt.ylabel('True Level')
        plt.tight_layout()

        confusion_matrix_path = self.result_log_path / "confusion_matrix.png"
        plt.savefig(confusion_matrix_path, dpi=300, bbox_inches='tight')
        plt.close()

        # 2. 성능 지표 바 차트
        plt.figure(figsize=(10, 6))
        metrics_names = ['Accuracy', 'Precision', 'Recall', 'F1-Score']
        metrics_values = [metrics['accuracy'], metrics['precision'], metrics['recall'], metrics['f1_score']]

        bars = plt.bar(metrics_names, metrics_values, color=['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728'])
        plt.ylim(0, 1)
        plt.title(f'Various Viewpoint Test{self.test_number} - Performance Metrics')
        plt.ylabel('Score')

        for bar, value in zip(bars, metrics_values):
            plt.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.01,
                    f'{value:.3f}', ha='center', va='bottom')

        plt.tight_layout()
        metrics_chart_path = self.result_log_path / "performance_metrics.png"
        plt.savefig(metrics_chart_path, dpi=300, bbox_inches='tight')
        plt.close()

        # 3. 뷰포인트별 정확도 차트
        plt.figure(figsize=(12, 6))
        viewpoint_data = metrics['viewpoint_accuracy']
        viewpoints = list(viewpoint_data.keys())
        accuracies = [viewpoint_data[vp]['accuracy'] for vp in viewpoints]
        counts = [viewpoint_data[vp]['count'] for vp in viewpoints]

        bars = plt.bar(viewpoints, accuracies, color='skyblue')
        plt.ylim(0, 1)
        plt.title(f'Various Viewpoint Test{self.test_number} - Accuracy by Viewpoint')
        plt.ylabel('Accuracy')
        plt.xlabel('Viewpoint')

        # 개수 정보 추가
        for bar, acc, count in zip(bars, accuracies, counts):
            plt.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.01,
                    f'{acc:.3f}\n({count})', ha='center', va='bottom')

        plt.xticks(rotation=45)
        plt.tight_layout()
        viewpoint_chart_path = self.result_log_path / "viewpoint_accuracy.png"
        plt.savefig(viewpoint_chart_path, dpi=300, bbox_inches='tight')
        plt.close()

        print(f"컨퓨전 메트릭스 저장: {confusion_matrix_path}")
        print(f"성능 지표 차트 저장: {metrics_chart_path}")
        print(f"뷰포인트별 정확도 차트 저장: {viewpoint_chart_path}")

    def save_results(self, metrics: Dict):
        """결과 저장"""
        print("\n결과 저장 중...")

        # 레벨별 이미지 수 계산
        level_counts = {}
        viewpoint_counts = {}
        for result in self.test_results:
            level = result['true_level']
            viewpoint = result['viewpoint']
            level_counts[level] = level_counts.get(level, 0) + 1
            viewpoint_counts[viewpoint] = viewpoint_counts.get(viewpoint, 0) + 1

        # 상세 결과 저장 (JSON)
        detailed_results = {
            'test_info': {
                'test_type': 'various_viewpoint_analyzer',
                'test_number': self.test_number,
                'timestamp': datetime.now().isoformat(),
                'test_data_path': str(self.test_data_path),
                'samples_per_level': self.samples_per_level,
                'total_images': len(self.test_results),
                'level_counts': level_counts,
                'viewpoint_counts': viewpoint_counts
            },
            'metrics': metrics,
            'detailed_results': self.test_results
        }

        json_path = self.result_log_path / "results.json"
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(detailed_results, f, ensure_ascii=False, indent=2)

        # 요약 리포트 저장 (텍스트)
        report_path = self.result_log_path / "report.txt"
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write("=" * 70 + "\n")
            f.write(f"Viewpoint-Specific RAG Hair Loss Analyzer 성능 테스트 리포트 (Test{self.test_number})\n")
            f.write("=" * 70 + "\n")
            f.write(f"테스트 일시: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"테스트 데이터: {self.test_data_path}\n")
            f.write(f"레벨당 샘플 수: {self.samples_per_level}\n")
            f.write(f"RAG 검색 필터: male 이미지만 (입력 이미지와 동일한 뷰포인트만)\n")
            f.write("\n")

            f.write("📊 전체 결과\n")
            f.write("-" * 30 + "\n")
            f.write(f"총 테스트 수: {metrics['total_tests']}\n")
            f.write(f"성공한 테스트: {metrics['successful_tests']}\n")
            f.write(f"실패한 테스트: {metrics['failed_tests']}\n")
            f.write(f"성공률: {metrics['success_rate']:.1%}\n")
            f.write("\n")

            f.write("📁 레벨별 테스트 파일 수\n")
            f.write("-" * 30 + "\n")
            for level in sorted(level_counts.keys()):
                f.write(f"레벨 {level}: {level_counts[level]}개 파일\n")
            f.write("\n")

            f.write("🎥 뷰포인트별 테스트 파일 수\n")
            f.write("-" * 30 + "\n")
            for viewpoint in sorted(viewpoint_counts.keys()):
                f.write(f"{viewpoint}: {viewpoint_counts[viewpoint]}개 파일\n")
            f.write("\n")

            f.write("📈 성능 지표\n")
            f.write("-" * 30 + "\n")
            f.write(f"정확도 (Accuracy): {metrics['accuracy']:.3f}\n")
            f.write(f"정밀도 (Precision): {metrics['precision']:.3f}\n")
            f.write(f"재현율 (Recall): {metrics['recall']:.3f}\n")
            f.write(f"F1-Score: {metrics['f1_score']:.3f}\n")
            f.write("\n")

            f.write("🎥 뷰포인트별 정확도\n")
            f.write("-" * 30 + "\n")
            for viewpoint, data in metrics['viewpoint_accuracy'].items():
                f.write(f"{viewpoint}: {data['accuracy']:.3f} ({data['count']}개 샘플)\n")
            f.write("\n")

            f.write("⏱️ 성능 통계\n")
            f.write("-" * 30 + "\n")
            f.write(f"평균 분석 시간: {metrics['avg_analysis_time']:.3f}초\n")
            f.write(f"평균 신뢰도: {metrics['avg_confidence']:.3f}\n")
            f.write("\n")

            f.write("🎯 클래스별 성능\n")
            f.write("-" * 30 + "\n")
            for level in sorted(metrics['unique_labels']):
                level_str = str(level)
                if level_str in metrics['class_report']:
                    cr = metrics['class_report'][level_str]
                    f.write(f"레벨 {level}: 정밀도={cr['precision']:.3f}, 재현율={cr['recall']:.3f}, F1={cr['f1-score']:.3f}\n")

        print(f"상세 결과 저장: {json_path}")
        print(f"요약 리포트 저장: {report_path}")

        # CSV로도 저장
        df = pd.DataFrame(self.test_results)
        csv_path = self.result_log_path / "results.csv"
        df.to_csv(csv_path, index=False, encoding='utf-8-sig')
        print(f"CSV 데이터 저장: {csv_path}")


async def main():
    """메인 함수"""
    print("Viewpoint-Specific RAG Hair Loss Analyzer 성능 테스트 시작")
    print("=" * 70)
    print("테스트 조건: 각 레벨당 20건씩 랜덤 샘플링")
    print("RAG 검색 대상: male 이미지만 (입력 이미지와 동일한 뷰포인트만)")
    print("=" * 70)

    # 경로 설정
    test_data_path = "C:/Users/301/Desktop/test_data_set_all_pointview"
    base_log_path = "C:/Users/301/Desktop/main_project/backend/hair_classification/result_log/log"

    # 테스터 초기화 및 실행
    tester = VariousViewpointTester(test_data_path, base_log_path, samples_per_level=20)

    try:
        # 테스트 실행
        await tester.run_tests()

        # 성능 지표 계산
        metrics = tester.calculate_metrics()

        if metrics:
            # 시각화 생성
            tester.create_visualizations(metrics)

            # 결과 저장
            tester.save_results(metrics)

            print("\n" + "=" * 70)
            print(f"Viewpoint-Specific RAG 테스트 완료! (Test{tester.test_number})")
            print("=" * 70)
            print(f"정확도: {metrics['accuracy']:.1%}")
            print(f"F1-Score: {metrics['f1_score']:.3f}")
            print(f"평균 분석 시간: {metrics['avg_analysis_time']:.3f}초")
            print(f"📁 결과 저장 위치: {tester.result_log_path}")

            print("\n뷰포인트별 정확도:")
            for viewpoint, data in metrics['viewpoint_accuracy'].items():
                print(f"  {viewpoint}: {data['accuracy']:.1%} ({data['count']}개)")
        else:
            print("\n성능 지표 계산 실패")

    except KeyboardInterrupt:
        print("\n\n사용자에 의해 테스트가 중단되었습니다.")
    except Exception as e:
        print(f"\n테스트 실행 중 오류 발생: {e}")


if __name__ == "__main__":
    asyncio.run(main())