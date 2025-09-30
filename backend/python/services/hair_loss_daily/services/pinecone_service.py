"""
Pinecone 벡터 데이터베이스 서비스
"""
import os
from pinecone import Pinecone
from typing import List, Dict, Optional, Any
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv("../../../../.env")

class PineconeService:
    """Pinecone 벡터 데이터베이스 서비스"""
    
    def __init__(self):
        self.pc = None
        self.index = None
        self.index_name = None
        self.dimension = 1552  # CLIP 앙상블 모델들(3개 × 512) + 프롬프트 특징(16) = 1552차원 (탈모 제외, 메모리 최적화)
        self._initialize_client()
    
    def _initialize_client(self):
        """Pinecone 클라이언트 초기화"""
        try:
            api_key = os.getenv("PINECONE_API_KEY")
            if not api_key:
                raise ValueError("PINECONE_API_KEY 환경변수가 설정되지 않았습니다.")
            
            self.index_name = os.getenv("PINECONE_INDEX_NAME2")
            if not self.index_name:
                raise ValueError("PINECONE_INDEX_NAME2 환경변수가 설정되지 않았습니다.")
            
            # Pinecone 클라이언트 초기화
            self.pc = Pinecone(api_key=api_key)
            
            # 인덱스 연결
            self.index = self.pc.Index(self.index_name)
            
            print(f"[OK] Pinecone 클라이언트 초기화 완료 (인덱스: {self.index_name})")

        except Exception as e:
            print(f"[ERROR] Pinecone 클라이언트 초기화 실패: {str(e)}")
            raise e
    
    def search_similar_vectors(self, 
                             query_vector: List[float], 
                             top_k: int = 10,
                             filter_dict: Optional[Dict[str, Any]] = None) -> List[Dict]:
        """유사한 벡터 검색"""
        try:
            if not self.index:
                raise ValueError("Pinecone 인덱스가 초기화되지 않았습니다.")
            
            # 검색 쿼리 실행
            search_params = {
                "vector": query_vector,
                "top_k": top_k,
                "include_metadata": True
            }
            
            if filter_dict:
                search_params["filter"] = filter_dict
            
            response = self.index.query(**search_params)
            
            # 결과 정리
            results = []
            for match in response.matches:
                result = {
                    "id": match.id,
                    "score": match.score,
                    "metadata": match.metadata
                }
                results.append(result)
            
            return results
            
        except Exception as e:
            print(f"⚠️ 벡터 검색 오류: {str(e)}")
            return []
    
    def search_by_category(self, 
                          query_vector: List[float], 
                          category: str, 
                          top_k: int = 5) -> List[Dict]:
        """특정 카테고리로 필터링하여 검색"""
        filter_dict = {"category": category}
        return self.search_similar_vectors(query_vector, top_k, filter_dict)
    
    def search_by_severity(self, 
                          query_vector: List[float], 
                          severity: str, 
                          top_k: int = 5) -> List[Dict]:
        """특정 심각도로 필터링하여 검색"""
        filter_dict = {"severity": severity}
        return self.search_similar_vectors(query_vector, top_k, filter_dict)
    
    def get_index_stats(self) -> Dict:
        """인덱스 통계 정보 반환"""
        try:
            if not self.index:
                return {"error": "인덱스가 초기화되지 않았습니다."}
            
            stats = self.index.describe_index_stats()
            return {
                "total_vector_count": stats.total_vector_count,
                "dimension": stats.dimension,
                "metric": stats.metric,
                "index_fullness": stats.index_fullness
            }
            
        except Exception as e:
            print(f"⚠️ 인덱스 통계 조회 오류: {str(e)}")
            return {"error": str(e)}
    
    def health_check(self) -> Dict:
        """서비스 상태 확인"""
        try:
            if not self.pc or not self.index:
                return {"status": "error", "message": "클라이언트가 초기화되지 않았습니다."}
            
            # 간단한 검색으로 연결 테스트
            test_vector = [0.0] * 2048  # 더미 벡터
            self.index.query(vector=test_vector, top_k=1)
            
            return {
                "status": "healthy",
                "index_name": self.index_name,
                "stats": self.get_index_stats()
            }
            
        except Exception as e:
            return {
                "status": "error", 
                "message": f"연결 테스트 실패: {str(e)}"
            }

# 전역 인스턴스
pinecone_service = PineconeService()
