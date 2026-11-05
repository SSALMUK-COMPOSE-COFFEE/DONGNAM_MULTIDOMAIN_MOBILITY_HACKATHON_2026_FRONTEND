'use client';

import { isAxiosError } from 'axios';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { saasErrorReason } from '@/apis/saas/errors';
import {
  useAcceptRefillOffer,
  useDeclineRefillOffer,
  useRefillOffers,
} from '@/apis/saas/quantity-reservations';
import { useShipperCatalog, useShipperLots } from '@/apis/saas/shipper';
import { lotLabel } from '@/app/(saas)/app/shipper/_components/lot-label';
import {
  CardSkeleton,
  EmptyState,
  QueryError,
} from '@/app/(saas)/app/shipper/_components/query-state';
import { RefillOfferCard } from '@/app/(saas)/app/shipper/_components/refill-offer-card';
import { ShipperPageHeader } from '@/app/(saas)/app/shipper/_components/shipper-page-header';
import { SHIPPER_PATHS } from '@/app/(saas)/app/shipper/_components/shipper-paths';
import { remainingMilliseconds, remainingTimeText, useServerNow } from '@/hooks/useServerNow';
import type { RefillOfferT } from '@/types/saas-quantity';
import { formatKstMonthDayTime } from '@/utils/kst';

const STATUS: Record<RefillOfferT['status'], string> = {
  pending: '응답 대기',
  pending_execution: '포워더 적용 대기',
  committed: '충원 반영됨',
  rejected: '거절함',
  expired: '제안 만료',
  failed: '적용하지 못함',
};

export function RefillOffersView() {
  const offers = useRefillOffers();
  const catalog = useShipperCatalog();
  const lots = useShipperLots();
  const [history, setHistory] = useState(false);
  const visible = (offers.data ?? []).filter(
    offer => history || offer.status === 'pending' || offer.status === 'pending_execution'
  );

  return (
    <>
      <ShipperPageHeader
        eyebrow="알림"
        title="빈자리 제안"
        sub="등록한 출하가 들어갈 수 있는 공간을 확인하고 수량을 선택하세요."
      >
        <Link href={SHIPPER_PATHS.LOTS} className="m2-btn m2-btn-sec">
          내 출하
        </Link>
      </ShipperPageHeader>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="m2-sub mt-0">
          수락은 충원 요청입니다. 기존 실행 승인 절차를 거쳐야 실제 배정에 반영됩니다.
        </p>
        <button
          type="button"
          className="m2-btn m2-btn-sec m2-btn-sm"
          aria-pressed={history}
          onClick={() => setHistory(value => !value)}
        >
          {history ? '진행 중만 보기' : '지난 제안 포함'}
        </button>
      </div>
      {offers.isPending && <CardSkeleton height={180} />}
      {offers.isError && (
        <QueryError
          message="빈자리 제안을 불러오지 못했습니다."
          isRetrying={offers.isFetching}
          onRetry={() => offers.refetch()}
        />
      )}
      {offers.isSuccess && visible.length === 0 && (
        <EmptyState
          title="진행 중인 빈자리 제안이 없습니다"
          description="조건에 맞는 공간이 생기면 이 화면에서 알려드립니다."
        />
      )}
      <div className="grid items-start gap-4 min-[1200px]:grid-cols-2">
        {visible.map(offer => {
          const voyage = catalog.data?.voyages.find(item => item.id === offer.voyage_id);
          const lot = lots.data?.find(item => item.id === offer.lot_id);
          const destination =
            catalog.data?.ports.find(item => item.id === offer.destination)?.name ??
            offer.destination ??
            '목적지 확인 중';
          return (
            <OfferResponse
              key={offer.offer_id}
              offer={offer}
              receivedAt={offers.dataUpdatedAt}
              title={`${voyage?.vessel_name ?? offer.voyage_id} · ${lot ? lotLabel(lot, catalog.data ?? null) : offer.lot_id}`}
              destination={destination}
              onRefresh={() => {
                void offers.refetch();
              }}
            />
          );
        })}
      </div>
    </>
  );
}

function OfferResponse({
  offer,
  receivedAt,
  title,
  destination,
  onRefresh,
}: {
  offer: RefillOfferT;
  receivedAt: number;
  title: string;
  destination: string;
  onRefresh: () => void;
}) {
  const now = useServerNow(offer.server_now, receivedAt);
  const remaining = remainingMilliseconds(offer.expires_at, now);
  const actionable = offer.status === 'pending' && remaining !== null && remaining > 0;
  const [quantity, setQuantity] = useState(String(offer.offered_quantity));
  const [requestError, setRequestError] = useState<string | null>(null);
  const accept = useAcceptRefillOffer(offer.offer_id);
  const decline = useDeclineRefillOffer(offer.offer_id);
  const acceptKey = useRef<{ quantity: number; key: string } | null>(null);
  const declineKey = useRef<string | null>(null);
  const count = /^\d+$/.test(quantity.trim()) ? Number(quantity) : Number.NaN;
  const valid = Number.isSafeInteger(count) && count > 0 && count <= offer.offered_quantity;
  const fieldError = valid
    ? null
    : `1부터 제안 수량(${offer.offered_quantity})까지 정수로 입력하세요.`;
  const pending = accept.isPending || decline.isPending;
  let statusText: string | null = null;
  if (offer.status !== 'pending') statusText = STATUS[offer.status];
  else if (remaining === 0) statusText = '제안 만료';
  const onError = (error: unknown) => {
    setRequestError(saasErrorReason(error) ?? '제안에 응답하지 못했습니다. 다시 확인하세요.');
    if (isAxiosError(error) && error.response?.status === 409) onRefresh();
  };

  return (
    <RefillOfferCard
      title={title}
      destination={destination}
      capacityText={`${offer.offered_quantity}파렛트 제안 · 출항 ${formatKstMonthDayTime(offer.departure_at)} KST`}
      pickupText={
        offer.pickup_at
          ? `${formatKstMonthDayTime(offer.pickup_at)} KST${offer.route_description ? ` · ${offer.route_description}` : ''}`
          : '일정 확인 중'
      }
      remainingText={`응답 ${remainingTimeText(offer.expires_at, now)}`}
      statusText={statusText}
      quantity={quantity}
      onQuantityChange={value => {
        if (pending) return;
        setQuantity(value);
        setRequestError(null);
      }}
      fieldError={fieldError}
      requestError={requestError ?? offer.reason}
      actionable={actionable}
      pending={pending}
      canAccept={valid}
      onAccept={() => {
        if (!actionable || !valid || pending) return;
        if (!acceptKey.current || acceptKey.current.quantity !== count)
          acceptKey.current = { quantity: count, key: crypto.randomUUID() };
        setRequestError(null);
        accept.mutate(
          { quantity: count, idempotency_key: acceptKey.current.key },
          {
            onSuccess: result => {
              toast.success(
                result.status === 'committed'
                  ? '충원 결과가 배정에 반영되었습니다.'
                  : '충원 요청을 보냈습니다. 실행 승인 후 반영됩니다.'
              );
              onRefresh();
            },
            onError,
          }
        );
      }}
      onDecline={() => {
        if (!actionable || pending) return;
        declineKey.current ??= crypto.randomUUID();
        setRequestError(null);
        decline.mutate(
          { idempotency_key: declineKey.current },
          {
            onSuccess: () => {
              toast.success('빈자리 제안을 거절했습니다.');
              onRefresh();
            },
            onError,
          }
        );
      }}
    />
  );
}
