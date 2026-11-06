'use client';

import { cn } from 'cn';
import type { ReactNode } from 'react';

import { dayTime, monthDayTime } from '@/app/(saas)/app/forwarder/_components/format';
import {
  CLOSED_ORDER_STATUSES,
  ORDER_STATUS_LABEL,
  REQUEST_KIND_LABEL,
  REQUEST_STATUS_LABEL,
  SHIPPER_CONFIRM_LABEL,
} from '@/app/(saas)/app/forwarder/_components/labels';
import {
  firstVoyage,
  lotPackhouseIds,
  truckRunKeys,
} from '@/app/(saas)/app/forwarder/_components/voyage-model';
import { useMapLinkTarget } from '@/components/map-link';
import type { ForwarderOrderT, ForwarderPlanSessionT } from '@/types/saas-forwarder';

type RequestT = ForwarderOrderT['requests'][number];

type ChecklistItemT = {
  key: string;
  title: ReactNode;
  sub: ReactNode;
  done: boolean | null;
  keys: string[];
  request?: RequestT | null;
};

type OrderCardPropsT = {
  order: ForwarderOrderT;
  session?: ForwarderPlanSessionT | null;
  heading?: ReactNode;
  confirm?: { onConfirm: () => void; isPending: boolean } | null;
  answer: (requestId: string, accepted: boolean) => void;
  busyRequestId: string | null;
};

const ORDER_CHIP: Record<ForwarderOrderT['status'], string> = {
  proposed: 'm2-chip',
  shipper_confirmed: 'm2-chip m2-chip-berry',
  forwarder_confirmed: 'm2-chip m2-chip-ok',
  executed: 'm2-chip m2-chip-ok',
  rejected: 'm2-chip',
  expired: 'm2-chip m2-chip-warn',
};

const REQUEST_CHIP: Record<NonNullable<RequestT['status']>, string> = {
  pending: 'm2-chip',
  accepted: 'm2-chip m2-chip-ok',
  declined: 'm2-chip m2-chip-warn',
};

const footNote = (order: ForwarderOrderT, pendingRequests: number) => {
  if (order.status === 'proposed') return '화주 확인이 끝나면 확정할 수 있습니다';
  if (order.status === 'shipper_confirmed')
    return '확정하면 자동 조치가 실행되고 요청 회신을 기록할 수 있습니다';
  if (order.status === 'forwarder_confirmed' && pendingRequests > 0)
    return '상대방 회신을 받으면 수락·거절로 기록합니다';
  if (order.status === 'executed') return '모든 항목을 마쳤습니다';

  return ORDER_STATUS_LABEL[order.status];
};

export function OrderCard({
  order,
  session = null,
  heading,
  confirm = null,
  answer,
  busyRequestId,
}: OrderCardPropsT) {
  const lotKeys = (lotIds: readonly string[] | null | undefined) =>
    session && lotIds ? lotPackhouseIds(session.scenario, lotIds) : [];
  const portKeyOf = (voyageId: string | null | undefined) => {
    if (!session) return null;
    const { voyages, ports } = session.scenario;
    const targetId = voyageId ?? firstVoyage(session)?.id ?? null;
    const origin = voyages.find(({ id }) => id === targetId)?.origin;

    return ports.find(({ id }) => id === origin)?.id ?? ports[0]?.id ?? null;
  };

  const automatic: ChecklistItemT[] = order.automatic
    .filter(({ kind }) => kind !== 'settlement_recompute')
    .map((action, index) => ({
      key: `auto:${index}`,
      title: action.description,
      sub: [
        action.truck_id ? `트럭 ${action.truck_id}` : '',
        action.container_id ?? '',
        action.lot_ids && action.lot_ids.length > 0 ? `로트 ${action.lot_ids.length}건` : '',
        '자동 조치',
      ]
        .filter(Boolean)
        .join(' · '),
      done: !!action.done,
      keys: [
        ...(session && action.truck_id ? truckRunKeys(session, action.truck_id) : []),
        ...(action.container_id ? [action.container_id] : []),
        ...lotKeys(action.lot_ids),
      ],
    }));
  const requests: ChecklistItemT[] = order.requests.map(request => {
    const portKey = request.kind === 'cy_entry' ? portKeyOf(request.voyage_id) : null;

    return {
      key: request.request_id,
      title: `${REQUEST_KIND_LABEL[request.kind]} · ${request.counterparty}`,
      sub: [request.text, `${request.channel} · 기한 ${monthDayTime(request.deadline)}`].join(
        ' · '
      ),
      done: request.status === 'accepted',
      keys: [
        ...(request.container_id ? [request.container_id] : []),
        ...(request.voyage_id ? [request.voyage_id] : []),
        ...(portKey ? [portKey] : []),
        ...lotKeys(request.lot_ids),
      ],
      request,
    };
  });
  const items = [...automatic, ...requests];
  const doneCount = items.filter(({ done }) => done).length;
  const pendingRequests = order.requests.filter(
    ({ status }) => (status ?? 'pending') === 'pending'
  ).length;
  const canAnswer = order.status === 'forwarder_confirmed';
  const isClosed = CLOSED_ORDER_STATUSES.includes(order.status);

  return (
    <section className="m2-card">
      <div className="m2-card-h items-start">
        <div className="min-w-0">
          <h2 className="m2-h2">{heading ?? `실행 지시 v${order.target_version}`}</h2>
          <div className="m2-sub m2-num">
            {ORDER_STATUS_LABEL[order.status]} · 포워더 확정 기한{' '}
            {dayTime(order.deadlines.forwarder)}
          </div>
        </div>
        <div className="flex flex-none flex-wrap justify-end gap-1.5">
          <span className={ORDER_CHIP[order.status]}>{ORDER_STATUS_LABEL[order.status]}</span>
          <span className="m2-chip">정산 금액 비공개</span>
        </div>
      </div>

      {order.shipper_confirmations.length > 0 ? (
        <div className="mb-3 flex flex-col gap-1.5">
          <div className="m2-lbl">화주 확인</div>
          {order.shipper_confirmations.map(({ shipper_id, shipper_name, reason_text, status }) => (
            <div
              key={shipper_id}
              className="flex items-center gap-3 rounded-xl bg-[rgba(15,27,51,.035)] px-3 py-2"
            >
              <div className="min-w-0 flex-1">
                <b className="block text-[13px] font-semibold">{shipper_name}</b>
                {reason_text && reason_text.length > 0 ? (
                  <small className="block text-[12px] text-m2-muted">
                    {reason_text.join(' · ')}
                  </small>
                ) : null}
              </div>
              <span className={cn('m2-chip', status === 'accepted' && 'm2-chip-ok')}>
                {SHIPPER_CONFIRM_LABEL[status]}
              </span>
            </div>
          ))}
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="m2-sub">이 실행 지시에는 포워더가 처리할 항목이 없습니다.</p>
      ) : (
        <ul className="m2-chk">
          {items.map(item => (
            <ChecklistRow
              key={item.key}
              item={item}
              canAnswer={canAnswer}
              answer={answer}
              isBusy={!!item.request && busyRequestId === item.request.request_id}
            />
          ))}
        </ul>
      )}

      <div className="m2-cfoot flex-wrap">
        <span className="m2-num">
          <b>
            {doneCount}/{items.length}
          </b>{' '}
          <span className="text-[13px] text-m2-muted">완료</span>
        </span>
        <span className="text-[12.5px] text-m2-muted">{footNote(order, pendingRequests)}</span>
        {confirm ? (
          <button
            type="button"
            className="m2-btn m2-btn-pri"
            disabled={confirm.isPending || order.status !== 'shipper_confirmed'}
            onClick={confirm.onConfirm}
          >
            {isClosed ? `확정됨 · v${order.target_version}` : '실행 지시 확정'}
          </button>
        ) : null}
      </div>
    </section>
  );
}

type ChecklistRowPropsT = {
  item: ChecklistItemT;
  canAnswer: boolean;
  answer: (requestId: string, accepted: boolean) => void;
  isBusy: boolean;
};

function ChecklistRow({ item, canAnswer, answer, isBusy }: ChecklistRowPropsT) {
  const { className: linkClass, ...link } = useMapLinkTarget(item.keys);
  const request = item.request ?? null;
  const status = request?.status ?? 'pending';

  return (
    <li {...link} className={cn(item.done && 'is-done', linkClass)}>
      <CheckMark done={!!item.done} label={String(item.title)} />
      <div className="min-w-0 flex-1">
        <b>{item.title}</b>
        <small className="m2-num">{item.sub}</small>
        {request && canAnswer && status === 'pending' ? (
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              className="m2-btn m2-btn-pri m2-btn-sm"
              disabled={isBusy}
              onClick={() => answer(request.request_id, true)}
            >
              수락
            </button>
            <button
              type="button"
              className="m2-btn m2-btn-sec m2-btn-sm"
              disabled={isBusy}
              onClick={() => answer(request.request_id, false)}
            >
              거절
            </button>
          </div>
        ) : null}
      </div>
      {request ? (
        <span className={cn(REQUEST_CHIP[status], 'flex-none')}>
          {REQUEST_STATUS_LABEL[status]}
        </span>
      ) : null}
    </li>
  );
}

export function CheckMark({ done, label }: { done: boolean; label: string }) {
  return (
    <input
      type="checkbox"
      className="m2-cb pointer-events-none mt-px"
      checked={done}
      readOnly
      tabIndex={-1}
      aria-label={`${label} ${done ? '완료' : '미완료'}`}
    />
  );
}

export const orderProgress = (order: ForwarderOrderT) => {
  const automatic = order.automatic.filter(({ kind }) => kind !== 'settlement_recompute');
  const done =
    automatic.filter(({ done }) => !!done).length +
    order.requests.filter(({ status }) => status === 'accepted').length;

  return { done, total: automatic.length + order.requests.length };
};
