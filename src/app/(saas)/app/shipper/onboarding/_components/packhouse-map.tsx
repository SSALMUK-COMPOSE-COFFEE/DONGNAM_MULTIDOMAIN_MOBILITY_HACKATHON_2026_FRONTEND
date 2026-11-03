'use client';

import { MapMarker } from 'react-kakao-maps-sdk';

import KakaoMap from '@/components/kakao-map';

export type CoordinateT = { lat: number; lon: number };

const DEFAULT_CENTER = { lat: 35.3, lng: 128.3 };
const COORD_DIGITS = 6;

const rounded = (value: number) => Number(value.toFixed(COORD_DIGITS));

type PackhouseMapPropsT = {
  value: CoordinateT | null;
  onPick: (value: CoordinateT) => void;
};

export default function PackhouseMap({ value, onPick }: PackhouseMapPropsT) {
  const center = value ? { lat: value.lat, lng: value.lon } : DEFAULT_CENTER;

  return (
    <KakaoMap
      center={center}
      level={value ? 6 : 10}
      className="h-[260px] w-full rounded-[12px] max-[767.98px]:h-[220px]"
      onClick={(_map, event) =>
        onPick({ lat: rounded(event.latLng.getLat()), lon: rounded(event.latLng.getLng()) })
      }
    >
      {value && <MapMarker position={center} />}
    </KakaoMap>
  );
}
