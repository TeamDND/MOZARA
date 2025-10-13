# Swin Hair Classification 테스트 실행 방법

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
cd C:\Users\301\Desktop\main_project\backend\python\services\swin_hair_classification

# 전체 테스트 실행
pytest test/api_test/ -v

# 특정 테스트만 실행
pytest test/api_test/test_swin_check.py::test_swin_analysis -v
```

## 샘플 이미지 준비
테스트 이미지를 사용하려면:
1. `test/api_test/test_data/` 폴더에 jpg 파일 배치
2. 아무 jpg 파일이나 자동으로 감지됨

## 주의사항
- Swin 모델 로딩에 시간이 걸릴 수 있습니다
- GPU가 없으면 분석이 느릴 수 있습니다
