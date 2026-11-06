'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { useReservationState } from '@/apis/saas/quantity-reservations';
import { useShipperCatalog, useShipperLots } from '@/apis/saas/shipper';
import { lotLabel } from '@/app/(saas)/app/shipper/_components/lot-label';
import { ReservationQuantityCard } from '@/app/(saas)/app/shipper/_components/quantity-reservation-section';
import { CardSkeleton, QueryError } from '@/app/(saas)/app/shipper/_components/query-state';
import { ShipperPageHeader } from '@/app/(saas)/app/shipper/_components/shipper-page-header';
import { SHIPPER_PATHS } from '@/app/(saas)/app/shipper/_components/shipper-paths';

export function QuantityDetailView() {
  const search = useSearchParams();
  const returnTo = search.get('returnTo') ?? '';
  const listHref =
    returnTo === SHIPPER_PATHS.LOTS || returnTo.startsWith(`${SHIPPER_PATHS.LOTS}?`)
      ? returnTo
      : SHIPPER_PATHS.LOT_LIST();
  const planId = search.get('plan_id') ?? '';
  const lotId = search.get('lot_id') ?? '';
  const state = useReservationState(planId, lotId);
  const lots = useShipperLots();
  const catalog = useShipperCatalog();
  const lot = lots.data?.find(item => item.id === lotId);

  return (
    <>
      <ShipperPageHeader
        eyebrow="내 출하"
        title="출하 예약 상세"
        sub={lot ? lotLabel(lot, catalog.data ?? null) : ''}
      >
        <Link href={listHref} className="m2-btn m2-btn-sec">
          출하 목록
        </Link>
      </ShipperPageHeader>
      {(!planId || !lotId) && (
        <p role="alert" className="m2-note">
          운송계획과 출하를 선택해 주세요.
        </p>
      )}
      {planId && lotId && state.isPending && <CardSkeleton height={180} />}
      {state.isError && (
        <QueryError
          message="이 출하의 수량 예약을 확인하지 못했습니다. 정책이 설정된 운송계획에서 다시 확인하세요."
          isRetrying={state.isFetching}
          onRetry={() => state.refetch()}
        />
      )}
      {state.data && (
        <ReservationQuantityCard
          state={state.data}
          receivedAt={state.dataUpdatedAt}
          label={lot ? lotLabel(lot, catalog.data ?? null) : lotId}
          onRefresh={() => {
            void state.refetch();
          }}
        />
      )}
    </>
  );
}
