'use client';

import { cn } from 'cn';
import { toast } from 'sonner';

import { useAnswerShipperRequest } from '@/apis/saas/shipper';
import {
  REQUEST_KIND_LABEL,
  REQUEST_STATUS_LABEL,
} from '@/app/(saas)/app/shipper/_components/labels';
import { errorDetail } from '@/app/(saas)/app/shipper/_components/query-state';
import { fmtMonthDayTime } from '@/app/(saas)/app/shipper/_components/shipper-format';
import {
  isRequestAddressedToShipper,
  isRequestAnswerable,
  isRequestAwaitingForwarder,
} from '@/app/(saas)/app/shipper/_components/use-shipper-tasks';
import type { ShipperOrderT, ShipperRequestT } from '@/types/saas-shipper';

export type RequestItemT = {
  planId: string;
  planLabel?: string;
  order: ShipperOrderT;
  request: ShipperRequestT;
};

const requestStatusLabel = (request: ShipperRequestT) =>
  request.status === 'pending' ? '마감' : REQUEST_STATUS_LABEL[request.status];

const awaitingForwarderLabel = (order: ShipperOrderT) =>
  order.status === 'forwarder_confirmed' ? '포워더 회신 대기' : '포워더 확정 대기';

export function RequestList({ items, emptyText }: { items: RequestItemT[]; emptyText: string }) {
  const answer = useAnswerShipperRequest();

  if (items.length === 0) return <p className="m2-sub mt-0">{emptyText}</p>;

  const respond = ({ planId, order, request }: RequestItemT, accepted: boolean) =>
    answer.mutate(
      { planId, orderId: order.order_id, requestId: request.request_id, answer: { accepted } },
      {
        onSuccess: () => toast.success(accepted ? '요청을 수락했습니다.' : '요청을 거절했습니다.'),
        onError: error => toast.error(errorDetail(error, '요청에 응답하지 못했습니다.')),
      }
    );

  return (
    <ul className="flex flex-col gap-2.5">
      {items.map(item => {
        const { order, request } = item;
        const canAnswer = isRequestAnswerable(order, request);
        const statusLabel = isRequestAwaitingForwarder(order, request)
          ? awaitingForwarderLabel(order)
          : requestStatusLabel(request);
        const isBusy = answer.isPending && answer.variables?.requestId === request.request_id;

        return (
          <li
            key={`${order.order_id}:${request.request_id}`}
            className="m2-block flex items-start gap-4"
            style={canAnswer ? { boxShadow: '0 0 0 1.5px var(--m2-brand)' } : {}}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="m2-chip">{REQUEST_KIND_LABEL[request.kind]}</span>
                <span className="font-semibold">{request.counterparty}</span>
                {!isRequestAddressedToShipper(request) && (
                  <span className="m2-sub mt-0">포워더가 회신 기록</span>
                )}
                <span className="m2-sub mt-0">{request.channel}</span>
              </div>
              {item.planLabel && <p className="m2-sub mt-0">{item.planLabel}</p>}
              <p className="text-[13.5px]">{request.text}</p>
              <p className="m2-sub mt-0 flex flex-wrap gap-x-5">
                <span>
                  기한{' '}
                  <span className="m2-num text-m2-ink">{fmtMonthDayTime(request.deadline)}</span>
                </span>
                {request.container_id && <span className="m2-num">{request.container_id}</span>}
                {request.pallets_before !== request.pallets_after && (
                  <span className="m2-num">
                    {request.pallets_before} → {request.pallets_after}팔레트
                  </span>
                )}
                {request.note && <span>메모 {request.note}</span>}
              </p>
            </div>
            {canAnswer ? (
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  className="m2-btn m2-btn-pri m2-btn-sm"
                  disabled={isBusy}
                  onClick={() => respond(item, true)}
                >
                  수락
                </button>
                <button
                  type="button"
                  className="m2-btn m2-btn-sec m2-btn-sm"
                  disabled={isBusy}
                  onClick={() => respond(item, false)}
                >
                  거절
                </button>
              </div>
            ) : (
              <span
                className={cn('m2-chip flex-none', request.status === 'accepted' && 'm2-chip-ok')}
              >
                {statusLabel}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
