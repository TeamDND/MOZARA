import chromadb

def test_chroma_status():
    """ChromaDB 상태 확인"""
    try:
        # ChromaDB 클라이언트 초기화
        client = chromadb.PersistentClient(path="./chroma_db")
        
        # 컬렉션 목록 조회
        collections = client.list_collections()
        print(f"현재 컬렉션 수: {len(collections)}")
        
        for collection in collections:
            count = collection.count()
            print(f"컬렉션 '{collection.name}': {count}개 문서")
            
            # 샘플 데이터 조회 (최대 3개)
            if count > 0:
                sample = collection.get(limit=3)
                print(f"  샘플 문서:")
                for i, doc_id in enumerate(sample['ids']):
                    print(f"    {i+1}. ID: {doc_id}")
                    if sample['documents'] and i < len(sample['documents']):
                        print(f"       내용: {sample['documents'][i][:100]}...")
        
        return True
        
    except Exception as e:
        print(f"ChromaDB 오류: {e}")
        return False

if __name__ == "__main__":
    print("=== ChromaDB 상태 확인 ===")
    test_chroma_status()
