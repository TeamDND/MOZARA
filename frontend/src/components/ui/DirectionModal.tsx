import React, { useMemo } from 'react';
import MapPreview from './MapPreview';

interface DirectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  userLocation?: { latitude: number; longitude: number };
}

const portalStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const DirectionModal: React.FC<DirectionModalProps> = ({ isOpen, onClose, name, address, latitude, longitude, userLocation }) => {
  // 길찾기 URL 생성
  const naverDirectionUrl = useMemo(() => {
    if (!userLocation || !latitude || !longitude) {
      const q = encodeURIComponent(address || name);
      return `https://map.naver.com/v5/search/${q}`;
    }
    return `https://map.naver.com/v5/directions/-/-/-/car?c=${longitude},${latitude},15,0,0,0,dh`;
  }, [name, address, latitude, longitude, userLocation]);

  const kakaoDirectionUrl = useMemo(() => {
    if (!userLocation || !latitude || !longitude) {
      const q = latitude && longitude ? `${latitude},${longitude}` : encodeURIComponent(address || name);
      return `https://map.kakao.com/?q=${q}`;
    }
    return `https://map.kakao.com/link/to/${encodeURIComponent(name)},${latitude},${longitude}`;
  }, [name, address, latitude, longitude, userLocation]);

  const googleDirectionUrl = useMemo(() => {
    if (!userLocation || !latitude || !longitude) {
      if (latitude && longitude) return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
      const q = encodeURIComponent(address || name);
      return `https://www.google.com/maps/search/?api=1&query=${q}`;
    }
    return `https://www.google.com/maps/dir/?api=1&origin=${userLocation.latitude},${userLocation.longitude}&destination=${latitude},${longitude}`;
  }, [name, address, latitude, longitude, userLocation]);

  if (!isOpen) return null;

  // 단일 병원 객체 생성 (지도에 표시)
  const targetHospital = latitude && longitude ? [{
    id: 'target',
    name: name,
    latitude: latitude,
    longitude: longitude,
    address: address,
  }] : [];

  return (
    <div style={portalStyle} onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
          <h3 className="text-lg font-semibold text-gray-900">지도보기 - {name}</h3>
          <button className="text-gray-500 hover:text-gray-700" onClick={onClose}>✕</button>
        </div>
        <div className="p-4">
          <div className="mb-3 text-sm text-gray-600">{address || '주소 정보 없음'}</div>
          <div className="grid grid-cols-1 gap-4">
            <MapPreview
              latitude={latitude || 37.5665}
              longitude={longitude || 126.9780}
              title={name}
              hospitals={targetHospital}
              userLocation={userLocation}
              zoom={15}
              className="h-[400px]"
            />
          </div>
          <div className="mt-4 space-y-2">
            <div className="text-sm font-semibold text-gray-700 mb-2">🧭 길찾기 앱으로 열기</div>
            <div className="flex flex-wrap gap-2">
              <a className="flex-1 min-w-[140px] px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium text-center transition-colors" href={naverDirectionUrl} target="_blank" rel="noreferrer">
                네이버 지도 열기
              </a>
              <a className="flex-1 min-w-[140px] px-4 py-3 bg-yellow-500 text-gray-900 rounded-lg hover:bg-yellow-600 text-sm font-medium text-center transition-colors" href={kakaoDirectionUrl} target="_blank" rel="noreferrer">
                카카오 지도 열기
              </a>
              <a className="flex-1 min-w-[140px] px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium text-center transition-colors" href={googleDirectionUrl} target="_blank" rel="noreferrer">
                구글 지도 열기
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DirectionModal;


