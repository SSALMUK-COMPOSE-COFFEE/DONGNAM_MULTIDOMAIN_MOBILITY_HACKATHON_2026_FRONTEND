'use client';

import dynamic from 'next/dynamic';

import type { ShipperCatalogT } from '@/types/saas-shipper';

const PackhouseMap = dynamic(
  () => import('@/app/(saas)/app/shipper/onboarding/_components/packhouse-map'),
  {
    ssr: false,
    loading: () => (
      <div
        className="grid h-[220px] place-items-center rounded-xl bg-m2-brand-soft text-sm text-m2-muted min-[900px]:h-[320px]"
        role="status"
      >
        지도를 불러오는 중
      </div>
    ),
  }
);

type ShipperPickupMapPropsT = {
  place: ShipperCatalogT['packhouses'][number] | null;
};

export function ShipperPickupMap({ place }: ShipperPickupMapPropsT) {
  const hasLocation =
    place &&
    Number.isFinite(place.lat) &&
    Number.isFinite(place.lon) &&
    Math.abs(place.lat) <= 90 &&
    Math.abs(place.lon) <= 180;

  return (
    <section
      className="min-w-0 self-start rounded-xl border border-m2-line bg-white p-3"
      aria-label="출하 장소 위치 확인"
    >
      <h3 className="text-sm font-bold">출하 장소 지도</h3>
      {place ? (
        <div className="mt-2 mb-3" aria-live="polite">
          <p className="text-sm font-semibold break-words">{place.name}</p>
          {place.region && <p className="m2-sub mt-1 break-words">{place.region}</p>}
        </div>
      ) : (
        <p className="m2-sub mt-2 mb-3">출하 장소를 선택하면 집하 위치를 보여드립니다.</p>
      )}
      {hasLocation ? (
        <PackhouseMap
          value={place}
          focusTarget={place}
          markerLabel={place.name}
          className="h-[220px] w-full rounded-xl min-[900px]:h-[320px]"
        />
      ) : (
        <p
          role="status"
          className="grid min-h-[120px] place-items-center rounded-xl bg-m2-brand-soft px-4 text-center text-sm text-m2-muted"
        >
          {place ? '등록된 위치 정보가 없습니다.' : '선택한 출하 장소가 없습니다.'}
        </p>
      )}
    </section>
  );
}
