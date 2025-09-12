import os
import schedule
import threading
import time
import logging
from datetime import datetime

class PubMedSchedulerService:
    def __init__(self):
        self.setup_logging()
        self.scheduler_running = False
        self.last_run_date = None
        
    def setup_logging(self):
        log_file = os.path.join(os.path.dirname(__file__), "scheduler.log")
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file, encoding='utf-8'),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger("HairEncyclopediaPubMedScheduler")
    
    def weekly_collection_job(self):
        import datetime
        
        today = datetime.date.today()
        
        if self.last_run_date and (today - self.last_run_date).days < 7:
            days_until_next = 7 - (today - self.last_run_date).days
            self.logger.info(f"이번 주 이미 논문 수집을 완료했습니다. 다음 실행까지 {days_until_next}일 남음")
            return
            
        try:
            self.logger.info("=== Hair Encyclopedia 주간 PubMed 논문 수집 시작 ===")
            
            try:
                from .pubmed_collector import PubMedCollector
                from .pubmed_pinecone_vectorizer import PubMedPineconeVectorizer
                
                collector = PubMedCollector()
                papers = collector.collect_papers(
                    keywords=['hair loss', 'alopecia'],
                    max_papers=3
                )
                
                if papers:
                    self.logger.info(f"수집 완료: {len(papers)}건")
                    
                    vectorizer = PubMedPineconeVectorizer()
                    for paper in papers:
                        try:
                            pmid = paper['pmid']
                            self.logger.info(f"벡터화 처리: {pmid}")
                            
                            if paper['fulltext']['format'] == 'xml' and paper['fulltext'].get('file_path'):
                                file_path = paper['fulltext']['file_path']
                                if os.path.exists(file_path):
                                    vectorizer.process_xml_paper(file_path, paper)
                                else:
                                    vectorizer.process_abstract_only(paper)
                            else:
                                vectorizer.process_abstract_only(paper)
                                
                        except Exception as e:
                            self.logger.error(f"논문 벡터화 실패 ({paper['pmid']}): {e}")
                else:
                    self.logger.info("새로운 논문이 없습니다.")
                    
                self.last_run_date = today
                self.logger.info(f"논문 수집 완료. 다음 실행: 1주일 후")
                
            except ImportError:
                self.logger.info("PubMed 수집 모듈을 찾을 수 없습니다. 수집 기능이 비활성화됩니다.")
                
        except Exception as e:
            self.logger.error(f"PubMed 논문 수집 중 오류 발생: {e}")
    
    def start_scheduler(self):
        if self.scheduler_running:
            return
            
        self.scheduler_running = True
        self.logger.info("Hair Encyclopedia PubMed 자동 수집 스케줄러 시작 - 일주일에 한 번 실행")
        
        schedule.every().monday.at("09:00").do(self.weekly_collection_job)
        
        def run_scheduler():
            while self.scheduler_running:
                schedule.run_pending()
                time.sleep(60)
        
        scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
        scheduler_thread.start()
        
        self.logger.info("Hair Encyclopedia PubMed 자동 수집 백그라운드 스레드 시작됨")