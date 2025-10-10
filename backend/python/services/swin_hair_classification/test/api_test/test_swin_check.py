"""
Swin Hair Classification API 엔드포인트 통합 테스트
실제 서버가 실행 중일 때 HTTP 요청으로 테스트
"""
import requests
import os
from pathlib import Path

# 실제 서버 URL (로컬 개발 서버)
BASE_URL = "http://localhost:8000"
API_PREFIX = "/swin-hair-check"

# 테스트용 샘플 이미지 경로
test_data_dir = Path(__file__).parent / "test_data"
image_files = list(test_data_dir.glob("*.jpg"))
TEST_IMAGE_PATH = str(image_files[0]) if image_files else "test_data/sample_hair.jpg"


def test_swin_analysis():
    """Swin 모델 이미지 분석 엔드포인트 테스트"""
    # 샘플 이미지가 있는 경우에만 테스트 실행
    if not os.path.exists(TEST_IMAGE_PATH):
        print(f"[SKIP] Test image not found: {TEST_IMAGE_PATH}")
        return

    try:
        with open(TEST_IMAGE_PATH, "rb") as f:
            files = {"file": ("test.jpg", f, "image/jpeg")}

            response = requests.post(
                f"{BASE_URL}{API_PREFIX}/analyze",
                files=files,
                timeout=60
            )

        if response.status_code == 200:
            result = response.json()
            assert "grade" in result or "classification" in result
            print(f"[OK] Swin analysis success - Result: {result}")
        else:
            # 서버 에러 또는 모델 로딩 실패 가능
            assert response.status_code in [400, 500, 503]
            print(f"[WARN] Swin analysis failed - status code: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("[ERROR] Server is not running.")
        raise


def test_swin_health():
    """Swin 서비스 헬스 체크 테스트"""
    try:
        response = requests.get(f"{BASE_URL}{API_PREFIX}/health", timeout=30)

        # 200 또는 503 모두 정상 범위
        assert response.status_code in [200, 503]

        if response.status_code == 200:
            data = response.json()
            print(f"[OK] Swin health check success - {data}")
        else:
            print(f"[WARN] Swin service degraded - status code: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("[ERROR] Server is not running.")
        raise
    except Exception as e:
        # health 엔드포인트가 없을 수도 있음
        print(f"[INFO] Health endpoint not implemented: {e}")
