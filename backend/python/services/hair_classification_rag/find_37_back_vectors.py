"""
37-Back_jpg 패턴 벡터들을 찾기 위한 검색 (메타데이터 필터링)
"""
import os
import sys
import numpy as np
from pathlib import Path

# 프로젝트 루트를 Python path에 추가
project_root = Path(__file__).parent / "hair_loss_rag_analyzer_v1" / "backend"
sys.path.insert(0, str(project_root))

from app.services.pinecone_manager import PineconeManager

def find_37_back_vectors():
    """37-Back_jpg 패턴 벡터들 찾기 (전체 스캔 방식)"""
    try:
        manager = PineconeManager()
        index = manager.get_index()

        # 더미 벡터 (실제로는 메타데이터로 필터링)
        dummy_vector = np.zeros(1536).tolist()

        print("=== 37-Back_jpg 패턴 벡터 검색 중... ===")

        # Back 뷰포인트로 먼저 필터링
        results = index.query(
            vector=dummy_vector,
            top_k=10000,  # 충분히 큰 수
            include_metadata=True,
            filter={
                "pointview": "Back"  # Back 뷰포인트만 필터링
            }
        )

        print(f"Back 뷰포인트 벡터 수: {len(results.matches)}")

        # 37-Back_jpg 패턴 매칭
        matching_vectors = []
        for match in results.matches:
            if match.metadata and match.metadata.get('filename'):
                filename = match.metadata['filename']
                # 37-Back_jpg 패턴 확인
                if '37-Back_jpg' in filename:
                    matching_vectors.append({
                        'id': match.id,
                        'filename': filename,
                        'stage': match.metadata.get('stage'),
                        'score': match.score
                    })

        print(f"\n=== 37-Back_jpg 패턴 매칭 결과: {len(matching_vectors)}개 ===")

        for i, vector in enumerate(matching_vectors, 1):
            print(f"{i}. ID: {vector['id']}")
            print(f"   파일명: {vector['filename']}")
            print(f"   스테이지: {vector['stage']}")
            print(f"   스코어: {vector['score']:.4f}")
            print()

        if matching_vectors:
            print(f"\n총 {len(matching_vectors)}개의 37-Back_jpg 패턴 벡터를 찾았습니다.")
            print("이 벡터들을 삭제하시겠습니까?")
            print("삭제하려면 별도 스크립트를 실행하세요.")

            # ID 리스트 저장
            ids_to_delete = [v['id'] for v in matching_vectors]
            print(f"\n삭제할 ID 리스트:")
            for id_to_delete in ids_to_delete:
                print(f"  '{id_to_delete}'")

        else:
            print("37-Back_jpg 패턴과 매칭되는 벡터가 없습니다.")

    except Exception as e:
        print(f"검색 중 오류 발생: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    find_37_back_vectors()