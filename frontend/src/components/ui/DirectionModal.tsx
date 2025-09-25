import React, { useMemo } from 'react';
import MapPreview from './MapPreview';

interface DirectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
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

const DirectionModal: React.FC<DirectionModalProps> = ({ isOpen, onClose, name, address, latitude, longitude }) => {
  const naverUrl = useMemo(() => {
    const q = encodeURIComponent(address || name);
    return `https://map.naver.com/v5/search/${q}`;
  }, [name, address]);

  const kakaoUrl = useMemo(() => {
    const q = latitude && longitude
      ? `${latitude},${longitude}`
      : encodeURIComponent(address || name);
    return `https://map.kakao.com/?q=${q}`;
  }, [name, address, latitude, longitude]);

  const googleUrl = useMemo(() => {
    if (latitude && longitude) return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    const q = encodeURIComponent(address || name);
    return `https://www.google.com/maps/search/?api=1&query=${q}`;
  }, [name, address, latitude, longitude]);

  if (!isOpen) return null;

  return (
    <div style={portalStyle} onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">지도보기 - {name}</h3>
          <button className="text-gray-500 hover:text-gray-700" onClick={onClose}>닫기</button>
        </div>
        <div className="p-4">
          <div className="mb-3 text-sm text-gray-600">{address || '주소 정보 없음'}</div>
          <div className="grid grid-cols-1 gap-4">
            <MapPreview
              latitude={latitude || 37.5665}
              longitude={longitude || 126.9780}
              title={name}
              zoom={16}
            />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <a className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm" href={naverUrl} target="_blank" rel="noreferrer">네이버 지도 열기</a>
            <a className="px-3 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 text-sm" href={kakaoUrl} target="_blank" rel="noreferrer">카카오 지도 열기</a>
            <a className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm" href={googleUrl} target="_blank" rel="noreferrer">구글 지도 열기</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DirectionModal;


