"""
실제 모발 손상 데이터를 Pinecone에 입력하는 스크립트
"""
import os
import pinecone
from dotenv import load_dotenv
from PIL import Image
from transformers import CLIPProcessor, CLIPModel
import torch
from pathlib import Path

# .env 파일 로드 (상위 디렉토리의 .env 파일 사용)
load_dotenv("../../../../.env")

def load_clip_model():
    """CLIP 모델 로드"""
    print("🔄 CLIP 모델 로딩 중...")
    model = CLIPModel.from_pretrained("openai/clip-vit-large-patch14")
    processor = CLIPProcessor.from_pretrained("openai/clip-vit-large-patch14")
    print("✅ CLIP 모델 로딩 완료")
    return model, processor

def get_image_embedding(image_path, model, processor):
    """이미지에서 벡터 추출"""
    try:
        image = Image.open(image_path).convert('RGB')
        inputs = processor(images=image, return_tensors="pt")
        
        with torch.no_grad():
            image_features = model.get_image_features(**inputs)
            # 정규화
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)
            
        return image_features.squeeze().tolist()
    except Exception as e:
        print(f"❌ 이미지 처리 오류 {image_path}: {str(e)}")
        return None

def parse_filename(filename):
    """파일명에서 라벨 정보 추출"""
    if filename.startswith('mild_'):
        return "경미", 1
    elif filename.startswith('moderate_'):
        return "중등도", 2
    elif filename.startswith('severe_'):
        return "심각", 3
    else:
        return "알 수 없음", 0

def import_real_data():
    """실제 데이터를 Pinecone에 입력"""
    
    # Pinecone API 키 및 호스트 정보 로드
    api_key = os.getenv("PINECONE_API_KEY")
    index_host = os.getenv("PINECONE_INDEX_HOST")

    if not api_key or not index_host:
        print("❌ PINECONE_API_KEY 또는 PINECONE_INDEX_HOST 환경변수가 설정되지 않았습니다.")
        return

    print("🌲 Pinecone 클라이언트 초기화 중...")
    try:
        # Pinecone 클라이언트 초기화 (v3.x 방식)
        from pinecone import Pinecone
        pc = Pinecone(api_key=api_key)
        
        # 인덱스 호스트를 사용하여 직접 인덱스에 연결
        print(f"🔗 인덱스 호스트에 연결 중: {index_host}")
        index = pc.Index(host=index_host)
        
        # 인덱스 연결 확인
        stats = index.describe_index_stats()
        print("✅ 인덱스 연결 성공!")
        print(f"📊 현재 인덱스 통계: {stats}")

        # CLIP 모델 로드
        model, processor = load_clip_model()
        
        # 데이터 디렉토리
        data_dir = Path("C:/Users/301/Desktop/hair_damage/train")
        
        # 이미지 파일들 처리
        image_files = list(data_dir.glob("*.jpg"))
        print(f"📊 총 {len(image_files)}개 이미지 파일 발견")
        
        batch_size = 10
        vectors_to_upsert = []
        
        for i, image_path in enumerate(image_files):
            print(f"🔄 처리 중: {i+1}/{len(image_files)} - {image_path.name}")
            
            vector = get_image_embedding(image_path, model, processor)
            if vector is None:
                continue
            
            diagnosis, stage = parse_filename(image_path.name)
            
            metadata = {
                "filename": image_path.name,
                "diagnosis": diagnosis,
                "gender": "남성",
                "stage": stage,
                "confidence": 0.95,
                "data_type": "real"
            }
            
            vectors_to_upsert.append({
                "id": f"real_{i}",
                "values": vector,
                "metadata": metadata
            })
            
            if len(vectors_to_upsert) >= batch_size:
                print(f"📤 {len(vectors_to_upsert)}개 벡터 업로드 중...")
                index.upsert(vectors=vectors_to_upsert)
                vectors_to_upsert = []
        
        if vectors_to_upsert:
            print(f"📤 마지막 {len(vectors_to_upsert)}개 벡터 업로드 중...")
            index.upsert(vectors=vectors_to_upsert)
        
        stats = index.describe_index_stats()
        print(f"📊 최종 인덱스 통계: {stats}")
        print("✅ 실제 데이터 입력 완료!")
        
    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")

if __name__ == "__main__":
    import_real_data()