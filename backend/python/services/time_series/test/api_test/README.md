# Time-Series Analysis 테스트 실행 방법

## 설치
```bash
pip install pytest requests
```

## 사전 준비
**중요: 테스트 전에 FastAPI 서버를 먼저 실행하세요!**

```bash
# 서버 실행 (별도 터미널에서)
cd C:\Users\301\Desktop\main_project\backend\python
python app.py
```

## 테스트 실행
```bash
# 경로 이동
cd C:\Users\301\Desktop\main_project\backend\python\services\time_series

# 전체 테스트 실행
pytest test/api_test/ -v

# 특정 테스트만 실행
pytest test/api_test/test_timeseries.py::test_timeseries_root -v
```

## 테스트 항목
1. API 루트 엔드포인트 - API 정보 조회
2. 단일 이미지 분석 - `/analyze-single`
3. 시계열 비교 분석 - `/compare`

## 주의사항
- 실제 이미지 분석은 S3 URL이 필요합니다
- 테스트는 엔드포인트 접근성만 확인합니다
- S3 연동 테스트는 별도로 수행하세요
