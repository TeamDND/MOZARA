#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gemini 데이터셋 검증 테스트 스크립트
- 빠른 API 처리 (지연시간 최소화)
- 2+ 레벨 차이 이미지 검증 리포트 생성
- 의심스러운 이미지 특징 분석
"""

import os
import io
import json
import time
import base64
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Tuple

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from PIL import Image
from sklearn.metrics import (
    confusion_matrix, classification_report,
    accuracy_score, precision_recall_fscore_support
)
import aiohttp


def get_next_test_number(base_log_path: Path, prefix: str = "gemini_validation") -> int:
    if not base_log_path.exists():
        return 1
    existing = [d for d in base_log_path.iterdir() if d.is_dir() and d.name.startswith(prefix)]
    if not existing:
        return 1
    nums = []
    for d in existing:
        try:
            nums.append(int(d.name.replace(prefix, '')))
        except:
            pass
    return max(nums) + 1 if nums else 1


class GeminiValidationTester:
    def __init__(self, test_data_path: str, base_log_path: str, api_base_url: str = "http://localhost:8080"):
        self.test_data_path = Path(test_data_path)
        self.base_log_path = Path(base_log_path)
        self.test_number = get_next_test_number(self.base_log_path, "gemini_validation")
        self.result_log_path = self.base_log_path / f"gemini_validation{self.test_number}"
        self.api_base_url = api_base_url.rstrip('/')
        self.api_endpoint = f"{self.api_base_url}/api/ai/gemini-check/analyze"
        self.login_endpoint = f"{self.api_base_url}/api/login"
        self.test_results: List[Dict] = []
        self.jwt_token = None
        self.result_log_path.mkdir(parents=True, exist_ok=True)

        print(f"Gemini 검증 테스트 번호: {self.test_number}")
        print(f"테스트 데이터 경로: {self.test_data_path}")
        print(f"결과 로그 경로: {self.result_log_path}")
        print(f"API 엔드포인트: {self.api_endpoint}")

    def load_test_data(self, samples_per_level: int = 20) -> Dict[int, List[Path]]:
        """각 레벨당 지정된 개수만큼 샘플링"""
        test_data: Dict[int, List[Path]] = {}

        for level in range(2, 8):
            level_path = self.test_data_path / f"level_{level}" / f"LEVEL_{level}"
            if not level_path.exists():
                print(f"경고: 레벨 {level} 폴더 없음: {level_path}")
                continue

            images: List[Path] = []
            for ext in ['.jpg', '.jpeg', '.png', '.bmp', '.JPG', '.JPEG', '.PNG', '.BMP']:
                images.extend(list(level_path.glob(f"*{ext}")))
            images = sorted(list(set(images)))

            # 샘플링
            if len(images) > samples_per_level:
                import random
                random.seed(42)
                images = random.sample(images, samples_per_level)

            test_data[level] = images
            print(f"레벨 {level}: {len(images)}개 이미지 (전체 중 샘플링)")

        total = sum(len(v) for v in test_data.values())
        print(f"총 테스트 이미지: {total}개")
        return test_data

    def map_gemini_to_backend_level(self, gemini_stage: int) -> int:
        """Gemini 단계(0~3) → 백엔드 레벨(2~7) 매핑"""
        mapping = {0: 2, 1: 3, 2: 5, 3: 7}
        return mapping.get(int(gemini_stage), int(gemini_stage) + 2)

    async def login_and_get_token(self, session: aiohttp.ClientSession) -> bool:
        """로그인해서 JWT 토큰 받아오기"""
        try:
            login_data = {
                "username": "aaaaaa",
                "password": "11111111"
            }

            async with session.post(self.login_endpoint, json=login_data, timeout=30) as resp:
                if resp.status == 200:
                    result = await resp.json()
                    auth_header = resp.headers.get('Authorization', '')
                    if auth_header.startswith('Bearer '):
                        self.jwt_token = auth_header[7:]
                        print(f"JWT 토큰 획득 성공")
                        return True
                    else:
                        self.jwt_token = result.get('jwt_token') or result.get('token') or result.get('access_token')
                        if self.jwt_token:
                            print(f"JWT 토큰 획득 성공")
                            return True
                        else:
                            print(f"응답에서 토큰을 찾을 수 없음: {result}")
                            return False
                else:
                    text = await resp.text()
                    print(f"로그인 실패 (Status: {resp.status}): {text}")
                    return False
        except Exception as e:
            print(f"로그인 요청 실패: {e}")
            return False

    async def test_single_image(self, session: aiohttp.ClientSession, image_path: Path, true_level: int) -> Dict:
        """단일 이미지 테스트"""
        try:
            with open(image_path, 'rb') as f:
                image_data = f.read()

            form_data = aiohttp.FormData()
            form_data.add_field('image', image_data, filename=image_path.name, content_type='image/jpeg')

            headers = {}
            if self.jwt_token:
                headers["Authorization"] = f"Bearer {self.jwt_token}"

            t0 = time.time()
            async with session.post(self.api_endpoint, data=form_data, headers=headers, timeout=60) as resp:
                status = resp.status
                text = await resp.text()
                dt = time.time() - t0

                if status == 200:
                    data = json.loads(text)
                    if 'analysis' in data:
                        analysis = data['analysis']
                        stage_raw = int(analysis.get('stage', 0))
                        stage_mapped = self.map_gemini_to_backend_level(stage_raw)

                        return {
                            'success': True,
                            'filename': image_path.name,
                            'image_path': str(image_path),
                            'true_level': true_level,
                            'predicted_stage': stage_mapped,
                            'gemini_stage_raw': stage_raw,
                            'gemini_title': analysis.get('title', ''),
                            'gemini_description': analysis.get('description', ''),
                            'analysis_time': dt,
                            'api_status': status,
                            'level_difference': abs(true_level - stage_mapped)
                        }
                    else:
                        stage_raw = int(data.get('stage', 0))
                        stage_mapped = self.map_gemini_to_backend_level(stage_raw)

                        return {
                            'success': True,
                            'filename': image_path.name,
                            'image_path': str(image_path),
                            'true_level': true_level,
                            'predicted_stage': stage_mapped,
                            'gemini_stage_raw': stage_raw,
                            'gemini_title': data.get('title', ''),
                            'gemini_description': data.get('description', ''),
                            'analysis_time': dt,
                            'api_status': status,
                            'level_difference': abs(true_level - stage_mapped)
                        }
                else:
                    return {
                        'success': False,
                        'filename': image_path.name,
                        'image_path': str(image_path),
                        'true_level': true_level,
                        'predicted_stage': None,
                        'error': f"HTTP {status}: {text[:200]}",
                        'analysis_time': dt,
                        'api_status': status,
                        'level_difference': None
                    }
        except Exception as e:
            return {
                'success': False,
                'filename': image_path.name,
                'image_path': str(image_path),
                'true_level': true_level,
                'predicted_stage': None,
                'error': str(e),
                'analysis_time': 0,
                'api_status': 'exception',
                'level_difference': None
            }

    async def run_tests(self, samples_per_level: int = 20):
        """테스트 실행 (빠른 처리)"""
        print("Gemini 검증 테스트 시작 (빠른 처리)")
        test_data = self.load_test_data(samples_per_level)
        if not test_data:
            print("테스트 데이터가 없습니다.")
            return

        async with aiohttp.ClientSession() as session:
            print("로그인 시도 중...")
            if not await self.login_and_get_token(session):
                print("로그인 실패. 테스트를 중단합니다.")
                return

            count = 0
            total = sum(len(v) for v in test_data.values())

            for level, images in test_data.items():
                print(f"\n레벨 {level} 테스트 진행 ({len(images)}장)")
                for i, image_path in enumerate(images):
                    count += 1
                    print(f"  [{count}/{total}] {i+1}/{len(images)}: {image_path.name}")
                    result = await self.test_single_image(session, image_path, level)
                    self.test_results.append(result)

                    if not result['success']:
                        print(f"    실패: {result.get('error')}")
                    else:
                        diff = result['level_difference']
                        print(f"    예측: {result['predicted_stage']} (차이: {diff}) - {result['gemini_title']}")

                    # 빠른 처리: 0.5초 대기
                    await asyncio.sleep(0.5)

        print(f"\n총 {len(self.test_results)}장 테스트 완료")

    def calculate_metrics(self) -> Dict:
        """성능 지표 계산"""
        print("\n성능 지표 계산 중...")
        successful = [r for r in self.test_results if r['success'] and r.get('predicted_stage') is not None]

        if not successful:
            print("성공 결과가 없습니다.")
            return {}

        y_true = [r['true_level'] for r in successful]
        y_pred = [r['predicted_stage'] for r in successful]

        acc = accuracy_score(y_true, y_pred)
        prec, rec, f1, _ = precision_recall_fscore_support(y_true, y_pred, average='weighted', zero_division=0)
        cm = confusion_matrix(y_true, y_pred, labels=[2,3,4,5,6,7])
        report = classification_report(y_true, y_pred, output_dict=True, zero_division=0)
        avg_time = np.mean([r['analysis_time'] for r in successful])

        return {
            'total_tests': len(self.test_results),
            'successful_tests': len(successful),
            'failed_tests': len(self.test_results) - len(successful),
            'success_rate': len(successful) / len(self.test_results) if self.test_results else 0,
            'accuracy': acc,
            'precision': prec,
            'recall': rec,
            'f1_score': f1,
            'confusion_matrix': cm.tolist(),
            'class_report': report,
            'unique_labels': sorted(list(set(y_true + y_pred))),
            'avg_analysis_time': avg_time
        }

    def generate_validation_report(self) -> Dict:
        """2+ 레벨 차이 이미지 검증 리포트 생성"""
        print("\n검증 리포트 생성 중...")

        successful = [r for r in self.test_results if r['success'] and r.get('predicted_stage') is not None]

        # 2+ 레벨 차이 이미지 필터링
        problematic_images = []
        for result in successful:
            diff = result.get('level_difference', 0)
            if diff >= 2:
                # 이미지 특징 분석 (파일명 기반)
                filename = result['filename'].lower()
                suspected_features = []

                # 파일명에서 특징 추출
                if 'front' in filename:
                    suspected_features.append("정면각도")
                if 'top' in filename:
                    suspected_features.append("상단각도")
                if 'side' in filename or 'left' in filename or 'right' in filename:
                    suspected_features.append("측면각도")
                if 'back' in filename:
                    suspected_features.append("후면각도")
                if 'male' in filename:
                    suspected_features.append("남성")
                if 'female' in filename:
                    suspected_features.append("여성")

                # 레벨 차이 패턴 분석
                if result['true_level'] < result['predicted_stage']:
                    error_pattern = f"과대평가 ({result['true_level']} → {result['predicted_stage']})"
                else:
                    error_pattern = f"과소평가 ({result['true_level']} → {result['predicted_stage']})"

                problematic_images.append({
                    'filename': result['filename'],
                    'image_path': result['image_path'],
                    'true_level': result['true_level'],
                    'predicted_level': result['predicted_stage'],
                    'level_difference': diff,
                    'error_pattern': error_pattern,
                    'gemini_title': result.get('gemini_title', ''),
                    'gemini_description': result.get('gemini_description', ''),
                    'suspected_features': suspected_features,
                    'analysis_time': result['analysis_time']
                })

        # 에러 패턴 통계
        error_patterns = {}
        feature_patterns = {}

        for img in problematic_images:
            pattern = img['error_pattern']
            error_patterns[pattern] = error_patterns.get(pattern, 0) + 1

            for feature in img['suspected_features']:
                feature_patterns[feature] = feature_patterns.get(feature, 0) + 1

        validation_report = {
            'total_problematic': len(problematic_images),
            'problematic_rate': len(problematic_images) / len(successful) if successful else 0,
            'problematic_images': problematic_images,
            'error_patterns': error_patterns,
            'feature_patterns': feature_patterns,
            'validation_guidelines': self.get_validation_guidelines()
        }

        return validation_report

    def get_validation_guidelines(self) -> Dict:
        """데이터셋 검증 가이드라인"""
        return {
            "수동_검증_체크리스트": [
                "1. 헤어라인 패턴: M자 탈모 정도가 레벨과 일치하는가?",
                "2. 정수리 상태: 정수리 탈모 진행도가 적절한가?",
                "3. 전체 모발 밀도: 전반적인 모발 양이 레벨에 맞는가?",
                "4. 이미지 품질: 조명, 각도, 해상도가 분석에 적합한가?",
                "5. 성별 일치: 남성/여성 분류가 정확한가?",
                "6. 뷰포인트 일치: 촬영 각도가 라벨과 일치하는가?"
            ],
            "의심_케이스_우선순위": [
                "1. 3레벨 이상 차이나는 이미지 (최우선)",
                "2. 과대평가된 이미지 (실제보다 높게 평가)",
                "3. 정면각도에서 오분류된 이미지",
                "4. 상단각도에서 오분류된 이미지"
            ],
            "재라벨링_기준": [
                "1. 전문가 2명 이상의 합의",
                "2. 노우드 분류 기준표 재참조",
                "3. 유사한 케이스들과의 일관성 확인",
                "4. 이미지 품질이 분석에 부적합한 경우 제외 고려"
            ],
            "데이터셋_개선_제안": [
                "1. 각도별 균등한 분포 확보",
                "2. 경계 케이스(레벨 간 애매한 경우) 추가 수집",
                "3. 이미지 품질 표준화",
                "4. 전문가 검증 단계 추가"
            ]
        }

    def create_visualizations(self, metrics: Dict, validation_report: Dict):
        """시각화 생성"""
        print("\n시각화 생성 중...")

        # 1. Confusion Matrix
        plt.figure(figsize=(10, 8))
        cm = np.array(metrics['confusion_matrix'])
        labels = [2,3,4,5,6,7]
        sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=labels, yticklabels=labels)
        plt.xlabel('Predicted Level')
        plt.ylabel('True Level')
        plt.title(f'Gemini Validation Test{self.test_number} - Confusion Matrix')
        confusion_path = self.result_log_path / 'confusion_matrix.png'
        plt.tight_layout()
        plt.savefig(confusion_path, dpi=300, bbox_inches='tight')
        plt.close()

        # 2. 성능 지표
        plt.figure(figsize=(10, 6))
        metrics_names = ['Accuracy', 'Precision', 'Recall', 'F1-Score']
        metrics_values = [metrics['accuracy'], metrics['precision'], metrics['recall'], metrics['f1_score']]
        bars = plt.bar(metrics_names, metrics_values, color=['#1f77b4', '#ff7f0e', '#2ca02c', '#d62728'])
        plt.ylim(0, 1)
        plt.title(f'Gemini Validation Test{self.test_number} - Performance Metrics')
        plt.ylabel('Score')
        for bar, value in zip(bars, metrics_values):
            plt.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 0.01,
                    f'{value:.3f}', ha='center', va='bottom')
        plt.tight_layout()
        metrics_path = self.result_log_path / 'performance_metrics.png'
        plt.savefig(metrics_path, dpi=300, bbox_inches='tight')
        plt.close()

        # 3. 에러 패턴 분석
        if validation_report['error_patterns']:
            plt.figure(figsize=(12, 6))
            patterns = list(validation_report['error_patterns'].keys())
            counts = list(validation_report['error_patterns'].values())
            plt.bar(patterns, counts, color='coral')
            plt.title(f'Error Patterns in Problematic Images (Test{self.test_number})')
            plt.ylabel('Count')
            plt.xticks(rotation=45)
            plt.tight_layout()
            error_path = self.result_log_path / 'error_patterns.png'
            plt.savefig(error_path, dpi=300, bbox_inches='tight')
            plt.close()

        print(f"시각화 저장 완료: {self.result_log_path}")

    def save_results(self, metrics: Dict, validation_report: Dict):
        """결과 저장"""
        print("\n결과 저장 중...")

        # 레벨별 통계
        level_counts = {}
        for r in self.test_results:
            level = r['true_level']
            level_counts[level] = level_counts.get(level, 0) + 1

        # 상세 결과 JSON
        detailed_results = {
            'test_info': {
                'test_type': 'gemini_validation',
                'test_number': self.test_number,
                'timestamp': datetime.now().isoformat(),
                'test_data_path': str(self.test_data_path),
                'api_endpoint': self.api_endpoint,
                'total_images': len(self.test_results),
                'level_counts': level_counts
            },
            'metrics': metrics,
            'validation_report': validation_report,
            'detailed_results': self.test_results
        }

        json_path = self.result_log_path / 'results.json'
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(detailed_results, f, ensure_ascii=False, indent=2)

        # 검증 리포트 (텍스트)
        report_path = self.result_log_path / 'validation_report.txt'
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write("=" * 80 + "\n")
            f.write(f"Gemini 데이터셋 검증 리포트 (Test{self.test_number})\n")
            f.write("=" * 80 + "\n")
            f.write(f"테스트 일시: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"테스트 데이터: {self.test_data_path}\n")
            f.write(f"API 엔드포인트: {self.api_endpoint}\n\n")

            f.write("📊 전체 성능\n")
            f.write("-" * 40 + "\n")
            f.write(f"총 테스트: {metrics['total_tests']}\n")
            f.write(f"성공: {metrics['successful_tests']}\n")
            f.write(f"실패: {metrics['failed_tests']}\n")
            f.write(f"정확도: {metrics['accuracy']:.3f}\n")
            f.write(f"F1-Score: {metrics['f1_score']:.3f}\n")
            f.write(f"평균 처리시간: {metrics['avg_analysis_time']:.3f}초\n\n")

            f.write("🚨 검증 필요 이미지\n")
            f.write("-" * 40 + "\n")
            f.write(f"문제 이미지 수: {validation_report['total_problematic']}\n")
            f.write(f"문제 비율: {validation_report['problematic_rate']:.1%}\n\n")

            f.write("📋 검증 대상 상세 목록\n")
            f.write("-" * 40 + "\n")
            for img in validation_report['problematic_images']:
                f.write(f"파일명: {img['filename']}\n")
                f.write(f"  실제: Level {img['true_level']} → 예측: Level {img['predicted_level']}\n")
                f.write(f"  차이: {img['level_difference']}레벨\n")
                f.write(f"  패턴: {img['error_pattern']}\n")
                f.write(f"  제미나이 제목: {img['gemini_title']}\n")
                f.write(f"  제미나이 설명: {img['gemini_description'][:100]}...\n")
                f.write(f"  의심 특징: {', '.join(img['suspected_features'])}\n")
                f.write(f"  경로: {img['image_path']}\n\n")

            f.write("📈 에러 패턴 분석\n")
            f.write("-" * 40 + "\n")
            for pattern, count in validation_report['error_patterns'].items():
                f.write(f"{pattern}: {count}건\n")
            f.write("\n")

            f.write("🔍 데이터셋 검증 가이드라인\n")
            f.write("-" * 40 + "\n")
            guidelines = validation_report['validation_guidelines']

            f.write("수동 검증 체크리스트:\n")
            for item in guidelines['수동_검증_체크리스트']:
                f.write(f"  {item}\n")
            f.write("\n")

            f.write("의심 케이스 우선순위:\n")
            for item in guidelines['의심_케이스_우선순위']:
                f.write(f"  {item}\n")
            f.write("\n")

            f.write("재라벨링 기준:\n")
            for item in guidelines['재라벨링_기준']:
                f.write(f"  {item}\n")
            f.write("\n")

            f.write("데이터셋 개선 제안:\n")
            for item in guidelines['데이터셋_개선_제안']:
                f.write(f"  {item}\n")

        # CSV 저장
        df = pd.DataFrame(self.test_results)
        csv_path = self.result_log_path / 'results.csv'
        df.to_csv(csv_path, index=False, encoding='utf-8-sig')

        # 문제 이미지만 별도 CSV
        if validation_report['problematic_images']:
            problem_df = pd.DataFrame(validation_report['problematic_images'])
            problem_csv_path = self.result_log_path / 'problematic_images.csv'
            problem_df.to_csv(problem_csv_path, index=False, encoding='utf-8-sig')
            print(f"문제 이미지 목록: {problem_csv_path}")

        print(f"상세 결과: {json_path}")
        print(f"검증 리포트: {report_path}")
        print(f"결과 CSV: {csv_path}")


async def main():
    """메인 함수"""
    print("Gemini 데이터셋 검증 테스트 시작")
    print("=" * 80)
    print("목적: 2+ 레벨 차이 이미지 검증 및 데이터셋 품질 분석")
    print("처리: 빠른 API 호출 (0.5초 간격)")
    print("=" * 80)

    # 경로 설정
    test_data_path = "C:/Users/301/Desktop/test_data_set/test"
    base_log_path = "C:/Users/301/Desktop/main_project/backend/hair_classification/result_log/log"

    # 테스터 초기화
    tester = GeminiValidationTester(test_data_path, base_log_path)

    try:
        # 테스트 실행 (각 레벨당 20개씩)
        await tester.run_tests(samples_per_level=20)

        # 성능 지표 계산
        metrics = tester.calculate_metrics()

        if metrics:
            # 검증 리포트 생성
            validation_report = tester.generate_validation_report()

            # 시각화 생성
            tester.create_visualizations(metrics, validation_report)

            # 결과 저장
            tester.save_results(metrics, validation_report)

            print("\n" + "=" * 80)
            print(f"Gemini 검증 테스트 완료! (Test{tester.test_number})")
            print("=" * 80)
            print(f"정확도: {metrics['accuracy']:.1%}")
            print(f"문제 이미지: {validation_report['total_problematic']}개 ({validation_report['problematic_rate']:.1%})")
            print(f"평균 처리시간: {metrics['avg_analysis_time']:.3f}초")
            print(f"📁 결과 저장 위치: {tester.result_log_path}")
            print("\n🚨 수동 검증 필요 이미지들을 problematic_images.csv에서 확인하세요!")
        else:
            print("\n성능 지표 계산 실패")

    except KeyboardInterrupt:
        print("\n\n사용자에 의해 테스트가 중단되었습니다.")
    except Exception as e:
        print(f"\n테스트 실행 중 오류 발생: {e}")


if __name__ == "__main__":
    asyncio.run(main())