"""
빠른 패턴 검색 테스트
"""
import os
import sys
import numpy as np
from pathlib import Path

# 프로젝트 루트를 Python path에 추가
project_root = Path(__file__).parent / "hair_loss_rag_analyzer_v1" / "backend"
sys.path.insert(0, str(project_root))

from app.services.pinecone_manager import Pinecone

def quick_search_pattern(pattern: str):
    """빠른 패턴 검색"""
    try:
        api_key = os.getenv('PINECONE_API_KEY')
        pc = Pinecone(api_key=api_key)

        # 두 인덱스에서 검색
        indexes = {
            'ConvNeXt (1536차원)': pc.Index("hair-loss-rag-analyzer"),
            'ViT-S16 (384차원)': pc.Index("hair-loss-vit-s16")
        }

        print(f"=== '{pattern}' 패턴 검색 결과 ===\n")

        total_found = 0

        for idx_name, index in indexes.items():
            print(f"[검색] {idx_name} 검색 중...")

            try:
                # 인덱스 차원에 맞는 더미 벡터
                dimension = 1536 if '1536' in idx_name else 384
                dummy_vector = np.zeros(dimension).tolist()

                # 검색 수행
                results = index.query(
                    vector=dummy_vector,
                    top_k=10000,
                    include_metadata=True
                )

                # 패턴 매칭
                matching_vectors = []
                for match in results.matches:
                    if match.metadata and match.metadata.get('filename'):
                        filename = match.metadata['filename']
                        if pattern in filename:
                            matching_vectors.append({
                                'id': match.id,
                                'filename': filename,
                                'pointview': match.metadata.get('pointview'),
                                'stage': match.metadata.get('stage')
                            })

                print(f"  [결과] 발견: {len(matching_vectors)}개 벡터")

                if matching_vectors:
                    print("  [파일목록] 매칭된 파일들:")
                    for i, vector in enumerate(matching_vectors, 1):
                        print(f"    {i}. {vector['filename']}")
                        print(f"       ID: {vector['id']}")
                        print(f"       뷰포인트: {vector['pointview']}, 스테이지: {vector['stage']}")
                        print()

                total_found += len(matching_vectors)

            except Exception as e:
                print(f"  [오류] {e}")

            print()

        print(f"[총계] 총 발견된 벡터: {total_found}개")

    except Exception as e:
        print(f"검색 중 오류 발생: {e}")

if __name__ == "__main__":
    # 검색할 패턴
    pattern = "20231229173430HV4mVs"
    quick_search_pattern(pattern)