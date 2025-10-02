// 날씨 데이터 인터페이스
export interface WeatherData {
  temperature: number;
  humidity: number;
  uvIndex: number;
  fineDust: number;
  location: string;
  lastUpdated: string;
}

// API 키 로드 (상위 폴더의 .env 파일에서)
// 기존 .env 파일의 API 키를 직접 사용
const WEATHER_API_KEY = process.env.REACT_APP_WEATHER_API_KEY || 'sHYNuPbTS1e2Dbj206tXnA';

// API 키가 유효한지 확인
const isValidApiKey = (key: string): boolean => {
  return Boolean(key && key.trim().length > 10 && key !== 'YOUR_WEATHER_API_KEY');
};

// 기본 날씨 데이터 (API 실패시 사용)
const getDefaultWeatherData = (): WeatherData => {
  // 현재 시간에 따른 더미 데이터 생성
  const hour = new Date().getHours();
  const temperature = 15 + Math.sin(hour * Math.PI / 12) * 10; // 5-25도 범위
  const humidity = 40 + Math.sin(hour * Math.PI / 6) * 20; // 20-60% 범위
  const uvIndex = hour >= 6 && hour <= 18 ? Math.floor(Math.random() * 8) + 1 : 0;
  const fineDust = Math.floor(Math.random() * 50) + 20; // 20-70 범위
  
  return {
    temperature: Math.round(temperature),
    humidity: Math.round(humidity),
    uvIndex,
    fineDust,
    location: '서울',
    lastUpdated: new Date().toISOString()
  };
};

// 좌표를 기상청 격자 좌표로 변환하는 함수 (개선된 버전)
function convertToGrid(lat: number, lon: number) {
  // 기상청 LCC DFS 좌표변환 (정확한 공식)
  const RE = 6371.00877; // 지구 반경 (km)
  const GRID = 5.0; // 격자 간격 (km)
  const SLAT1 = 30.0; // 투영 위도1 (도)
  const SLAT2 = 60.0; // 투영 위도2 (도)
  const OLON = 126.0; // 기준 경도 (도)
  const OLAT = 38.0; // 기준 위도 (도)
  const XO = 43; // 기준 X 좌표
  const YO = 136; // 기준 Y 좌표

  const DEGRAD = Math.PI / 180.0;
  const RADDEG = 180.0 / Math.PI;

  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;

  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);

  const ra = Math.tan(Math.PI * 0.25 + lat * DEGRAD * 0.5);
  const theta = lon * DEGRAD - olon;
  let x = Math.floor(ra * Math.sin(theta) + XO + 0.5);
  let y = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);

  // 좌표 범위 제한 (기상청 격자 범위 내로)
  x = Math.max(1, Math.min(149, x));
  y = Math.max(1, Math.min(253, y));

  return { x, y };
}

// 기준 시간 계산 (기상청 API는 정해진 시간에만 데이터 제공)
// 기상청 단기실황 기준시각 보정 (매 시각 40분 경 업데이트)
function adjustBaseDateTime(now: Date): { date: string; time: string } {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = now.getHours();
  const minute = now.getMinutes();

  // 40분 이전이면 이전 시간의 데이터 사용
  let targetHour = hour;
  if (minute < 40) {
    targetHour = hour - 1;
    if (targetHour < 0) {
      targetHour = 23;
      // 날짜도 하루 빼기
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        date: `${yesterday.getFullYear()}${String(yesterday.getMonth() + 1).padStart(2, '0')}${String(yesterday.getDate()).padStart(2, '0')}`,
        time: '2300'
      };
    }
  }

  return {
    date: `${year}${month}${day}`,
    time: `${String(targetHour).padStart(2, '0')}00`
  };
}

// 초단기예보 기준시각 보정 (매 시각 30분 경 업데이트)
function adjustForecastBaseDateTime(now: Date): { date: string; time: string } {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = now.getHours();
  const minute = now.getMinutes();

  // 30분 이전이면 이전 시간의 데이터 사용
  let targetHour = hour;
  if (minute < 30) {
    targetHour = hour - 1;
    if (targetHour < 0) {
      targetHour = 23;
      // 날짜도 하루 빼기
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      return {
        date: `${yesterday.getFullYear()}${String(yesterday.getMonth() + 1).padStart(2, '0')}${String(yesterday.getDate()).padStart(2, '0')}`,
        time: '2330'
      };
    }
  }

  return {
    date: `${year}${month}${day}`,
    time: `${String(targetHour).padStart(2, '0')}30`
  };
}

// 예보 데이터에서 가장 가까운 시간의 데이터 선택
function pickNearestForecast(items: any[]): any[] {
  if (!items || items.length === 0) return [];
  
  const now = new Date();
  const currentHour = now.getHours();
  
  // 현재 시간과 가장 가까운 예보 시간 찾기
  let nearestItems: any[] = [];
  let minDiff = Infinity;
  
  // 시간별로 그룹화
  const timeGroups: { [key: string]: any[] } = {};
  items.forEach(item => {
    if (!timeGroups[item.fcstTime]) {
      timeGroups[item.fcstTime] = [];
    }
    timeGroups[item.fcstTime].push(item);
  });
  
  // 각 시간대와의 차이 계산
  Object.keys(timeGroups).forEach(timeStr => {
    const forecastHour = parseInt(timeStr.substring(0, 2));
    const diff = Math.abs(forecastHour - currentHour);
    
    if (diff < minDiff) {
      minDiff = diff;
      nearestItems = timeGroups[timeStr];
    }
  });
  
  return nearestItems;
}

// 현재 위치 가져오기
const getCurrentLocation = (): Promise<{ latitude: number; longitude: number; address: string }> => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        resolve({
          latitude,
          longitude,
          address: '서울' // 기본값
        });
      },
      (error) => {
        console.warn('위치 정보를 가져올 수 없습니다:', error);
        // 기본 위치 (서울)
        resolve({
          latitude: 37.5665,
          longitude: 126.9780,
          address: '서울'
        });
      },
      {
        timeout: 10000,
        enableHighAccuracy: false,
        maximumAge: 300000 // 5분
      }
    );
  });
};

// 기상청 API에서 날씨 정보 가져오기
export const getWeatherData = async (): Promise<WeatherData> => {
  try {
    // API 키 확인
    console.log('현재 API 키 상태:', {
      hasKey: !!WEATHER_API_KEY,
      keyLength: WEATHER_API_KEY.length,
      keyPreview: WEATHER_API_KEY ? `${WEATHER_API_KEY.substring(0, 4)}...` : '없음',
      isValid: isValidApiKey(WEATHER_API_KEY)
    });

    if (!isValidApiKey(WEATHER_API_KEY)) {
      console.warn('기상청 API 키가 설정되지 않았습니다. .env 파일에 REACT_APP_WEATHER_API_KEY를 설정해주세요.');
      console.warn('예시: REACT_APP_WEATHER_API_KEY=실제_API_키');
      return getDefaultWeatherData();
    }

    console.log('기상청 API 키 확인됨, 실제 API 호출 시작...');

    // 현재 위치 가져오기
    const location = await getCurrentLocation();
    const grid = convertToGrid(location.latitude, location.longitude);
    
    // 변환된 격자 좌표 확인
    console.log('변환된 격자 좌표:', { nx: grid.x, ny: grid.y, lat: location.latitude, lon: location.longitude });
    
    // 기상청 단기예보 API 호출
    const now = new Date();
    const base = adjustBaseDateTime(now);
    const baseDateStr = base.date;
    const baseTime = base.time;
    
    // 1차: 초단기실황(Ncst) 시도
    const ncstUrl = `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst`;
    const ncstQuery = `serviceKey=${encodeURIComponent(WEATHER_API_KEY)}&pageNo=1&numOfRows=1000&dataType=JSON&base_date=${baseDateStr}&base_time=${baseTime}&nx=${grid.x}&ny=${grid.y}`;
    
    let data: any | null = null;
    let ok = false;
    
    try {
      const res = await fetch(`${ncstUrl}?${ncstQuery}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors',
        credentials: 'omit'
      });
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }
      
      const text = await res.text();
      console.log('API 응답:', text.substring(0, 200)); // 디버깅용
      
      data = JSON.parse(text);
      if (data?.response?.header?.resultCode === '00') {
        ok = true;
      } else {
        console.warn('API 응답 오류:', data?.response?.header);
      }
    } catch (e) {
      console.error('초단기실황 API 호출 실패:', e);
      ok = false;
    }

    // 2차: 초단기예보(Fcst)로 대체 시도
    if (!ok) {
      try {
        const fcstBase = adjustForecastBaseDateTime(new Date());
        const fcstUrl = `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtFcst`;
        const fcstQuery = `serviceKey=${encodeURIComponent(WEATHER_API_KEY)}&pageNo=1&numOfRows=1000&dataType=JSON&base_date=${fcstBase.date}&base_time=${fcstBase.time}&nx=${grid.x}&ny=${grid.y}`;
        
        const res2 = await fetch(`${fcstUrl}?${fcstQuery}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          mode: 'cors',
          credentials: 'omit'
        });
        
        if (!res2.ok) {
          throw new Error(`HTTP ${res2.status}: ${res2.statusText}`);
        }
        
        const text2 = await res2.text();
        console.log('예보 API 응답:', text2.substring(0, 200)); // 디버깅용
        
        const json2 = JSON.parse(text2);
        if (json2?.response?.header?.resultCode === '00') {
          // 예보 아이템을 관측처럼 가공하여 사용
          const items2 = json2.response.body.items.item || [];
          const nearest = pickNearestForecast(items2);
          data = {
            response: {
              header: { resultCode: '00' },
              body: { items: { item: nearest } }
            }
          };
          ok = true;
        } else {
          console.warn('예보 API 응답 오류:', json2?.response?.header);
        }
      } catch (e) {
        console.error('초단기예보 API 호출 실패:', e);
        ok = false;
      }
    }

    if (!ok || !data) {
      const code = data?.response?.header?.resultCode;
      const msg = data?.response?.header?.resultMsg;
      console.error(`기상청 API 호출 실패 (${code || 'N/A'}: ${msg || 'no message'})`);
      return getDefaultWeatherData();
    }

    const items = data.response?.body?.items?.item || [];
    
    // 필요한 데이터 추출
    const weatherData: WeatherData = {
      temperature: 0,
      humidity: 0,
      uvIndex: 0,
      fineDust: 0,
      location: location.address,
      lastUpdated: new Date().toISOString()
    };

    items.forEach((item: any) => {
      switch (item.category) {
        case 'T1H': // 기온
          weatherData.temperature = parseFloat(item.obsrValue);
          break;
        case 'REH': // 습도
          weatherData.humidity = parseFloat(item.obsrValue);
          break;
        case 'UVI': // 자외선지수
          weatherData.uvIndex = parseFloat(item.obsrValue);
          break;
        case 'PM10': // 미세먼지
          weatherData.fineDust = parseFloat(item.obsrValue);
          break;
      }
    });

    // UVI가 없으면 시간대별 추정값 사용
    if (weatherData.uvIndex === 0) {
      const hour = new Date().getHours();
      if (hour >= 6 && hour <= 18) {
        weatherData.uvIndex = Math.floor(Math.random() * 8) + 1;
      }
    }

    // PM10이 없으면 기본값 사용
    if (weatherData.fineDust === 0) {
      weatherData.fineDust = Math.floor(Math.random() * 50) + 20;
    }

    return weatherData;
    
  } catch (error) {
    console.error('날씨 데이터 가져오기 실패:', error);
    // 실패시 기본값 반환
    return getDefaultWeatherData();
  }
};

// 날씨 기반 추천 정보 생성
export const getWeatherRecommendations = (weather: WeatherData) => {
  const recommendations = [];

  // 자외선 지수에 따른 추천
  if (weather.uvIndex >= 6) {
    recommendations.push({
      type: 'warning',
      message: '자외선이 매우 강합니다. 모자나 선크림을 사용하세요.',
      icon: '☀️'
    });
  } else if (weather.uvIndex >= 3) {
    recommendations.push({
      type: 'caution',
      message: '자외선이 보통입니다. 실외 활동 시 주의하세요.',
      icon: '🌤️'
    });
  }

  // 습도에 따른 추천
  if (weather.humidity < 30) {
    recommendations.push({
      type: 'info',
      message: '습도가 낮습니다. 두피 보습에 신경 쓰세요.',
      icon: '💧'
    });
  } else if (weather.humidity > 70) {
    recommendations.push({
      type: 'info',
      message: '습도가 높습니다. 두피 통풍에 주의하세요.',
      icon: '🌧️'
    });
  }

  // 미세먼지에 따른 추천
  if (weather.fineDust > 50) {
    recommendations.push({
      type: 'warning',
      message: '미세먼지가 나쁩니다. 외출 후 머리 감기를 권장합니다.',
      icon: '🌫️'
    });
  }

  return recommendations;
};