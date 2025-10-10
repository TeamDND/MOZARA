"""
날씨 정보 제공 서비스
OpenWeatherMap API를 사용하여 현재 위치 기반 날씨 정보 제공
"""
import os
import requests
from fastapi import APIRouter, Query, HTTPException
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()

OPENWEATHER_API_KEY = os.getenv('REACT_APP_OPENWEATHER_API_KEY')

# FastAPI Router 생성
router = APIRouter(prefix="/api/weather", tags=["weather"])


def get_weather_info(lat: float, lon: float):
    """
    위도, 경도 기반 날씨 정보 조회

    Args:
        lat: 위도
        lon: 경도

    Returns:
        dict: 날씨 정보 (UV Index, 습도, 대기질)
    """
    if not OPENWEATHER_API_KEY:
        return {
            'success': False,
            'error': 'API key not configured'
        }

    try:
        # 1. 현재 날씨 (습도)
        weather_url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}&units=metric"
        weather_response = requests.get(weather_url, timeout=5)
        weather_data = weather_response.json()

        humidity = weather_data.get('main', {}).get('humidity', 0)

        # 2. UV Index
        uv_url = f"https://api.openweathermap.org/data/2.5/uvi?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}"
        uv_response = requests.get(uv_url, timeout=5)
        uv_data = uv_response.json()

        uv_index = uv_data.get('value', 0)

        # 3. Air Pollution (미세먼지)
        air_url = f"https://api.openweathermap.org/data/2.5/air_pollution?lat={lat}&lon={lon}&appid={OPENWEATHER_API_KEY}"
        air_response = requests.get(air_url, timeout=5)
        air_data = air_response.json()

        aqi = air_data.get('list', [{}])[0].get('main', {}).get('aqi', 0)

        # UV 레벨 판정
        uv_level = '낮음'
        if uv_index >= 11:
            uv_level = '위험'
        elif uv_index >= 8:
            uv_level = '매우 높음'
        elif uv_index >= 6:
            uv_level = '높음'
        elif uv_index >= 3:
            uv_level = '보통'

        # 습도 조언
        humidity_advice = '적정'
        if humidity < 30:
            humidity_advice = '보습 필요'
        elif humidity < 40:
            humidity_advice = '건조'
        elif humidity > 70:
            humidity_advice = '다습'

        # 대기질 레벨 (1: 좋음, 2: 보통, 3: 나쁨, 4: 매우 나쁨, 5: 최악)
        air_quality_levels = ['좋음', '보통', '나쁨', '매우 나쁨', '최악']
        air_quality_level = air_quality_levels[aqi - 1] if 1 <= aqi <= 5 else '정보 없음'

        return {
            'success': True,
            'data': {
                'uvIndex': uv_index,
                'uvLevel': uv_level,
                'humidity': humidity,
                'humidityAdvice': humidity_advice,
                'airQuality': aqi,
                'airQualityLevel': air_quality_level
            }
        }

    except requests.exceptions.Timeout:
        return {
            'success': False,
            'error': 'API request timeout'
        }
    except requests.exceptions.RequestException as e:
        return {
            'success': False,
            'error': f'API request failed: {str(e)}'
        }
    except Exception as e:
        return {
            'success': False,
            'error': f'Unexpected error: {str(e)}'
        }


@router.get("")
async def get_weather(
    lat: float = Query(..., description="위도"),
    lon: float = Query(..., description="경도")
):
    """
    현재 위치 기반 날씨 정보 조회

    Args:
        lat: 위도
        lon: 경도

    Returns:
        날씨 정보 (UV Index, 습도, 대기질)

    Example:
        GET /api/weather?lat=37.5665&lon=126.9780

    Response:
        {
            "success": true,
            "data": {
                "uvIndex": 5.2,
                "uvLevel": "보통",
                "humidity": 45,
                "humidityAdvice": "적정",
                "airQuality": 2,
                "airQualityLevel": "보통"
            }
        }
    """
    result = get_weather_info(lat, lon)

    if result['success']:
        return result
    else:
        raise HTTPException(status_code=500, detail=result.get('error', 'Unknown error'))
