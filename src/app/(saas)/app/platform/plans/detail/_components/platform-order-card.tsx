import { cn } from 'cn';
import { CheckCircle2Icon, CircleIcon } from 'lucide-react';

import { TONE_CLASS, burdenWords } from '@/components/replan-alternatives/money-words';
import type { ExecutionOrderT } from '@/types/api';

const STATUS_LABEL: Record<ExecutionOrderT['status'], string> = {
  proposed: '화주 확인 대기',
  shipper_confirmed: '포워더 확정 대기',
  forwarder_confirmed: '확정 완료',
  executed: '실행 완료',
  rejected: '거절됨',
  expired: '기한 만료',
};

const STATUS_CHIP: Record<ExecutionOrderT['status'], string> = {
  proposed: 'm2-chip-warn',
  shipper_confirmed: 'm2-chip-brand',
  forwarder_confirmed: 'm2-chip-ok',
  executed: 'm2-chip-ok',
  rejected: 'm2-chip-berry',
  expired: '',
};

const SHIPPER_STATUS_LABEL: Record<
  ExecutionOrderT['shipper_confirmations'][number]['status'],
  string
> = {
  pending: '확인 대기',
  accepted: '수락함',
  rejected: '거절함',
};

const REQUEST_STATUS_LABEL: Record<ExecutionOrderT['requests'][number]['status'], string> = {
  pending: '회신 대기',
  accepted: '수락',
  declined: '거절',
};

export function PlatformOrderCard({ order }: { order: ExecutionOrderT }) {
  return (
    <section className="m2-card">
      <div className="m2-card-h">
        <div>
          <h2 className="m2-h2">실행 지시</h2>
          <div className="m2-sub">화주 확인과 포워더 확정은 각 조직 화면에서 진행됩니다.</div>
        </div>
        <span className={cn('m2-chip', STATUS_CHIP[order.status])}>
          {STATUS_LABEL[order.status]}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-4 max-[1180px]:grid-cols-1">
        <div className="m2-block">
          <div className="m2-lbl mb-2">자동 조치</div>
          <ul className="flex flex-col gap-2 text-[13px]">
            {order.automatic.map(({ kind, description, done }) => (
              <li key={`${kind}-${description}`} className="flex gap-2">
                {done ? (
                  <CheckCircle2Icon
                    size={15}
                    className="shrink-0 translate-y-0.5 text-m2-ok"
                    aria-hidden
                  />
                ) : (
                  <CircleIcon
                    size={15}
                    className="shrink-0 translate-y-0.5 text-m2-faint"
                    aria-hidden
                  />
                )}
                <span className="min-w-0">{description}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="m2-block">
          <div className="m2-lbl mb-2">화주 확인</div>
          {order.shipper_confirmations.length === 0 ? (
            <p className="m2-sub mt-0">비용·일정이 바뀌는 화주가 없습니다.</p>
          ) : (
            <ul className="flex flex-col gap-2.5 text-[13px]">
              {order.shipper_confirmations.map(
                ({ shipper_id, shipper_name, reason_text, net_cost_delta, status }) => {
                  const burden = burdenWords(net_cost_delta);
                  return (
                    <li key={shipper_id} className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-semibold text-m2-ink">{shipper_name}</div>
                        {reason_text.length > 0 ? (
                          <div className="text-[12px] text-m2-muted">{reason_text.join(' · ')}</div>
                        ) : null}
                        <div className={cn('m2-num text-[12px]', TONE_CLASS[burden.tone])}>
                          {burden.text}
                        </div>
                      </div>
                      <span
                        className={cn('m2-chip flex-none', status === 'accepted' && 'm2-chip-ok')}
                      >
                        {SHIPPER_STATUS_LABEL[status]}
                      </span>
                    </li>
                  );
                }
              )}
            </ul>
          )}
        </div>
        <div className="m2-block">
          <div className="m2-lbl mb-2">포워더가 보낼 요청</div>
          {order.requests.length === 0 ? (
            <p className="m2-sub mt-0">보낼 요청이 없습니다.</p>
          ) : (
            <ul className="flex flex-col gap-2.5 text-[13px]">
              {order.requests.map(({ request_id, counterparty, text, status }) => (
                <li key={request_id} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-m2-ink">{counterparty}</span>
                    <span className={cn('m2-chip', status === 'accepted' && 'm2-chip-ok')}>
                      {REQUEST_STATUS_LABEL[status]}
                    </span>
                  </div>
                  <span className="text-[12px] text-m2-muted">{text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
