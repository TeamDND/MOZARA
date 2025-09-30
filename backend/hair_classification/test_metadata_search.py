"""
메타데이터 필터링으로 37-Back_jpg 패턴 검색 테스트
"""
import os
import sys
import numpy as np
from pathlib import Path

# 프로젝트 루트를 Python path에 추가
project_root = Path(__file__).parent / "hair_loss_rag_analyzer_v1" / "backend"
sys.path.insert(0, str(project_root))

from app.services.pinecone_manager import PineconeManager

def search_by_metadata():
    """메타데이터로 파일명 패턴 검색"""
    try:
        manager = PineconeManager()
        index = manager.get_index()

        # 더미 벡터 (실제 검색은 메타데이터 필터로)
        dummy_vector = np.zeros(1536).tolist()

        print("=== 메타데이터 구조 확인 (샘플 5개) ===")
        # 전체 검색으로 메타데이터 구조 확인
        sample_results = index.query(
            vector=dummy_vector,
            top_k=5,
            include_metadata=True
        )

        for i, match in enumerate(sample_results.matches, 1):
            print(f"\n샘플 {i}:")
            print(f"  ID: {match.id}")
            print(f"  메타데이터: {match.metadata}")

        print("\n=== filename 필드로 37-Back_jpg 패턴 검색 ===")

        # filename 메타데이터에서 37-Back_jpg 패턴 검색
        results = index.query(
            vector=dummy_vector,
            top_k=10000,  # 충분히 큰 수
            include_metadata=True,
            filter={
                "filename": {"$regex": ".*37-Back_jpg.*"}  # regex 패턴으로 검색
            }
        )

        matching_results = []
        for match in results.matches:
            if match.metadata and match.metadata.get('filename'):
                filename = match.metadata['filename']
                if '37-Back_jpg' in filename:
                    matching_results.append({
                        'id': match.id,
                        'filename': filename,
                        'score': match.score
                    })

        print(f"\n찾은 매칭 결과: {len(matching_results)}개")
        for i, result in enumerate(matching_results, 1):
            print(f"  {i}. ID: {result['id']}")
            print(f"     파일명: {result['filename']}")
            print(f"     스코어: {result['score']:.4f}")

    except Exception as e:
        print(f"검색 중 오류 발생: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    search_by_metadata()