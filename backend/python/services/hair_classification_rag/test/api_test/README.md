# 테스트 실행 방법

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
cd C:\Users\301\Desktop\main_project\backend\python\services\hair_classification_rag

# 전체 테스트 실행
pytest test/api_test/ -v

# 특정 테스트만 실행
pytest test/api_test/test_router.py::test_health_check -v
```

## 샘플 이미지 준비
테스트 이미지를 사용하려면:
1. `test_data/` 폴더 생성
2. `sample_hair.jpg` 파일 배치
3. 또는 `test_router.py`의 `TEST_IMAGE_PATH` 수정

## 주의사항
- 일부 테스트는 분석기/DB 초기화가 필요합니다
- 샘플 이미지가 없어도 기본 엔드포인트 테스트는 실행 가능
