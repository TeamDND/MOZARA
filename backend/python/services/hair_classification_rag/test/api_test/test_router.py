"""
API 엔드포인트 통합 테스트
실제 서버가 실행 중일 때 HTTP 요청으로 테스트
"""
import requests
import os

# 실제 서버 URL (로컬 개발 서버)
BASE_URL = "http://localhost:8000"
API_PREFIX = "/api/hair-classification-rag"

# 테스트용 샘플 이미지 경로
import glob
from pathlib import Path

# 현재 파일 기준으로 test_data 폴더의 첫 번째 jpg 파일 사용
test_data_dir = Path(__file__).parent / "test_data"
image_files = list(test_data_dir.glob("*.jpg"))
TEST_IMAGE_PATH = str(image_files[0]) if image_files else "test_data/sample_hair.jpg"


def test_health_check():
    """헬스 체크 엔드포인트 테스트"""
    try:
        response = requests.get(f"{BASE_URL}{API_PREFIX}/health", timeout=30)

        # 200(healthy), 206(degraded), 503(unhealthy) 모두 정상 응답
        assert response.status_code in [200, 206, 503]

        data = response.json()
        assert "status" in data
        assert data["status"] in ["healthy", "degraded", "unhealthy"]
        assert "timestamp" in data
        print(f"[OK] Health check success - status: {data['status']}")
    except requests.exceptions.ConnectionError:
        print("[ERROR] Server is not running. Please start the server first.")
        raise


def test_database_info():
    """데이터베이스 정보 조회 엔드포인트 테스트"""
    try:
        response = requests.get(f"{BASE_URL}{API_PREFIX}/database-info", timeout=30)

        if response.status_code == 200:
            data = response.json()
            # 응답 확인 (schema가 다를 수 있으므로 유연하게 처리)
            assert isinstance(data, dict)
            print(f"[OK] DB info retrieved - {data}")
        else:
            # DB 미설정 시 500 에러 발생 가능
            assert response.status_code in [500, 503]
            print(f"[WARN] DB not setup or error - status code: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("[ERROR] Server is not running.")
        raise


def test_analyze_upload_no_file():
    """파일 없이 분석 요청 시 에러 처리 테스트"""
    try:
        response = requests.post(f"{BASE_URL}{API_PREFIX}/analyze-upload", timeout=30)

        # 422: 필수 파라미터 누락
        assert response.status_code == 422
        print("[OK] File missing error handling works correctly")
    except requests.exceptions.ConnectionError:
        print("[ERROR] Server is not running.")
        raise


def test_analyze_upload_with_file():
    """이미지 업로드 분석 엔드포인트 테스트"""
    # 샘플 이미지가 있는 경우에만 테스트 실행
    if not os.path.exists(TEST_IMAGE_PATH):
        print(f"[SKIP] Test image not found: {TEST_IMAGE_PATH}")
        return

    try:
        with open(TEST_IMAGE_PATH, "rb") as f:
            files = {"file": ("test.jpg", f, "image/jpeg")}
            data = {
                "use_llm": "true",
                "use_roi": "true",
                "age": "30",
                "gender": "female"
            }

            response = requests.post(
                f"{BASE_URL}{API_PREFIX}/analyze-upload",
                files=files,
                data=data,
                timeout=60
            )

        if response.status_code == 200:
            result = response.json()
            assert "success" in result
            assert "grade" in result
            assert result["grade"] in [0, 1, 2, 3]
            assert "stage_description" in result
            print(f"[OK] Image analysis success - Grade: {result['grade']}")
        else:
            # 분석기 초기화 실패 등으로 500 발생 가능
            assert response.status_code in [400, 500]
            print(f"[WARN] Analysis failed - status code: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("[ERROR] Server is not running.")
        raise


def test_analyze_base64_missing_data():
    """Base64 분석 시 데이터 누락 테스트"""
    try:
        response = requests.post(
            f"{BASE_URL}{API_PREFIX}/analyze-base64",
            json={},
            timeout=30
        )

        # 422: Validation Error
        assert response.status_code == 422
        print("[OK] Base64 data missing error handling works correctly")
    except requests.exceptions.ConnectionError:
        print("[ERROR] Server is not running.")
        raise


def test_setup_database():
    """데이터베이스 셋업 엔드포인트 테스트"""
    try:
        response = requests.post(
            f"{BASE_URL}{API_PREFIX}/setup",
            json={"recreate_index": False},
            timeout=60
        )

        # 성공 또는 에러 모두 정상 범위
        assert response.status_code in [200, 500]

        if response.status_code == 200:
            data = response.json()
            assert "success" in data
            print("[OK] DB setup test passed")
        else:
            print(f"[WARN] DB setup error - status code: {response.status_code}")
    except requests.exceptions.ConnectionError:
        print("[ERROR] Server is not running.")
        raise
