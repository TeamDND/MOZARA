"""
hair-loss-vit-s16 인덱스 (384차원)에서 패턴 검색
"""
import os
import sys
import numpy as np
from pathlib import Path

# 프로젝트 루트를 Python path에 추가
project_root = Path(__file__).parent / "hair_loss_rag_analyzer_v1" / "backend"
sys.path.insert(0, str(project_root))

from app.services.pinecone_manager import Pinecone

class VitS16IndexChecker:
    """ViT-S16 인덱스 확인 클래스"""

    def __init__(self):
        self.api_key = os.getenv('PINECONE_API_KEY')
        if not self.api_key:
            raise ValueError("PINECONE_API_KEY가 설정되지 않았습니다.")

        self.pc = Pinecone(api_key=self.api_key)
        self.index = self.pc.Index("hair-loss-vit-s16")  # ViT-S16 인덱스
        self.dimension = 384

    def get_index_stats(self):
        """인덱스 통계 확인"""
        try:
            stats = self.index.describe_index_stats()
            print(f"=== hair-loss-vit-s16 인덱스 정보 ===")
            print(f"총 벡터 수: {stats.get('total_vector_count', 0):,}")
            print(f"차원: {stats.get('dimension', 0)}")
            print(f"인덱스 사용률: {stats.get('index_fullness', 0):.2%}")
            return stats
        except Exception as e:
            print(f"인덱스 통계 조회 실패: {e}")
            return None

    def search_patterns_in_vit_index(self):
        """ViT-S16 인덱스에서 패턴 검색"""
        try:
            # 더미 벡터 (384차원)
            dummy_vector = np.zeros(self.dimension).tolist()

            print(f"\n=== ViT-S16 인덱스에서 패턴 검색 시작 ===")

            # 여러 배치로 나누어 전체 데이터 스캔
            all_matches = []
            batch_size = 10000

            for offset in range(0, 50000, batch_size):  # 충분히 큰 범위
                print(f"배치 {offset//batch_size + 1}: {offset}~{offset+batch_size-1}")

                results = self.index.query(
                    vector=dummy_vector,
                    top_k=batch_size,
                    include_metadata=True
                )

                current_matches = results.matches
                print(f"이번 배치에서 가져온 벡터 수: {len(current_matches)}")

                if not current_matches:
                    print("더 이상 데이터가 없습니다.")
                    break

                all_matches.extend(current_matches)

                if len(current_matches) < batch_size:
                    print("마지막 배치입니다.")
                    break

            print(f"\n총 수집된 벡터 수: {len(all_matches)}")

            # 찾을 패턴들
            patterns_to_search = [
                '37-Back_jpg',
                '20231224152230NVMy5f',
                '2eb3e4ce37e41f082830848e56afd798-top',
                '2eb3e4ce37e41f082830848e56afd798',
                'NVMy5f',
                '152230'
            ]

            for pattern in patterns_to_search:
                print(f"\n=== '{pattern}' 패턴 검색 결과 ===")

                matching_vectors = []
                unique_filenames = set()

                for match in all_matches:
                    if match.metadata and match.metadata.get('filename'):
                        filename = match.metadata['filename']

                        if pattern in filename:
                            matching_vectors.append({
                                'id': match.id,
                                'filename': filename,
                                'pointview': match.metadata.get('pointview'),
                                'stage': match.metadata.get('stage'),
                            })
                            unique_filenames.add(filename)

                print(f"매칭된 벡터 수: {len(matching_vectors)}개")
                print(f"고유 파일 수: {len(unique_filenames)}개")

                if matching_vectors:
                    print(f"\n매칭된 벡터들 (처음 10개):")
                    for i, vector in enumerate(matching_vectors[:10], 1):
                        print(f"  {i}. ID: {vector['id']}")
                        print(f"     파일명: {vector['filename']}")
                        print(f"     뷰포인트: {vector['pointview']}")
                        print(f"     스테이지: {vector['stage']}")

                    if len(matching_vectors) > 10:
                        print(f"  ... 그리고 {len(matching_vectors) - 10}개 더")

                    print(f"\n삭제할 ID 리스트:")
                    for vector in matching_vectors:
                        print(f"  {vector['id']}")

            # 20231224 날짜 전체 통계
            print(f"\n=== 20231224 날짜 전체 파일 통계 (ViT-S16) ===")
            date_matches = []

            for match in all_matches:
                if match.metadata and match.metadata.get('filename'):
                    filename = match.metadata['filename']
                    if '20231224' in filename:
                        date_matches.append(filename)

            unique_date_files = list(set(date_matches))
            print(f"20231224 날짜가 포함된 벡터 수: {len(date_matches)}")
            print(f"고유 20231224 파일 수: {len(unique_date_files)}")

            if len(unique_date_files) <= 20:
                print("\n모든 20231224 파일들:")
                for i, filename in enumerate(sorted(unique_date_files), 1):
                    print(f"  {i}. {filename}")

        except Exception as e:
            print(f"ViT-S16 인덱스 검색 중 오류: {e}")
            import traceback
            traceback.print_exc()

def main():
    """메인 함수"""
    try:
        checker = VitS16IndexChecker()

        # 인덱스 정보 확인
        stats = checker.get_index_stats()

        if stats:
            # 패턴 검색 수행
            checker.search_patterns_in_vit_index()
        else:
            print("인덱스에 접근할 수 없습니다.")

    except Exception as e:
        print(f"오류 발생: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()