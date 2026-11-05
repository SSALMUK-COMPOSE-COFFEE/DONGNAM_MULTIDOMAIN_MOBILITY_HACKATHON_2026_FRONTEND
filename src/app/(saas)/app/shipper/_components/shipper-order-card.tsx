'use client';

import { cn } from 'cn';
import { CheckCircle2Icon, CircleIcon } from 'lucide-react';

import type { LotLabelMapT } from '@/app/(saas)/app/shipper/_components/lot-label';
import {
  type OwnScopeT,
  myPendingConfirmations,
} from '@/app/(saas)/app/shipper/_components/my-plan';
import {
  DecisionButtons,
  RejectForm,
  useOrderDecision,
} from '@/app/(saas)/app/shipper/_components/order-decision';
import { plainWords } from '@/app/(saas)/app/shipper/_components/plain-words';
import { fmtBurden, fmtDayTime } from '@/app/(saas)/app/shipper/_components/shipper-format';
import type { ShipperOrderT } from '@/types/saas-shipper';

const ORDER_STATUS: Record<ShipperOrderT['status'], { label: string; tone: string }> = {
  proposed: { label: '화주 확인 대기', tone: 'm2-chip-brand' },
  shipper_confirmed: { label: '포워더 확정 대기', tone: 'm2-chip-warn' },
  forwarder_confirmed: { label: '확정 완료', tone: 'm2-chip-ok' },
  executed: { label: '실행 완료', tone: 'm2-chip-ok' },
  rejected: { label: '거절됨', tone: '' },
  expired: { label: '기한 만료', tone: '' },
};

const CONFIRM_STATUS: Record<
  ShipperOrderT['shipper_confirmations'][number]['status'],
  { label: string; tone: string }
> = {
  pending: { label: '확인 대기', tone: '' },
  accepted: { label: '수락함', tone: 'm2-chip-ok' },
  rejected: { label: '거절함', tone: 'm2-chip-berry' },
};

type ShipperOrderCardPropsT = {
  planId: string;
  order: ShipperOrderT;
  own: OwnScopeT;
  labels: LotLabelMapT;
  readOnly?: boolean;
};

export function ShipperOrderCard({
  planId,
  order,
  own,
  labels,
  readOnly = false,
}: ShipperOrderCardPropsT) {
  const mine = myPendingConfirmations([order], own);
  const decision = useOrderDecision(planId, mine);
  const ownShippers = new Set(own.shipperIds);
  const status = ORDER_STATUS[order.status];

  return (
    <section className="m2-card" aria-label="실행 지시">
      <div className="m2-card-h">
        <h2 className="m2-h2">실행 지시</h2>
        <span className={cn('m2-chip', status.tone)}>{status.label}</span>
      </div>

      <div className="grid grid-cols-2 gap-4 max-[900px]:grid-cols-1">
        <div className="min-w-0">
          <h3 className="m2-h3 mb-2">자동으로 처리되는 일</h3>
          {order.automatic.length === 0 && <p className="m2-sub mt-0">자동 조치가 없습니다.</p>}
          <ul className="flex flex-col gap-2 text-[13.5px]">
            {order.automatic.map(({ kind, description, done }) => (
              <li key={`${kind}-${description}`} className="flex gap-2">
                {done ? (
                  <CheckCircle2Icon size={16} className="mt-0.5 flex-none text-m2-ok" />
                ) : (
                  <CircleIcon size={16} className="mt-0.5 flex-none text-m2-faint" />
                )}
                <span className="min-w-0 [overflow-wrap:anywhere]">
                  {plainWords(description, labels)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="min-w-0">
          <h3 className="m2-h3 mb-2">화주 확인</h3>
          {order.shipper_confirmations.length === 0 && (
            <p className="m2-sub mt-0">비용·일정이 바뀌는 화주가 없습니다.</p>
          )}
          <ul className="flex flex-col gap-2">
            {order.shipper_confirmations.map(confirmation => {
              const isMine = ownShippers.has(confirmation.shipper_id);
              const chip = CONFIRM_STATUS[confirmation.status];
              const delta = confirmation.net_cost_delta;

              return (
                <li key={confirmation.shipper_id} className="m2-block flex flex-col gap-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <b className="text-[13.5px] font-semibold">
                      {isMine ? '내 출하' : confirmation.shipper_name || '다른 화주'}
                    </b>
                    <span className={cn('m2-chip', chip.tone)}>{chip.label}</span>
                  </div>
                  {confirmation.reason_text.length > 0 && (
                    <p className="m2-sub mt-0 [overflow-wrap:anywhere]">
                      {plainWords(confirmation.reason_text.join(' · '), labels)}
                    </p>
                  )}
                  {isMine && (
                    <p className="m2-sub m2-num mt-0">
                      내 비용 {fmtBurden(delta)} · 기한 {fmtDayTime(confirmation.deadline)}
                    </p>
                  )}
                  {isMine && confirmation.note && (
                    <p className="m2-sub mt-0">메모 {confirmation.note}</p>
                  )}
                </li>
              );
            })}
          </ul>
          {!readOnly && (
            <>
              <DecisionButtons
                decision={decision}
                acceptLabel="수락"
                className="mt-3 justify-end"
              />
              <RejectForm decision={decision} />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
