'use client';

import { cn } from 'cn';
import { toast } from 'sonner';

import { useAnswerShipperRequest } from '@/apis/saas/shipper';
import {
  REQUEST_KIND_LABEL,
  REQUEST_STATUS_LABEL,
} from '@/app/(saas)/app/shipper/_components/labels';
import type { LotLabelMapT } from '@/app/(saas)/app/shipper/_components/lot-label';
import { plainWords } from '@/app/(saas)/app/shipper/_components/plain-words';
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

const NO_LABELS: LotLabelMapT = new Map();

const palletsNote = (pallets: number) => (pallets > 0 ? ` (${pallets}파렛트)` : '');

const changeNote = (before: number, after: number) =>
  before !== after && before > 0 && after > 0
    ? ` (${before} → ${after}파렛트)`
    : palletsNote(after);

const summaryOf = ({ kind, pallets_before: before, pallets_after: after }: ShipperRequestT) => {
  switch (kind) {
    case 'booking_amendment':
      return `배 예약 내용을 바꿉니다${changeNote(before, after)}.`;
    case 'booking_cancel':
      return `배 예약을 취소합니다${palletsNote(before)}.`;
    case 'booking_new':
      return `새 배를 예약합니다${palletsNote(after)}.`;
    case 'reefer_plug':
      return '항구에서 냉장 컨테이너 전원을 연결합니다.';
    case 'cy_entry':
      return `컨테이너를 항구에 들여놓습니다${palletsNote(after)}.`;
    case 'air_booking':
      return `항공편을 예약합니다${palletsNote(after)}.`;
    case 'air_cancel':
      return `항공 예약을 취소합니다${palletsNote(before)}.`;
    default:
      return `요청을 처리합니다${palletsNote(after)}.`;
  }
};

const requestTextOf = (request: ShipperRequestT, labels: LotLabelMapT) => {
  const plain: unknown = (request as Record<string, unknown>).plain_text;

  return typeof plain === 'string' && plain.trim() ? plainWords(plain, labels) : summaryOf(request);
};

const requestStatusLabel = (request: ShipperRequestT) =>
  request.status === 'pending' ? '마감' : REQUEST_STATUS_LABEL[request.status];

const hasMyPendingConfirmation = (order: ShipperOrderT, ownShipperIds: readonly string[]) =>
  order.shipper_confirmations.some(
    ({ status, shipper_id }) => status === 'pending' && ownShipperIds.includes(shipper_id)
  );

const awaitingForwarderLabel = (order: ShipperOrderT, ownShipperIds: readonly string[]) => {
  if (order.status === 'forwarder_confirmed') return '포워더 회신 대기';
  if (order.status === 'shipper_confirmed') return '포워더 확정 대기';
  if (order.status === 'proposed' && hasMyPendingConfirmation(order, ownShipperIds)) {
    return '내 확정 대기';
  }

  return '화주 확정 후 발송';
};

type RequestListPropsT = {
  items: RequestItemT[];
  emptyText: string;
  labels?: LotLabelMapT;
  ownShipperIds?: readonly string[];
};

const NO_SHIPPERS: readonly string[] = [];

export function RequestList({
  items,
  emptyText,
  labels = NO_LABELS,
  ownShipperIds = NO_SHIPPERS,
}: RequestListPropsT) {
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
          ? awaitingForwarderLabel(order, ownShipperIds)
          : requestStatusLabel(request);
        const isBusy = answer.isPending && answer.variables?.requestId === request.request_id;

        return (
          <li
            key={`${order.order_id}:${request.request_id}`}
            className="m2-block flex items-start gap-4 max-[767.98px]:flex-col max-[767.98px]:gap-2.5"
            style={canAnswer ? { boxShadow: '0 0 0 1.5px var(--m2-brand)' } : {}}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="m2-chip">{REQUEST_KIND_LABEL[request.kind]}</span>
                <span className="font-semibold">{plainWords(request.counterparty)}</span>
                {!isRequestAddressedToShipper(request) && (
                  <span className="m2-sub mt-0">포워더가 회신 기록</span>
                )}
                <span className="m2-sub mt-0">{request.channel}</span>
              </div>
              {item.planLabel && <p className="m2-sub mt-0">{item.planLabel}</p>}
              <p className="text-[13.5px] [overflow-wrap:anywhere]">
                {requestTextOf(request, labels)}
              </p>
              {request.text.trim() && (
                <details className="text-[12.5px] text-m2-muted">
                  <summary className="w-fit cursor-pointer font-semibold text-m2-brand-ink">
                    원문 보기
                  </summary>
                  <p className="mt-1 [overflow-wrap:anywhere]">
                    {plainWords(request.text, labels)}
                  </p>
                </details>
              )}
              <p className="m2-sub mt-0 flex flex-wrap gap-x-5">
                <span>
                  기한{' '}
                  <span className="m2-num text-m2-ink">{fmtMonthDayTime(request.deadline)}</span>
                </span>
                {request.container_id && <span className="m2-num">{request.container_id}</span>}
                {request.pallets_before !== request.pallets_after && (
                  <span className="m2-num">
                    {request.pallets_before} → {request.pallets_after}파렛트
                  </span>
                )}
                {request.note && <span>메모 {plainWords(request.note, labels)}</span>}
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
