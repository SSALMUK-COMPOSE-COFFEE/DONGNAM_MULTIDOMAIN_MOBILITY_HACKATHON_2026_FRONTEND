'use client';

import { useEffect, useMemo } from 'react';
import { Polyline, useMap } from 'react-kakao-maps-sdk';

import KakaoMap from '@/components/kakao-map';
import { SectionErrorBoundary } from '@/components/section-error-boundary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ScenarioT, SchemaT } from '@/types/api';

type PickupMapPropsT = {
  scenario: ScenarioT;
  voyagePickups: SchemaT<'VoyagePickup'>[];
};

/** 화물 그룹별 경로 색. SO2 처리 포도는 딸기와 따로 싣는다 */
const ROUTE_COLOR: Record<string, string> = {
  grape_so2: '#6b55d9',
};
const DEFAULT_ROUTE_COLOR = '#1a7bff';
/** 가장자리 출하 장소 이름표가 잘리지 않도록 둔 여백 (px) */
const BOUNDS_PADDING = 48;

export function PickupMap({ scenario, voyagePickups }: PickupMapPropsT) {
  const port = scenario.ports[0];
  const findPackhouse = (packhouseId: string) =>
    scenario.packhouses.find(({ id }) => id === packhouseId);

  const truckRoutes = voyagePickups.flatMap(({ pickup }) => pickup.routes);
  const places = useMemo(() => {
    const stopIds = new Set(
      voyagePickups.flatMap(({ pickup }) =>
        pickup.routes.flatMap(({ stops }) => stops.map(({ packhouse_id }) => packhouse_id))
      )
    );

    return [...scenario.packhouses.filter(({ id }) => stopIds.has(id)), port];
  }, [voyagePickups, scenario.packhouses, port]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          출하 장소 집하 경로
          <span className="ml-2 text-base font-medium text-muted-foreground">
            트럭{' '}
            <span className="num">{new Set(truckRoutes.map(({ truck_id }) => truck_id)).size}</span>
            대
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <SectionErrorBoundary message="지도를 그리지 못했습니다." className="h-105">
          <KakaoMap
            center={{ lat: 35.7, lng: 128.6 }}
            level={11}
            className="h-105 w-full rounded-xl"
          >
            <FitToPlaces places={places} />
            {truckRoutes.map(route => {
              const path = route.stops.flatMap(({ packhouse_id }) => {
                const packhouse = findPackhouse(packhouse_id);
                return packhouse ? [{ lat: packhouse.lat, lng: packhouse.lon }] : [];
              });

              return (
                <Polyline
                  key={`${route.truck_id}-${route.trip}`}
                  path={[...path, { lat: port.lat, lng: port.lon }]}
                  strokeWeight={4}
                  strokeColor={ROUTE_COLOR[route.cargo_group ?? ''] ?? DEFAULT_ROUTE_COLOR}
                  strokeOpacity={0.85}
                />
              );
            })}

            <PlaceLabels places={places} />
          </KakaoMap>
        </SectionErrorBoundary>
      </CardContent>
    </Card>
  );
}

type PlaceT = { id: string; name: string; lat: number; lon: number };

/**
 * 고정 중심·확대 수준으로는 상주·포항이 지도 밖으로 나가므로 경로에 든 출하 장소과 항구가 들어오게 맞춘다.
 * Map 이 center·level prop 을 레이아웃 effect 에서 다시 적용하므로, 그 뒤(일반 effect)에 맞춰야 덮이지 않는다
 */
function FitToPlaces({ places }: { places: PlaceT[] }) {
  const map = useMap();

  useEffect(() => {
    const bounds = new kakao.maps.LatLngBounds();
    places.forEach(({ lat, lon }) => bounds.extend(new kakao.maps.LatLng(lat, lon)));
    map.setBounds(bounds, BOUNDS_PADDING, BOUNDS_PADDING, BOUNDS_PADDING, BOUNDS_PADDING);
  }, [map, places]);

  return null;
}

/**
 * 출하 장소·항구 이름표.
 * CustomOverlayMap 은 카카오가 관리하는 DOM 안에 React portal 로 그리는데, 숨겨진 화면(Activity)에서
 * 계획이 바뀌어 다시 그리면 카카오가 바꿔 둔 DOM 에 끼워 넣다가 insertBefore 오류로 화면 전체가 깨졌다.
 * 그래서 React 를 거치지 않고 카카오 API 로 직접 만들고 지운다
 */
function PlaceLabels({ places }: { places: PlaceT[] }) {
  const map = useMap();

  useEffect(() => {
    const overlays = places.map(({ name, lat, lon }) => {
      const label = document.createElement('span');
      label.className = 'rounded-md border bg-card px-2 py-0.5 text-xs font-bold shadow-sm';
      label.textContent = name;

      return new kakao.maps.CustomOverlay({
        map,
        position: new kakao.maps.LatLng(lat, lon),
        content: label,
        yAnchor: 1.4,
      });
    });

    return () => overlays.forEach(overlay => overlay.setMap(null));
  }, [map, places]);

  return null;
}
