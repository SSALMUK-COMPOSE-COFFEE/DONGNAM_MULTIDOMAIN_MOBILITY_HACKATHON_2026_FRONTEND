'use client';

import { cn } from 'cn';
import { ArrowRightIcon } from 'lucide-react';
import Link from 'next/link';
import { useId, useState } from 'react';

import {
  type ShipperPlanConfirmationT,
  isReplanPending,
  useDecidePlanConfirmation,
  useShipperPlanConfirmation,
} from '@/apis/saas/shipper-confirm';
import type { LotLabelMapT } from '@/app/(saas)/app/shipper/_components/lot-label';
import { CardSkeleton, QueryError } from '@/app/(saas)/app/shipper/_components/query-state';
import { fmtMonthDayTime } from '@/app/(saas)/app/shipper/_components/shipper-format';
import { SHIPPER_PATHS } from '@/app/(saas)/app/shipper/_components/shipper-paths';

const REASON_MAX = 500;

export const REPLAN_PENDING_TEXT = '운송계획을 다시 검토하고 있습니다.';

export function ReplanPendingNotice({ className }: { className?: string }) {
  return (
    <p role="status" className={cn('m2-note mt-0', className)}>
      {REPLAN_PENDING_TEXT} 새 계획이 나오면 다시 확인을 요청드립니다.
    </p>
  );
}

type PlanConfirmCardPropsT = {
  planId: string;
  labels: LotLabelMapT;
  planLabel?: string;
  replanPending?: boolean;
  showDetailLink?: boolean;
};

export function PlanConfirmCard({
  planId,
  labels,
  planLabel = '',
  replanPending = false,
  showDetailLink = false,
}: PlanConfirmCardPropsT) {
  const query = useShipperPlanConfirmation(planId);

  if (query.isPending) return <CardSkeleton height={160} />;
  if (query.isError) {
    return (
      <QueryError
        message="계획 확인 요청을 불러오지 못했습니다."
        onRetry={() => query.refetch()}
        isRetrying={query.isFetching}
      />
    );
  }

  const view = query.data;
  const isReplanning = replanPending || isReplanPending(view);
  const rows = view.confirmations;
  if (rows.length === 0) return isReplanning ? <ReplanPendingNotice /> : null;

  return (
    <PlanConfirmBody
      planId={planId}
      rows={rows}
      labels={labels}
      planLabel={planLabel}
      planStatus={view.plan_status}
      isReplanning={isReplanning}
      showDetailLink={showDetailLink}
    />
  );
}

type PlanConfirmBodyPropsT = {
  planId: string;
  rows: ShipperPlanConfirmationT[];
  labels: LotLabelMapT;
  planLabel: string;
  planStatus: string;
  isReplanning: boolean;
  showDetailLink: boolean;
};

function PlanConfirmBody({
  planId,
  rows,
  labels,
  planLabel,
  planStatus,
  isReplanning,
  showDetailLink,
}: PlanConfirmBodyPropsT) {
  const decide = useDecidePlanConfirmation(planId);
  const reasonId = useId();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const pending = rows.filter(({ status }) => status === 'pending');
  const rejected = rows.filter(({ status }) => status === 'rejected');
  const lotIds = [...new Set(rows.flatMap(({ lot_ids }) => lot_ids))];
  const isOpen = pending.length > 0 && !isReplanning;
  const pendingAccept = decide.isPending ? (decide.variables?.accept ?? null) : null;

  const submit = (accept: boolean) => {
    const note = reason.trim();
    if (!accept && !note) return;
    decide.mutate(
      {
        accept,
        reason: accept ? null : note,
        shipperIds: pending.map(({ shipper_id }) => shipper_id),
      },
      {
        onSuccess: () => {
          setRejecting(false);
          setReason('');
        },
      }
    );
  };

  const statusChip = () => {
    if (isReplanning) return <span className="m2-chip">다시 짜는 중</span>;
    if (pending.length > 0) return <span className="m2-chip m2-chip-brand">수락 대기</span>;
    if (rejected.length > 0) return <span className="m2-chip m2-chip-berry">거절함</span>;
    if (planStatus === 'committed') return <span className="m2-chip m2-chip-ok">확정됨</span>;

    return <span className="m2-chip m2-chip-ok">수락함</span>;
  };

  const description = () => {
    if (isReplanning) return REPLAN_PENDING_TEXT;
    if (pending.length > 0) {
      return '포워더가 내 출하의 운송계획을 제안했습니다. 내용을 보고 수락하거나 사유를 적어 거절하세요.';
    }
    if (rejected.length > 0)
      return '거절을 보냈습니다. 포워더가 사유를 확인하고 계획을 다시 검토합니다.';
    if (planStatus === 'committed') return '모든 화주가 수락해 계획이 확정되었습니다.';

    return '수락했습니다. 다른 화주의 수락을 기다리고 있습니다.';
  };

  return (
    <section className="m2-card" aria-label="계획 확인">
      <div className="m2-card-h">
        <div className="min-w-0">
          <h2 className="m2-h2">계획 확인</h2>
          <p className="m2-sub">{description()}</p>
        </div>
        {statusChip()}
      </div>

      <div className="m2-lines mt-0">
        {planLabel ? (
          <div>
            <span>계획</span>
            <b className="m2-num">{planLabel}</b>
          </div>
        ) : null}
        <div>
          <span>내 출하</span>
          <b className="break-words">
            {lotIds.length > 0
              ? lotIds.map(id => labels.get(id) ?? '내 출하').join(', ')
              : '출하 정보 없음'}
          </b>
        </div>
        {rows
          .filter(({ decided_at }) => decided_at)
          .map(row => (
            <div key={`${row.round}:${row.shipper_id}`}>
              <span>{row.status === 'rejected' ? '거절한 시각' : '수락한 시각'}</span>
              <b className="m2-num">{fmtMonthDayTime(row.decided_at)}</b>
            </div>
          ))}
      </div>

      {rejected.map(row =>
        row.reason ? (
          <p key={row.shipper_id} className="m2-note m2-note-warn mt-3 break-words">
            내가 적은 사유: {row.reason}
          </p>
        ) : null
      )}

      {isReplanning && <ReplanPendingNotice className="mt-3" />}

      {(isOpen || showDetailLink) && (
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
          {showDetailLink && (
            <Link href={SHIPPER_PATHS.PLAN(planId)} className="m2-btn m2-btn-sec">
              계획 자세히 보기
              <ArrowRightIcon size={14} />
            </Link>
          )}
          {isOpen && (
            <>
              <button
                type="button"
                className="m2-btn m2-btn-sec"
                disabled={decide.isPending}
                aria-expanded={rejecting}
                aria-controls={reasonId}
                onClick={() => setRejecting(value => !value)}
              >
                거절
              </button>
              <button
                type="button"
                className="m2-btn m2-btn-pri"
                disabled={decide.isPending}
                onClick={() => submit(true)}
              >
                {pendingAccept === true ? '수락 중' : '계획 수락하기'}
              </button>
            </>
          )}
        </div>
      )}

      {isOpen && rejecting && (
        <form
          id={reasonId}
          className="m2-block mt-3 flex flex-col gap-2"
          onSubmit={event => {
            event.preventDefault();
            submit(false);
          }}
        >
          <label htmlFor={`${reasonId}-text`} className="text-[13px] font-semibold">
            거절 사유
          </label>
          <textarea
            id={`${reasonId}-text`}
            className="m2-inp h-auto min-h-[72px] w-full resize-y py-2.5 text-[13.5px]"
            placeholder="예: 그날 출하 장소 작업이 어려워요"
            value={reason}
            maxLength={REASON_MAX}
            onChange={event => setReason(event.target.value.slice(0, REASON_MAX))}
            disabled={decide.isPending}
            required
          />
          <p className="m2-sub mt-0 text-[12px]">
            사유는 담당 포워더에게 전달되고 다른 화주에게는 보이지 않습니다.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              className="m2-btn m2-btn-sec m2-btn-sm"
              disabled={decide.isPending}
              onClick={() => {
                setRejecting(false);
                setReason('');
              }}
            >
              닫기
            </button>
            <button
              type="submit"
              className="m2-btn m2-btn-sm bg-m2-berry-soft text-m2-berry-ink"
              disabled={decide.isPending || reason.trim() === ''}
            >
              {pendingAccept === false ? '보내는 중' : '거절 보내기'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
