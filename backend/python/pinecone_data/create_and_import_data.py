"""
Pinecone 인덱스 생성 및 데이터 입력 스크립트
"""
import os
from pinecone import Pinecone, ServerlessSpec
from dotenv import load_dotenv
import random
import json
import glob
from pathlib import Path
import numpy as np

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
    pc = Pinecone(api_key=api_key)
    
    index_name = os.getenv("PINECONE_INDEX_NAME2")
    
    try:
        # 기존 인덱스 확인
        existing_indexes = pc.list_indexes().names()
        print(f"📋 기존 인덱스 목록: {existing_indexes}")
        
        if index_name in existing_indexes:
            print(f"✅ 인덱스 '{index_name}'이(가) 이미 존재합니다.")
            # 기존 인덱스 삭제
            print(f"🗑️ 기존 인덱스 '{index_name}' 삭제 중...")
            pc.delete_index(index_name)
            print(f"✅ 인덱스 '{index_name}' 삭제 완료!")
        
        # 새 인덱스 생성
        print(f"🆕 인덱스 '{index_name}' 생성 중...")
        pc.create_index(
            name=index_name,
            dimension=1552,  # CLIP 앙상블 모델들(3개 × 512) + 프롬프트 특징(16) = 1552차원 (탈모 제외, 메모리 최적화)
            metric="cosine",
            spec=ServerlessSpec(
                cloud='aws',
                region='us-east-1'
            )
        )
        print(f"✅ 인덱스 '{index_name}' 생성 완료!")
        
        # 인덱스 연결
        index = pc.Index(index_name)
        
        # CLIP 앙상블 모델 초기화
        print("🤖 CLIP 앙상블 모델 초기화 중...")
        try:
            import sys
            sys.path.append(os.path.join(os.path.dirname(__file__), '..'))
            from services.hair_loss_daily.services.clip_ensemble_service import clip_ensemble_service
            clip_service = clip_ensemble_service
            print("✅ CLIP 앙상블 모델 초기화 완료!")
        except Exception as e:
            print(f"❌ CLIP 앙상블 로드 실패: {str(e)}")
            print("❌ CLIP 앙상블이 필요합니다. 종료합니다.")
            return
        
        # 실제 데이터 입력
        print("📊 실제 데이터 입력 중...")
        data_path = "C:/Users/301/Desktop/data_all"
        vectors_data = []
        
        # 라벨링 데이터 폴더 경로
        labeling_path = os.path.join(data_path, "라벨링데이터")
        
        # 카테고리별로 데이터 처리 (탈모 제외)
        categories = ["1.미세각질", "2.피지과다", "3.모낭사이홍반", "4.모낭홍반농포", "5.비듬"]
        severity_levels = ["0.양호", "1.경증", "2.중등도", "3.중증"]
        
        for category in categories:
            print(f"📁 카테고리 '{category}' 처리 중...")
            
            for severity in severity_levels:
                category_path = os.path.join(labeling_path, category, severity)
                
                if not os.path.exists(category_path):
                    continue
                
                # JSON 파일들 읽기
                json_files = glob.glob(os.path.join(category_path, "*.json"))
                
                for json_file in json_files:
                    try:
                        with open(json_file, 'r', encoding='utf-8') as f:
                            data = json.load(f)
                        
                        # 이미지 파일 경로 구성
                        image_file_name = data.get("image_file_name", "")
                        if not image_file_name:
                            continue
                            
                        # 원천데이터 폴더에서 해당 이미지 찾기
                        source_data_path = os.path.join(data_path, "원천데이터", category, severity, image_file_name)
                        
                        if not os.path.exists(source_data_path):
                            print(f"⚠️ 이미지 파일을 찾을 수 없습니다: {source_data_path}")
                            continue
                        
                        # CLIP 앙상블로 이미지 임베딩 생성
                        try:
                            # CLIP 앙상블로 벡터 생성
                            with open(source_data_path, 'rb') as f:
                                image_bytes = f.read()
                            hybrid_features = clip_service.extract_hybrid_features(image_bytes)
                            vector = hybrid_features["combined"]
                            print(f"✅ CLIP 앙상블 벡터 생성: {len(vector)}차원")
                        except Exception as e:
                            print(f"❌ CLIP 앙상블 실패: {str(e)}")
                            continue
                        
                        if vector is None or len(vector) == 0:
                            print(f"⚠️ 이미지 임베딩 생성 실패: {source_data_path}")
                            continue
                        
                        # 메타데이터 구성 (탈모 제외)
                        metadata = {
                            "image_id": data.get("image_id", ""),
                            "image_file_name": data.get("image_file_name", ""),
                            "image_path": source_data_path,  # 전체 이미지 경로 추가
                            "category": category,
                            "severity": severity,
                            "severity_level": severity.split(".")[0],
                            "value_1": data.get("value_1", "0"),
                            "value_2": data.get("value_2", "0"),
                            "value_3": data.get("value_3", "0"),
                            "value_4": data.get("value_4", "0"),
                            "value_5": data.get("value_5", "0")
                            # "value_6": data.get("value_6", "0") - 탈모 제외
                        }
                        
                        vectors_data.append({
                            "id": data.get("image_id", f"unknown_{len(vectors_data)}"),
                            "values": vector,
                            "metadata": metadata
                        })
                        
                    except Exception as e:
                        print(f"⚠️ 파일 처리 오류: {json_file} - {str(e)}")
                        continue
        
        # 벡터 업로드 (배치 단위로)
        batch_size = 100
        total_uploaded = 0
        
        for i in range(0, len(vectors_data), batch_size):
            batch = vectors_data[i:i + batch_size]
            index.upsert(vectors=batch)
            total_uploaded += len(batch)
            print(f"📤 {total_uploaded}/{len(vectors_data)} 벡터 업로드 완료...")
        
        print(f"✅ 총 {len(vectors_data)}개 데이터 입력 완료!")
        
        # 인덱스 상태 확인
        stats = index.describe_index_stats()
        print(f"📊 인덱스 통계: {stats}")
        
    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")

if __name__ == "__main__":
    create_index_and_import_data()