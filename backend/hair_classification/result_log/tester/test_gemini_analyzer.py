#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Gemini 기반 헤어 단계 분석 전체 테스트 (레벨 2-7 전량)
- Spring Boot 백엔드의 /api/ai/gemini-check/analyze 엔드포인트 사용
- 결과를 로그 폴더에 저장(JSON/CSV/플롯)
"""

import os
import io
import json
import time
import base64
import asyncio
from datetime import datetime
from pathlib import Path
from typing import Dict, List

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


def get_next_test_number(base_log_path: Path) -> int:
    if not base_log_path.exists():
        return 1
    existing = [d for d in base_log_path.iterdir() if d.is_dir() and d.name.startswith('test')]
    if not existing:
        return 1
    nums = []
    for d in existing:
        try:
            nums.append(int(d.name.replace('test', '')))
        except:  # noqa
            pass
    return max(nums) + 1 if nums else 1


class GeminiAnalyzerTester:
    def __init__(self, test_data_path: str, base_log_path: str, api_base_url: str = "http://localhost:8080"):
        self.test_data_path = Path(test_data_path)
        self.base_log_path = Path(base_log_path)
        self.test_number = get_next_test_number(self.base_log_path)
        self.result_log_path = self.base_log_path / f"test{self.test_number}"
        self.api_base_url = api_base_url.rstrip('/')
        self.api_endpoint = f"{self.api_base_url}/api/ai/gemini-check/analyze"
        self.login_endpoint = f"{self.api_base_url}/api/login"
        self.test_results: List[Dict] = []
        self.jwt_token = None
        self.result_log_path.mkdir(parents=True, exist_ok=True)

        print(f"테스트 번호: {self.test_number}")
        print(f"테스트 데이터 경로: {self.test_data_path}")
        print(f"결과 로그 경로: {self.result_log_path}")
        print(f"API 엔드포인트: {self.api_endpoint}")

    def load_test_data(self) -> Dict[int, List[Path]]:
        test_data: Dict[int, List[Path]] = {}
        for level in range(2, 8):
            level_path = self.test_data_path / str(level)
            if not level_path.exists():
                print(f"경고: 레벨 {level} 폴더 없음: {level_path}")
                continue
            images: List[Path] = []
            for ext in ['.jpg', '.jpeg', '.png', '.bmp', '.JPG', '.JPEG', '.PNG', '.BMP']:
                images.extend(list(level_path.glob(f"*{ext}")))
            images = sorted(list(set(images)))
            test_data[level] = images
            print(f"레벨 {level}: 전체 {len(images)}개 이미지")
        total = sum(len(v) for v in test_data.values())
        print(f"총 테스트 이미지: {total}개")
        return test_data

    def map_gemini_to_backend_level(self, gemini_stage: int) -> int:
        # Gemini 단계(0~3) → 백엔드 레벨(2~7)
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
                    # Authorization 헤더에서 JWT 토큰 추출
                    auth_header = resp.headers.get('Authorization', '')
                    if auth_header.startswith('Bearer '):
                        self.jwt_token = auth_header[7:]  # 'Bearer ' 제거
                        print(f"JWT 토큰 획득 성공")
                        return True
                    else:
                        # 혹시 응답 body에서도 확인
                        self.jwt_token = result.get('jwt_token') or result.get('token') or result.get('access_token')
                        if self.jwt_token:
                            print(f"JWT 토큰 획득 성공 (body에서)")
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

    @staticmethod
    def encode_image_b64(image_path: Path) -> str:
        with Image.open(image_path) as im:
            im = im.convert('RGB')
            buf = io.BytesIO()
            im.save(buf, format='JPEG', quality=85)
            return base64.b64encode(buf.getvalue()).decode('utf-8')

    async def test_single_image(self, session: aiohttp.ClientSession, image_path: Path, true_level: int) -> Dict:
        try:
            # multipart/form-data로 이미지 전송
            with open(image_path, 'rb') as f:
                image_data = f.read()

            form_data = aiohttp.FormData()
            form_data.add_field('image', image_data, filename=image_path.name, content_type='image/jpeg')

            headers = {}
            if self.jwt_token:
                headers["Authorization"] = f"Bearer {self.jwt_token}"

            t0 = time.time()
            async with session.post(self.api_endpoint, data=form_data, headers=headers, timeout=120) as resp:
                status = resp.status
                text = await resp.text()
                if status == 200:
                    data = json.loads(text)
                    # Spring Boot 응답 구조에 맞게 수정
                    if 'analysis' in data:
                        analysis = data['analysis']
                        stage_raw = int(analysis.get('stage', 0))
                        stage_mapped = self.map_gemini_to_backend_level(stage_raw)
                        dt = time.time() - t0
                        return {
                            'success': True,
                            'api_status': status,
                            'filename': image_path.name,
                            'image_path': str(image_path),
                            'true_level': true_level,
                            'predicted_stage': stage_mapped,
                            'gemini_stage_raw': stage_raw,
                            'gemini_title': analysis.get('title', ''),
                            'gemini_description': analysis.get('description', ''),
                            'analysis_time': dt,
                        }
                    else:
                        # 기존 형식으로 fallback
                        stage_raw = int(data.get('stage', 0))
                        stage_mapped = self.map_gemini_to_backend_level(stage_raw)
                        dt = time.time() - t0
                        return {
                            'success': True,
                            'api_status': status,
                            'filename': image_path.name,
                            'image_path': str(image_path),
                            'true_level': true_level,
                            'predicted_stage': stage_mapped,
                            'gemini_stage_raw': stage_raw,
                            'gemini_title': data.get('title', ''),
                            'gemini_description': data.get('description', ''),
                            'analysis_time': dt,
                        }
                else:
                    return {
                        'success': False,
                        'api_status': status,
                        'filename': image_path.name,
                        'image_path': str(image_path),
                        'true_level': true_level,
                        'predicted_stage': None,
                        'error': f"HTTP {status}: {text[:200]}"
                    }
        except Exception as e:
            return {
                'success': False,
                'api_status': 'exception',
                'filename': image_path.name,
                'image_path': str(image_path),
                'true_level': true_level,
                'predicted_stage': None,
                'error': str(e)
            }

    async def run_tests(self):
        print("Gemini 전체 테스트 시작")
        test_data = self.load_test_data()
        if not test_data:
            print("테스트 데이터가 없습니다.")
            return

        async with aiohttp.ClientSession() as session:
            # 먼저 로그인해서 JWT 토큰 획득
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
                        print(f"    예측(Stage): {result['predicted_stage']} (원시: {result['gemini_stage_raw']})")
                    await asyncio.sleep(5.0)  # API 제한을 피하기 위해 지연시간 더 증가
        print(f"\n총 {len(self.test_results)}장 테스트 완료")

    def calculate_metrics(self) -> Dict:
        print("\n성능 지표 계산 중...")
        ok = [r for r in self.test_results if r['success'] and r.get('predicted_stage') is not None]
        if not ok:
            print("성공 결과가 없습니다.")
            return {}
        y_true = [r['true_level'] for r in ok]
        y_pred = [r['predicted_stage'] for r in ok]

        acc = accuracy_score(y_true, y_pred)
        prec, rec, f1, _ = precision_recall_fscore_support(y_true, y_pred, average='weighted', zero_division=0)
        cm = confusion_matrix(y_true, y_pred, labels=[2,3,4,5,6,7])
        report = classification_report(y_true, y_pred, output_dict=True, zero_division=0)
        avg_t = float(np.mean([r['analysis_time'] for r in ok]))

        status_counts = {}
        for r in self.test_results:
            st = r.get('api_status', 'unknown')
            status_counts[st] = status_counts.get(st, 0) + 1

        return {
            'total_tests': len(self.test_results),
            'successful_tests': len(ok),
            'failed_tests': len(self.test_results) - len(ok),
            'success_rate': len(ok) / len(self.test_results) if self.test_results else 0,
            'accuracy': acc,
            'precision': prec,
            'recall': rec,
            'f1_score': f1,
            'confusion_matrix': cm.tolist(),
            'class_report': report,
            'unique_labels': sorted(list(set(y_true + y_pred))),
            'avg_analysis_time': avg_t,
            'status_counts': status_counts
        }

    def create_visualizations(self, metrics: Dict):
        try:
            # Confusion matrix
            cm = np.array(metrics['confusion_matrix'])
            labels = [2,3,4,5,6,7]
            plt.figure(figsize=(8,6))
            sns.heatmap(cm, annot=True, fmt='d', cmap='Blues', xticklabels=labels, yticklabels=labels)
            plt.xlabel('Predicted')
            plt.ylabel('True')
            plt.title('Confusion Matrix (Gemini mapped to 2-7)')
            out = self.result_log_path / 'confusion_matrix.png'
            plt.tight_layout(); plt.savefig(out); plt.close()
            print(f"혼동행렬 저장: {out}")

            # Performance bars
            plt.figure(figsize=(6,4))
            vals = [metrics['accuracy'], metrics['precision'], metrics['recall'], metrics['f1_score']]
            names = ['Acc','Prec','Rec','F1']
            sns.barplot(x=names, y=vals)
            plt.ylim(0,1)
            out2 = self.result_log_path / 'performance_metrics.png'
            plt.tight_layout(); plt.savefig(out2); plt.close()
            print(f"성능 지표 플롯 저장: {out2}")
        except Exception as e:
            print(f"시각화 오류: {e}")

    def save_results(self, metrics: Dict):
        print("\n결과 저장 중...")
        # level counts
        level_counts = {}
        for r in self.test_results:
            lvl = r['true_level']
            level_counts[lvl] = level_counts.get(lvl, 0) + 1

        detailed = {
            'test_info': {
                'test_type': 'gemini_analyzer',
                'test_number': self.test_number,
                'timestamp': datetime.now().isoformat(),
                'test_data_path': str(self.test_data_path),
                'api_endpoint': self.api_endpoint,
                'total_images': len(self.test_results),
                'level_counts': level_counts
            },
            'metrics': metrics,
            'detailed_results': self.test_results
        }
        json_path = self.result_log_path / 'results.json'
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(detailed, f, ensure_ascii=False, indent=2)
        print(f"상세 결과(JSON) 저장: {json_path}")

        report_path = self.result_log_path / 'report.txt'
        with open(report_path, 'w', encoding='utf-8') as f:
            f.write("="*60+"\n")
            f.write(f"Gemini Hair Loss Analyzer 성능 리포트 (Test{self.test_number})\n")
            f.write("="*60+"\n")
            f.write(f"테스트 시작: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"테스트 데이터: {self.test_data_path}\n")
            f.write(f"API 엔드포인트: {self.api_endpoint}\n\n")
            f.write("전체 결과\n"+"-"*30+"\n")
            f.write(f"총 테스트: {metrics['total_tests']}\n")
            f.write(f"성공 테스트: {metrics['successful_tests']}\n")
            f.write(f"실패 테스트: {metrics['failed_tests']}\n")
            f.write(f"성공률: {metrics['success_rate']:.1%}\n\n")
            f.write("성능 지표\n"+"-"*30+"\n")
            f.write(f"Accuracy: {metrics['accuracy']:.3f}\n")
            f.write(f"Precision: {metrics['precision']:.3f}\n")
            f.write(f"Recall: {metrics['recall']:.3f}\n")
            f.write(f"F1-Score: {metrics['f1_score']:.3f}\n")
        print(f"요약 리포트 저장: {report_path}")

        df = pd.DataFrame(self.test_results)
        csv_path = self.result_log_path / 'results.csv'
        df.to_csv(csv_path, index=False, encoding='utf-8-sig')
        print(f"CSV 저장: {csv_path}")


async def main():
    print("Gemini Hair Loss Analyzer 성능 테스트 시작")
    print("="*60)
    test_data_path = "C:/Users/301/Desktop/test_data_set/test"
    base_log_path = "C:/Users/301/Desktop/main_project/backend/hair_classification/result_log/log"

    tester = GeminiAnalyzerTester(test_data_path, base_log_path)
    try:
        await tester.run_tests()
        metrics = tester.calculate_metrics()
        if metrics:
            tester.create_visualizations(metrics)
            tester.save_results(metrics)
            print("\n"+"="*60)
            print(f"Gemini 분석기 성능 테스트 완료! (Test{tester.test_number})")
            print("="*60)
            print(f"Accuracy: {metrics['accuracy']:.1%}")
            print(f"F1-Score: {metrics['f1_score']:.3f}")
            print(f"평균 분석 시간: {metrics['avg_analysis_time']:.3f}s")
            print(f"결과 경로: {tester.result_log_path}")
        else:
            print("\n성능 지표 계산 실패")
    except Exception as e:
        print(f"\n테스트 실행 오류: {e}")


if __name__ == "__main__":
    asyncio.run(main())
