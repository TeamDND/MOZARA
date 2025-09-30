"""
Pinecone 벡터 검색 및 삭제 테스트 스크립트
37-Back_jpg 같은 패턴으로 벡터들을 찾아서 삭제할 수 있습니다.
"""
import os
import sys
from pathlib import Path

# 프로젝트 루트를 Python path에 추가
project_root = Path(__file__).parent / "hair_loss_rag_analyzer_v1" / "backend"
sys.path.insert(0, str(project_root))

from app.services.pinecone_manager import PineconeManager
from app.config import settings

def test_search_by_prefix():
    """prefix로 벡터 검색 테스트"""
    try:
        manager = PineconeManager()

        # 37-Back_jpg로 시작하는 벡터들 검색
        prefix = "37-Back_jpg"
        matching_ids = manager.search_vectors_by_prefix(prefix, limit=100)

        print(f"\n=== '{prefix}' prefix 검색 결과 ===")
        print(f"찾은 벡터 수: {len(matching_ids)}")

        if matching_ids:
            print("\n매칭된 ID들:")
            for i, vector_id in enumerate(matching_ids[:10], 1):  # 처음 10개만 표시
                print(f"  {i}. {vector_id}")

            if len(matching_ids) > 10:
                print(f"  ... 그리고 {len(matching_ids) - 10}개 더")
        else:
            print("매칭되는 벡터가 없습니다.")

    except Exception as e:
        print(f"검색 중 오류 발생: {e}")

def test_delete_by_prefix():
    """prefix로 벡터 삭제 테스트 (안전 모드)"""
    try:
        manager = PineconeManager()

        # 먼저 확인 모드로 실행 (실제 삭제 안함)
        prefix = "37-Back_jpg"
        result = manager.delete_vectors_by_prefix(prefix, confirm=False)

        print(f"\n=== '{prefix}' prefix 삭제 미리보기 ===")
        print(f"결과: {result}")

        if result.get('found_count', 0) > 0:
            print(f"\n발견된 벡터 수: {result['found_count']}")
            preview_ids = result.get('preview_ids', [])
            if preview_ids:
                print("\n삭제 예정 벡터들 (미리보기):")
                for i, vector_id in enumerate(preview_ids, 1):
                    print(f"  {i}. {vector_id}")

            print(f"\n실제 삭제하려면: manager.delete_vectors_by_prefix('{prefix}', confirm=True)")

    except Exception as e:
        print(f"삭제 테스트 중 오류 발생: {e}")

def actual_delete_by_prefix(prefix: str):
    """실제로 prefix로 벡터 삭제 (주의!)"""
    try:
        manager = PineconeManager()

        print(f"\n경고: '{prefix}' prefix로 시작하는 모든 벡터를 삭제합니다!")
        confirm = input("정말 삭제하시겠습니까? (yes/no): ")

        if confirm.lower() != 'yes':
            print("삭제가 취소되었습니다.")
            return

        result = manager.delete_vectors_by_prefix(prefix, confirm=True)

        print(f"\n=== 삭제 결과 ===")
        print(f"성공: {result.get('success', False)}")
        print(f"발견된 벡터 수: {result.get('found_count', 0)}")
        print(f"삭제된 벡터 수: {result.get('deleted_count', 0)}")
        print(f"메시지: {result.get('message', '')}")

    except Exception as e:
        print(f"삭제 중 오류 발생: {e}")

def get_index_stats():
    """인덱스 통계 정보 출력"""
    try:
        manager = PineconeManager()
        stats = manager.get_index_stats()

        print(f"\n=== Pinecone 인덱스 통계 ===")
        if stats.get('success', False):
            print(f"총 벡터 수: {stats.get('total_vector_count', 0):,}")
            print(f"차원: {stats.get('dimension', 0)}")
            print(f"인덱스 사용률: {stats.get('index_fullness', 0):.2%}")
        else:
            print(f"통계 조회 실패: {stats.get('error', 'Unknown error')}")

    except Exception as e:
        print(f"통계 조회 중 오류 발생: {e}")

def main():
    """메인 함수"""
    print("=== Pinecone 벡터 관리 도구 ===")
    print("1. 인덱스 통계 조회")
    print("2. Prefix로 벡터 검색")
    print("3. Prefix로 벡터 삭제 미리보기")
    print("4. 실제 벡터 삭제 (주의!)")

    choice = input("\n원하는 기능을 선택하세요 (1-4): ")

    if choice == '1':
        get_index_stats()
    elif choice == '2':
        test_search_by_prefix()
    elif choice == '3':
        test_delete_by_prefix()
    elif choice == '4':
        prefix = input("삭제할 prefix를 입력하세요 (예: 37-Back_jpg): ")
        actual_delete_by_prefix(prefix)
    else:
        print("잘못된 선택입니다.")

if __name__ == "__main__":
    main()