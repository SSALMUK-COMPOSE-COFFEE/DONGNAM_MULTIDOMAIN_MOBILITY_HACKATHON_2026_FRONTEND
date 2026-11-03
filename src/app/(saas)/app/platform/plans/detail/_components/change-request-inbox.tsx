'use client';

import { useState } from 'react';

import {
  usePlatformChangeRequests,
  useRejectChangeRequest,
} from '@/apis/saas/platform-change-requests';
import { EmptyState } from '@/app/(saas)/app/platform/_components/empty-state';
import {
  kstDayTime,
  productOf,
  productShortName,
  won,
} from '@/app/(saas)/app/platform/_components/m2-format';
import { QueryError } from '@/app/(saas)/app/platform/_components/query-error';
import { Skeleton } from '@/components/ui/skeleton';
import type { SaasPlanSessionT } from '@/types/api-saas';
import type { PlatformChangeRequestT } from '@/types/saas-platform';

const TYPE_LABEL: Record<PlatformChangeRequestT['type'], string> = {
  reduce: '감축',
  cancel: '취소',
  air_switch: '항공 전환',
};

export const openRequestParams = (planId: string) => ({ plan_id: planId, status: 'open' as const });

type ChangeRequestInboxPropsT = {
  session: SaasPlanSessionT;
  pendingRequestId: string | null;
  activeRequestId: string | null;
  isBusy: boolean;
  onReplan: (request: PlatformChangeRequestT) => void;
  onRejected: (requestId: string) => void;
};

export function ChangeRequestInbox({
  session,
  pendingRequestId,
  activeRequestId,
  isBusy,
  onReplan,
  onRejected,
}: ChangeRequestInboxPropsT) {
  const { scenario } = session;
  const query = usePlatformChangeRequests(openRequestParams(session.plan_id));
  const reject = useRejectChangeRequest();
  const [rejecting, setRejecting] = useState<{ requestId: string; note: string } | null>(null);

  if (query.isPending) return <Skeleton className="h-32 w-full rounded-[14px]" />;
  if (query.isError) {
    return (
      <QueryError
        error={query.error}
        subject="화주 변경 요청을"
        onRetry={() => query.refetch()}
        isRetrying={query.isFetching}
      />
    );
  }
  if (query.data.length === 0) {
    return (
      <EmptyState
        compact
        title="받은 변경 요청이 없습니다"
        description="화주가 물량 줄이기·취소·항공 전환을 요청하면 여기에 쌓입니다."
      />
    );
  }

  const lotText = (request: PlatformChangeRequestT) => {
    const lot = scenario.lots.find(({ id }) => id === request.lot_id);
    if (!lot) return request.lot_id;
    const product = productShortName(productOf(scenario, lot.product_id), lot.product_id);
    if (request.type === 'reduce' && request.new_pallets !== null) {
      return `${product} ${lot.pallets} → ${request.new_pallets}파렛트`;
    }

    return `${product} ${lot.pallets}파렛트`;
  };

  const submitReject = () => {
    if (!rejecting) return;
    const { requestId } = rejecting;
    const note = rejecting.note.trim();
    reject.mutate(
      { requestId, note: note || null },
      {
        onSuccess: () => {
          setRejecting(null);
          onRejected(requestId);
        },
      }
    );
  };

  return (
    <ul className="flex min-w-0 flex-col gap-3">
      {query.data.map(request => {
        const isRejecting = rejecting?.requestId === request.request_id;
        const isPending = pendingRequestId === request.request_id;

        return (
          <li
            key={request.request_id}
            className={
              activeRequestId === request.request_id
                ? 'm2-block mt-0 flex flex-col gap-2 ring-2 ring-m2-brand'
                : 'm2-block mt-0 flex flex-col gap-2'
            }
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex flex-wrap items-center gap-2">
                <b>{request.shipper_org_name}</b>
                <span className="m2-chip m2-chip-warn">{TYPE_LABEL[request.type]}</span>
              </span>
              <span className="text-[12px] text-m2-muted">{kstDayTime(request.created_at)}</span>
            </div>
            <p className="text-[13px]">{lotText(request)}</p>
            {request.reason && <p className="m2-sub mt-0">사유: {request.reason}</p>}
            {request.cancellation_estimate && (
              <p className="m2-sub mt-0">
                취소 부담금 예상 {won(request.cancellation_estimate.fee)} ·{' '}
                {request.cancellation_estimate.rule}
              </p>
            )}
            {isRejecting ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className="m2-inp min-w-0 flex-1"
                  aria-label="반려 사유"
                  placeholder="화주에게 남길 반려 사유 (선택)"
                  value={rejecting.note}
                  onChange={event =>
                    setRejecting({ requestId: request.request_id, note: event.target.value })
                  }
                />
                <button
                  type="button"
                  className="m2-btn m2-btn-sec"
                  disabled={reject.isPending}
                  onClick={submitReject}
                >
                  {reject.isPending ? '반려 중' : '반려 확정'}
                </button>
                <button
                  type="button"
                  className="m2-btn m2-btn-sec"
                  disabled={reject.isPending}
                  onClick={() => setRejecting(null)}
                >
                  취소
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="m2-btn m2-btn-pri"
                  disabled={isBusy}
                  onClick={() => onReplan(request)}
                >
                  {isPending ? '계산 중' : '이 요청으로 3안 계산'}
                </button>
                <button
                  type="button"
                  className="m2-btn m2-btn-sec"
                  disabled={isBusy}
                  onClick={() => setRejecting({ requestId: request.request_id, note: '' })}
                >
                  반려
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
