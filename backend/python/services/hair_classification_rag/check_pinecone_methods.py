"""
현재 Pinecone 인덱스에서 사용 가능한 메소드들 확인
"""
import os
import sys
from pathlib import Path

# 프로젝트 루트를 Python path에 추가
project_root = Path(__file__).parent / "hair_loss_rag_analyzer_v1" / "backend"
sys.path.insert(0, str(project_root))

from app.services.pinecone_manager import PineconeManager

def check_index_methods():
    """인덱스 메소드들 확인"""
    try:
        manager = PineconeManager()
        index = manager.get_index()

        print("=== Pinecone Index 사용 가능한 메소드들 ===")
        methods = [method for method in dir(index) if not method.startswith('_')]
        for method in methods:
            print(f"  - {method}")

        print(f"\n=== 인덱스 정보 ===")
        print(f"인덱스 타입: {type(index)}")

        # 통계 정보도 확인
        stats = manager.get_index_stats()
        print(f"통계: {stats}")

    except Exception as e:
        print(f"오류 발생: {e}")

if __name__ == "__main__":
    check_index_methods()