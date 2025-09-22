# Hair Loss Analyzer 성능 테스트 도구

이 프로젝트는 탈모 분석 시스템의 두 가지 애널라이저 성능을 비교 평가하는 도구입니다.

## 📊 지원하는 분석기

1. **백엔드 애널라이저**: CLIP + Pinecone RAG 기반 분석기
2. **제미나이 애널라이저**: Google Gemini API 기반 분석기

## 🎯 성능 지표

- **컨퓨전 메트릭스** (Confusion Matrix)
- **정확도** (Accuracy)
- **정밀도** (Precision)
- **재현율** (Recall)
- **F1-Score**
- **분석 시간** (Processing Time)
- **성공률** (Success Rate)

## 📁 프로젝트 구조

```
hair_classification/
├── test_backend_analyzer.py      # 백엔드 애널라이저 테스트
├── test_gemini_analyzer.py       # 제미나이 애널라이저 테스트
├── run_performance_tests.py      # 통합 테스트 실행기
├── requirements.txt              # 필요 패키지 목록
├── result_log/                   # 테스트 결과 저장 폴더
│   ├── backend_results_*.json    # 백엔드 상세 결과
│   ├── backend_report_*.txt      # 백엔드 요약 리포트
│   ├── gemini_results_*.json     # 제미나이 상세 결과
│   ├── gemini_report_*.txt       # 제미나이 요약 리포트
│   ├── comparison_report_*.txt   # 비교 분석 리포트
│   └── *.png                     # 시각화 차트들
└── README.md                     # 이 파일
```

## 🚀 설치 및 설정

### 1. 필요 패키지 설치

```bash
cd C:/Users/301/Desktop/main_project/backend/hair_classification
pip install -r requirements.txt
```

### 2. 테스트 데이터 준비

테스트 데이터는 다음 경로에 레벨별로 구성되어야 합니다:

```
C:/Users/301/Desktop/test_data_set/test/
├── 2/  # 레벨 2 이미지들
├── 3/  # 레벨 3 이미지들
├── 4/  # 레벨 4 이미지들
├── 5/  # 레벨 5 이미지들
├── 6/  # 레벨 6 이미지들
└── 7/  # 레벨 7 이미지들
```

지원 이미지 형식: `.jpg`, `.jpeg`, `.png`, `.bmp`

### 3. 환경 설정

#### 백엔드 애널라이저 테스트
- Pinecone API 키 설정 필요
- 백엔드 서버가 실행 중이어야 함

#### 제미나이 애널라이저 테스트
- Spring Boot 서버가 실행 중이어야 함 (기본 포트: 8080)
- `/ai/gemini-check/analyze` 엔드포인트 접근 가능해야 함

## 🔧 사용법

### 통합 테스트 실행 (권장)

```bash
# 모든 분석기 테스트 + 비교 리포트 생성
python run_performance_tests.py

# 백엔드 애널라이저만 테스트
python run_performance_tests.py --backend-only

# 제미나이 애널라이저만 테스트
python run_performance_tests.py --gemini-only
```

### 개별 테스트 실행

```bash
# 백엔드 애널라이저 테스트
python test_backend_analyzer.py

# 제미나이 애널라이저 테스트
python test_gemini_analyzer.py
```

## 📈 결과 해석

### 성능 지표 설명

- **정확도 (Accuracy)**: 전체 예측 중 정확한 예측의 비율
- **정밀도 (Precision)**: 각 클래스별 예측한 것 중 실제로 맞춘 비율
- **재현율 (Recall)**: 각 클래스별 실제 정답 중 예측으로 찾아낸 비율
- **F1-Score**: 정밀도와 재현율의 조화평균

### 컨퓨전 메트릭스 읽기

```
실제\예측   2    3    4    5    6    7
    2      45    3    0    0    0    0
    3       2   38    5    0    0    0
    4       0    4   35    3    0    0
    5       0    0    2   40    2    0
    6       0    0    0    1   41    1
    7       0    0    0    0    2   43
```

- 대각선 값이 클수록 정확도가 높음
- 대각선에서 멀어질수록 오분류가 심함

### 결과 파일 설명

- **JSON 파일**: 상세한 테스트 결과 및 메타데이터
- **TXT 파일**: 사람이 읽기 쉬운 요약 리포트
- **CSV 파일**: Excel에서 분석 가능한 데이터
- **PNG 파일**: 컨퓨전 메트릭스 및 성능 차트

## 🔍 트러블슈팅

### 자주 발생하는 문제들

1. **백엔드 테스트 실패**
   ```
   ❌ HairLossAnalyzer 초기화 실패
   ```
   - Pinecone API 키 확인
   - 백엔드 서버 실행 상태 확인
   - 필요 패키지 설치 확인

2. **제미나이 테스트 실패**
   ```
   ❌ API 연결 실패
   ```
   - Spring Boot 서버 실행 확인 (http://localhost:8080)
   - 방화벽 설정 확인
   - API 엔드포인트 경로 확인

3. **테스트 데이터 없음**
   ```
   ❌ 테스트 데이터가 없습니다
   ```
   - 테스트 데이터 경로 확인
   - 이미지 파일 존재 여부 확인
   - 파일 권한 확인

### 로그 확인

실행 중 오류가 발생하면 다음 위치에서 상세 로그를 확인할 수 있습니다:
- 콘솔 출력
- `result_log/` 폴더의 리포트 파일들

## 📊 추가 개선 제안

현재 구현된 성능 지표 외에 다음과 같은 추가 지표를 고려할 수 있습니다:

### 추가 성능 지표
- **ROC-AUC**: 클래스별 분류 성능
- **Cohen's Kappa**: 클래스 불균형을 고려한 일치도
- **평균 절대 오차 (MAE)**: 레벨 예측 오차
- **가중 평균 정확도**: 클래스 크기를 고려한 정확도

### 분석 개선
- **오분류 분석**: 어떤 레벨간 혼동이 많은지 분석
- **신뢰도 분석**: 예측 신뢰도와 실제 정확도 상관관계
- **시간 성능**: 이미지 크기별 처리 시간 분석
- **안정성 테스트**: 동일 이미지 반복 테스트 결과 일관성

## 📝 업데이트 로그

- **v1.0.0**: 초기 버전 구현
  - 백엔드 애널라이저 테스트 구현
  - 제미나이 애널라이저 테스트 구현
  - 컨퓨전 메트릭스 및 기본 성능 지표
  - 통합 실행 스크립트 및 비교 리포트

## 👥 기여자

- 성능 테스트 시스템 설계 및 구현

## 📞 지원

문제가 발생하거나 개선 사항이 있으면 이슈를 등록해 주세요.