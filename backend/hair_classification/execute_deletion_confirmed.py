"""
확인된 대량 벡터 삭제 실행 (자동 확인)
"""
import os
import sys
from pathlib import Path

# 프로젝트 루트를 Python path에 추가
project_root = Path(__file__).parent / "hair_loss_rag_analyzer_v1" / "backend"
sys.path.insert(0, str(project_root))

from dual_index_vector_manager import DualIndexVectorManager

def main():
    """확인된 17개 패턴 대량 삭제 실행"""

    delete_patterns = [
        "37-back",
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
    print("PINECONE 대량 벡터 실제 삭제 시작")
    print("="*80)
    print(f"삭제 패턴 수: {len(delete_patterns)}개")
    print("예상 삭제 벡터: 183개 (ConvNeXt: 116개, ViT: 67개)")
    print()

    try:
        # 매니저 초기화
        print("[시작] 매니저 초기화 및 삭제 진행...")
        manager = DualIndexVectorManager()

        # 삭제 전 상태 확인
        print("[삭제전] 현재 인덱스 상태:")
        before_stats = manager.get_both_index_stats()
        for key, stat in before_stats.items():
            if 'error' not in stat:
                print(f"  - {stat['name']}: {stat['total_vectors']:,}개 벡터")

        # 실제 삭제 수행 (확인 없이 바로 진행)
        print("\n[실행] 실제 삭제 작업 시작...")
        deletion_results = manager.delete_vectors_by_patterns(
            patterns=delete_patterns,
            confirm_deletion=True,
            dry_run=False
        )

        # 최종 리포트 출력
        print("\n[리포트] 삭제 결과:")
        final_report = manager.generate_deletion_report(deletion_results)
        print(final_report)

        # 삭제 후 상태 확인
        print("[삭제후] 최종 인덱스 상태:")
        after_stats = manager.get_both_index_stats()
        for key, stat in after_stats.items():
            if 'error' not in stat:
                before_count = before_stats[key]['total_vectors']
                after_count = stat['total_vectors']
                deleted = before_count - after_count
                print(f"  - {stat['name']}: {after_count:,}개 벡터 (삭제: {deleted}개)")

        print("\n[완료] 대량 삭제 작업이 성공적으로 완료되었습니다!")

    except Exception as e:
        print(f"[오류] 삭제 중 오류 발생: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()