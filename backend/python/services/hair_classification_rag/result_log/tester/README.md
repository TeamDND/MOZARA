# 🧪 Hair Loss Analyzer 테스트 스크립트 모음

이 폴더에는 Hair Loss Analyzer 시스템의 성능을 테스트하는 다양한 스크립트들이 포함되어 있습니다.

## 📄 파일 구성 및 역할

### 1. 🎯 `test_backend_analyzer.py`
**CLIP + Pinecone RAG 백엔드 분석기 전용 테스트**

**주요 기능:**
- HairLossAnalyzer 클래스를 직접 임포트하여 테스트
- CLIP 임베딩 + Pinecone 벡터 검색 기반 분석 성능 측정
- 레벨 2-7 이미지에 대한 개별 분석 및 성능 지표 계산

**요구사항:**
- Pinecone API 키 설정 필요
- 백엔드 모듈 경로 접근 가능
- 테스트 이미지 데이터 (레벨 2-7)

**생성 결과:**
- `backend_results_*.json` - 상세 테스트 결과
- `backend_report_*.txt` - 요약 리포트
- `backend_confusion_matrix_*.png` - 컨퓨전 매트릭스
- `backend_metrics_*.png` - 성능 지표 차트

**실행 방법:**
```bash
python test_backend_analyzer.py
```

---

### 2. 🌟 `test_gemini_analyzer.py`
**Gemini API 기반 분석기 테스트**

**주요 기능:**
- Spring Boot API를 통한 Gemini 분석기 HTTP 요청 테스트
- FormData로 이미지 업로드하여 API 응답 성능 측정
- Gemini stage(0-3)와 백엔드 level(2-7) 매핑 분석

**요구사항:**
- Spring Boot 서버 실행 중 (기본 포트: 8080)
- `/ai/gemini-check/analyze` 엔드포인트 활성화
- aiohttp, aiofiles 패키지 설치

**특별 기능:**
- API 연결 상태 확인
- HTTP 상태 코드별 통계
- 원본 Gemini stage와 매핑된 level 두 가지 성능 분석

**생성 결과:**
- `gemini_results_*.json` - 상세 테스트 결과
- `gemini_report_*.txt` - 요약 리포트
- `gemini_confusion_matrix_*.png` - 원본/매핑 비교 매트릭스
- `gemini_metrics_*.png` - 성능 비교 차트

**실행 방법:**
```bash
python test_gemini_analyzer.py
```

---

### 3. 🚀 `run_performance_tests.py`
**통합 테스트 실행기 및 비교 분석**

**주요 기능:**
- 백엔드와 Gemini 테스트를 순차적으로 실행
- 두 시스템의 성능 비교 리포트 자동 생성
- 전체 테스트 프로세스 관리 및 오류 처리

**실행 옵션:**
```bash
# 모든 테스트 실행 + 비교 리포트
python run_performance_tests.py

# 백엔드만 테스트
python run_performance_tests.py --backend-only

# Gemini만 테스트
python run_performance_tests.py --gemini-only
```

**생성 결과:**
- 각 분석기별 개별 결과 + `comparison_report_*.txt`
- 두 시스템의 성능 비교표 및 개선 권장사항

**특별 기능:**
- 사전 요구사항 자동 확인
- 패키지 설치 상태 검증
- 테스트 데이터 존재 여부 확인

---

### 4. 📦 `requirements.txt`
**필요 패키지 목록**

**포함 패키지:**
```
numpy>=1.21.0          # 수치 계산
pandas>=1.3.0          # 데이터 처리
matplotlib>=3.4.0      # 기본 시각화
seaborn>=0.11.0        # 고급 시각화
scikit-learn>=1.0.0    # 머신러닝 지표
Pillow>=8.0.0          # 이미지 처리
aiohttp>=3.8.0         # HTTP 클라이언트
aiofiles>=0.8.0        # 비동기 파일 처리
python-dotenv>=0.19.0  # 환경 변수
tqdm>=4.62.0           # 진행률 표시
```

**설치 방법:**
```bash
pip install -r requirements.txt
```

---

## 🔄 테스트 플로우

### 일반적인 테스트 순서:

1. **환경 준비**
   ```bash
   pip install -r requirements.txt
   ```

2. **개별 테스트** (실제 데이터)
   ```bash
   python test_backend_analyzer.py
   python test_gemini_analyzer.py  # Spring Boot 서버 필요
   ```

3. **통합 테스트** (비교 분석)
   ```bash
   python run_performance_tests.py
   ```

### 실제 운영 시나리오:

1. **테스트 단계**: 실제 데이터로 개별 테스트
2. **벤치마크 단계**: 통합 테스트로 성능 비교
3. **모니터링 단계**: 정기적 성능 테스트 실행

---

## ⚙️ 설정 및 커스터마이징

### 주요 설정 파라미터:

**테스트 데이터 경로:**
```python
TEST_DATA_PATH = "C:/Users/301/Desktop/test_data_set/test"
```

**결과 저장 경로:**
```python
BASE_LOG_PATH = "../log"  # test1, test2, test3 폴더가 자동 생성됨
```

**Gemini API 엔드포인트:**
```python
api_base_url = "http://localhost:8080"
api_endpoint = "/ai/gemini-check/analyze"
```

**백엔드 모듈 경로:**
```python
backend_path = "C:/Users/301/Desktop/main_project/backend/hair_classification/hair_loss_rag_analyzer_v0/backend"
```

---

## 🔧 트러블슈팅

### 백엔드 테스트 오류:
```
❌ HairLossAnalyzer 초기화 실패
```
**해결책:** Pinecone API 키, 백엔드 의존성 확인

### Gemini 테스트 오류:
```
❌ API 연결 실패
```
**해결책:** Spring Boot 서버 실행, 포트 확인

### 인코딩 오류:
```
UnicodeEncodeError: 'cp949' codec
```
**해결책:** `set PYTHONIOENCODING=utf-8` 설정

### 패키지 오류:
```
ModuleNotFoundError
```
**해결책:** `pip install -r requirements.txt` 재실행

---

## 📊 생성되는 결과물

### JSON 파일 (기계 판독용)
- 각 이미지별 상세 결과
- 성능 지표 및 메타데이터
- API 호출 통계

### TXT 파일 (사람 판독용)
- 요약된 성능 리포트
- 클래스별 성능 분석
- 개선 권장사항

### PNG 파일 (시각화)
- 컨퓨전 매트릭스 히트맵
- 성능 지표 바 차트
- 비교 분석 차트

### CSV 파일 (분석용)
- Excel에서 열어서 추가 분석
- 필터링 및 피벗 테이블 생성

## 📁 결과 파일 구조

```
log/
├── test1/                    # 첫 번째 테스트 실행 결과
│   ├── confusion_matrix.png       # 컨퓨전 메트릭스
│   ├── performance_metrics.png    # 성능 지표 차트
│   ├── results.json              # 상세 결과 (JSON)
│   ├── report.txt                # 요약 리포트 (TXT)
│   └── results.csv               # 데이터 (CSV)
├── test2/                    # 두 번째 테스트 실행 결과
│   └── ... (동일한 파일 구조)
└── test3/                    # 세 번째 테스트 실행 결과
    └── ... (동일한 파일 구조)
```

**특징:**
- 매 실행시마다 새로운 testN 폴더 생성
- 이전 결과를 덮어쓰지 않음
- 시간순 성능 변화 추적 가능
- 각 테스트는 완전히 독립적

---

## 🔄 테스트 번호 관리

### 자동 번호 할당
- 실행할 때마다 자동으로 다음 번호 폴더 생성
- 기존 test1, test2가 있으면 test3 생성
- 번호가 비어있어도 다음 최대값 사용

### 수동 정리
```bash
# 특정 테스트 결과 삭제
rm -rf log/test2

# 모든 테스트 결과 삭제 (새로 시작)
rm -rf log/test*
```

## 💡 사용 팁

1. **정기 테스트**: `run_performance_tests.py`로 일괄 실행
2. **디버깅**: 개별 스크립트로 문제 구간 분리 테스트
3. **성능 모니터링**: 결과 파일들을 test 번호순으로 비교 분석
4. **버전 관리**: 각 test 폴더는 독립적인 실행 결과를 보관

---

## 📊 결과 비교 및 분석

### 시간별 성능 추적
```bash
# 모든 테스트 결과의 정확도 비교
grep "정확도" log/test*/report.txt

# JSON에서 정확도 추출
jq '.metrics.accuracy' log/test*/results.json
```

### Excel에서 분석
1. 각 testN/results.csv를 하나의 시트로 import
2. 테스트별 성능 추이 차트 생성
3. 개선/악화 구간 식별

*마지막 업데이트: 2025-09-18*