'use client';

import { useEffect, useRef, useState } from 'react';
import { MapMarker } from 'react-kakao-maps-sdk';

import KakaoMap from '@/components/kakao-map';

export type CoordinateT = { lat: number; lon: number };

const DEFAULT_CENTER = { lat: 35.3, lng: 128.3 };
const COORD_DIGITS = 6;

const rounded = (value: number) => Number(value.toFixed(COORD_DIGITS));

type PackhouseMapPropsT = {
  value: CoordinateT | null;
  onPick?: (value: CoordinateT) => void;
  focusTarget?: CoordinateT | null;
  markerLabel?: string;
  className?: string;
};

export default function PackhouseMap({
  value,
  onPick,
  focusTarget,
  markerLabel,
  className = 'h-[320px] w-full rounded-[12px] min-[1100px]:h-[520px]',
}: PackhouseMapPropsT) {
  const [map, setMap] = useState<kakao.maps.Map | null>(null);
  const [initialLevel] = useState(() => (value ? 6 : 10));
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!map || !focusTarget) return;
    map.relayout();
    map.setLevel(6);
    map.panTo(new kakao.maps.LatLng(focusTarget.lat, focusTarget.lon));
  }, [map, focusTarget]);
  useEffect(() => {
    if (!map || !containerRef.current) return;
    const observer = new ResizeObserver(() => {
      map.relayout();
      if (focusTarget) map.setCenter(new kakao.maps.LatLng(focusTarget.lat, focusTarget.lon));
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [map, focusTarget]);
  const center = value ? { lat: value.lat, lng: value.lon } : DEFAULT_CENTER;
  const selectionLevel = value ? 6 : 10;

  return (
    <div ref={containerRef} className="min-w-0">
      <KakaoMap
        center={center}
        isPanto={!!onPick}
        onCreate={setMap}
        level={onPick ? initialLevel : selectionLevel}
        className={className}
        onClick={(_map, event) =>
          onPick?.({ lat: rounded(event.latLng.getLat()), lon: rounded(event.latLng.getLng()) })
        }
      >
        {value && <MapMarker position={center} title={markerLabel ?? '선택한 출하 장소 위치'} />}
      </KakaoMap>
    </div>
  );
}
