'use client';

import { useQuery } from '@tanstack/react-query';
import { MapMarker, Polyline } from 'react-kakao-maps-sdk';

import { planQueryOptions } from '@/apis/getPlan';
import KakaoMap from '@/components/kakao-map';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import type { ContainerT } from '@/types/plan';

const DEMO_PLAN_ID = 'demo-plan';

/** 선과장 집하 순서 (예시 좌표) */
const PICKUP_ROUTE = [
  { name: '산청 선과장', lat: 35.4156, lng: 127.8734 },
  { name: '진주 선과장', lat: 35.18, lng: 128.1076 },
  { name: '밀양 선과장', lat: 35.5038, lng: 128.7467 },
  { name: '부산신항', lat: 35.0746, lng: 128.8183 },
];

export function PlanView() {
  const { data: plan, isPending, isError } = useQuery(planQueryOptions(DEMO_PLAN_ID));

  if (isError) return <p className="text-destructive">운송계획을 불러오지 못했습니다.</p>;

  return (
    <div className="grid grid-cols-[1fr_1fr] gap-6">
      <section className="flex flex-col gap-4">
        {isPending ? (
          <>
            <Skeleton className="h-36" />
            <Skeleton className="h-36" />
          </>
        ) : (
          plan.containers.map(container => (
            <ContainerCard key={container.id} container={container} />
          ))
        )}
      </section>

      <Card>
        <CardHeader>
          <CardTitle>선과장 집하 경로 · 트럭 T1</CardTitle>
          <CardDescription>예시 좌표</CardDescription>
        </CardHeader>
        <CardContent>
          <KakaoMap center={{ lat: 35.3, lng: 128.3 }} level={10} className="h-[420px] w-full">
            {PICKUP_ROUTE.map(({ name, lat, lng }) => (
              <MapMarker key={name} position={{ lat, lng }} title={name} />
            ))}
            <Polyline
              path={PICKUP_ROUTE.map(({ lat, lng }) => ({ lat, lng }))}
              strokeWeight={4}
              strokeColor="#0b6a7a"
              strokeOpacity={0.9}
            />
          </KakaoMap>
        </CardContent>
      </Card>
    </div>
  );
}

function ContainerCard({ container }: { container: ContainerT }) {
  const loaded = container.allocations.reduce((sum, { pallets }) => sum + pallets, 0);
  const loadRate = Math.round((loaded / container.capacityPallets) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {container.id} · {container.destination}행
          <Badge variant="secondary">{container.item === 'strawberry' ? '딸기' : '포도'}</Badge>
        </CardTitle>
        <CardDescription className="num">
          {loaded} / {container.capacityPallets} 파렛트 · {loadRate}%
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Progress value={loadRate} />
        <div className="flex gap-2">
          {container.allocations.map(({ shipperId, shipperName, pallets }) => (
            <Badge key={shipperId} variant="outline">
              {shipperName} <span className="num">{pallets}</span>
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
