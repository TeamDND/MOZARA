"""
Pinecone 인덱스 생성 및 데이터 입력 스크립트
"""
import os
import pinecone
from dotenv import load_dotenv
import random

# .env 파일 로드 (상위 디렉토리의 .env 파일 사용)
load_dotenv("../../../.env")

def create_index_and_import_data():
    """인덱스 생성 및 데이터 입력"""
    
    # Pinecone 초기화
    api_key = os.getenv("PINECONE_API_KEY")
    if not api_key:
        print("❌ PINECONE_API_KEY 환경변수가 설정되지 않았습니다.")
        return
    
    print("🌲 Pinecone 클라이언트 초기화 중...")
    pinecone.init(api_key=api_key, environment="us-east-1")
    
    index_name = "hair-loss-image"
    
    try:
        # 기존 인덱스 확인
        existing_indexes = [index.name for index in pinecone.list_indexes()]
        print(f"📋 기존 인덱스 목록: {existing_indexes}")
        
        if index_name in existing_indexes:
            print(f"✅ 인덱스 '{index_name}'이(가) 이미 존재합니다.")
            # 기존 인덱스 삭제
            print(f"🗑️ 기존 인덱스 '{index_name}' 삭제 중...")
            pinecone.delete_index(index_name)
            print(f"✅ 인덱스 '{index_name}' 삭제 완료!")
        
        # 새 인덱스 생성
        print(f"🆕 인덱스 '{index_name}' 생성 중...")
        pinecone.create_index(
            name=index_name,
            dimension=768,  # CLIP 모델의 벡터 차원
            metric="cosine"
        )
        print(f"✅ 인덱스 '{index_name}' 생성 완료!")
        
        # 인덱스 연결
        index = pinecone.Index(index_name)
        
        # 샘플 데이터 입력
        print("📊 샘플 데이터 입력 중...")
        sample_data = []
        
        for i in range(10):
            # 768차원 랜덤 벡터 생성
            vector = [random.random() for _ in range(768)]
            
            # 메타데이터
            metadata = {
                "diagnosis": random.choice(["경미", "중등도", "심각"]),
                "gender": random.choice(["남성", "여성"]),
                "stage": random.randint(1, 5),
                "confidence": round(random.uniform(0.7, 0.95), 2)
            }
            
            sample_data.append({
                "id": f"sample_{i}",
                "values": vector,
                "metadata": metadata
            })
        
        # 벡터 업로드
        index.upsert(vectors=sample_data)
        print(f"✅ {len(sample_data)}개 샘플 데이터 입력 완료!")
        
        # 인덱스 상태 확인
        stats = index.describe_index_stats()
        print(f"📊 인덱스 통계: {stats}")
        
    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")

if __name__ == "__main__":
    create_index_and_import_data()