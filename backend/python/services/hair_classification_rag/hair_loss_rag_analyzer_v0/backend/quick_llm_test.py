#!/usr/bin/env python3
"""
빠른 LLM 통합 테스트 (소규모 샘플)
"""

import os
import sys
import json
import time
import asyncio
from datetime import datetime
from pathlib import Path
from PIL import Image

# 백엔드 모듈 import
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

# config 설정
class HardcodedSettings:
    UPLOAD_DIR = "C:/Users/301/Desktop/main_project/backend/hair_classification/hair_loss_rag_analyzer_v0/backend/uploads"
    EMBEDDING_DIMENSION = 1536
    MODEL_NAME = "convnext_large.fb_in22k_ft_in1k_384"
    STAGE_DESCRIPTIONS = {
        2: "경미한 탈모", 3: "초기 탈모", 4: "중기 탈모",
        5: "진행된 탈모", 6: "심한 탈모", 7: "매우 심한 탈모"
    }

import app.config
app.config.settings = HardcodedSettings()

from app.services.hair_loss_analyzer import HairLossAnalyzer

async def quick_llm_test():
    print("=" * 50)
    print("빠른 LLM 통합 테스트")
    print("=" * 50)

    # 테스트 데이터 경로 찾기
    test_paths = [
        "C:/Users/301/Desktop/test_data_set/test",
        "C:/Users/301/Desktop/hair_loss_rag/hair_rag_dataset_image/hair_rag_dataset_ragging"
    ]

    test_path = None
    for path in test_paths:
        if Path(path).exists():
            test_path = Path(path)
            break

    if not test_path:
        print("[ERROR] 테스트 데이터 경로를 찾을 수 없습니다.")
        return

    print(f"[INFO] 테스트 데이터 경로: {test_path}")

    # 애널라이저 초기화
    try:
        analyzer = HairLossAnalyzer()
        print("[SUCCESS] HairLossAnalyzer 초기화 완료")
    except Exception as e:
        print(f"[ERROR] 초기화 실패: {e}")
        return

    # 각 레벨에서 1개씩만 테스트 (비용 절약)
    test_results = []
    total_cost = 0

    for level in range(2, 8):  # 레벨 2-7
        # 레벨 폴더 찾기
        level_patterns = [f"LEVEL_{level}", f"{level}", f"level_{level}"]
        level_path = None

        for pattern in level_patterns:
            candidate = test_path / pattern
            if candidate.exists():
                level_path = candidate
                break

        if not level_path:
            print(f"[SKIP] 레벨 {level} 폴더 없음")
            continue

        # 첫 번째 이미지 파일 찾기
        image_files = []
        for ext in ['.jpg', '.jpeg', '.png']:
            image_files.extend(list(level_path.glob(f"*{ext}")))
            if image_files:
                break

        if not image_files:
            print(f"[SKIP] 레벨 {level} 이미지 없음")
            continue

        test_image = image_files[0]
        print(f"\n[LEVEL {level}] 테스트: {test_image.name}")

        try:
            image = Image.open(test_image).convert('RGB')

            # 1. FAISS 전용 테스트
            start_time = time.time()
            faiss_result = await analyzer.analyze_image(image, test_image.name, use_llm=False)
            faiss_time = time.time() - start_time

            # 2. LLM 통합 테스트
            start_time = time.time()
            llm_result = await analyzer.analyze_image(image, test_image.name, use_llm=True)
            llm_time = time.time() - start_time

            # 결과 정리
            result = {
                'level': level,
                'filename': test_image.name,
                'faiss': {
                    'predicted': faiss_result.get('predicted_stage') if faiss_result['success'] else None,
                    'confidence': faiss_result.get('confidence', 0),
                    'time': faiss_time,
                    'success': faiss_result['success']
                },
                'llm': {
                    'predicted': llm_result.get('predicted_stage') if llm_result['success'] else None,
                    'confidence': llm_result.get('confidence', 0),
                    'time': llm_time,
                    'success': llm_result['success'],
                    'method': llm_result.get('analysis_details', {}).get('method', 'unknown'),
                    'tokens': llm_result.get('analysis_details', {}).get('token_usage', {}).get('total_tokens', 0)
                }
            }

            test_results.append(result)

            # 토큰 비용 계산 (GPT-4o-mini: $0.150/1M input + $0.600/1M output)
            tokens = result['llm']['tokens']
            estimated_cost = tokens * 0.0001 / 1000  # 대략적 계산
            total_cost += estimated_cost

            # 결과 출력
            print(f"  [FAISS] 예측: {result['faiss']['predicted']} (신뢰도: {result['faiss']['confidence']:.3f}, 시간: {result['faiss']['time']:.2f}s)")
            if result['llm']['success']:
                print(f"  [LLM] 예측: {result['llm']['predicted']} (신뢰도: {result['llm']['confidence']:.3f}, 시간: {result['llm']['time']:.2f}s)")
                print(f"  [TOKEN] 사용량: {tokens}, 비용: ${estimated_cost:.5f}")

                # 정확도 체크
                faiss_correct = result['faiss']['predicted'] == level
                llm_correct = result['llm']['predicted'] == level
                print(f"  [ACCURACY] FAISS: {'✓' if faiss_correct else '✗'}, LLM: {'✓' if llm_correct else '✗'}")
            else:
                print(f"  [LLM] 실패: {llm_result.get('error', 'Unknown')}")

        except Exception as e:
            print(f"  [ERROR] 테스트 실패: {e}")

    # 최종 결과 요약
    print("\n" + "=" * 50)
    print("테스트 요약")
    print("=" * 50)

    if test_results:
        successful_tests = [r for r in test_results if r['faiss']['success'] and r['llm']['success']]

        if successful_tests:
            # 정확도 계산
            faiss_correct = sum(1 for r in successful_tests if r['faiss']['predicted'] == r['level'])
            llm_correct = sum(1 for r in successful_tests if r['llm']['predicted'] == r['level'])

            faiss_accuracy = faiss_correct / len(successful_tests)
            llm_accuracy = llm_correct / len(successful_tests)

            # 평균 시간
            faiss_avg_time = sum(r['faiss']['time'] for r in successful_tests) / len(successful_tests)
            llm_avg_time = sum(r['llm']['time'] for r in successful_tests) / len(successful_tests)

            print(f"성공한 테스트: {len(successful_tests)}/{len(test_results)}")
            print(f"FAISS 정확도: {faiss_accuracy:.1%} ({faiss_correct}/{len(successful_tests)})")
            print(f"LLM 정확도: {llm_accuracy:.1%} ({llm_correct}/{len(successful_tests)})")
            print(f"정확도 개선: {llm_accuracy - faiss_accuracy:+.1%}")
            print(f"FAISS 평균 시간: {faiss_avg_time:.2f}초")
            print(f"LLM 평균 시간: {llm_avg_time:.2f}초")
            print(f"총 비용: ${total_cost:.5f}")
        else:
            print("성공한 테스트가 없습니다.")

        # 결과 저장
        result_path = Path("quick_llm_test_results.json")
        with open(result_path, 'w', encoding='utf-8') as f:
            json.dump({
                'timestamp': datetime.now().isoformat(),
                'total_cost': total_cost,
                'test_results': test_results
            }, f, ensure_ascii=False, indent=2)

        print(f"결과 저장: {result_path}")

if __name__ == "__main__":
    asyncio.run(quick_llm_test())