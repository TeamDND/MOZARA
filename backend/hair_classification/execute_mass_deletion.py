"""
대량 벡터 삭제 실행 스크립트
17개 패턴을 두 인덱스에서 삭제
"""
import os
import sys
from pathlib import Path

# 프로젝트 루트를 Python path에 추가
project_root = Path(__file__).parent / "hair_loss_rag_analyzer_v1" / "backend"
sys.path.insert(0, str(project_root))

from dual_index_vector_manager import DualIndexVectorManager

def main():
    """17개 패턴 대량 삭제 실행"""

    # vector_delete_list.txt에서 읽어온 패턴들
    delete_patterns = [
        "37-back",  # 원래는 37-Back_jpg 였는데 더 넓게 매칭
        "20231224152230NVMy5f",
        "20231224164216joJkxJ",
        "20231225045824PLLwSq_channeldrop",
        "20231227130814tp52dM_jpg",
        "20231229125025h0rziY_jpg",
        "20231229172809ThayKq_jpg",
        "20231229172835hsUlWY_jpg",
        "20231229173338gJ0nuC_jpg",
        "20231229173430HV4mVs_jpg",
        "20240106041745aFqhUn",
        "20240225164417vwUUmf_jpg",
        "202312271517539Qdexs_jpg",
        "eu-902da8c4-e34f-4fc8-8aa3-229f5dcd75fe_jpg",
        "20240105194437swInPJ",
        "20240110122847hN8VwR",
        "eu-1318656b-9b75-4e65-89e7-154aa2916ead"
    ]

    print("="*80)
    print("PINECONE 대량 벡터 삭제 작업")
    print("="*80)
    print(f"삭제 대상 패턴 수: {len(delete_patterns)}개")
    print("대상 인덱스:")
    print("  - hair-loss-rag-analyzer (1536차원)")
    print("  - hair-loss-vit-s16 (384차원)")
    print()

    # 패턴 목록 출력
    print("삭제 패턴 목록:")
    for i, pattern in enumerate(delete_patterns, 1):
        print(f"  {i:2d}. {pattern}")
    print()

    try:
        # 매니저 초기화
        print("[초기화] 매니저 초기화 중...")
        manager = DualIndexVectorManager()

        # 인덱스 상태 확인
        print("[상태확인] 인덱스 상태 확인 중...")
        stats = manager.get_both_index_stats()

        print("현재 인덱스 상태:")
        for key, stat in stats.items():
            if 'error' not in stat:
                print(f"  - {stat['name']}: {stat['total_vectors']:,}개 벡터")
            else:
                print(f"  - {key}: 오류 - {stat['error']}")
        print()

        # 1단계: DRY RUN으로 삭제 예정 벡터 확인
        print("[1단계] 삭제 예정 벡터 검색 및 분석...")
        dry_run_results = manager.delete_vectors_by_patterns(
            patterns=delete_patterns,
            dry_run=True
        )

        # DRY RUN 리포트 출력
        dry_run_report = manager.generate_deletion_report(dry_run_results)
        print(dry_run_report)

        # 사용자 확인 대기
        total_to_delete = dry_run_results.get('search_results', {}).get('summary', {}).get('total_vectors_to_delete', 0)

        if total_to_delete == 0:
            print("[종료] 삭제할 벡터가 없습니다. 작업을 종료합니다.")
            return

        print(f"[경고] 총 {total_to_delete}개의 벡터를 삭제합니다.")
        print("[경고] 이 작업은 되돌릴 수 없습니다!")
        print()

        confirmation = input("계속 진행하시겠습니까? (YES 입력 시 진행): ")

        if confirmation.upper() != "YES":
            print("[취소] 사용자가 취소했습니다. 작업을 종료합니다.")
            return

        # 2단계: 실제 삭제 수행
        print("\n" + "="*80)
        print("[2단계] 실제 삭제 작업 시작...")
        print("="*80)

        actual_deletion_results = manager.delete_vectors_by_patterns(
            patterns=delete_patterns,
            confirm_deletion=True,
            dry_run=False
        )

        # 최종 리포트 출력
        final_report = manager.generate_deletion_report(actual_deletion_results)
        print(final_report)

        # 최종 상태 확인
        print("[최종상태] 삭제 후 인덱스 상태:")
        final_stats = manager.get_both_index_stats()

        for key, stat in final_stats.items():
            if 'error' not in stat:
                print(f"  - {stat['name']}: {stat['total_vectors']:,}개 벡터")
            else:
                print(f"  - {key}: 오류 - {stat['error']}")

        print("\n[완료] 대량 삭제 작업이 완료되었습니다!")

    except Exception as e:
        print(f"[오류] 오류 발생: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()