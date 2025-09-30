#!/usr/bin/env python3
"""로그를 포함한 완전한 인덱싱 스크립트"""

import asyncio
import os
import time
from datetime import datetime
from app.services.hair_loss_analyzer import HairLossAnalyzer
from app.services.image_processor import ImageProcessor
from app.config import settings

async def complete_indexing_with_logs():
    """모든 레벨을 인덱싱하며 상세 로그 출력"""

    print("=" * 80)
    print("FAISS 완전 재인덱싱 시작")
    print("=" * 80)
    print(f"시작 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")

    try:
        # 1. 초기화
        print("\n[1] 컴포넌트 초기화 중...")
        analyzer = HairLossAnalyzer()
        image_processor = ImageProcessor()
        print("[OK] 분석기 및 이미지 프로세서 초기화 완료")

        # 2. 데이터셋 경로 확인
        dataset_path = settings.DATASET_PATH
        print(f"\n[2] 데이터셋 경로 확인: {dataset_path}")

        if not os.path.exists(dataset_path):
            print(f"[ERROR] 데이터셋 경로가 존재하지 않습니다: {dataset_path}")
            return False

        # 3. 각 레벨 폴더 확인
        print("\n[3] 레벨별 데이터 확인:")
        levels_to_process = []
        total_images = 0

        for level in range(1, 8):
            level_path = os.path.join(dataset_path, f"LEVEL_{level}")
            if os.path.exists(level_path):
                image_files = [f for f in os.listdir(level_path) if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
                image_count = len(image_files)
                total_images += image_count

                print(f"   레벨 {level}: {image_count}개 이미지 ({level_path})")

                if image_count > 0:
                    levels_to_process.append(level)
                else:
                    print(f"   [WARNING] 레벨 {level}에 이미지가 없습니다.")
            else:
                print(f"   [ERROR] 레벨 {level} 폴더가 없습니다: {level_path}")

        print(f"\n[STATS] 총 {len(levels_to_process)}개 레벨, {total_images}개 이미지 발견")

        if not levels_to_process:
            print("[ERROR] 처리할 레벨이 없습니다.")
            return False

        # 4. 임베딩 생성
        print(f"\n[4] 임베딩 생성 시작 (레벨: {levels_to_process})")
        embedding_start_time = time.time()

        embeddings_data = image_processor.process_dataset(dataset_path, stages=levels_to_process)

        embedding_end_time = time.time()
        embedding_duration = embedding_end_time - embedding_start_time

        print(f"[TIME] 임베딩 생성 소요 시간: {embedding_duration:.2f}초")

        # 5. 임베딩 결과 확인
        embeddings_count = len(embeddings_data.get('embeddings', []))
        metadata_count = len(embeddings_data.get('metadata', []))

        print(f"\n[5] 임베딩 생성 결과:")
        print(f"   생성된 임베딩 수: {embeddings_count}")
        print(f"   메타데이터 수: {metadata_count}")

        if embeddings_count == 0:
            print("[ERROR] 임베딩이 생성되지 않았습니다.")
            return False

        if embeddings_count != metadata_count:
            print("[WARNING] 임베딩 수와 메타데이터 수가 일치하지 않습니다.")

        # 6. 레벨별 분포 확인
        level_distribution = {}
        for metadata in embeddings_data.get('metadata', []):
            stage = metadata.get('stage', 'unknown')
            level_distribution[stage] = level_distribution.get(stage, 0) + 1

        print(f"\n[DISTRIBUTION] 생성된 임베딩의 레벨별 분포:")
        for level in sorted(level_distribution.keys()):
            count = level_distribution[level]
            percentage = (count / embeddings_count) * 100
            print(f"   레벨 {level}: {count}개 ({percentage:.1f}%)")

        # 7. FAISS 인덱스 업로드
        print(f"\n[6] FAISS 인덱스 업로드 시작...")
        upload_start_time = time.time()

        # 기존 인덱스 완전 교체
        embeddings_data['recreate'] = True
        upload_success = analyzer.vector_manager.upload_embeddings(embeddings_data)

        upload_end_time = time.time()
        upload_duration = upload_end_time - upload_start_time

        print(f"[TIME] 업로드 소요 시간: {upload_duration:.2f}초")

        if upload_success:
            print("[OK] FAISS 인덱스 업로드 성공!")

            # 8. 최종 확인
            print(f"\n[7] 최종 인덱스 상태 확인:")
            stats = analyzer.vector_manager.get_index_stats()
            if stats['success']:
                print(f"   총 벡터 수: {stats['total_vector_count']}")
                print(f"   인덱스 차원: {stats.get('dimension', 'unknown')}")
            else:
                print(f"   [WARNING] 상태 확인 실패: {stats.get('error', '알 수 없는 오류')}")

        else:
            print("[ERROR] FAISS 인덱스 업로드 실패!")
            return False

        # 완료
        total_end_time = time.time()
        total_duration = total_end_time - embedding_start_time

        print(f"\n" + "=" * 80)
        print("FAISS 완전 재인덱싱 완료!")
        print("=" * 80)
        print(f"완료 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"총 소요 시간: {total_duration:.2f}초")
        print(f"처리된 레벨: {levels_to_process}")
        print(f"총 이미지 수: {embeddings_count}")

        return True

    except Exception as e:
        print(f"\n[ERROR] 오류 발생: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(complete_indexing_with_logs())
    if success:
        print("\n[SUCCESS] 모든 작업이 성공적으로 완료되었습니다!")
    else:
        print("\n[FAILED] 작업 중 오류가 발생했습니다.")