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

        # 상세 권고사항 생성
        recommendations = {
            'uv': None,
            'humidity': None,
            'air': None
        }

        # 자외선 지수에 따른 추천
        if uv_index >= 6:
            recommendations['uv'] = {
                'type': 'warning',
                'message': '자외선이 매우 강합니다. 모자나 선크림을 사용하세요.',
                'icon': 'sun'
            }
        elif uv_index >= 3:
            recommendations['uv'] = {
                'type': 'caution',
                'message': '자외선이 보통입니다. 실외 활동 시 주의하세요.',
                'icon': 'sun'
            }
        else:
            recommendations['uv'] = {
                'type': 'info',
                'message': '자외선이 약합니다. 두피 건강에 좋은 날입니다.',
                'icon': 'sun'
            }

        # 습도에 따른 추천
        if humidity < 30:
            recommendations['humidity'] = {
                'type': 'warning',
                'message': '습도가 매우 낮습니다. 두피 보습에 신경 쓰세요.',
                'icon': 'droplets'
            }
        elif humidity < 40:
            recommendations['humidity'] = {
                'type': 'caution',
                'message': '습도가 낮습니다. 두피 건조 예방에 주의하세요.',
                'icon': 'droplets'
            }
        elif humidity > 70:
            recommendations['humidity'] = {
                'type': 'caution',
                'message': '습도가 높습니다. 두피 통풍에 주의하세요.',
                'icon': 'droplets'
            }
        else:
            recommendations['humidity'] = {
                'type': 'info',
                'message': '습도가 적정합니다. 두피 건강에 좋은 날입니다.',
                'icon': 'droplets'
            }

        # 미세먼지에 따른 추천 (AQI 기준: 1=좋음, 2=보통, 3=나쁨, 4=매우나쁨, 5=최악)
        if aqi >= 4:
            recommendations['air'] = {
                'type': 'warning',
                'message': '미세먼지가 나쁩니다. 외출 후 머리 감기를 권장합니다.',
                'icon': 'wind'
            }
        elif aqi == 3:
            recommendations['air'] = {
                'type': 'caution',
                'message': '대기질이 나쁩니다. 외출 시 주의하세요.',
                'icon': 'wind'
            }
        elif aqi == 2:
            recommendations['air'] = {
                'type': 'info',
                'message': '대기질이 보통입니다. 야외 활동 가능합니다.',
                'icon': 'wind'
            }
        elif aqi == 1:
            recommendations['air'] = {
                'type': 'info',
                'message': '대기질이 좋습니다. 두피 건강에 좋은 날입니다!',
                'icon': 'wind'
            }
        else:
            recommendations['air'] = {
                'type': 'info',
                'message': '대기질 정보를 확인할 수 없습니다.',
                'icon': 'wind'
            }

        return {
            'success': True,
            'data': {
                'uvIndex': uv_index,
                'uvLevel': uv_level,
                'humidity': humidity,
                'humidityAdvice': humidity_advice,
                'airQuality': aqi,
                'airQualityLevel': air_quality_level,
                'recommendations': recommendations
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
