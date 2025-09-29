"""
37-Back_jpg prefix로 검색만 테스트 (삭제 안함)
"""
import os
import sys
from pathlib import Path

# 프로젝트 루트를 Python path에 추가
project_root = Path(__file__).parent / "hair_loss_rag_analyzer_v1" / "backend"
sys.path.insert(0, str(project_root))

from app.services.pinecone_manager import PineconeManager

def search_only_test():
    """검색만 테스트 - 절대 삭제 안함"""
    try:
        manager = PineconeManager()

        # 37-Back_jpg로 시작하는 벡터들 검색만
        prefix = "37-Back_jpg"
        print(f"'{prefix}' prefix로 검색 중...")

        matching_ids = manager.search_vectors_by_prefix(prefix, limit=100)

        print(f"\n=== 검색 결과 (삭제 안함!) ===")
        print(f"찾은 벡터 수: {len(matching_ids)}")

        if matching_ids:
            print("\n매칭된 ID들:")
            for i, vector_id in enumerate(matching_ids, 1):
                print(f"  {i}. {vector_id}")
        else:
            print("매칭되는 벡터가 없습니다.")

    except Exception as e:
        print(f"검색 중 오류 발생: {e}")

if __name__ == "__main__":
    search_only_test()