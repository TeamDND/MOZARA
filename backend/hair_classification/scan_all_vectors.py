"""
전체 벡터 스캔해서 37-Back_jpg 패턴 찾기
"""
import os
import sys
import numpy as np
from pathlib import Path

# 프로젝트 루트를 Python path에 추가
project_root = Path(__file__).parent / "hair_loss_rag_analyzer_v1" / "backend"
sys.path.insert(0, str(project_root))

from app.services.pinecone_manager import PineconeManager

def scan_all_for_37_back():
    """전체 벡터를 스캔해서 37-Back_jpg 패턴 찾기"""
    try:
        manager = PineconeManager()
        index = manager.get_index()

        # 더미 벡터
        dummy_vector = np.zeros(1536).tolist()

        print("=== 전체 벡터 스캔해서 37-Back_jpg 패턴 찾는 중... ===")
        print("(시간이 좀 걸릴 수 있습니다)")

        # 전체 검색 (top_k 최대값으로)
        results = index.query(
            vector=dummy_vector,
            top_k=10000,  # 최대값
            include_metadata=True
        )

        print(f"총 스캔한 벡터 수: {len(results.matches)}")

        # 37-Back_jpg 패턴과 Back 관련 패턴들 모두 찾기
        matching_vectors = []
        back_related = []

        for match in results.matches:
            if match.metadata and match.metadata.get('filename'):
                filename = match.metadata['filename']

                # 37-Back_jpg 정확히 매칭
                if '37-Back_jpg' in filename:
                    matching_vectors.append({
                        'id': match.id,
                        'filename': filename,
                        'pointview': match.metadata.get('pointview'),
                        'stage': match.metadata.get('stage'),
                        'score': match.score
                    })

                # Back 관련 모든 패턴 (참고용)
                elif 'Back' in filename or match.metadata.get('pointview') == 'Back':
                    back_related.append({
                        'id': match.id,
                        'filename': filename,
                        'pointview': match.metadata.get('pointview'),
                        'stage': match.metadata.get('stage')
                    })

        print(f"\n=== 37-Back_jpg 정확 매칭: {len(matching_vectors)}개 ===")
        for i, vector in enumerate(matching_vectors, 1):
            print(f"{i}. ID: {vector['id']}")
            print(f"   파일명: {vector['filename']}")
            print(f"   뷰포인트: {vector['pointview']}")
            print(f"   스테이지: {vector['stage']}")
            print()

        print(f"\n=== Back 관련 참고 데이터 (처음 10개): {len(back_related)}개 ===")
        for i, vector in enumerate(back_related[:10], 1):
            print(f"{i}. 파일명: {vector['filename']}")
            print(f"   뷰포인트: {vector['pointview']}")

        if matching_vectors:
            print(f"\n*** 찾았습니다! 총 {len(matching_vectors)}개의 37-Back_jpg 벡터 ***")
            ids_to_delete = [v['id'] for v in matching_vectors]
            print(f"\n삭제할 ID들:")
            for id_val in ids_to_delete:
                print(f"  {id_val}")
        else:
            print("\n37-Back_jpg 패턴 벡터를 찾지 못했습니다.")
            if len(results.matches) >= 10000:
                print("(전체 데이터가 10000개 이상일 수 있으니 여러 번 스캔 필요)")

    except Exception as e:
        print(f"스캔 중 오류 발생: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    scan_all_for_37_back()