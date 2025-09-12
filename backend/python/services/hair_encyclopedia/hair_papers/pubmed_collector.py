import requests
import json
import os
import time
from datetime import datetime
import xml.etree.ElementTree as ET
from typing import List, Dict, Optional
import logging
from pathlib import Path

class PubMedCollector:
    def __init__(self, base_dir: str = r"C:\Users\301\Desktop\hair_loss_thesis\pubmed"):
        self.base_url = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/"
        self.base_dir = Path(base_dir)
        self.base_dir.mkdir(parents=True, exist_ok=True)
        
        # 로그 설정
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
        
        # 수집된 논문 추적용 파일
        self.collected_file = self.base_dir / "collected_pmids.json"
        self.collected_pmids = self.load_collected_pmids()
    
    def load_collected_pmids(self) -> set:
        """이미 수집된 PMID 목록 로드"""
        if self.collected_file.exists():
            with open(self.collected_file, 'r') as f:
                return set(json.load(f))
        return set()
    
    def save_collected_pmids(self):
        """수집된 PMID 목록 저장"""
        with open(self.collected_file, 'w') as f:
            json.dump(list(self.collected_pmids), f)
    
    def search_papers(self, keywords: List[str], max_results: int = 10) -> List[str]:
        """키워드로 무료 논문 검색"""
        # 키워드를 OR로 연결
        query = " OR ".join([f'"{keyword}"' for keyword in keywords])
        # 무료 전문 필터 추가
        query += " AND ffrft[Filter]"
        
        params = {
            'db': 'pubmed',
            'term': query,
            'retmax': max_results,
            'retmode': 'json',
            'sort': 'pub_date',  # 최신순 정렬
            'usehistory': 'n'
        }
        
        try:
            response = requests.get(f"{self.base_url}esearch.fcgi", params=params)
            response.raise_for_status()
            data = response.json()
            
            pmids = data['esearchresult'].get('idlist', [])
            self.logger.info(f"검색된 논문 수: {len(pmids)}")
            return pmids
            
        except Exception as e:
            self.logger.error(f"논문 검색 실패: {e}")
            return []
    
    def get_paper_details(self, pmid: str) -> Optional[Dict]:
        """PMID로 논문 상세 정보 가져오기"""
        params = {
            'db': 'pubmed',
            'id': pmid,
            'retmode': 'xml'
        }
        
        try:
            response = requests.get(f"{self.base_url}efetch.fcgi", params=params)
            response.raise_for_status()
            
            root = ET.fromstring(response.content)
            article = root.find('.//Article')
            if article is None:
                return None
            
            # 논문 정보 추출
            title_elem = article.find('.//ArticleTitle')
            title = title_elem.text if title_elem is not None else "제목 없음"
            
            abstract_elem = article.find('.//Abstract/AbstractText')
            abstract = abstract_elem.text if abstract_elem is not None else "초록 없음"
            
            # 저자 정보
            authors = []
            author_list = article.findall('.//Author')
            for author in author_list[:5]:  # 최대 5명
                last_name = author.find('LastName')
                first_name = author.find('ForeName')
                if last_name is not None and first_name is not None:
                    authors.append(f"{first_name.text} {last_name.text}")
            
            # 발행일
            pub_date = article.find('.//PubDate')
            year = pub_date.find('Year').text if pub_date is not None and pub_date.find('Year') is not None else "연도 미상"
            
            return {
                'pmid': pmid,
                'title': title,
                'abstract': abstract,
                'authors': authors,
                'year': year,
                'source': 'PubMed'
            }
            
        except Exception as e:
            self.logger.error(f"논문 상세 정보 가져오기 실패 (PMID: {pmid}): {e}")
            return None
    
    def check_fulltext_availability(self, pmid: str) -> Dict[str, str]:
        """전문 이용 가능성 확인"""
        # PMC 링크 확인
        pmc_params = {
            'db': 'pmc',
            'term': f'{pmid}[pmid]',
            'retmode': 'json'
        }
        
        try:
            response = requests.get(f"{self.base_url}esearch.fcgi", params=pmc_params)
            data = response.json()
            pmc_ids = data['esearchresult'].get('idlist', [])
            
            availability = {
                'pdf': False,
                'xml': False,
                'html': False,
                'pmc_id': None
            }
            
            if pmc_ids:
                availability['pmc_id'] = pmc_ids[0]
                availability['pdf'] = True  # PMC는 보통 PDF 제공
                availability['xml'] = True  # PMC는 XML 제공
                
            return availability
            
        except Exception as e:
            self.logger.error(f"전문 이용 가능성 확인 실패 (PMID: {pmid}): {e}")
            return {'pdf': False, 'xml': False, 'html': False, 'pmc_id': None}
    
    def download_fulltext(self, pmid: str, pmc_id: str = None) -> Dict[str, str]:
        """전문 다운로드 (혼합 접근법)"""
        result = {
            'format': 'abstract',
            'content': '',
            'file_path': ''
        }
        
        if pmc_id:
            # PDF 다운로드 시도
            pdf_url = f"https://www.ncbi.nlm.nih.gov/pmc/articles/PMC{pmc_id}/pdf/"
            try:
                pdf_response = requests.get(pdf_url, timeout=30)
                if pdf_response.status_code == 200:
                    pdf_path = self.base_dir / f"{pmid}.pdf"
                    with open(pdf_path, 'wb') as f:
                        f.write(pdf_response.content)
                    
                    result.update({
                        'format': 'pdf',
                        'file_path': str(pdf_path)
                    })
                    self.logger.info(f"PDF 다운로드 성공: {pmid}")
                    return result
            except Exception as e:
                self.logger.warning(f"PDF 다운로드 실패 (PMID: {pmid}): {e}")
            
            # XML 다운로드 시도
            try:
                xml_params = {
                    'db': 'pmc',
                    'id': pmc_id,
                    'retmode': 'xml'
                }
                xml_response = requests.get(f"{self.base_url}efetch.fcgi", params=xml_params)
                if xml_response.status_code == 200:
                    xml_path = self.base_dir / f"{pmid}.xml"
                    with open(xml_path, 'w', encoding='utf-8') as f:
                        f.write(xml_response.text)
                    
                    result.update({
                        'format': 'xml',
                        'content': xml_response.text,
                        'file_path': str(xml_path)
                    })
                    self.logger.info(f"XML 다운로드 성공: {pmid}")
                    return result
            except Exception as e:
                self.logger.warning(f"XML 다운로드 실패 (PMID: {pmid}): {e}")
        
        # 최종적으로 Abstract만 저장
        self.logger.info(f"Abstract만 저장: {pmid}")
        return result
    
    def collect_papers(self, keywords: List[str] = None, max_papers: int = 3) -> List[Dict]:
        """논문 수집 메인 함수"""
        if keywords is None:
            keywords = ['hair loss', 'alopecia']
        
        self.logger.info(f"논문 수집 시작: 키워드={keywords}, 최대={max_papers}건")
        
        # 1. 논문 검색
        pmids = self.search_papers(keywords, max_results=max_papers * 3)  # 여유분 확보
        
        # 2. 새 논문만 필터링
        new_pmids = [pmid for pmid in pmids if pmid not in self.collected_pmids][:max_papers]
        
        if not new_pmids:
            self.logger.info("새로운 논문이 없습니다.")
            return []
        
        collected_papers = []
        
        for pmid in new_pmids:
            self.logger.info(f"논문 처리 중: {pmid}")
            
            # 3. 논문 상세 정보 가져오기
            paper_details = self.get_paper_details(pmid)
            if not paper_details:
                continue
            
            # 4. 전문 이용 가능성 확인
            availability = self.check_fulltext_availability(pmid)
            
            # 5. 전문 다운로드 (혼합 접근법)
            fulltext_info = self.download_fulltext(pmid, availability.get('pmc_id'))
            
            # 6. 논문 정보 통합
            paper_data = {
                **paper_details,
                'availability': availability,
                'fulltext': fulltext_info,
                'collected_date': datetime.now().isoformat()
            }
            
            # 7. 메타데이터 저장
            metadata_path = self.base_dir / f"{pmid}_metadata.json"
            with open(metadata_path, 'w', encoding='utf-8') as f:
                json.dump(paper_data, f, ensure_ascii=False, indent=2)
            
            collected_papers.append(paper_data)
            self.collected_pmids.add(pmid)
            
            # API 제한 준수 (초당 3회)
            time.sleep(0.4)
        
        # 8. 수집된 PMID 목록 업데이트
        self.save_collected_pmids()
        
        self.logger.info(f"논문 수집 완료: {len(collected_papers)}건")
        return collected_papers

if __name__ == "__main__":
    collector = PubMedCollector()
    papers = collector.collect_papers()
    
    print(f"\n수집된 논문: {len(papers)}건")
    for paper in papers:
        print(f"- {paper['title']} ({paper['year']}) - {paper['fulltext']['format']}")