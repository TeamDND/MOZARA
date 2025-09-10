"""
Pinecone Vector Database Client
"""
import os
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from pinecone import Pinecone
import traceback

# .env 파일 로드 (상위 디렉토리에서 찾기)
load_dotenv("../../.env")

class PineconeClient:
    def __init__(self):
        """
        Initializes the PineconeClient, loading credentials and connecting to the index.
        """
        self.client = None
        self.index = None
        self._initialize_and_connect()

    def _initialize_and_connect(self):
        """
        Initializes the Pinecone client and connects to the index using host.
        """
        print("🔍 Pinecone 초기화 및 연결 시작...")
        api_key = os.getenv("PINECONE_API_KEY")
        index_host = os.getenv("PINECONE_INDEX_HOST")

        if not api_key or not index_host:
            print("❌ PINECONE_API_KEY 또는 PINECONE_INDEX_HOST 환경변수가 설정되지 않았습니다.")
            self.index = None
            return

        try:
            print("🌲 Pinecone 클라이언트 초기화 중...")
            self.client = Pinecone(api_key=api_key)

            print(f"🔗 인덱스 호스트에 연결 중: {index_host}")
            self.index = self.client.Index(host=index_host)

            # Verify connection
            stats = self.index.describe_index_stats()
            print("✅ Pinecone 인덱스 연결 완료!")
            print(f"📊 현재 인덱스 통계: {stats}")

        except Exception as e:
            print(f"❌ Pinecone 초기화 또는 연결 실패: {str(e)}")
            self.index = None

    def insert_analysis_data(self, analysis_result: Dict[str, Any]) -> str:
        """
        분석 결과를 Pinecone에 저장
        """
        if not self.index:
            print("❌ Pinecone 인덱스가 연결되지 않아 데이터 삽입을 건너뜁니다.")
            return "dummy_id_not_inserted"

        vector_id = f"hair_loss_{len(analysis_result.get('image_vector', []))}_{hash(str(analysis_result))}"
        vector_values = analysis_result["image_vector"]
        
        metadata = {
            "image_url": analysis_result.get("processed_image_s3_url", "/path/to/placeholder.jpg"),
            "diagnosis": analysis_result["analysis"]["diagnosis"],
            "gender": "남성",
            "stage": analysis_result["analysis"]["stage"],
            "confidence": analysis_result["analysis"]["confidence"]
        }
        
        self.index.upsert(
            vectors=[{"id": vector_id, "values": vector_values, "metadata": metadata}]
        )
        
        print(f"데이터 저장 성공! Vector ID: {vector_id}")
        return vector_id

    def search_similar_images(self, vector: List[float], search_stage: Optional[int] = None, limit: int = 5):
        """
        유사한 이미지 검색
        """
        print("🔍 search_similar_images 호출됨")
        
        if not self.index:
            print("Pinecone 인덱스가 연결되지 않았습니다. 더미 데이터를 반환합니다.")
            # 오류 메시지를 포함한 더미 결과 반환
            return {"error": "Pinecone index not connected", "results": self._get_dummy_results()}
            
        try:
            # Pinecone에서 유사 벡터 검색
            filter_query = None
            if search_stage is not None:
                filter_query = {"stage": {"$eq": search_stage}}

            search_response = self.index.query(
                vector=vector,
                top_k=limit,
                filter=filter_query,
                include_metadata=True
            )
        except Exception as e:
            print(f"❌ Pinecone 검색 오류: {e}")
            traceback.print_exc() # 이 부분은 계속 유지
            # 오류 메시지를 포함한 더미 결과 반환
            return {"error": f"Pinecone search failed: {str(e)}", "results": self._get_dummy_results()}
        
        # 결과를 Weaviate와 유사한 형태로 변환
        class MockObject:
            def __init__(self, match_data):
                self.uuid = match_data.id
                self.properties = match_data.metadata
                self.score = match_data.score
        
        results = [MockObject(match) for match in search_response.matches]
        return results
    
    def _get_dummy_results(self):
        """더미 결과 반환"""
        class MockObject:
            def __init__(self, uuid, properties):
                self.uuid = uuid
                self.properties = properties
                self.score = 0.85
        
        return [
            MockObject("dummy_1", {"diagnosis": "mild", "gender": "남성", "stage": 1, "confidence": 0.95}),
            MockObject("dummy_2", {"diagnosis": "moderate", "gender": "남성", "stage": 2, "confidence": 0.88}),
            MockObject("dummy_3", {"diagnosis": "severe", "gender": "남성", "stage": 3, "confidence": 0.92})
        ]