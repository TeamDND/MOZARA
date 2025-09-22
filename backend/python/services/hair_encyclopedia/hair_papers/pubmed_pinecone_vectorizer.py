import os
import json
import xml.etree.ElementTree as ET
from pinecone import Pinecone
from openai import OpenAI
from dotenv import load_dotenv
import hashlib
import logging
from pathlib import Path
from datetime import datetime

load_dotenv()

class PubMedPineconeVectorizer:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        # Pinecone 초기화
        self.pc = Pinecone(api_key=os.getenv("PINECONE_API_KEY"))
        self.index_name = os.getenv("PINECONE_INDEX_NAME1")
        self.index = self.pc.Index(self.index_name)
        
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
        
        self.logger.info(f"Pinecone 인덱스 연결: {self.index_name}")
    
    def extract_text_from_xml(self, xml_path: str) -> str:
        """XML 파일에서 텍스트 추출"""
        try:
            tree = ET.parse(xml_path)
            root = tree.getroot()
            
            # 텍스트 추출
            text_parts = []
            
            # 제목
            title = root.find('.//article-title')
            if title is not None and title.text:
                text_parts.append(f"Title: {title.text}")
            
            # 초록
            abstract = root.find('.//abstract')
            if abstract is not None:
                abstract_text = self.extract_text_from_element(abstract)
                text_parts.append(f"Abstract: {abstract_text}")
            
            # 본문 (일부만 - 토큰 제한)
            body = root.find('.//body')
            if body is not None:
                body_text = self.extract_text_from_element(body)
                # 본문이 너무 길면 처음 3000자만
                if len(body_text) > 3000:
                    body_text = body_text[:3000] + "..."
                text_parts.append(f"Body: {body_text}")
            
            return "\n\n".join(text_parts)
            
        except Exception as e:
            self.logger.error(f"XML 텍스트 추출 실패 {xml_path}: {e}")
            return ""
    
    def extract_text_from_element(self, element) -> str:
        """XML 요소에서 텍스트 재귀적 추출"""
        text = ""
        if element.text:
            text += element.text
        
        for child in element:
            text += " " + self.extract_text_from_element(child)
            if child.tail:
                text += child.tail
        
        return text.strip()
    
    def generate_summary(self, text: str, title: str) -> str:
        """GPT를 사용한 요약 생성"""
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "당신은 의학 논문을 일반인이 이해하기 쉽게 요약하는 전문가입니다. 탈모 관련 논문을 읽고 500-700자 정도로 핵심 내용을 쉽게 설명해주세요. 전문용어는 최대한 일반 용어로 바꿔서 설명하고, 연구 결과와 실용적 의미를 포함해주세요."},
                    {"role": "user", "content": f"논문 제목: {title}\n\n논문 내용:\n{text[:4000]}\n\n위 논문을 일반인이 이해하기 쉽게 요약해주세요."}
                ],
                max_tokens=800,
                temperature=0.3
            )
            return response.choices[0].message.content
        except Exception as e:
            self.logger.error(f"요약 생성 실패: {e}")
            return "요약을 생성할 수 없습니다."
    
    def get_embedding(self, text: str) -> list:
        """텍스트의 임베딩 벡터 생성"""
        try:
            response = self.client.embeddings.create(
                model="text-embedding-3-small",
                input=text[:8000]  # 토큰 제한
            )
            return response.data[0].embedding
        except Exception as e:
            self.logger.error(f"임베딩 생성 실패: {e}")
            return []
    
    def generate_vector_id(self, pmid: str, content: str) -> str:
        """Pinecone용 벡터 ID 생성"""
        content_hash = hashlib.md5(content.encode()).hexdigest()[:8]
        return f"pubmed-{pmid}-{content_hash}"
    
    def calculate_vector_size(self, vector_data: dict) -> dict:
        """벡터 데이터 크기 계산"""
        # 벡터 자체 크기 (1536 dimensions * 4 bytes per float)
        vector_size = 1536 * 4  # 6,144 bytes
        
        # 메타데이터 크기 계산
        metadata_str = json.dumps(vector_data['metadata'], ensure_ascii=False)
        metadata_size = len(metadata_str.encode('utf-8'))
        
        # ID 크기
        id_size = len(vector_data['id'].encode('utf-8'))
        
        total_size = vector_size + metadata_size + id_size
        
        return {
            'vector_size': vector_size,
            'metadata_size': metadata_size,
            'id_size': id_size,
            'total_size': total_size,
            'total_size_kb': round(total_size / 1024, 2),
            'total_size_mb': round(total_size / (1024 * 1024), 4)
        }
    
    def process_xml_paper(self, xml_path: str, metadata: dict):
        """XML 논문 처리 및 Pinecone에 저장"""
        try:
            # XML에서 텍스트 추출
            text = self.extract_text_from_xml(xml_path)
            if not text:
                self.logger.warning(f"텍스트 추출 실패: {xml_path}")
                return None
            
            # 요약 생성
            summary = self.generate_summary(text, metadata['title'])
            
            # 임베딩 생성
            embedding = self.get_embedding(text)
            if not embedding:
                return None
            
            # 벡터 ID 생성
            vector_id = self.generate_vector_id(metadata['pmid'], text)
            
            # Pinecone 메타데이터 준비
            pinecone_metadata = {
                'title': metadata['title'],
                'pmid': metadata['pmid'],
                'year': metadata['year'],
                'authors': ', '.join(metadata['authors']),
                'format': 'xml',
                'file_path': xml_path,
                'summary': summary,
                'source': 'PubMed',
                'added_date': datetime.now().isoformat(),
                'text_length': len(text)
            }
            
            # 벡터 데이터 준비
            vector_data = {
                'id': vector_id,
                'values': embedding,
                'metadata': pinecone_metadata
            }
            
            # 크기 계산
            size_info = self.calculate_vector_size(vector_data)
            
            # Pinecone에 업서트
            self.index.upsert(vectors=[vector_data])
            
            self.logger.info(f"XML 논문 벡터화 완료: {metadata['pmid']} (크기: {size_info['total_size_kb']}KB)")
            return size_info
            
        except Exception as e:
            self.logger.error(f"XML 논문 처리 실패: {e}")
            return None
    
    def process_abstract_only(self, metadata: dict):
        """Abstract만 있는 논문 처리"""
        try:
            # Abstract 텍스트
            text = f"Title: {metadata['title']}\n\nAbstract: {metadata['abstract']}"
            
            # 요약 생성 (Abstract 기반)
            summary = self.generate_summary(text, metadata['title'])
            
            # 임베딩 생성
            embedding = self.get_embedding(text)
            if not embedding:
                return None
            
            # 벡터 ID 생성
            vector_id = self.generate_vector_id(metadata['pmid'], text)
            
            # Pinecone 메타데이터 준비
            pinecone_metadata = {
                'title': metadata['title'],
                'pmid': metadata['pmid'],
                'year': metadata['year'],
                'authors': ', '.join(metadata['authors']),
                'format': 'abstract',
                'summary': summary,
                'source': 'PubMed',
                'added_date': datetime.now().isoformat(),
                'text_length': len(text)
            }
            
            # 벡터 데이터 준비
            vector_data = {
                'id': vector_id,
                'values': embedding,
                'metadata': pinecone_metadata
            }
            
            # 크기 계산
            size_info = self.calculate_vector_size(vector_data)
            
            # Pinecone에 업서트
            self.index.upsert(vectors=[vector_data])
            
            self.logger.info(f"Abstract 논문 벡터화 완료: {metadata['pmid']} (크기: {size_info['total_size_kb']}KB)")
            return size_info
            
        except Exception as e:
            self.logger.error(f"Abstract 논문 처리 실패: {e}")
            return None
    
    def process_collected_papers(self, pubmed_dir: str = r"C:\Users\301\Desktop\hair_loss_thesis\pubmed"):
        """수집된 논문들 일괄 벡터화"""
        pubmed_path = Path(pubmed_dir)
        
        # 메타데이터 파일들 찾기
        metadata_files = list(pubmed_path.glob("*_metadata.json"))
        
        self.logger.info(f"처리할 논문 수: {len(metadata_files)}")
        
        total_size_info = {
            'total_papers': 0,
            'total_size_kb': 0,
            'total_size_mb': 0,
            'papers': []
        }
        
        for metadata_file in metadata_files:
            try:
                # 메타데이터 로드
                with open(metadata_file, 'r', encoding='utf-8') as f:
                    metadata = json.load(f)
                
                pmid = metadata['pmid']
                vector_id = self.generate_vector_id(pmid, metadata['title'])
                
                # 이미 처리된 논문인지 확인
                try:
                    existing = self.index.fetch(ids=[vector_id])
                    if existing['vectors']:
                        self.logger.info(f"이미 처리된 논문: {pmid}")
                        continue
                except:
                    pass
                
                # 전문 파일 확인 및 처리
                size_info = None
                if metadata['fulltext']['format'] == 'xml':
                    xml_file = pubmed_path / f"{pmid}.xml"
                    if xml_file.exists():
                        size_info = self.process_xml_paper(str(xml_file), metadata)
                    else:
                        size_info = self.process_abstract_only(metadata)
                else:
                    # PDF나 Abstract만 있는 경우
                    size_info = self.process_abstract_only(metadata)
                
                if size_info:
                    total_size_info['total_papers'] += 1
                    total_size_info['total_size_kb'] += size_info['total_size_kb']
                    total_size_info['papers'].append({
                        'pmid': pmid,
                        'title': metadata['title'],
                        'format': metadata['fulltext']['format'],
                        'size_kb': size_info['total_size_kb']
                    })
                    
            except Exception as e:
                self.logger.error(f"논문 처리 실패 {metadata_file}: {e}")
        
        # 총 크기 계산
        total_size_info['total_size_mb'] = round(total_size_info['total_size_kb'] / 1024, 4)
        
        self.logger.info(f"논문 벡터화 완료 - 총 {total_size_info['total_papers']}건, {total_size_info['total_size_kb']}KB ({total_size_info['total_size_mb']}MB)")
        return total_size_info
    
    def search_papers(self, query: str, top_k: int = 5):
        """논문 검색"""
        try:
            # 쿼리 임베딩 생성
            query_embedding = self.get_embedding(query)
            if not query_embedding:
                return []
            
            # 검색 수행
            results = self.index.query(
                vector=query_embedding,
                top_k=top_k,
                include_metadata=True
            )
            
            return results
            
        except Exception as e:
            self.logger.error(f"논문 검색 실패: {e}")
            return []

if __name__ == "__main__":
    vectorizer = PubMedPineconeVectorizer()
    
    # 수집된 모든 논문 벡터화
    size_info = vectorizer.process_collected_papers()
    
    print(f"\n=== PubMed 논문 Pinecone 저장 완료 ===")
    print(f"총 논문 수: {size_info['total_papers']}건")
    print(f"총 크기: {size_info['total_size_kb']}KB ({size_info['total_size_mb']}MB)")
    print(f"\n개별 논문 크기:")
    for paper in size_info['papers']:
        print(f"- {paper['pmid']} ({paper['format']}): {paper['size_kb']}KB")
        print(f"  제목: {paper['title'][:50]}...")
    
    # 테스트 검색
    print(f"\n=== 검색 테스트 ===")
    results = vectorizer.search_papers("hair growth treatment", 3)
    print(f"검색 결과: {len(results['matches']) if results else 0}건")
    
    if results and results['matches']:
        for i, match in enumerate(results['matches']):
            metadata = match['metadata']
            print(f"\n{i+1}. {metadata['title']}")
            print(f"   PMID: {metadata['pmid']} ({metadata['year']})")
            print(f"   형식: {metadata['format']}")
            print(f"   유사도: {match['score']:.4f}")
            if 'summary' in metadata:
                print(f"   요약: {metadata['summary'][:100]}...")