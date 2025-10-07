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
        self.processed_pmids = set()  # 처리 완료된 PMID 추적
        
    def setup_logging(self):
        log_file = os.path.join(os.path.dirname(__file__), "scheduler.log")
        logging.basicConfig(
            level=logging.WARNING,
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

                    # 이미 처리된 PMID 로드
                    self._load_processed_pmids()

                    vectorizer = PubMedPineconeVectorizer()
                    success_count = 0

                    for paper in papers:
                        try:
                            pmid = paper['pmid']

                            # 이미 처리한 논문은 건너뛰기
                            if pmid in self.processed_pmids:
                                self.logger.info(f"이미 처리된 논문 건너뛰기: {pmid}")
                                continue

                            self.logger.info(f"벡터화 처리: {pmid}")

                            if paper['fulltext']['format'] == 'xml' and paper['fulltext'].get('file_path'):
                                file_path = paper['fulltext']['file_path']
                                if os.path.exists(file_path):
                                    vectorizer.process_xml_paper(file_path, paper)
                                else:
                                    vectorizer.process_abstract_only(paper)
                            else:
                                vectorizer.process_abstract_only(paper)

                            # 성공 시 PMID 기록하고 저장
                            self.processed_pmids.add(pmid)
                            self._save_processed_pmid(pmid)
                            success_count += 1
                            self.logger.info(f"✅ 논문 처리 완료: {pmid} ({success_count}/{len(papers)})")

                        except Exception as e:
                            self.logger.error(f"논문 벡터화 실패 ({paper['pmid']}): {e}")

                    self.logger.info(f"총 {success_count}개 논문 처리 완료")
                else:
                    self.logger.info("새로운 논문이 없습니다.")

                # 모든 작업 완료 후 날짜 저장
                self.last_run_date = today
                self._save_last_run_date(today)
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

        # 마지막 실행일 체크: 1주일 지났으면 즉시 실행
        self._load_last_run_date()
        import datetime
        today = datetime.date.today()

        if self.last_run_date is None:
            self.logger.info("이전 실행 기록 없음 - 즉시 논문 수집 실행")
            threading.Thread(target=self.weekly_collection_job, daemon=True).start()
        elif (today - self.last_run_date).days >= 7:
            days_passed = (today - self.last_run_date).days
            self.logger.info(f"마지막 실행 이후 {days_passed}일 경과 - 즉시 논문 수집 실행")
            threading.Thread(target=self.weekly_collection_job, daemon=True).start()
        else:
            days_until_next = 7 - (today - self.last_run_date).days
            self.logger.info(f"다음 실행까지 {days_until_next}일 남음")

        schedule.every().monday.at("09:00").do(self.weekly_collection_job)

        def run_scheduler():
            while self.scheduler_running:
                schedule.run_pending()
                time.sleep(60)

        scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
        scheduler_thread.start()

        self.logger.info("Hair Encyclopedia PubMed 자동 수집 백그라운드 스레드 시작됨")

    def _load_last_run_date(self):
        """마지막 실행일을 파일에서 로드"""
        import datetime
        last_run_file = os.path.join(os.path.dirname(__file__), ".last_pubmed_run")

        if os.path.exists(last_run_file):
            try:
                with open(last_run_file, 'r') as f:
                    date_str = f.read().strip()
                    self.last_run_date = datetime.datetime.strptime(date_str, "%Y-%m-%d").date()
                    self.logger.info(f"마지막 실행일: {self.last_run_date}")
            except Exception as e:
                self.logger.warning(f"마지막 실행일 로드 실패: {e}")
                self.last_run_date = None
        else:
            self.last_run_date = None

    def _save_last_run_date(self, date):
        """마지막 실행일을 파일에 저장"""
        last_run_file = os.path.join(os.path.dirname(__file__), ".last_pubmed_run")
        try:
            with open(last_run_file, 'w') as f:
                f.write(date.strftime("%Y-%m-%d"))
        except Exception as e:
            self.logger.error(f"마지막 실행일 저장 실패: {e}")

    def _load_processed_pmids(self):
        """이미 처리된 PMID 목록 로드"""
        pmid_file = os.path.join(os.path.dirname(__file__), ".processed_pmids")
        if os.path.exists(pmid_file):
            try:
                with open(pmid_file, 'r') as f:
                    self.processed_pmids = set(line.strip() for line in f if line.strip())
                self.logger.info(f"처리 완료 논문 {len(self.processed_pmids)}개 로드")
            except Exception as e:
                self.logger.warning(f"PMID 로드 실패: {e}")
                self.processed_pmids = set()

    def _save_processed_pmid(self, pmid):
        """처리 완료된 PMID를 파일에 추가"""
        pmid_file = os.path.join(os.path.dirname(__file__), ".processed_pmids")
        try:
            with open(pmid_file, 'a') as f:
                f.write(f"{pmid}\n")
        except Exception as e:
            self.logger.error(f"PMID 저장 실패: {e}")