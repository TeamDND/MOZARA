#!/usr/bin/env python3
"""
LLM 통합 Hair Loss Analyzer 성능 테스트 스크립트
"""

import os
import sys
import json
import time
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple
import numpy as np
import pandas as pd
from PIL import Image

# 백엔드 모듈 import를 위한 경로 추가
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

# 하드코딩된 경로로 config 우회
class HardcodedSettings:
    UPLOAD_DIR = "C:/Users/301/Desktop/main_project/backend/hair_classification/hair_loss_rag_analyzer_v0/backend/uploads"
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
import app.config
app.config.settings = HardcodedSettings()

from app.services.hair_loss_analyzer import HairLossAnalyzer
settings = HardcodedSettings()


class LLMEnhancedAnalyzerTester:
    def __init__(self, test_data_path: str, base_log_path: str):
        """
        LLM 통합 애널라이저 테스터 초기화
        """
        self.test_data_path = Path(test_data_path)
        self.base_log_path = Path(base_log_path)

        # 테스트 번호 결정
        self.test_number = self.get_next_test_number()
        self.result_log_path = self.base_log_path / f"llm_enhanced_test{self.test_number}"

        self.analyzer = None
        self.faiss_results = []  # FAISS 전용 결과
        self.llm_results = []    # LLM 통합 결과

        # 결과 로그 디렉터리 생성
        self.result_log_path.mkdir(parents=True, exist_ok=True)

        print(f"[INFO] LLM 통합 테스트 번호: {self.test_number}")
        print(f"[INFO] 테스트 데이터 경로: {self.test_data_path}")
        print(f"[INFO] 결과 로그 경로: {self.result_log_path}")

    def get_next_test_number(self) -> int:
        """다음 테스트 번호 결정"""
        if not self.base_log_path.exists():
            return 1

        existing_tests = [d for d in self.base_log_path.iterdir()
                         if d.is_dir() and 'llm_enhanced_test' in d.name]
        if not existing_tests:
            return 1

        test_numbers = []
        for test_dir in existing_tests:
            try:
                num = int(test_dir.name.replace('llm_enhanced_test', ''))
                test_numbers.append(num)
            except ValueError:
                continue

        return max(test_numbers) + 1 if test_numbers else 1

    async def initialize_analyzer(self):
        """HairLossAnalyzer 초기화"""
        try:
            print("[INIT] HairLossAnalyzer 초기화 중...")
            self.analyzer = HairLossAnalyzer()
            print("[SUCCESS] HairLossAnalyzer 초기화 완료 (LLM 통합)")
            return True
        except Exception as e:
            print(f"[ERROR] HairLossAnalyzer 초기화 실패: {e}")
            return False

    def load_test_data(self) -> Dict[int, List[Path]]:
        """테스트 데이터 로드"""
        test_data = {}

        # 일반적인 테스트 데이터 경로들 확인
        possible_paths = [
            self.test_data_path,
            Path("C:/Users/301/Desktop/test_data_set/test"),
            Path("C:/Users/301/Desktop/hair_loss_rag/hair_rag_dataset_image/hair_rag_dataset_ragging"),
        ]

        actual_test_path = None
        for path in possible_paths:
            if path.exists():
                actual_test_path = path
                print(f"[FOUND] 테스트 데이터 경로 발견: {path}")
                break

        if not actual_test_path:
            print("[ERROR] 테스트 데이터 경로를 찾을 수 없습니다.")
            return {}

        # 레벨별 폴더 찾기
        for level in range(2, 8):  # 레벨 2-7
            level_patterns = [f"LEVEL_{level}", f"level_{level}", f"{level}", f"level{level}"]

            level_path = None
            for pattern in level_patterns:
                candidate_path = actual_test_path / pattern
                if candidate_path.exists():
                    level_path = candidate_path
                    break

            if not level_path:
                print(f"[WARNING] 레벨 {level} 폴더를 찾을 수 없습니다")
                continue

            # 이미지 파일 찾기
            image_files = []
            for ext in ['.jpg', '.jpeg', '.png', '.bmp']:
                image_files.extend(list(level_path.glob(f"*{ext}")))
                image_files.extend(list(level_path.glob(f"*{ext.upper()}")))

            # 중복 제거
            image_files = list(set(image_files))

            # 테스트용으로 각 레벨당 최대 3개만 선택 (비용 절약)
            if len(image_files) > 3:
                image_files = image_files[:3]
                print(f"[INFO] 레벨 {level}: {len(image_files)}개 이미지 선택 (비용 절약을 위해 제한)")
            else:
                print(f"[INFO] 레벨 {level}: {len(image_files)}개 이미지")

            test_data[level] = image_files

        total_images = sum(len(files) for files in test_data.values())
        estimated_cost = total_images * 0.003  # GPT-4o-mini 추정 비용
        print(f"[INFO] 총 테스트 이미지: {total_images}개")
        print(f"[COST] 예상 비용: ${estimated_cost:.3f}")

        return test_data

    async def test_single_image_both_methods(self, image_path: Path, true_level: int) -> Tuple[Dict, Dict]:
        """
        단일 이미지를 FAISS와 LLM 두 방법으로 테스트
        """
        try:
            image = Image.open(image_path).convert('RGB')

            # 1. FAISS 전용 분석
            print(f"    [FAISS] 분석 중...")
            start_time = time.time()
            faiss_result = await self.analyzer.analyze_image(image, image_path.name, use_llm=False)
            faiss_time = time.time() - start_time

            # 2. LLM 통합 분석
            print(f"    [LLM] 통합 분석 중...")
            start_time = time.time()
            llm_result = await self.analyzer.analyze_image(image, image_path.name, use_llm=True)
            llm_time = time.time() - start_time

            # FAISS 결과 정리
            faiss_test_result = {
                'image_path': str(image_path),
                'filename': image_path.name,
                'true_level': true_level,
                'predicted_level': faiss_result.get('predicted_stage') if faiss_result['success'] else None,
                'confidence': faiss_result.get('confidence', 0.0) if faiss_result['success'] else 0.0,
                'analysis_time': faiss_time,
                'method': 'faiss_only',
                'success': faiss_result['success'],
                'error': faiss_result.get('error') if not faiss_result['success'] else None
            }

            # LLM 결과 정리
            llm_test_result = {
                'image_path': str(image_path),
                'filename': image_path.name,
                'true_level': true_level,
                'predicted_level': llm_result.get('predicted_stage') if llm_result['success'] else None,
                'confidence': llm_result.get('confidence', 0.0) if llm_result['success'] else 0.0,
                'analysis_time': llm_time,
                'method': llm_result.get('analysis_details', {}).get('method', 'llm_enhanced'),
                'success': llm_result['success'],
                'error': llm_result.get('error') if not llm_result['success'] else None,
                'llm_analysis': llm_result.get('analysis_details', {}).get('llm_analysis', {}),
                'token_usage': llm_result.get('analysis_details', {}).get('token_usage', {})
            }

            return faiss_test_result, llm_test_result

        except Exception as e:
            error_result = {
                'image_path': str(image_path),
                'filename': image_path.name,
                'true_level': true_level,
                'predicted_level': None,
                'confidence': 0.0,
                'analysis_time': 0.0,
                'success': False,
                'error': str(e)
            }
            return error_result, error_result

    async def run_comparative_tests(self):
        """FAISS vs LLM 비교 테스트 실행"""
        print("[START] LLM 통합 vs FAISS 비교 테스트 시작")

        # 테스트 데이터 로드
        test_data = self.load_test_data()
        if not test_data:
            print("[ERROR] 테스트 데이터가 없습니다.")
            return

        # 애널라이저 초기화
        if not await self.initialize_analyzer():
            return

        # 각 레벨별 테스트 실행
        for level, image_files in test_data.items():
            print(f"\n[LEVEL {level}] 테스트 중... ({len(image_files)}개 이미지)")

            for i, image_path in enumerate(image_files):
                print(f"  [{i+1}/{len(image_files)}] {image_path.name}")

                faiss_result, llm_result = await self.test_single_image_both_methods(image_path, level)

                self.faiss_results.append(faiss_result)
                self.llm_results.append(llm_result)

                # 결과 출력
                if faiss_result['success']:
                    print(f"    [FAISS] 예측: {faiss_result['predicted_level']} (신뢰도: {faiss_result['confidence']:.3f})")
                else:
                    print(f"    [FAISS] 실패: {faiss_result['error']}")

                if llm_result['success']:
                    print(f"    [LLM] 예측: {llm_result['predicted_level']} (신뢰도: {llm_result['confidence']:.3f})")
                    if 'token_usage' in llm_result and llm_result['token_usage']:
                        tokens = llm_result['token_usage'].get('total_tokens', 0)
                        print(f"    [TOKEN] 사용량: {tokens}")
                else:
                    print(f"    [LLM] 실패: {llm_result['error']}")

        print(f"\n[COMPLETE] 총 {len(self.faiss_results)}개 이미지 비교 테스트 완료")

    def calculate_comparative_metrics(self) -> Dict:
        """FAISS vs LLM 비교 메트릭 계산"""
        print("\n[METRICS] 비교 성능 지표 계산 중...")

        # FAISS 결과 분석
        faiss_successful = [r for r in self.faiss_results if r['success'] and r['predicted_level'] is not None]
        faiss_accuracy = 0
        if faiss_successful:
            faiss_y_true = [r['true_level'] for r in faiss_successful]
            faiss_y_pred = [r['predicted_level'] for r in faiss_successful]
            faiss_accuracy = sum(1 for t, p in zip(faiss_y_true, faiss_y_pred) if t == p) / len(faiss_y_true)

        # LLM 결과 분석
        llm_successful = [r for r in self.llm_results if r['success'] and r['predicted_level'] is not None]
        llm_accuracy = 0
        if llm_successful:
            llm_y_true = [r['true_level'] for r in llm_successful]
            llm_y_pred = [r['predicted_level'] for r in llm_successful]
            llm_accuracy = sum(1 for t, p in zip(llm_y_true, llm_y_pred) if t == p) / len(llm_y_true)

        # 토큰 사용량 계산
        total_tokens = sum(r.get('token_usage', {}).get('total_tokens', 0) for r in self.llm_results)
        estimated_cost = total_tokens * 0.000001 * 1.5  # GPT-4o-mini 대략적 비용

        # 평균 분석 시간
        faiss_avg_time = np.mean([r['analysis_time'] for r in faiss_successful]) if faiss_successful else 0
        llm_avg_time = np.mean([r['analysis_time'] for r in llm_successful]) if llm_successful else 0

        metrics = {
            'test_info': {
                'total_tests': len(self.faiss_results),
                'timestamp': datetime.now().isoformat()
            },
            'faiss_performance': {
                'successful_tests': len(faiss_successful),
                'accuracy': faiss_accuracy,
                'avg_analysis_time': faiss_avg_time,
                'success_rate': len(faiss_successful) / len(self.faiss_results) if self.faiss_results else 0
            },
            'llm_performance': {
                'successful_tests': len(llm_successful),
                'accuracy': llm_accuracy,
                'avg_analysis_time': llm_avg_time,
                'success_rate': len(llm_successful) / len(self.llm_results) if self.llm_results else 0,
                'total_tokens_used': total_tokens,
                'estimated_cost_usd': estimated_cost
            },
            'comparison': {
                'accuracy_improvement': llm_accuracy - faiss_accuracy,
                'time_overhead': llm_avg_time - faiss_avg_time,
                'cost_per_analysis': estimated_cost / len(self.llm_results) if self.llm_results else 0
            }
        }

        return metrics

    def save_comparative_results(self, metrics: Dict):
        """비교 결과 저장"""
        print("\n[SAVE] 비교 결과 저장 중...")

        # 상세 결과 저장
        detailed_results = {
            'test_info': {
                'test_type': 'llm_enhanced_comparative',
                'test_number': self.test_number,
                'timestamp': datetime.now().isoformat(),
                'total_images': len(self.faiss_results)
            },
            'metrics': metrics,
            'faiss_results': self.faiss_results,
            'llm_results': self.llm_results
        }

        json_path = self.result_log_path / "comparative_results.json"
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(detailed_results, f, ensure_ascii=False, indent=2)

        # 요약 리포트 저장
        report_path = self.result_log_path / "comparison_report.txt"
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write("=" * 70 + "\n")
            f.write(f"LLM 통합 vs FAISS 성능 비교 리포트 (Test{self.test_number})\n")
            f.write("=" * 70 + "\n")
            f.write(f"테스트 일시: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"총 테스트 수: {metrics['test_info']['total_tests']}\n\n")

            # FAISS 성능
            f.write("📊 FAISS 전용 성능\n")
            f.write("-" * 30 + "\n")
            faiss_perf = metrics['faiss_performance']
            f.write(f"정확도: {faiss_perf['accuracy']:.1%}\n")
            f.write(f"성공률: {faiss_perf['success_rate']:.1%}\n")
            f.write(f"평균 분석 시간: {faiss_perf['avg_analysis_time']:.3f}초\n\n")

            # LLM 통합 성능
            f.write("🤖 LLM 통합 성능\n")
            f.write("-" * 30 + "\n")
            llm_perf = metrics['llm_performance']
            f.write(f"정확도: {llm_perf['accuracy']:.1%}\n")
            f.write(f"성공률: {llm_perf['success_rate']:.1%}\n")
            f.write(f"평균 분석 시간: {llm_perf['avg_analysis_time']:.3f}초\n")
            f.write(f"총 토큰 사용량: {llm_perf['total_tokens_used']:,}\n")
            f.write(f"예상 비용: ${llm_perf['estimated_cost_usd']:.4f}\n\n")

            # 비교 결과
            f.write("📈 성능 비교\n")
            f.write("-" * 30 + "\n")
            comp = metrics['comparison']
            f.write(f"정확도 개선: {comp['accuracy_improvement']:+.1%}\n")
            f.write(f"시간 오버헤드: {comp['time_overhead']:+.3f}초\n")
            f.write(f"분석당 비용: ${comp['cost_per_analysis']:.5f}\n")

        print(f"[SUCCESS] 상세 결과: {json_path}")
        print(f"[SUCCESS] 요약 리포트: {report_path}")


async def main():
    """메인 함수"""
    print("LLM 통합 Hair Loss Analyzer 비교 테스트")
    print("=" * 70)

    # 경로 설정
    test_data_path = "C:/Users/301/Desktop/test_data_set/test"
    base_log_path = "C:/Users/301/Desktop/main_project/backend/hair_classification/result_log/log"

    # 테스터 초기화 및 실행
    tester = LLMEnhancedAnalyzerTester(test_data_path, base_log_path)

    try:
        # 비교 테스트 실행
        await tester.run_comparative_tests()

        # 성능 지표 계산
        metrics = tester.calculate_comparative_metrics()

        if metrics:
            # 결과 저장
            tester.save_comparative_results(metrics)

            print("\n" + "=" * 70)
            print(f"LLM 통합 비교 테스트 완료! (Test{tester.test_number})")
            print("=" * 70)

            faiss_acc = metrics['faiss_performance']['accuracy']
            llm_acc = metrics['llm_performance']['accuracy']
            improvement = metrics['comparison']['accuracy_improvement']
            cost = metrics['llm_performance']['estimated_cost_usd']

            print(f"FAISS 정확도: {faiss_acc:.1%}")
            print(f"LLM 통합 정확도: {llm_acc:.1%}")
            print(f"성능 개선: {improvement:+.1%}")
            print(f"총 비용: ${cost:.4f}")
            print(f"📁 결과 저장: {tester.result_log_path}")
        else:
            print("\n[ERROR] 성능 지표 계산 실패")

    except KeyboardInterrupt:
        print("\n\n[STOP] 사용자에 의해 테스트가 중단되었습니다.")
    except Exception as e:
        print(f"\n[ERROR] 테스트 실행 중 오류: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())