@echo off
echo ========================================
echo 밀도 시각화 테스트 실행
echo ========================================
echo.

cd /d "%~dp0"

echo [1/2] 테스트 실행 중...
python test_visualizer_real.py

echo.
echo [2/2] 결과 이미지 열기...

if exist test_output_fake.jpg (
    echo ✅ test_output_fake.jpg 생성 완료
    start test_output_fake.jpg
) else (
    echo ⚠️ test_output_fake.jpg 없음
)

if exist test_output_real.jpg (
    echo ✅ test_output_real.jpg 생성 완료
    start test_output_real.jpg
) else (
    echo ⚠️ test_output_real.jpg 없음 (이미지 파일 필요)
)

if exist test_output_api.jpg (
    echo ✅ test_output_api.jpg 생성 완료
    start test_output_api.jpg
) else (
    echo ⚠️ test_output_api.jpg 없음 (API 서버 필요)
)

echo.
echo ========================================
echo 테스트 완료!
echo ========================================
echo.
echo 창을 닫으려면 아무 키나 누르세요...
pause >nul
