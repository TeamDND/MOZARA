import React, { useMemo } from 'react';

interface MapPreviewProps {
  latitude: number;
  longitude: number;
  title?: string;
  className?: string;
  zoom?: number;
}

function buildOsmEmbedUrl(lat: number, lon: number, zoom: number = 16): string {
  // OSM embed: bbox is required even for a single marker. We build a small bbox around the point.
  const delta = 0.01; // ~1km bounding box
  const left = lon - delta;
  const bottom = lat - delta;
  const right = lon + delta;
  const top = lat + delta;
  const bbox = `${left},${bottom},${right},${top}`;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(
    bbox
  )}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lon}`)}&zoom=${zoom}`;
}

const MapPreview: React.FC<MapPreviewProps> = ({ latitude, longitude, title, className, zoom = 16 }) => {
  const src = useMemo(() => buildOsmEmbedUrl(latitude, longitude, zoom), [latitude, longitude, zoom]);

  return (
    <div className={`rounded-lg overflow-hidden border border-gray-200 bg-white ${className || ''}`}> 
      <div className="w-full h-40">
        <iframe
          title={title || 'map-preview'}
          src={src}
          className="w-full h-full"
          style={{ border: 0 }}
          loading="lazy"
        />
      </div>
      {title && (
        <div className="px-3 py-2 text-sm text-gray-700 border-t bg-gray-50 truncate">{title}</div>
      )}
    </div>
  );
};

export default MapPreview;


