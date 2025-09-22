#!/usr/bin/env python3
"""
제미나이 분석기 성능 테스트 스크립트 (로그인 기능 추가)
"""

import os
import json
import time
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import (
    confusion_matrix, classification_report,
    accuracy_score, precision_recall_fscore_support
)
import aiohttp
import aiofiles


def get_next_test_number(base_log_path: Path) -> int:
    """다음 테스트 번호 결정"""
    if not base_log_path.exists():
        return 1

    existing_tests = [d for d in base_log_path.iterdir() if d.is_dir() and d.name.startswith('test')]
    if not existing_tests:
        return 1

    test_numbers = []
    for test_dir in existing_tests:
        try:
            num = int(test_dir.name.replace('test', ''))
            test_numbers.append(num)
        except ValueError:
            continue

    return max(test_numbers) + 1 if test_numbers else 1


class GeminiAnalyzerTester:
    def __init__(self, test_data_path: str, base_log_path: str, api_base_url: str = "http://localhost:8080"):
        """
        제미나이 애널라이저 테스터 초기화
        """
        self.test_data_path = Path(test_data_path)
        self.base_log_path = Path(base_log_path)
        self.test_number = get_next_test_number(self.base_log_path)
        self.result_log_path = self.base_log_path / f"test{self.test_number}"
        self.api_base_url = api_base_url
        self.api_endpoint = f"{self.api_base_url}/api/ai/gemini-check/analyze"
        self.test_results = []
        self.jwt_token = None  # JWT 토큰 저장

        self.result_log_path.mkdir(parents=True, exist_ok=True)

        print(f"테스트 번호: {self.test_number}")
        print(f"테스트 데이터 경로: {self.test_data_path}")
        print(f"결과 로그 경로: {self.result_log_path}")
        print(f"API 엔드포인트: {self.api_endpoint}")

    def load_test_data(self) -> Dict[int, List[Path]]:
        """
        테스트 데이터 로드 (레벨 2-7)
        """
        test_data = {}
        for level in range(2, 8):  # 레벨 2-7 테스트
            level_path = self.test_data_path / str(level)
            if not level_path.exists():
                print(f"경고: 레벨 {level} 폴더가 존재하지 않습니다: {level_path}")
                continue
            image_files = []
            for ext in ['.jpg', '.jpeg', '.png', '.bmp']:
                image_files.extend(list(level_path.glob(f"*{ext}")))
                image_files.extend(list(level_path.glob(f"*{ext.upper()}")))
            test_data[level] = image_files[:20]  # 레벨당 20개로 제한
            print(f"레벨 {level}: {len(image_files[:7])}개 이미지 파일 (전체 {len(image_files)}개 중)")
        total_images = sum(len(files) for files in test_data.values())
        print(f"총 테스트 이미지: {total_images}개")
        return test_data

    async def login_and_get_token(self, username, password) -> bool:
        """API에 로그인하여 JWT 토큰을 발급받습니다."""
        login_url = f"{self.api_base_url}/api/login"
        credentials = {"username": username, "password": password}
        print(f"'{login_url}'에 로그인을 시도합니다...")

        async with aiohttp.ClientSession() as session:
            try:
                async with session.post(login_url, json=credentials, timeout=15) as response:
                    if response.status == 200:
                        auth_header = response.headers.get("Authorization")
                        if auth_header and auth_header.startswith("Bearer "):
                            self.jwt_token = auth_header
                            print("로그인 성공. JWT 토큰을 발급받았습니다.")
                            return True
                        else:
                            print("로그인에 성공했지만, 응답 헤더에서 'Authorization: Bearer <토큰>'을 찾을 수 없습니다.")
                            return False
                    else:
                        error_text = await response.text()
                        print(f"로그인 실패. 상태 코드: {response.status}, 메시지: {error_text}")
                        return False
            except Exception as e:
                print(f"로그인 중 예외 발생: {e}")
                return False

    async def test_single_image(self, session: aiohttp.ClientSession, image_path: Path, true_level: int) -> Dict:
        """인증 헤더를 포함하여 단일 이미지를 테스트합니다."""
        headers = {"Authorization": self.jwt_token}
        try:
            async with aiofiles.open(image_path, 'rb') as f:
                image_data = await f.read()

            data = aiohttp.FormData()
            data.add_field('image', image_data, filename=image_path.name, content_type='image/jpeg')

            start_time = time.time()
            async with session.post(self.api_endpoint, data=data, headers=headers, timeout=30) as response:
                end_time = time.time()
                analysis_time = end_time - start_time

                if response.status == 200:
                    result = await response.json()
                    return {
                        'image_path': str(image_path), 'filename': image_path.name, 'true_level': true_level,
                        'predicted_stage': result.get('stage'), 'gemini_title': result.get('title', ''),
                        'gemini_description': result.get('description', ''), 'gemini_advice': result.get('advice', []),
                        'analysis_time': analysis_time, 'success': True, 'error': None, 'api_status': response.status
                    }
                else:
                    error_text = await response.text()
                    return {
                        'image_path': str(image_path), 'filename': image_path.name, 'true_level': true_level,
                        'predicted_stage': None, 'analysis_time': analysis_time, 'success': False,
                        'error': f"HTTP {response.status}: {error_text}", 'api_status': response.status
                    }
        except Exception as e:
            return {
                'image_path': str(image_path), 'filename': image_path.name, 'true_level': true_level,
                'predicted_stage': None, 'analysis_time': 0.0, 'success': False,
                'error': str(e), 'api_status': None
            }

    async def run_tests(self, username, password):
        """로그인 과정을 포함하여 전체 테스트를 실행합니다."""
        print("제미나이 분석기 성능 테스트 시작")

        if not await self.login_and_get_token(username, password):
            print("로그인 실패로 인해 테스트를 중단합니다.")
            return

        test_data = self.load_test_data()
        if not test_data:
            print("테스트 데이터가 없습니다.")
            return

        async with aiohttp.ClientSession() as session:
            for level, image_files in test_data.items():
                print(f"\n레벨 {level} 테스트 중... ({len(image_files)}개 이미지)")
                for i, image_path in enumerate(image_files):
                    print(f"  {i+1}/{len(image_files)}: {image_path.name}")
                    result = await self.test_single_image(session, image_path, level)
                    self.test_results.append(result)
                    if not result['success']:
                        print(f"    실패: {result['error']}")
                    else:
                        print(f"    예측: Stage {result['predicted_stage']} - {result['gemini_title']}")
                    await asyncio.sleep(10)  # 할당량 문제 해결을 위해 10초 대기

        print(f"\n총 {len(self.test_results)}개 이미지 테스트 완료")

    def map_gemini_to_backend_level(self, gemini_stage: int) -> int:
        """제미나이 stage를 백엔드 레벨로 매핑합니다."""
        mapping = {0: 2, 1: 3, 2: 5, 3: 7}
        return mapping.get(gemini_stage, gemini_stage + 2)

    def calculate_metrics(self) -> Dict:
        """성능 지표를 계산합니다."""
        print("\n성능 지표 계산 중...")
        successful_results = [r for r in self.test_results if r['success'] and r['predicted_stage'] is not None]
        if not successful_results:
            print("성공한 테스트 결과가 없습니다.")
            return {}

        y_true = [r['true_level'] for r in successful_results]
        y_pred_raw = [r['predicted_stage'] for r in successful_results]
        y_pred_mapped = [self.map_gemini_to_backend_level(stage) for stage in y_pred_raw]

        # 원본 제미나이 stage로 계산
        accuracy_raw, precision_raw, recall_raw, f1_raw = (0,0,0,0)
        cm_raw, class_report_raw = np.array([[0]]), {}
        try:
            accuracy_raw = accuracy_score(y_true, y_pred_raw)
            precision_raw, recall_raw, f1_raw, _ = precision_recall_fscore_support(y_true, y_pred_raw, average='weighted', zero_division=0)
            cm_raw = confusion_matrix(y_true, y_pred_raw)
            class_report_raw = classification_report(y_true, y_pred_raw, output_dict=True, zero_division=0)
        except Exception as e:
            print(f"원본 Stage 지표 계산 오류: {e}")


        # 매핑된 레벨로 계산
        accuracy_mapped, precision_mapped, recall_mapped, f1_mapped = (0,0,0,0)
        cm_mapped, class_report_mapped = np.array([[0]]), {}
        try:
            accuracy_mapped = accuracy_score(y_true, y_pred_mapped)
            precision_mapped, recall_mapped, f1_mapped, _ = precision_recall_fscore_support(y_true, y_pred_mapped, average='weighted', zero_division=0)
            cm_mapped = confusion_matrix(y_true, y_pred_mapped)
            class_report_mapped = classification_report(y_true, y_pred_mapped, output_dict=True, zero_division=0)
        except Exception as e:
            print(f"매핑된 Level 지표 계산 오류: {e}")

        status_counts = {}
        for result in self.test_results:
            status = result.get('api_status', 'unknown')
            status_counts[status] = status_counts.get(status, 0) + 1

        return {
            'total_tests': len(self.test_results),
            'successful_tests': len(successful_results),
            'failed_tests': len(self.test_results) - len(successful_results),
            'success_rate': len(successful_results) / len(self.test_results) if self.test_results else 0,
            'raw_metrics': {
                'accuracy': accuracy_raw, 'precision': precision_raw, 'recall': recall_raw, 'f1_score': f1_raw,
                'confusion_matrix': cm_raw.tolist(), 'class_report': class_report_raw,
                'unique_labels': sorted(list(set(y_true + y_pred_raw)))
            },
            'mapped_metrics': {
                'accuracy': accuracy_mapped, 'precision': precision_mapped, 'recall': recall_mapped, 'f1_score': f1_mapped,
                'confusion_matrix': cm_mapped.tolist(), 'class_report': class_report_mapped,
                'unique_labels': sorted(list(set(y_true + y_pred_mapped)))
            },
            'avg_analysis_time': np.mean([r['analysis_time'] for r in successful_results]) if successful_results else 0,
            'api_status_counts': status_counts
        }

    def create_visualizations(self, metrics: Dict):
        """시각화 자료를 생성합니다."""
        print("\n시각화 생성 중...")
        plt.figure(figsize=(12, 5))
        plt.subplot(1, 2, 1)
        cm_raw = np.array(metrics['raw_metrics']['confusion_matrix'])
        labels_raw = metrics['raw_metrics']['unique_labels']
        if cm_raw.size > 1:
            sns.heatmap(cm_raw, annot=True, fmt='d', cmap='Blues', xticklabels=labels_raw, yticklabels=labels_raw)
        plt.title(f'Gemini Test{self.test_number} - Raw Stage Prediction')
        plt.xlabel('Predicted Stage (Gemini 0-3)')
        plt.ylabel('True Level (Backend 2-7)')

        plt.subplot(1, 2, 2)
        cm_mapped = np.array(metrics['mapped_metrics']['confusion_matrix'])
        labels_mapped = metrics['mapped_metrics']['unique_labels']
        if cm_mapped.size > 1:
            sns.heatmap(cm_mapped, annot=True, fmt='d', cmap='Greens', xticklabels=labels_mapped, yticklabels=labels_mapped)
        plt.title(f'Gemini Test{self.test_number} - Mapped Level Prediction')
        plt.xlabel('Predicted Level (Mapped 2-7)')
        plt.ylabel('True Level (Backend 2-7)')

        plt.tight_layout()
        confusion_matrix_path = self.result_log_path / "confusion_matrix.png"
        plt.savefig(confusion_matrix_path, dpi=300, bbox_inches='tight')
        plt.close()
        print(f"컨퓨전 메트릭스 저장: {confusion_matrix_path}")

    def save_results(self, metrics: Dict):
        """결과를 파일로 저장합니다."""
        print("\n결과 저장 중...")

        # 레벨별 이미지 수 계산
        level_counts = {}
        for result in self.test_results:
            level = result['true_level']
            level_counts[level] = level_counts.get(level, 0) + 1

        detailed_results = {
            'test_info': {
                'test_type': 'gemini_analyzer', 'test_number': self.test_number,
                'timestamp': datetime.now().isoformat(), 'test_data_path': str(self.test_data_path),
                'api_endpoint': self.api_endpoint, 'total_images': len(self.test_results),
                'level_counts': level_counts
            },
            'metrics': metrics, 'detailed_results': self.test_results
        }
        json_path = self.result_log_path / "results.json"
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(detailed_results, f, ensure_ascii=False, indent=2)
        print(f"상세 결과(JSON) 저장: {json_path}")

        report_path = self.result_log_path / "report.txt"
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write("=" * 60 + "\n")
            f.write(f"제미나이 Hair Loss Analyzer 성능 테스트 리포트 (Test{self.test_number})\n")
            f.write("=" * 60 + "\n")
            f.write(f"테스트 일시: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"테스트 데이터: {self.test_data_path}\n")
            f.write(f"API 엔드포인트: {self.api_endpoint}\n")
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

            f.write("📈 원본 Stage 성능 지표\n")
            f.write("-" * 30 + "\n")
            f.write(f"정확도: {metrics['raw_metrics']['accuracy']:.3f}\n")
            f.write(f"정밀도: {metrics['raw_metrics']['precision']:.3f}\n")
            f.write(f"재현율: {metrics['raw_metrics']['recall']:.3f}\n")
            f.write(f"F1-Score: {metrics['raw_metrics']['f1_score']:.3f}\n")
            f.write("\n")

            f.write("📈 매핑된 Level 성능 지표\n")
            f.write("-" * 30 + "\n")
            f.write(f"정확도: {metrics['mapped_metrics']['accuracy']:.3f}\n")
            f.write(f"정밀도: {metrics['mapped_metrics']['precision']:.3f}\n")
            f.write(f"재현율: {metrics['mapped_metrics']['recall']:.3f}\n")
            f.write(f"F1-Score: {metrics['mapped_metrics']['f1_score']:.3f}\n")
            f.write("\n")

            f.write("⏱️ 성능 통계\n")
            f.write("-" * 30 + "\n")
            f.write(f"평균 분석 시간: {metrics['avg_analysis_time']:.3f}초\n")
            f.write("\n")
        print(f"요약 리포트(TXT) 저장: {report_path}")

        df = pd.DataFrame(self.test_results)
        csv_path = self.result_log_path / "results.csv"
        df.to_csv(csv_path, index=False, encoding='utf-8-sig')
        print(f"CSV 데이터 저장: {csv_path}")


async def main():
    """메인 함수"""
    print("제미나이 Hair Loss Analyzer 성능 테스트 시작")
    print("=" * 60)
    test_data_path = "C:/Users/301/Desktop/test_data_set/test"
    base_log_path = "C:/Users/301/Desktop/main_project/backend/hair_classification/result_log/log"
    
    tester = GeminiAnalyzerTester(test_data_path, base_log_path)

    try:
        await tester.run_tests(username="aaaaaa", password="11111111")
        metrics = tester.calculate_metrics()
        if metrics:
            tester.create_visualizations(metrics)
            tester.save_results(metrics)
            print("\n" + "=" * 60)
            print(f"제미나이 애널라이저 성능 테스트 완료! (Test{tester.test_number})")
            print("=" * 60)
            print(f"원본 Stage 정확도: {metrics['raw_metrics']['accuracy']:.1%}")
            print(f"원본 Stage F1-Score: {metrics['raw_metrics']['f1_score']:.3f}")
            print(f"매핑된 Level 정확도: {metrics['mapped_metrics']['accuracy']:.1%}")
            print(f"매핑된 Level F1-Score: {metrics['mapped_metrics']['f1_score']:.3f}")
            print(f"평균 분석 시간: {metrics['avg_analysis_time']:.3f}초")
            print(f"결과 저장 위치: {tester.result_log_path}")
        else:
            print("\n성능 지표 계산 실패")
    except Exception as e:
        print(f"\n테스트 실행 중 오류 발생: {e}")


if __name__ == "__main__":
    asyncio.run(main())
