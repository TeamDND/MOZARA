"""
20231224152230NVMy5f 패턴 벡터들 검색
"""
import os
import sys
import numpy as np
from pathlib import Path

# 프로젝트 루트를 Python path에 추가
project_root = Path(__file__).parent / "hair_loss_rag_analyzer_v1" / "backend"
sys.path.insert(0, str(project_root))

from app.services.pinecone_manager import PineconeManager

def search_20231224_pattern():
    """20231224152230NVMy5f 패턴 벡터들 검색"""
    try:
        manager = PineconeManager()
        index = manager.get_index()

        # 더미 벡터
        dummy_vector = np.zeros(1536).tolist()

        print("=== 20231224152230NVMy5f 패턴 검색 중... ===")

        # 전체 검색해서 패턴 매칭
        results = index.query(
            vector=dummy_vector,
            top_k=10000,
            include_metadata=True
        )

        print(f"총 스캔한 벡터 수: {len(results.matches)}")

        # 20231224152230NVMy5f 패턴 찾기
        matching_vectors = []
        unique_filenames = set()

        for match in results.matches:
            if match.metadata and match.metadata.get('filename'):
                filename = match.metadata['filename']

                # 20231224152230NVMy5f 패턴 확인
                if '20231224152230NVMy5f' in filename:
                    matching_vectors.append({
                        'id': match.id,
                        'filename': filename,
                        'pointview': match.metadata.get('pointview'),
                        'stage': match.metadata.get('stage'),
                        'score': match.score
                    })
                    unique_filenames.add(filename)

        print(f"\n=== 20231224152230NVMy5f 패턴 매칭 결과 ===")
        print(f"총 벡터 수: {len(matching_vectors)}개")
        print(f"고유 파일 수: {len(unique_filenames)}개")

        if matching_vectors:
            print(f"\n=== 모든 매칭 벡터들 ===")
            for i, vector in enumerate(matching_vectors, 1):
                print(f"{i}. ID: {vector['id']}")
                print(f"   파일명: {vector['filename']}")
                print(f"   뷰포인트: {vector['pointview']}")
                print(f"   스테이지: {vector['stage']}")
                print()

            print(f"\n=== 고유 파일명들 ===")
            for i, filename in enumerate(sorted(unique_filenames), 1):
                print(f"{i}. {filename}")

            print(f"\n삭제할 벡터 ID 리스트:")
            for vector in matching_vectors:
                print(f"  {vector['id']}")

        else:
            print("20231224152230NVMy5f 패턴과 매칭되는 벡터가 없습니다.")

    except Exception as e:
        print(f"검색 중 오류 발생: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    search_20231224_pattern()