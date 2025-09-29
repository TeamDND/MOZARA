"""
2eb3e4ce37e41f082830848e56afd798-top 패턴 벡터들 검색
"""
import os
import sys
import numpy as np
from pathlib import Path

# 프로젝트 루트를 Python path에 추가
project_root = Path(__file__).parent / "hair_loss_rag_analyzer_v1" / "backend"
sys.path.insert(0, str(project_root))

from app.services.pinecone_manager import PineconeManager

def search_hash_top_pattern():
    """2eb3e4ce37e41f082830848e56afd798-top 패턴 벡터들 검색"""
    try:
        manager = PineconeManager()
        index = manager.get_index()

        # 더미 벡터
        dummy_vector = np.zeros(1536).tolist()

        print("=== 2eb3e4ce37e41f082830848e56afd798-top 패턴 검색 중... ===")

        # 전체 검색해서 패턴 매칭
        results = index.query(
            vector=dummy_vector,
            top_k=10000,
            include_metadata=True
        )

        print(f"총 스캔한 벡터 수: {len(results.matches)}")

        # 여러 패턴으로 검색
        patterns = [
            '2eb3e4ce37e41f082830848e56afd798-top',
            '2eb3e4ce37e41f082830848e56afd798',
            '20231224152230NVMy5f'
        ]

        for pattern in patterns:
            print(f"\n=== '{pattern}' 패턴 검색 ===")

            matching_vectors = []
            unique_filenames = set()

            for match in results.matches:
                if match.metadata and match.metadata.get('filename'):
                    filename = match.metadata['filename']

                    # 패턴 확인
                    if pattern in filename:
                        matching_vectors.append({
                            'id': match.id,
                            'filename': filename,
                            'pointview': match.metadata.get('pointview'),
                            'stage': match.metadata.get('stage'),
                            'score': match.score
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

                print(f"\n고유 파일명들:")
                for i, filename in enumerate(sorted(unique_filenames), 1):
                    print(f"  {i}. {filename}")

        # 전체 파일명에서 20231224152230NVMy5f 포함하는 것들 찾기
        print(f"\n=== 전체 파일명에서 유사 패턴 검색 ===")
        similar_patterns = []

        for match in results.matches:
            if match.metadata and match.metadata.get('filename'):
                filename = match.metadata['filename']
                # 비슷한 날짜 패턴이나 해시 패턴 찾기
                if '20231224' in filename or 'NVMy5f' in filename or '2eb3e4ce37' in filename:
                    similar_patterns.append({
                        'id': match.id,
                        'filename': filename,
                        'pointview': match.metadata.get('pointview'),
                        'stage': match.metadata.get('stage')
                    })

        if similar_patterns:
            print(f"유사 패턴 {len(similar_patterns)}개 발견:")
            for i, item in enumerate(similar_patterns[:10], 1):  # 처음 10개만
                print(f"  {i}. {item['filename']}")

    except Exception as e:
        print(f"검색 중 오류 발생: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    search_hash_top_pattern()