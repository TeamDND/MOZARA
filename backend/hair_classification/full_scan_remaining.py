"""
전체 12,710개 벡터를 모두 스캔해서 패턴 검색
"""
import os
import sys
import numpy as np
from pathlib import Path

# 프로젝트 루트를 Python path에 추가
project_root = Path(__file__).parent / "hair_loss_rag_analyzer_v1" / "backend"
sys.path.insert(0, str(project_root))

from app.services.pinecone_manager import Pinecone
from app.services.pinecone_manager import PineconeManager

def full_scan_all_vectors():
    """전체 벡터 스캔 (여러 번에 나누어서)"""
    try:
        manager = PineconeManager()
        index = manager.get_index()

        # 더미 벡터
        dummy_vector = np.zeros(1536).tolist()

        print("=== 전체 벡터 완전 스캔 시작 ===")
        print("총 12,710개 벡터를 스캔합니다...")

        all_matches = []
        batch_size = 10000

        # 여러 번 쿼리해서 전체 데이터 수집
        for offset in range(0, 15000, batch_size):  # 15000까지 여유있게
            print(f"\n배치 {offset//batch_size + 1}: {offset}~{offset+batch_size-1}")

            results = index.query(
                vector=dummy_vector,
                top_k=batch_size,
                include_metadata=True
            )

            current_matches = results.matches
            print(f"이번 배치에서 가져온 벡터 수: {len(current_matches)}")

            if not current_matches:
                print("더 이상 데이터가 없습니다.")
                break

            all_matches.extend(current_matches)

            if len(current_matches) < batch_size:
                print("마지막 배치입니다.")
                break

        print(f"\n총 수집된 벡터 수: {len(all_matches)}")

        # 패턴들 검색
        patterns_to_search = [
            '20231224152230NVMy5f',
            '2eb3e4ce37e41f082830848e56afd798-top',
            '2eb3e4ce37e41f082830848e56afd798',
            'NVMy5f',
            '152230',
        ]

        for pattern in patterns_to_search:
            print(f"\n=== '{pattern}' 패턴 검색 결과 ===")

            matching_vectors = []
            unique_filenames = set()

            for match in all_matches:
                if match.metadata and match.metadata.get('filename'):
                    filename = match.metadata['filename']

                    if pattern in filename:
                        matching_vectors.append({
                            'id': match.id,
                            'filename': filename,
                            'pointview': match.metadata.get('pointview'),
                            'stage': match.metadata.get('stage'),
                        })
                        unique_filenames.add(filename)

            print(f"매칭된 벡터 수: {len(matching_vectors)}개")
            print(f"고유 파일 수: {len(unique_filenames)}개")

            if matching_vectors:
                print(f"\n매칭된 벡터들:")
                for i, vector in enumerate(matching_vectors, 1):
                    print(f"  {i}. ID: {vector['id']}")
                    print(f"     파일명: {vector['filename']}")
                    print(f"     뷰포인트: {vector['pointview']}")
                    print(f"     스테이지: {vector['stage']}")

                if len(matching_vectors) > 0:
                    print(f"\n삭제할 ID 리스트:")
                    for vector in matching_vectors:
                        print(f"  {vector['id']}")

        # 전체 20231224 날짜 파일들도 확인
        print(f"\n=== 20231224 날짜 전체 파일 통계 ===")
        date_matches = []

        for match in all_matches:
            if match.metadata and match.metadata.get('filename'):
                filename = match.metadata['filename']
                if '20231224' in filename:
                    date_matches.append(filename)

        print(f"20231224 날짜가 포함된 파일 수: {len(date_matches)}")

        # 고유 파일명만 추출
        unique_date_files = list(set(date_matches))
        print(f"고유 20231224 파일 수: {len(unique_date_files)}")

        if len(unique_date_files) <= 20:  # 20개 이하면 모두 출력
            print("\n모든 20231224 파일들:")
            for i, filename in enumerate(sorted(unique_date_files), 1):
                print(f"  {i}. {filename}")

    except Exception as e:
        print(f"스캔 중 오류 발생: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    full_scan_all_vectors()