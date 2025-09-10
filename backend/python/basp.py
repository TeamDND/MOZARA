from fastapi import HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import chromadb
from sentence_transformers import SentenceTransformer
import json
import hashlib
import time

# 요청 모델
class LifestyleData(BaseModel):
    shedding6m: bool
    familyHistory: bool
    sleepHours: str  # lt4, 5to7, ge8
    smoking: bool
    alcohol: str  # none, light, heavy

class BaspRequest(BaseModel):
    hairline: str  # A, M, C, U
    vertex: int    # 0, 1, 2, 3
    density: int   # 0, 1, 2, 3
    lifestyle: LifestyleData

# 응답 모델
class BaspResponse(BaseModel):
    baspBasic: str
    baspSpecific: str
    stageLabel: str
    summaryText: str
    recommendations: List[str]
    disclaimers: List[str]
    rawScore: int
    lifestyleRisk: int

# RAG 관련 모델
class RagRequest(BaseModel):
    baspBasic: str
    baspSpecific: str
    stageLabel: str
    riskScore: int

class Citation(BaseModel):
    n: int
    title: str
    publisher: str
    year: Optional[int] = None
    url: Optional[str] = None
    snippet: Optional[str] = None

class RagResponse(BaseModel):
    answer: List[str]
    citations: List[Citation]

# KB 문서 모델
class KBDocument(BaseModel):
    id: str
    title: str
    source: str  # guideline, journal, gov, faq, internal
    publisher: Optional[str] = None
    year: Optional[int] = None
    lang: Optional[str] = None  # ko, en, multi
    url: Optional[str] = None
    tags: Optional[List[str]] = None
    createdAt: int
    updatedAt: int

class KBChunk(BaseModel):
    id: str
    docId: str
    ord: int
    text: str  # 300~1200자
    meta: Optional[Dict[str, Any]] = None
    createdAt: int

# BASP 진단 로직
class BaspDiagnosisEngine:
    @staticmethod
    def calculate_lifestyle_risk(lifestyle: LifestyleData) -> int:
        """생활습관 리스크 계산 (0~8)"""
        risk = 0
        
        if lifestyle.shedding6m:
            risk += 2
        if lifestyle.familyHistory:
            risk += 2
            
        if lifestyle.sleepHours == "lt4":
            risk += 2
        elif lifestyle.sleepHours == "5to7":
            risk += 1
        elif lifestyle.sleepHours == "ge8":
            risk += 0
            
        if lifestyle.smoking:
            risk += 1
        if lifestyle.alcohol == "heavy":
            risk += 1
            
        return min(8, risk)
    
    @staticmethod
    def get_stage_label(raw_score: int) -> str:
        """진행 정도 매핑"""
        if raw_score == 0:
            return "정상"
        elif raw_score <= 2:
            return "초기"
        elif raw_score <= 5:
            return "중등도"
        else:
            return "진행성"
    
    @staticmethod
    def get_hairline_description(hairline: str) -> str:
        """헤어라인 설명"""
        descriptions = {
            "A": "이마 라인 안정적",
            "M": "양측 이마 후퇴(M형 경향)",
            "C": "곡선형 후퇴(C형 경향)",
            "U": "넓은 이마 상승(U형 경향)"
        }
        return descriptions.get(hairline, "알 수 없음")
    
    @staticmethod
    def get_vertex_description(vertex: int) -> str:
        """정수리 설명"""
        descriptions = {
            0: "정수리 정상",
            1: "약간 감소",
            2: "감소",
            3: "넓은 감소"
        }
        return descriptions.get(vertex, "알 수 없음")
    
    @staticmethod
    def get_recommendations(stage_label: str, lifestyle: LifestyleData) -> List[str]:
        """권장사항 생성"""
        recommendations = [
            "본 도구는 의료 진단이 아닌 참고용입니다. 지속 시 전문의 상담 권장."
        ]
        
        if stage_label in ["정상", "초기"]:
            recommendations.extend([
                "순한 두피 전용 샴푸 사용",
                "수면 7~8시간 확보",
                "분기별 셀프 체크"
            ])
        else:
            recommendations.extend([
                "전문의 상담/치료 옵션 안내",
                "주간 관찰 리포트",
                "두피 관리 전문 제품 사용"
            ])
        
        if lifestyle.familyHistory:
            recommendations.append("가족력 있으므로 정기적 모니터링")
        
        return recommendations
    
    @classmethod
    def diagnose(cls, request: BaspRequest) -> BaspResponse:
        """BASP 진단 수행"""
        # 입력 검증
        if request.hairline not in ["A", "M", "C", "U"]:
            raise ValueError("잘못된 헤어라인 타입")
        if request.vertex not in [0, 1, 2, 3]:
            raise ValueError("잘못된 정수리 레벨")
        if request.density not in [0, 1, 2, 3]:
            raise ValueError("잘못된 밀도 레벨")
        
        # Lifestyle Risk 계산
        lifestyle_risk = cls.calculate_lifestyle_risk(request.lifestyle)
        
        # Raw Score 계산
        v = request.vertex
        d = request.density
        risk_bucket = min(2, lifestyle_risk // 3)
        raw_score = v + d + risk_bucket
        
        # 진행 정도 매핑
        stage_label = cls.get_stage_label(raw_score)
        
        # 설명 생성
        hairline_desc = cls.get_hairline_description(request.hairline)
        vertex_desc = cls.get_vertex_description(request.vertex)
        
        # 요약 텍스트
        summary_text = f"{hairline_desc}, {vertex_desc}. 생활습관 리스크 점수: {lifestyle_risk}"
        
        # 권장사항
        recommendations = cls.get_recommendations(stage_label, request.lifestyle)
        
        # 디스클레이머
        disclaimers = [
            "본 도구는 의료 진단이 아닌 참고용입니다.",
            "증상이 지속·악화되면 피부과 전문의 상담을 권장합니다."
        ]
        
        return BaspResponse(
            baspBasic=request.hairline,
            baspSpecific=f"V{request.vertex}",
            stageLabel=stage_label,
            summaryText=summary_text,
            recommendations=recommendations,
            disclaimers=disclaimers,
            rawScore=raw_score,
            lifestyleRisk=lifestyle_risk
        )

# RAG 엔진
class RagEngine:
    def __init__(self):
        self.chroma_client = None
        self.collection = None
        self.embedding_model = None
        self.reranker_model = None
        self._initialize_models()
    
    def _initialize_models(self):
        """모델 초기화"""
        try:
            # 임베딩 모델 로드
            self.embedding_model = SentenceTransformer('BAAI/bge-m3')
            
            # Chroma 클라이언트 초기화
            self.chroma_client = chromadb.Client()
            
            # 컬렉션 생성 또는 가져오기
            try:
                self.collection = self.chroma_client.get_collection("hair_kb")
            except:
                self.collection = self.chroma_client.create_collection(
                    name="hair_kb",
                    metadata={"hnsw:space": "cosine"}
                )
            
            # 리랭커 모델 로드 (선택적)
            try:
                from sentence_transformers import CrossEncoder
                self.reranker_model = CrossEncoder('BAAI/bge-reranker-v2-m3')
            except Exception as e:
                print(f"Reranker 모델 로드 실패, 벡터 검색만 사용: {e}")
                self.reranker_model = None
                
        except Exception as e:
            print(f"RAG 엔진 초기화 실패: {e}")
            self.embedding_model = None
            self.chroma_client = None
            self.collection = None
    
    def build_query(self, request: RagRequest) -> str:
        """BASP 결과 기반 검색 쿼리 생성"""
        query_parts = []
        
        # 헤어라인 타입별 쿼리
        hairline_queries = {
            "A": "일자형 헤어라인 안정적",
            "M": "M자형 헤어라인 양측 이마 후퇴",
            "C": "곡선형 헤어라인 후퇴",
            "U": "U자형 헤어라인 넓은 이마 상승"
        }
        query_parts.append(hairline_queries.get(request.baspBasic, "헤어라인"))
        
        # 정수리 상태
        vertex_queries = {
            "V0": "정수리 정상",
            "V1": "정수리 약간 감소",
            "V2": "정수리 감소",
            "V3": "정수리 넓은 감소"
        }
        query_parts.append(vertex_queries.get(request.baspSpecific, "정수리"))
        
        # 단계별 쿼리
        stage_queries = {
            "정상": "정상 모발 관리",
            "초기": "초기 탈모 예방",
            "중등도": "중등도 탈모 관리",
            "진행성": "진행성 탈모 관리"
        }
        query_parts.append(stage_queries.get(request.stageLabel, "탈모 관리"))
        
        # 리스크 점수별 쿼리
        if request.riskScore >= 6:
            query_parts.append("높은 위험 생활습관 개선")
        elif request.riskScore >= 3:
            query_parts.append("중간 위험 생활습관 관리")
        else:
            query_parts.append("낮은 위험 생활습관 유지")
        
        return " ".join(query_parts)
    
    def similarity_search(self, query: str, k: int = 12) -> List[Dict]:
        """Chroma 벡터 유사도 검색"""
        if not self.collection or not self.embedding_model:
            return []
        
        try:
            # 쿼리 임베딩 생성
            query_embedding = self.embedding_model.encode([query])
            
            # Chroma 검색
            results = self.collection.query(
                query_embeddings=query_embedding.tolist(),
                n_results=k
            )
            
            # 결과 포맷팅
            hits = []
            for i in range(len(results['ids'][0])):
                hit = {
                    'id': results['ids'][0][i],
                    'document': results['documents'][0][i],
                    'metadata': results['metadatas'][0][i] if results['metadatas'] else {},
                    'distance': results['distances'][0][i] if results['distances'] else 0
                }
                hits.append(hit)
            
            return hits
            
        except Exception as e:
            print(f"벡터 검색 오류: {e}")
            return []
    
    def rerank(self, query: str, hits: List[Dict], topk: int = 4) -> List[Dict]:
        """리랭킹 (선택적)"""
        if not self.reranker_model or not hits:
            return hits[:topk]
        
        try:
            # 쿼리-문서 쌍 점수화
            pairs = [(query, hit['document']) for hit in hits]
            scores = self.reranker_model.predict(pairs)
            
            # 점수와 함께 정렬
            scored_hits = [(hit, score) for hit, score in zip(hits, scores)]
            scored_hits.sort(key=lambda x: x[1], reverse=True)
            
            return [hit for hit, _ in scored_hits[:topk]]
            
        except Exception as e:
            print(f"리랭킹 오류: {e}")
            return hits[:topk]
    
    def format_context_with_citations(self, hits: List[Dict]) -> tuple:
        """컨텍스트와 각주 포맷팅"""
        context_parts = []
        citations = []
        
        for i, hit in enumerate(hits, 1):
            text = hit['document']
            metadata = hit.get('metadata', {})
            
            # 컨텍스트에 추가
            context_parts.append(f"[{i}] {text}")
            
            # 각주 정보 생성
            citation = Citation(
                n=i,
                title=metadata.get('title', '알 수 없는 제목'),
                publisher=metadata.get('publisher', '알 수 없는 발행처'),
                year=metadata.get('year'),
                url=metadata.get('url'),
                snippet=text[:200] + "..." if len(text) > 200 else text
            )
            citations.append(citation)
        
        return "\n\n".join(context_parts), citations
    
    def generate_answer(self, context: str, request: RagRequest) -> List[str]:
        """간단한 템플릿 기반 답변 생성 (실제 LLM 대신)"""
        # 실제 환경에서는 Llama-3.1-70B 등 LLM 사용
        # 여기서는 템플릿 기반으로 구현
        
        answers = []
        
        # 단계별 기본 가이드
        if request.stageLabel == "정상":
            answers.extend([
                "규칙적인 수면 패턴(7-8시간)은 모발 건강에 중요한 역할을 합니다. [1]",
                "균형 잡힌 식단과 충분한 단백질 섭취가 모발 성장에 도움이 될 수 있습니다. [2]",
                "스트레스 관리와 규칙적인 운동은 전반적인 건강과 모발 상태에 긍정적 영향을 줍니다. [3]"
            ])
        elif request.stageLabel == "초기":
            answers.extend([
                "초기 단계에서는 생활습관 개선이 가장 중요합니다. 충분한 수면과 스트레스 관리에 집중하세요. [1]",
                "두피 마사지와 순한 샴푸 사용이 도움이 될 수 있습니다. [2]",
                "전문의 상담을 통해 정확한 진단과 관리 방안을 받아보시기 바랍니다. [3]"
            ])
        elif request.stageLabel == "중등도":
            answers.extend([
                "중등도 탈모는 전문의 상담이 필요합니다. 생활습관 개선과 함께 의료적 관리가 중요합니다. [1]",
                "두피 건강을 위한 전문 관리와 정기적인 모니터링을 권장합니다. [2]",
                "가족력이 있다면 더욱 신중한 관리가 필요합니다. [3]"
            ])
        else:  # 진행성
            answers.extend([
                "진행성 탈모는 즉시 전문의 상담이 필요합니다. 조기 치료가 중요합니다. [1]",
                "생활습관 개선과 함께 의료적 개입을 고려해야 합니다. [2]",
                "정기적인 모니터링과 전문가와의 지속적인 상담이 필요합니다. [3]"
            ])
        
        # 리스크 점수별 추가 안내
        if request.riskScore >= 6:
            answers.append("높은 위험 점수로 인해 생활습관 개선이 시급합니다. 전문의 상담을 받으시기 바랍니다. [4]")
        
        return answers[:5]  # 최대 5개 항목
    
    def answer(self, request: RagRequest) -> RagResponse:
        """RAG 기반 답변 생성"""
        try:
            # 1. 쿼리 생성
            query = self.build_query(request)
            print("1. 쿼리 생성,", query)
            
            # 2. 벡터 검색
            hits = self.similarity_search(query, k=12)
            print("2. 벡터 검색,", hits)
            
            # 3. 리랭킹
            reranked_hits = self.rerank(query, hits, topk=4)
            print("3. 리랭킹,", reranked_hits)

            # 4. 컨텍스트 포맷팅
            context, citations = self.format_context_with_citations(reranked_hits)
            print("4. 컨텍스트 포맷팅,", context, citations)
            # 5. 답변 생성
            if context.strip():
                # 실제 LLM 사용 시
                # answer = llm.generate(context, request)
                # 여기서는 템플릿 기반
                answers = self.generate_answer(context, request)
            else:
                # 폴백 답변
                answers = [
                    "전문의 상담을 통해 정확한 진단과 관리 방안을 받아보시기 바랍니다. [1]",
                    "생활습관 개선과 규칙적인 모니터링이 중요합니다. [2]"
                ]
                citations = [
                    Citation(n=1, title="전문의 상담 안내", publisher="의료진단 가이드", year=2024),
                    Citation(n=2, title="생활습관 관리", publisher="건강 관리 가이드", year=2024)
                ]
            
            return RagResponse(answer=answers, citations=citations)
            
        except Exception as e:
            print(f"RAG 답변 생성 오류: {e}")
            # 폴백 응답
            return RagResponse(
                answer=[
                    "죄송합니다. 현재 서비스에 일시적인 문제가 있습니다. 전문의 상담을 권장합니다. [1]"
                ],
                citations=[
                    Citation(n=1, title="서비스 오류 안내", publisher="시스템", year=2024)
                ]
            )
    
    def add_document(self, doc: KBDocument, chunks: List[KBChunk]):
        """KB 문서 추가"""
        if not self.collection or not self.embedding_model:
            return False
        
        try:
            # 청크 텍스트 임베딩
            texts = [chunk.text for chunk in chunks]
            embeddings = self.embedding_model.encode(texts)
            
            # Chroma에 추가 (None 값 제거)
            metadatas = []
            for chunk in chunks:
                metadata = {
                    "docId": chunk.docId,
                    "ord": chunk.ord,
                    "title": doc.title,
                    "publisher": doc.publisher or "알 수 없음",
                    "source": doc.source
                }
                # None이 아닌 값만 추가
                if doc.year is not None:
                    metadata["year"] = doc.year
                if doc.url is not None:
                    metadata["url"] = doc.url
                metadatas.append(metadata)
            
            self.collection.add(
                ids=[chunk.id for chunk in chunks],
                documents=texts,
                metadatas=metadatas,
                embeddings=embeddings.tolist()
            )
            
            return True
            
        except Exception as e:
            print(f"문서 추가 오류: {e}")
            return False

# 전역 RAG 엔진 인스턴스
rag_engine = RagEngine()
