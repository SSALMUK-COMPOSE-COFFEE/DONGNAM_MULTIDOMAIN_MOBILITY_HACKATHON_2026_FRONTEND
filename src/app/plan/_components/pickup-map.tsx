'use client';

import { CustomOverlayMap, Polyline } from 'react-kakao-maps-sdk';

import KakaoMap from '@/components/kakao-map';
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

export function PickupMap({ scenario, voyagePickups }: PickupMapPropsT) {
  const port = scenario.ports[0];
  const findPackhouse = (packhouseId: string) =>
    scenario.packhouses.find(({ id }) => id === packhouseId);

  const truckRoutes = voyagePickups.flatMap(({ pickup }) => pickup.routes);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          선과장 집하 경로
          <span className="ml-2 text-base font-medium text-muted-foreground">
            트럭{' '}
            <span className="num">{new Set(truckRoutes.map(({ truck_id }) => truck_id)).size}</span>
            대
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <KakaoMap center={{ lat: 35.5, lng: 128.5 }} level={11} className="h-105 w-full rounded-xl">
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

          {[...scenario.packhouses, port].map(({ id, name, lat, lon }) => (
            <CustomOverlayMap key={id} position={{ lat, lng: lon }} yAnchor={1.4}>
              <span className="rounded-md border bg-card px-2 py-0.5 text-xs font-bold shadow-sm">
                {name}
              </span>
            </CustomOverlayMap>
          ))}
        </KakaoMap>
      </CardContent>
    </Card>
  );
}
