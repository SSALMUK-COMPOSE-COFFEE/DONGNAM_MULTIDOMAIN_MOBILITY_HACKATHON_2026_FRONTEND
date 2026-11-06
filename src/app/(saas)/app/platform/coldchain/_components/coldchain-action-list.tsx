'use client';

import { cn } from 'cn';
import { Copy } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  type ColdchainActionStatusT,
  type ColdchainActionT,
  type ColdchainRequestDraftT,
  openActionCount,
  useAcceptColdchainAction,
  useCompleteColdchainAction,
} from '@/apis/saas/coldchain';
import { kstDayTime } from '@/app/(saas)/app/platform/_components/m2-format';
import type { ColdchainActionHandlerT } from '@/types/saas-platform';
import { withoutContainerPrefix } from '@/utils/format';

const NOTE_MAX_LENGTH = 500;

const STATUS_ORDER: Record<ColdchainActionStatusT, number> = { open: 0, accepted: 1, done: 2 };

const SEVERITY_ORDER: Record<ColdchainActionT['severity'], number> = {
  critical: 0,
  warning: 1,
  info: 2,
};

const STATUS_CHIP: Record<ColdchainActionStatusT, { label: string; className: string }> = {
  open: { label: '대기', className: 'm2-chip-warn' },
  accepted: { label: '수락됨', className: 'm2-chip-brand' },
  done: { label: '완료', className: 'm2-chip-ok' },
};

const SEVERITY_CHIP: Record<ColdchainActionT['severity'], { label: string; className: string }> = {
  critical: { label: '위험', className: 'm2-chip-berry' },
  warning: { label: '주의', className: 'm2-chip-warn' },
  info: { label: '참고', className: '' },
};

const COUNTERPARTY_ROLE: Record<ColdchainRequestDraftT['counterparty_role'], string> = {
  terminal: '터미널',
  trucker: '운송사',
  destination_warehouse: '도착지 창고',
  insurer: '보험사',
};

const HANDLER_LABEL: Record<ColdchainActionHandlerT['org_type'], string> = {
  platform: '플랫폼',
  forwarder: '포워더',
};

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success('요청 문장을 복사했습니다.');
  } catch {
    toast.error('요청 문장을 복사하지 못했습니다.');
  }
};

const sortActions = (actions: readonly ColdchainActionT[]) =>
  [...actions].sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
      Date.parse(a.triggered_at) - Date.parse(b.triggered_at)
  );

type ColdchainActionListPropsT = {
  planId: string;
  containerId: string;
  actions: readonly ColdchainActionT[];
  canAct: boolean;
};

export function ColdchainActionList({
  planId,
  containerId,
  actions,
  canAct,
}: ColdchainActionListPropsT) {
  const accept = useAcceptColdchainAction(planId, containerId);
  const complete = useCompleteColdchainAction(planId, containerId);
  const isPending = accept.isPending || complete.isPending;
  const openCount = openActionCount(actions);

  return (
    <section className="m2-card" aria-label={`${containerId} 자동 조치`}>
      <div className="m2-card-h">
        <h2 className="m2-h2">자동 조치</h2>
        <span className={cn('m2-chip', openCount > 0 && 'm2-chip-warn')}>
          열린 조치 {openCount}건
        </span>
      </div>
      {actions.length === 0 ? (
        <p className="m2-sub">단전·품온 이탈이 감지되면 필요한 조치가 여기에 쌓입니다.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {sortActions(actions).map(action => (
            <ActionRow
              key={action.key}
              action={action}
              canAct={canAct}
              isPending={isPending}
              onAccept={note =>
                accept.mutate(note ? { key: action.key, note } : { key: action.key })
              }
              onComplete={note =>
                complete.mutate(note ? { key: action.key, note } : { key: action.key })
              }
            />
          ))}
        </ul>
      )}
    </section>
  );
}

type ActionRowPropsT = {
  action: ColdchainActionT;
  canAct: boolean;
  isPending: boolean;
  onAccept: (note: string) => void;
  onComplete: (note: string) => void;
};

function ActionRow({ action, canAct, isPending, onAccept, onComplete }: ActionRowPropsT) {
  const [note, setNote] = useState('');
  const status = STATUS_CHIP[action.status];
  const severity = SEVERITY_CHIP[action.severity];
  const title = withoutContainerPrefix(action.title);
  const request = action.request ?? null;
  const trimmedNote = note.trim();

  return (
    <li className={cn('m2-block flex flex-col gap-2', action.status === 'done' && 'opacity-70')}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn('m2-chip', status.className)}>{status.label}</span>
        <span className={cn('m2-chip', severity.className)}>{severity.label}</span>
        <span className="m2-h3 text-[14px]">{title}</span>
        <time className="m2-num ml-auto text-[12px] text-m2-muted">
          {kstDayTime(action.triggered_at)}
        </time>
      </div>
      <p className="text-[13px] text-m2-ink-2">{action.description}</p>
      {request ? (
        <dl className="grid grid-cols-[72px_minmax(0,1fr)] gap-x-3 gap-y-1 text-[12.5px]">
          <dt className="text-m2-muted">요청 상대</dt>
          <dd>
            {request.counterparty}
            <span className="ml-1.5 text-m2-muted">
              {COUNTERPARTY_ROLE[request.counterparty_role]}
            </span>
          </dd>
          <dt className="text-m2-muted">경로</dt>
          <dd>{request.channel}</dd>
          <dt className="text-m2-muted">요청 문장</dt>
          <dd className="flex items-start gap-2">
            <p className="m2-note mt-0 flex-1 whitespace-pre-wrap">{request.text}</p>
            {canAct ? (
              <button
                type="button"
                className="m2-btn m2-btn-sec m2-btn-sm flex-none"
                aria-label={`${title} 요청 문장 복사`}
                onClick={() => copyText(request.text)}
              >
                <Copy className="size-3.5" aria-hidden />
                복사
              </button>
            ) : null}
          </dd>
        </dl>
      ) : null}
      {action.note ? <p className="text-[12.5px] text-m2-ink-2">메모 · {action.note}</p> : null}
      <HandlerLine label="수락" by={action.accepted_by ?? null} at={action.accepted_at ?? null} />
      <HandlerLine label="완료" by={action.done_by ?? null} at={action.done_at ?? null} />
      {canAct && action.status !== 'done' ? (
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="m2-inp h-8 min-w-0 flex-1 text-[12.5px]"
            value={note}
            maxLength={NOTE_MAX_LENGTH}
            placeholder="메모 (선택)"
            aria-label={`${title} 조치 메모`}
            onChange={event => setNote(event.target.value)}
            disabled={isPending}
          />
          {action.status === 'open' ? (
            <button
              type="button"
              className="m2-btn m2-btn-sec m2-btn-sm"
              aria-label={`${title} 조치 수락`}
              disabled={isPending}
              onClick={() => onAccept(trimmedNote)}
            >
              조치 수락
            </button>
          ) : null}
          <button
            type="button"
            className="m2-btn m2-btn-pri m2-btn-sm"
            aria-label={`${title} 조치 완료`}
            disabled={isPending}
            onClick={() => onComplete(trimmedNote)}
          >
            조치 완료
          </button>
        </div>
      ) : null}
    </li>
  );
}

type HandlerLinePropsT = {
  label: string;
  by: ColdchainActionHandlerT | null;
  at: string | null;
};

function HandlerLine({ label, by, at }: HandlerLinePropsT) {
  if (!at) return null;

  return (
    <p className="m2-num text-[12px] text-m2-muted">
      {label} · {by ? `${HANDLER_LABEL[by.org_type]} · ` : ''}
      {kstDayTime(at)}
    </p>
  );
}
