#!/usr/bin/env python3
"""
LLM 통합 Hair Loss Analyzer 테스트 (ConvNeXt + LLM)
"""

import os
import sys
import json
import time
import asyncio
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns
from datetime import datetime
from pathlib import Path
from PIL import Image
from typing import Dict, List, Any
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix, classification_report

# 백엔드 모듈 import
current_dir = Path(__file__).parent.parent.parent / "hair_loss_rag_analyzer_v0" / "backend"
sys.path.insert(0, str(current_dir))

# config 설정
class HardcodedSettings:
    UPLOAD_DIR = "C:/Users/301/Desktop/main_project/backend/hair_classification/hair_loss_rag_analyzer_v0/backend/uploads"
    EMBEDDING_DIMENSION = 1536
    MODEL_NAME = "convnext_large.fb_in22k_ft_in1k_384"
    DATASET_PATH = "C:/Users/301/Desktop/hair_loss_rag/hair_rag_dataset_image/hair_rag_dataset_ragging"
    FAISS_INDEX_PATH = "C:/Users/301/Desktop/main_project/backend/hair_classification/hair_loss_rag_analyzer_v0/backend/data/vector_index.faiss"
    STAGE_DESCRIPTIONS = {
        2: "경미한 탈모", 3: "초기 탈모", 4: "중기 탈모",
        5: "진행된 탈모", 6: "심한 탈모", 7: "매우 심한 탈모"
    }

# config를 직접 덮어쓰기
import app.config
app.config.settings = HardcodedSettings()

from app.services.hair_loss_analyzer import HairLossAnalyzer

class LLMIntegratedTestRunner:
    def __init__(self, test_data_path: str, log_base_path: str):
        self.test_data_path = Path(test_data_path)
        self.log_base_path = Path(log_base_path)
        self.test_number = self.get_next_test_number()
        self.log_path = self.log_base_path / f"llm_integrated_test{self.test_number}"
        self.llm_results = []

    def get_next_test_number(self):
        """다음 테스트 번호 반환"""
        if not self.log_base_path.exists():
            return 1

        existing_tests = [d.name for d in self.log_base_path.iterdir()
                         if d.is_dir() and d.name.startswith("llm_integrated_test")]

        if not existing_tests:
            return 1

        numbers = []
        for test_dir in existing_tests:
            try:
                num = int(test_dir.replace("llm_integrated_test", ""))
                numbers.append(num)
            except ValueError:
                continue

        return max(numbers) + 1 if numbers else 1

    def setup_logging(self):
        """로깅 디렉토리 설정"""
        self.log_path.mkdir(parents=True, exist_ok=True)
        print(f"로그 파일 저장: {self.log_path}")

    async def run_test(self):
        """LLM 통합 테스트 실행 (레벨 2-7)"""
        print("=" * 80)
        print("LLM 통합 Hair Loss Analyzer 테스트 (ConvNeXt + LLM)")
        print("=" * 80)
        print(f"LLM 통합 테스트 번호: {self.test_number}")
        print(f"테스트 데이터 경로: {self.test_data_path}")
        print(f"전체 로그 저장: {self.log_path}")

        self.setup_logging()

        # 이미지 수집 (레벨 2-7만)
        print("\nLLM 통합 테스트 시작")
        test_images = self.collect_test_images()

        if not test_images:
            print("[ERROR] 테스트 이미지를 찾을 수 없습니다.")
            return

        total_images = sum(len(images) for images in test_images.values())
        print(f"총 테스트 이미지: {total_images}개 (레벨 2-7)")

        # 예상 비용 계산 (GPT-4o-mini 기준)
        estimated_cost = total_images * 0.003  # 이미지당 약 $0.003 예상
        print(f"예상 LLM 분석 비용: ${estimated_cost:.3f}")

        # HairLossAnalyzer 초기화
        try:
            analyzer = HairLossAnalyzer()
            print("HairLossAnalyzer 초기화 완료 (LLM 통합)")
        except Exception as e:
            print(f"[ERROR] 초기화 실패: {e}")
            return

        # 레벨별 테스트 실행
        for level in range(2, 8):  # 레벨 2-7만 테스트
            if level not in test_images:
                continue

            level_images = test_images[level]
            print(f"\n레벨 {level} 테스트 시작... ({len(level_images)}개 이미지)")

            for idx, image_path in enumerate(level_images, 1):
                try:
                    image = Image.open(image_path).convert('RGB')

                    # LLM 통합 분석 (use_llm=True)
                    start_time = time.time()
                    result = await analyzer.analyze_image(image, image_path.name, use_llm=True)
                    analysis_time = time.time() - start_time

                    # 토큰 사용량 정확히 추출
                    analysis_details = result.get('analysis_details', {})
                    token_usage = analysis_details.get('token_usage', {})
                    total_tokens = token_usage.get('total_tokens', 0)

                    print(f"  [{idx + sum(len(test_images[l]) for l in range(2, level))}/{total_images}] {idx}/{len(level_images)}: {image_path.name}")
                    print(f"    LLM: {result.get('predicted_stage')} | 정답: {level} | 토큰: {total_tokens}")

                    self.llm_results.append({
                        'image_path': str(image_path),
                        'filename': image_path.name,
                        'true_level': level,
                        'predicted_level': result.get('predicted_stage'),
                        'confidence': result.get('confidence', 0),
                        'analysis_time': analysis_time,
                        'tokens_used': total_tokens,
                        'method': analysis_details.get('method', 'llm_integrated'),
                        'success': result.get('success', False)
                    })

                except Exception as e:
                    print(f"    [ERROR] {image_path.name}: {e}")
                    self.llm_results.append({
                        'image_path': str(image_path),
                        'filename': image_path.name,
                        'true_level': level,
                        'predicted_level': None,
                        'confidence': 0,
                        'analysis_time': 0,
                        'tokens_used': 0,
                        'method': 'error',
                        'success': False,
                        'error': str(e)
                    })

        print(f"\n총 {len(self.llm_results)}개 이미지 LLM 통합 테스트 완료")

        # 성능 분석 및 저장
        self.analyze_and_save_results()

    def collect_test_images(self):
        """테스트 이미지 수집 (레벨 2-7만)"""
        test_images = {}

        for level in range(2, 8):  # 레벨 2-7만
            level_patterns = [f"LEVEL_{level}", f"{level}", f"level_{level}"]
            level_path = None

            for pattern in level_patterns:
                candidate = self.test_data_path / pattern
                if candidate.exists():
                    level_path = candidate
                    break

            if level_path:
                image_files = []
                for ext in ['.jpg', '.jpeg', '.png']:
                    image_files.extend(list(level_path.glob(f"*{ext}")))
                    image_files.extend(list(level_path.glob(f"*{ext.upper()}")))

                if image_files:
                    test_images[level] = image_files
                    print(f"레벨 {level}: {len(image_files)}개 이미지 추가")

        return test_images

    def analyze_and_save_results(self):
        """결과 분석 및 저장"""
        if not self.llm_results:
            print("분석할 결과가 없습니다.")
            return

        # 성공한 결과만 필터링
        successful_results = [r for r in self.llm_results if r['success'] and r['predicted_level'] is not None]

        if not successful_results:
            print("성공한 테스트 결과가 없습니다.")
            return

        # 레벨 2-7만 고려
        true_labels = []
        predicted_labels = []

        # 레벨 2-7로 레이블 매핑
        level_mapping = {2: 0, 3: 1, 4: 2, 5: 3, 6: 4, 7: 5}
        reverse_mapping = {0: 2, 1: 3, 2: 4, 3: 5, 4: 6, 5: 7}

        for result in successful_results:
            true_level = result['true_level']
            pred_level = result['predicted_level']

            if true_level in level_mapping and pred_level in level_mapping:
                true_labels.append(level_mapping[true_level])
                predicted_labels.append(level_mapping[pred_level])

        if not true_labels:
            print("유효한 예측 결과가 없습니다.")
            return

        # 성능 지표 계산
        accuracy = accuracy_score(true_labels, predicted_labels)
        precision, recall, f1, _ = precision_recall_fscore_support(true_labels, predicted_labels, average='weighted', zero_division=0)

        # 토큰 사용량 통계
        total_tokens = sum(r['tokens_used'] for r in successful_results)
        avg_tokens = total_tokens / len(successful_results) if successful_results else 0
        estimated_cost = total_tokens * 0.000001 * 1.5  # GPT-4o-mini 비용

        # 분석 시간 통계
        avg_time = sum(r['analysis_time'] for r in successful_results) / len(successful_results)
        avg_confidence = sum(r['confidence'] for r in successful_results) / len(successful_results)

        # 결과 출력
        print(f"\n🤖 LLM 통합 성능 (레벨 2-7)")
        print(f"성공한 테스트: {len(successful_results)}")
        print(f"정확도: {accuracy:.1%}")
        print(f"정밀도: {precision:.3f}")
        print(f"재현율: {recall:.3f}")
        print(f"F1-Score: {f1:.3f}")
        print(f"평균 분석 시간: {avg_time:.3f}초")
        print(f"평균 신뢰도: {avg_confidence:.3f}")
        print(f"총 토큰 사용량: {total_tokens:,}")
        print(f"평균 토큰: {avg_tokens:.0f}")
        print(f"총 예상 비용: ${estimated_cost:.5f}")

        # 결과 저장
        self.save_results(successful_results, {
            'accuracy': accuracy,
            'precision': precision,
            'recall': recall,
            'f1_score': f1,
            'avg_analysis_time': avg_time,
            'avg_confidence': avg_confidence,
            'total_tokens': total_tokens,
            'avg_tokens': avg_tokens,
            'estimated_cost': estimated_cost,
            'total_tests': len(successful_results)
        })

        # 시각화
        self.create_visualizations(true_labels, predicted_labels, reverse_mapping)

        print(f"LLM 통합 성능 테스트 완료! (Test{self.test_number}, 레벨 2-7)")

    def save_results(self, results, metrics):
        """결과 JSON 및 텍스트 저장"""

        # JSON 결과 저장
        results_data = {
            'test_info': {
                'test_number': self.test_number,
                'test_type': 'llm_integrated',
                'test_date': datetime.now().isoformat(),
                'test_levels': '2-7',
                'total_images': len(results)
            },
            'metrics': metrics,
            'detailed_results': results
        }

        json_path = self.log_path / "llm_integrated_results.json"
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(results_data, f, ensure_ascii=False, indent=2)

        # 텍스트 리포트 저장
        report_path = self.log_path / "llm_integrated_report.txt"
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write("=" * 80 + "\n")
            f.write(f"LLM 통합 성능 테스트 리포트 (Test{self.test_number}, 레벨 2-7)\n")
            f.write("=" * 80 + "\n")
            f.write(f"테스트 일시: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"테스트 데이터: {self.test_data_path}\n")
            f.write(f"총 테스트 이미지: {len(results)}\n")
            f.write(f"테스트 레벨: 2-7\n\n")

            f.write("🤖 LLM 통합 성능 (레벨 2-7)\n")
            f.write("-" * 40 + "\n")
            f.write(f"성공한 테스트: {metrics['total_tests']}\n")
            f.write(f"정확도: {metrics['accuracy']:.1%}\n")
            f.write(f"정밀도: {metrics['precision']:.3f}\n")
            f.write(f"재현율: {metrics['recall']:.3f}\n")
            f.write(f"F1-Score: {metrics['f1_score']:.3f}\n")
            f.write(f"평균 분석 시간: {metrics['avg_analysis_time']:.3f}초\n")
            f.write(f"평균 신뢰도: {metrics['avg_confidence']:.3f}\n\n")

            f.write("💰 LLM 비용 분석 (레벨 2-7)\n")
            f.write("-" * 40 + "\n")
            f.write(f"총 토큰 사용량: {metrics['total_tokens']:,}\n")
            f.write(f"이미지당 평균 토큰: {metrics['avg_tokens']:.0f}\n")
            f.write(f"총 예상 비용: ${metrics['estimated_cost']:.5f}\n")
            f.write(f"이미지당 평균 비용: ${metrics['estimated_cost']/metrics['total_tests']:.5f}\n\n")

        print(f"상세 결과 저장: {json_path}")
        print(f"리포트 저장: {report_path}")

    def create_visualizations(self, true_labels, predicted_labels, reverse_mapping):
        """성능 시각화 생성"""

        # 한글 폰트 설정
        plt.rcParams['font.family'] = ['Malgun Gothic', 'AppleGothic', 'DejaVu Sans']
        plt.rcParams['axes.unicode_minus'] = False

        # 컨퓨전 매트릭스
        cm = confusion_matrix(true_labels, predicted_labels)

        plt.figure(figsize=(10, 8))
        labels = [f"레벨 {reverse_mapping[i]}" for i in range(len(reverse_mapping))]
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues',
                    xticklabels=labels, yticklabels=labels)
        plt.title(f'LLM 통합 성능 컨퓨전 매트릭스 (Test{self.test_number})')
        plt.ylabel('실제 레벨')
        plt.xlabel('예측 레벨')
        plt.tight_layout()

        cm_path = self.log_path / "llm_integrated_confusion_matrix.png"
        plt.savefig(cm_path, dpi=300, bbox_inches='tight')
        plt.close()

        print(f"컨퓨전 매트릭스 저장: {cm_path}")

async def main():
    test_data_path = "C:/Users/301/Desktop/test_data_set/test"
    log_base_path = "../log"

    runner = LLMIntegratedTestRunner(test_data_path, log_base_path)
    await runner.run_test()

if __name__ == "__main__":
    asyncio.run(main())