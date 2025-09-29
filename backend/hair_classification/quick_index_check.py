"""
벡터 삭제 후 인덱스 상태 및 간단한 성능 테스트
"""
import os
import sys
import numpy as np
from pathlib import Path

# 프로젝트 루트를 Python path에 추가
project_root = Path(__file__).parent / "hair_loss_rag_analyzer_v1" / "backend"
sys.path.insert(0, str(project_root))

from app.services.pinecone_manager import Pinecone

def check_index_status():
    """인덱스 상태 확인"""
    try:
        api_key = os.getenv('PINECONE_API_KEY')
        if not api_key:
            print("PINECONE_API_KEY 환경변수가 설정되지 않았습니다.")
            return

        pc = Pinecone(api_key=api_key)

        # 두 인덱스 상태 확인
        indexes = {
            'ConvNeXt (1536차원)': 'hair-loss-rag-analyzer',
            'ViT-S16 (384차원)': 'hair-loss-vit-s16'
        }

        print("="*60)
        print("벡터 삭제 후 인덱스 상태 확인")
        print("="*60)

        total_vectors = 0
        for name, idx_name in indexes.items():
            try:
                index = pc.Index(idx_name)
                stats = index.describe_index_stats()
                vector_count = stats.get('total_vector_count', 0)
                total_vectors += vector_count

                print(f"{name}: {vector_count:,}개 벡터")
                print(f"  - 인덱스 사용률: {stats.get('index_fullness', 0):.4f}")

            except Exception as e:
                print(f"{name}: 오류 - {e}")

        print("-"*40)
        print(f"총 벡터 수: {total_vectors:,}개")
        print("="*60)

        return True

    except Exception as e:
        print(f"인덱스 확인 중 오류: {e}")
        return False

def quick_search_test():
    """간단한 검색 테스트"""
    try:
        api_key = os.getenv('PINECONE_API_KEY')
        pc = Pinecone(api_key=api_key)

        # 더미 벡터로 간단한 검색 테스트
        conv_index = pc.Index('hair-loss-rag-analyzer')
        vit_index = pc.Index('hair-loss-vit-s16')

        print("간단한 검색 테스트 수행 중...")

        # ConvNeXt 인덱스 테스트
        dummy_conv = np.zeros(1536).tolist()
        conv_result = conv_index.query(vector=dummy_conv, top_k=5, include_metadata=True)
        conv_matches = len(conv_result.get('matches', []))

        # ViT 인덱스 테스트
        dummy_vit = np.zeros(384).tolist()
        vit_result = vit_index.query(vector=dummy_vit, top_k=5, include_metadata=True)
        vit_matches = len(vit_result.get('matches', []))

        print(f"ConvNeXt 검색 결과: {conv_matches}개 매치")
        print(f"ViT 검색 결과: {vit_matches}개 매치")

        # 삭제된 패턴이 검색되지 않는지 확인
        print("\n삭제된 패턴 확인:")
        deleted_patterns = ["37-back", "20231224152230NVMy5f"]

        for pattern in deleted_patterns:
            conv_found = 0
            vit_found = 0

            for match in conv_result.get('matches', []):
                if match.metadata and match.metadata.get('filename'):
                    if pattern in match.metadata['filename']:
                        conv_found += 1

            for match in vit_result.get('matches', []):
                if match.metadata and match.metadata.get('filename'):
                    if pattern in match.metadata['filename']:
                        vit_found += 1

            print(f"패턴 '{pattern}': ConvNeXt={conv_found}개, ViT={vit_found}개")

        return True

    except Exception as e:
        print(f"검색 테스트 중 오류: {e}")
        return False

if __name__ == "__main__":
    print("벡터 삭제 후 인덱스 상태 및 검색 테스트")
    print()

    # 인덱스 상태 확인
    if check_index_status():
        print()
        # 간단한 검색 테스트
        quick_search_test()

    print("\n테스트 완료!")