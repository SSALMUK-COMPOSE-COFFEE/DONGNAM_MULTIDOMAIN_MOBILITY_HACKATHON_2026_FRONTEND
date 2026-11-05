'use client';

import { cn } from 'cn';
import type { ReactNode } from 'react';
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

  const respond = ({ planId, order, request }: RequestItemT, accepted: boolean) => {
    if (answer.isPending) return;
    answer.mutate(
      { planId, orderId: order.order_id, requestId: request.request_id, answer: { accepted } },
      {
        onSuccess: () => toast.success(accepted ? '요청을 수락했습니다.' : '요청을 거절했습니다.'),
        onError: error => toast.error(errorDetail(error, '요청에 응답하지 못했습니다.')),
      }
    );
  };

  const groups = items.reduce<{ planLabel: string | null; items: RequestItemT[] }[]>(
    (acc, item) => {
      const planLabel = item.planLabel ?? null;
      const last = acc.at(-1);
      if (last && last.planLabel === planLabel) last.items.push(item);
      else acc.push({ planLabel, items: [item] });
      return acc;
    },
    []
  );

  return (
    <div className="flex flex-col gap-5">
      {groups.map(group => (
        <div key={`${group.planLabel ?? ''}:${group.items[0]?.request.request_id ?? ''}`}>
          {group.planLabel && (
            <p className="mb-2 flex items-start gap-2 text-[12.5px] font-semibold text-m2-ink-2">
              <span className="m2-dot mt-[6px] bg-m2-brand" aria-hidden />
              <span>
                {group.planLabel}{' '}
                <span className="m2-num font-normal text-m2-muted">· {group.items.length}건</span>
              </span>
            </p>
          )}
          <ul className="flex flex-col gap-2.5">
            {group.items.map(item => (
              <RequestCard
                key={`${item.order.order_id}:${item.request.request_id}`}
                item={item}
                labels={labels}
                ownShipperIds={ownShipperIds}
                isBusy={answer.isPending && answer.variables?.requestId === item.request.request_id}
                responsePending={answer.isPending}
                onRespond={accepted => respond(item, accepted)}
              />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

const kindTone = (kind: ShipperRequestT['kind']) => {
  if (kind === 'booking_cancel' || kind === 'air_cancel') return 'm2-chip-berry';
  if (kind === 'air_booking') return 'm2-chip-grape';
  return 'm2-chip-brand';
};

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11.5px] text-m2-muted">{label}</dt>
      <dd className="m2-num text-[13.5px] font-semibold text-m2-ink">{children}</dd>
    </div>
  );
}

type RequestCardPropsT = {
  item: RequestItemT;
  labels: LotLabelMapT;
  ownShipperIds: readonly string[];
  isBusy: boolean;
  responsePending: boolean;
  onRespond: (accepted: boolean) => void;
};

function RequestCard({
  item,
  labels,
  ownShipperIds,
  isBusy,
  responsePending,
  onRespond,
}: RequestCardPropsT) {
  const { order, request } = item;
  const canAnswer = isRequestAnswerable(order, request);
  const statusLabel = isRequestAwaitingForwarder(order, request)
    ? awaitingForwarderLabel(order, ownShipperIds)
    : requestStatusLabel(request);
  const route = [
    request.channel,
    isRequestAddressedToShipper(request) ? null : '포워더가 회신 기록',
  ]
    .filter(Boolean)
    .join(' · ');
  const original = request.text.trim() ? plainWords(request.text, labels) : null;

  return (
    <li className={cn('m2-block flex flex-col gap-3', canAnswer && 'is-lit')}>
      <div className="flex items-start gap-4 max-[767.98px]:flex-col max-[767.98px]:gap-2.5">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('m2-chip', kindTone(request.kind))}>
              {REQUEST_KIND_LABEL[request.kind]}
            </span>
            <span className="text-[12.5px] text-m2-muted">
              받는 곳{' '}
              <b className="font-semibold text-m2-ink-2">{plainWords(request.counterparty)}</b>
            </span>
          </div>
          <p className="text-[14.5px] leading-snug font-semibold [overflow-wrap:anywhere]">
            {requestTextOf(request, labels)}
          </p>
        </div>
        {canAnswer ? (
          <div className="flex shrink-0 gap-2" aria-busy={isBusy}>
            <button
              type="button"
              className="m2-btn m2-btn-pri m2-btn-sm"
              disabled={responsePending}
              onClick={() => onRespond(true)}
            >
              {isBusy ? '처리 중' : '수락'}
            </button>
            <button
              type="button"
              className="m2-btn m2-btn-sec m2-btn-sm"
              disabled={responsePending}
              onClick={() => onRespond(false)}
            >
              거절
            </button>
          </div>
        ) : (
          <span
            className={cn(
              'm2-chip flex-none',
              request.status === 'accepted' ? 'm2-chip-ok' : 'm2-chip-warn'
            )}
          >
            {statusLabel}
          </span>
        )}
      </div>

      <dl className="flex flex-wrap gap-x-8 gap-y-2">
        <Fact label="기한">{fmtMonthDayTime(request.deadline)}</Fact>
        {request.pallets_before !== request.pallets_after && (
          <Fact label="파렛트">
            {request.pallets_before} → {request.pallets_after}
          </Fact>
        )}
        {request.container_id && <Fact label="컨테이너">{request.container_id}</Fact>}
        {request.note && <Fact label="메모">{plainWords(request.note, labels)}</Fact>}
      </dl>

      {original ? (
        <details className="group border-t border-m2-line pt-2.5 text-[12px] text-m2-muted">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
            <span className="min-w-0 [overflow-wrap:anywhere]">{route}</span>
            <span className="flex-none font-semibold text-m2-brand-ink">
              <span className="group-open:hidden">원문 보기</span>
              <span className="hidden group-open:inline">원문 접기</span>
            </span>
          </summary>
          <p className="mt-2 rounded-lg bg-m2-brand-soft/50 px-3 py-2 [overflow-wrap:anywhere] text-m2-ink-2">
            {original}
          </p>
        </details>
      ) : (
        <p className="border-t border-m2-line pt-2.5 text-[12px] [overflow-wrap:anywhere] text-m2-muted">
          {route}
        </p>
      )}
    </li>
  );
}
