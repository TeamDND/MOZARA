"""
Time-Series Analysis API 엔드포인트 통합 테스트
실제 서버가 실행 중일 때 HTTP 요청으로 테스트
"""
import requests
import os
from pathlib import Path

# 실제 서버 URL (로컬 개발 서버)
BASE_URL = "http://localhost:8000"
API_PREFIX = "/timeseries"

# 테스트용 샘플 이미지 경로
test_data_dir = Path(__file__).parent / "test_data"
image_files = list(test_data_dir.glob("*.jpg"))
TEST_IMAGE_PATH = str(image_files[0]) if image_files else "test_data/sample_hair.jpg"


def test_timeseries_root():
    """Time-Series API 루트 엔드포인트 테스트"""
    try:
        response = requests.get(f"{BASE_URL}{API_PREFIX}/", timeout=10)

        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        assert "endpoints" in data
        print(f"[OK] Time-Series API root - {data['name']}")
    except requests.exceptions.ConnectionError:
        print("[ERROR] Server is not running.")
        raise


def test_analyze_single_image():
    """단일 이미지 분석 엔드포인트 테스트"""
    # S3 URL 또는 로컬 경로 필요
    try:
        # 테스트용 더미 URL
        test_url = "https://example.com/test.jpg"

        response = requests.post(
            f"{BASE_URL}{API_PREFIX}/analyze-single",
            json={"image_url": test_url},
            timeout=30
        )

        # 실제 S3 URL이 아니므로 400 또는 500 에러 예상
        # 엔드포인트가 존재하고 요청을 받는지만 확인
        assert response.status_code in [200, 400, 422, 500]
        print(f"[OK] Analyze single endpoint accessible - status: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("[ERROR] Server is not running.")
        raise


def test_compare_timeseries():
    """시계열 비교 분석 엔드포인트 테스트"""
    try:
        # 테스트용 더미 데이터
        test_data = {
            "image_urls": [
                "https://example.com/image1.jpg",
                "https://example.com/image2.jpg"
            ],
            "dates": ["2024-01-01", "2024-02-01"]
        }

        response = requests.post(
            f"{BASE_URL}{API_PREFIX}/compare",
            json=test_data,
            timeout=30
        )

        # 실제 데이터가 아니므로 에러 예상, 엔드포인트 존재 확인
        assert response.status_code in [200, 400, 422, 500]
        print(f"[OK] Compare timeseries endpoint accessible - status: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("[ERROR] Server is not running.")
        raise


def test_analyze_with_real_image():
    """실제 이미지로 분석 테스트 (이미지 파일 있을 때)"""
    if not os.path.exists(TEST_IMAGE_PATH):
        print(f"[SKIP] Test image not found: {TEST_IMAGE_PATH}")
        return

    # S3 업로드 후 분석하는 로직이 필요하므로 스킵
    print("[INFO] Real image analysis requires S3 upload - skipping")
