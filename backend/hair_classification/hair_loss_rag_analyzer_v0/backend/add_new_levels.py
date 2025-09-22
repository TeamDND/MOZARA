import asyncio
import os
from app.services.hair_loss_analyzer import HairLossAnalyzer
from app.services.image_processor import ImageProcessor
from app.config import settings

async def add_specific_levels(levels_to_add):
    """
    지정된 레벨의 이미지를 처리하고 기존 FAISS 인덱스에 추가합니다.
    """
    analyzer = HairLossAnalyzer()
    image_processor = ImageProcessor()

    print(f"처리할 레벨: {levels_to_add}")

    # 데이터셋 경로 설정
    dataset_path = settings.DATASET_PATH

    # 지정된 레벨에 대한 임베딩 생성
    print("지정된 레벨에 대한 임베딩 생성 중...")
    embeddings_data = image_processor.process_dataset(dataset_path, stages=levels_to_add)

    if len(embeddings_data['embeddings']) > 0:
        print("FAISS 인덱스를 재생성하여 임베딩 업로드 중...")
        # 'recreate' 플래그를 True로 설정하여 기존 인덱스를 완전히 교체
        embeddings_data['recreate'] = True
        upload_success = analyzer.vector_manager.upload_embeddings(embeddings_data)
        if upload_success:
            print("성공적으로 새로운 레벨을 인덱스에 추가했습니다.")
            # 추가된 벡터 수 확인
            stats = analyzer.vector_manager.get_index_stats()
            if stats['success']:
                print(f"현재 총 벡터 수: {stats['total_vector_count']}")
        else:
            print("임베딩 업로드에 실패했습니다.")
    else:
        print("지정된 레벨에 대한 이미지를 찾을 수 없습니다.")

if __name__ == "__main__":
    # 추가할 레벨 지정 (모든 레벨 1-7 다시 인덱싱)
    levels_to_add = [1, 2, 3, 4, 5, 6, 7]

    # 이벤트 루프를 생성하고 비동기 함수 실행
    asyncio.run(add_specific_levels(levels_to_add))
