# Hair Loss Analyzer 성능 테스트 시스템

## 📁 폴더 구조

```
result_log/
├── tester/                     # 테스트 스크립트 모음
│   ├── test_backend_analyzer.py      # 백엔드 CLIP+Pinecone 분석기 테스트
│   ├── test_gemini_analyzer.py       # 제미나이 API 분석기 테스트
│   ├── run_performance_tests.py      # 통합 테스트 실행기
│   ├── demo_test.py                  # 데모 테스트 (시뮬레이션)
│   └── requirements.txt              # 필요 패키지 목록
│
└── log/                        # 테스트 결과 저장소
    ├── backend_results_*.json        # 백엔드 상세 결과 (JSON)
    ├── backend_report_*.txt          # 백엔드 요약 리포트 (TXT)
    ├── gemini_results_*.json         # 제미나이 상세 결과 (JSON)
    ├── gemini_report_*.txt           # 제미나이 요약 리포트 (TXT)
    ├── comparison_report_*.txt       # 두 시스템 비교 분석
    ├── *_confusion_matrix_*.png      # 컨퓨전 메트릭스 시각화
    ├── *_metrics_*.png               # 성능 지표 차트
    └── *.csv                         # Excel 분석용 데이터
```

## 🚀 사용법

### 1. 환경 설정

```bash
cd tester
pip install -r requirements.txt
```

### 2. 개별 테스트 실행

```bash
# 백엔드 애널라이저만 테스트
python test_backend_analyzer.py

# 제미나이 애널라이저만 테스트 (Spring Boot 서버 필요)
python test_gemini_analyzer.py

# 데모 테스트 (시뮬레이션)
python demo_test.py
```

### 3. 통합 테스트 실행

```bash
# 모든 테스트 + 비교 리포트 생성
python run_performance_tests.py

# 백엔드만
python run_performance_tests.py --backend-only

# 제미나이만
python run_performance_tests.py --gemini-only
```

## 📊 생성되는 결과물

### JSON 파일 (상세 데이터)
- 각 이미지별 테스트 결과
- 성능 지표 상세 정보
- 메타데이터 및 설정 정보

### TXT 파일 (요약 리포트)
- 사람이 읽기 쉬운 요약
- 주요 성능 지표
- 클래스별 성능 분석

### PNG 파일 (시각화)
- 컨퓨전 메트릭스 히트맵
- 성능 지표 바 차트
- 비교 분석 차트

### CSV 파일 (데이터 분석)
- Excel에서 열어서 추가 분석 가능
- 필터링 및 피벗 테이블 생성 가능

## 🎯 성능 지표

### 기본 지표
- **정확도 (Accuracy)**: 전체 예측 중 정확한 비율
- **정밀도 (Precision)**: 예측한 것 중 실제로 맞춘 비율
- **재현율 (Recall)**: 실제 정답 중 예측으로 찾아낸 비율
- **F1-Score**: 정밀도와 재현율의 조화평균

### 추가 지표
- **성공률**: API 호출 성공률
- **평균 분석 시간**: 이미지당 처리 시간
- **평균 신뢰도**: 예측 신뢰도 (백엔드 전용)
- **컨퓨전 메트릭스**: 클래스별 예측 정확도

### 클래스별 분석
- 각 탈모 레벨(2-7)별 성능
- 오분류 패턴 분석
- 인접 레벨간 혼동 정도

## 🔧 커스터마이징

### 테스트 데이터 경로 변경
```python
# 각 테스트 스크립트의 main() 함수에서
test_data_path = "your/test/data/path"
```

### 결과 저장 경로 변경
```python
# 각 테스트 스크립트의 main() 함수에서
result_log_path = "your/result/path"
```

### API 엔드포인트 변경 (제미나이)
```python
# test_gemini_analyzer.py에서
api_base_url = "http://your-api-server:port"
```

## 🐛 트러블슈팅

### 백엔드 테스트 오류
```
❌ HairLossAnalyzer 초기화 실패
```
**해결책:**
- Pinecone API 키 설정 확인
- 백엔드 의존성 패키지 설치 확인
- Python 경로 설정 확인

### 제미나이 테스트 오류
```
❌ API 연결 실패
```
**해결책:**
- Spring Boot 서버 실행 상태 확인
- 포트 충돌 확인 (기본 8080)
- 방화벽 설정 확인

### 인코딩 오류
```
UnicodeEncodeError: 'cp949' codec can't encode
```
**해결책:**
- 환경 변수 설정: `set PYTHONIOENCODING=utf-8`
- 또는 콘솔 코드페이지 변경: `chcp 65001`

## 📈 결과 해석 가이드

### 컨퓨전 메트릭스 읽는 법
```
실제\예측   2    3    4    5    6    7
    2      45    3    0    0    0    0  ← 레벨 2: 45개 정확, 3개 레벨 3으로 오분류
    3       2   38    5    0    0    0  ← 레벨 3: 38개 정확, 2개는 레벨 2로, 5개는 레벨 4로
    ...
```

### 성능 지표 기준
- **정확도 85% 이상**: 우수
- **정확도 75-85%**: 양호
- **정확도 65-75%**: 보통
- **정확도 65% 미만**: 개선 필요

### F1-Score 해석
- **0.9 이상**: 매우 우수
- **0.8-0.9**: 우수
- **0.7-0.8**: 양호
- **0.6-0.7**: 보통
- **0.6 미만**: 개선 필요

## 📞 지원

문제가 발생하거나 기능 개선 요청이 있으면:
1. 로그 파일 확인 (`log/` 폴더)
2. 에러 메시지와 함께 이슈 등록
3. 테스트 환경 정보 제공 (OS, Python 버전 등)

---

*마지막 업데이트: 2025-09-18*