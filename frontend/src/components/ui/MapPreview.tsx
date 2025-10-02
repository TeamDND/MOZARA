import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// @ts-ignore - leaflet 타입 문제 우회
import L from 'leaflet';

// Leaflet 기본 마커 아이콘 수정 (React에서 경로 문제 해결)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Hospital {
  id: string;
  name: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  distance?: number;
  [key: string]: any;
}

interface MapPreviewProps {
  latitude: number;
  longitude: number;
  title?: string;
  className?: string;
  zoom?: number;
  hospitals?: Hospital[];
  userLocation?: { latitude: number; longitude: number };
  onNavigate?: (hospital: Hospital) => void;
}

// 지도 경계를 맞추는 컴포넌트
function FitBounds({ hospitals }: { hospitals: Hospital[] }) {
  const map = useMap();
  
  useMemo(() => {
    if (hospitals && hospitals.length > 0) {
      const validHospitals = hospitals.filter(h => h.latitude !== undefined && h.longitude !== undefined);
      if (validHospitals.length > 0) {
        // @ts-ignore
        const bounds = L.latLngBounds(
          validHospitals.map(h => [h.latitude!, h.longitude!])
        );
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [hospitals, map]);
  
  return null;
}

const MapPreview: React.FC<MapPreviewProps> = ({ 
  latitude, 
  longitude, 
  title, 
  className, 
  zoom = 16, 
  hospitals,
  userLocation,
  onNavigate
}) => {
  const validHospitals = hospitals?.filter(h => h.latitude !== undefined && h.longitude !== undefined) || [];
  
  // 중심 좌표 계산
  const center: [number, number] = useMemo(() => {
    if (validHospitals.length > 0) {
      const avgLat = validHospitals.reduce((sum, h) => sum + h.latitude!, 0) / validHospitals.length;
      const avgLon = validHospitals.reduce((sum, h) => sum + h.longitude!, 0) / validHospitals.length;
      return [avgLat, avgLon];
    }
    return [latitude, longitude];
  }, [latitude, longitude, validHospitals]);

  // 길찾기 URL 생성 함수들
  const getKakaoDirectionUrl = (hospital: Hospital) => {
    if (!userLocation || !hospital.latitude || !hospital.longitude) return '#';
    // 카카오맵 길찾기 (출발지와 도착지 모두 지정)
    const fromParam = `${userLocation.latitude},${userLocation.longitude}`;
    const toParam = `${encodeURIComponent(hospital.name)},${hospital.latitude},${hospital.longitude}`;
    return `https://map.kakao.com/link/to/${toParam}`;
  };

  const getNaverDirectionUrl = (hospital: Hospital) => {
    if (!userLocation || !hospital.latitude || !hospital.longitude) return '#';
    // 네이버맵 길찾기
    return `https://map.naver.com/v5/directions/-/-/-/car?c=${hospital.longitude},${hospital.latitude},15,0,0,0,dh`;
  };

  const getGoogleDirectionUrl = (hospital: Hospital) => {
    if (!userLocation || !hospital.latitude || !hospital.longitude) return '#';
    // 구글맵 길찾기
    return `https://www.google.com/maps/dir/?api=1&origin=${userLocation.latitude},${userLocation.longitude}&destination=${hospital.latitude},${hospital.longitude}`;
  };

  return (
    <div className={`overflow-hidden shadow-inner ${className || ''}`} style={{ zIndex: 1 }}> 
      <div className="w-full h-full relative" style={{ zIndex: 1 }}>
        {/* @ts-ignore */}
        <MapContainer
          center={center}
          zoom={zoom}
          scrollWheelZoom={true}
          style={{ height: '100%', width: '100%', zIndex: 1 }}
        >
          {/* @ts-ignore */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {validHospitals.length > 0 ? (
            <>
              <FitBounds hospitals={validHospitals} />
              
              {/* 현재 위치 마커 (userLocation이 있을 때) */}
              {userLocation && (
                <Marker
                  position={[userLocation.latitude, userLocation.longitude]}
                  // @ts-ignore
                  icon={L.icon({
                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                  })}
                >
                  <Popup>
                    <div className="text-sm font-bold text-red-600">
                      📍 내 위치
                    </div>
                  </Popup>
                </Marker>
              )}
              
              {/* 병원/매장 마커들 */}
              {validHospitals.map((hospital, index) => (
                <Marker
                  key={hospital.id}
                  position={[hospital.latitude!, hospital.longitude!]}
                >
                  <Popup>
                    <div className="text-sm min-w-[200px]">
                      <div className="font-bold text-gray-900 mb-2">
                        {index + 1}. {hospital.name}
                      </div>
                      {hospital.address && (
                        <div className="text-xs text-gray-600 mb-1">{hospital.address}</div>
                      )}
                      {hospital.distance !== undefined && (
                        <div className="text-xs text-blue-600 mb-3">
                          📍 {(hospital.distance / 1000).toFixed(1)}km
                        </div>
                      )}
                      {/* 길찾기 버튼들 */}
                      <div className="space-y-2 mt-3 pt-2 border-t border-gray-200">
                        <div className="text-xs font-semibold text-gray-700 mb-1">🧭 길찾기</div>
                        <div className="grid grid-cols-2 gap-2">
                          <a
                            href={getKakaoDirectionUrl(hospital)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-yellow-400 hover:bg-yellow-500 text-gray-900 text-xs font-medium py-2 px-2 rounded-lg text-center transition-colors"
                          >
                            카카오
                          </a>
                          <a
                            href={getNaverDirectionUrl(hospital)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-green-500 hover:bg-green-600 text-white text-xs font-medium py-2 px-2 rounded-lg text-center transition-colors"
                          >
                            네이버
                          </a>
                        </div>
                        {hospital.phone && hospital.phone !== '전화번호 없음' && (
                          <a
                            href={`tel:${hospital.phone}`}
                            className="block w-full bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium py-2 px-3 rounded-lg text-center transition-colors"
                          >
                            📞 전화하기
                          </a>
                        )}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </>
          ) : (
            <Marker position={center}>
              <Popup>
                <div className="text-sm font-medium">{title || '현재 위치'}</div>
              </Popup>
            </Marker>
          )}
        </MapContainer>
      </div>
    </div>
  );
};

export default MapPreview;