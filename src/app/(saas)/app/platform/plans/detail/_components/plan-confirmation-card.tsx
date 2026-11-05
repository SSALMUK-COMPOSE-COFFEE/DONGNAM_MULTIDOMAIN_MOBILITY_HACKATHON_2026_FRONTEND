'use client';

import { cn } from 'cn';

import { useIsSandbox, useMe } from '@/apis/saas/auth';
import { saasErrorDetail, saasErrorStatus } from '@/apis/saas/errors';
import { useForwarderConfirmation } from '@/apis/saas/forwarder';
import {
  useForwarderAutoAcceptConfirmation,
  useForwarderRecomputeWithoutRejected,
} from '@/apis/saas/forwarder-operations';
import {
  AWAITING_SHIPPERS_STATUS,
  type PlanConfirmationStatusT,
  confirmationCounts,
} from '@/apis/saas/platform-confirm';
import { QueryError } from '@/app/(saas)/app/platform/_components/query-error';
import { scrollToReplanCandidates } from '@/app/(saas)/app/platform/plans/detail/_components/replan-gate';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import type { SaasPlanSessionT } from '@/types/api-saas';
import { formatKstMonthDayTime } from '@/utils/kst';
import { getShipperName } from '@/utils/scenario';

const STATUS_CHIP: Record<PlanConfirmationStatusT, { label: string; className: string }> = {
  pending: { label: '확인 대기', className: 'm2-chip-warn' },
  accepted: { label: '수락', className: 'm2-chip-ok' },
  rejected: { label: '거절', className: 'm2-chip-berry' },
};

export function PlanConfirmationCard({ session }: { session: SaasPlanSessionT }) {
  const me = useMe();
  if (me.data?.active_org.org_type !== 'forwarder') return null;
  return <ForwarderPlanConfirmationCard session={session} />;
}

function ForwarderPlanConfirmationCard({ session }: { session: SaasPlanSessionT }) {
  const planId = session.plan_id;
  const query = useForwarderConfirmation(planId);
  const isSandbox = useIsSandbox();
  const autoAccept = useForwarderAutoAcceptConfirmation(planId);
  const recompute = useForwarderRecomputeWithoutRejected(planId);
  const state = query.data ?? null;
  const counts = confirmationCounts(state);
  const planStatus = state?.status ?? session.status;
  const isAwaiting = planStatus === AWAITING_SHIPPERS_STATUS;
  const isCommitted = planStatus === 'committed';
  const isBusy = autoAccept.isPending || recompute.isPending;
  const recomputeConflict =
    recompute.isError && saasErrorStatus(recompute.error) === 409
      ? (saasErrorDetail(recompute.error) ?? '지금은 거절한 화주를 빼고 다시 짤 수 없습니다.')
      : null;
  const hasRejectedCandidate = !!state?.replan_candidates.some(
    ({ source }) => source === 'shipper_rejected'
  );

  const summary = () => {
    if (!state) return '화주별 계획 수락 여부를 불러오는 중입니다.';
    if (counts.total === 0) {
      return isCommitted
        ? '이 계획은 화주 확인 단계 없이 확정되었습니다.'
        : '이 계획은 화주 확인 단계가 없습니다. 실행 지시 확정을 기다립니다.';
    }
    if (isAwaiting) {
      return `참여 화주 ${counts.total}곳 중 ${counts.accepted}곳이 수락했습니다. 전원이 수락하면 계획이 확정되어 실행을 준비할 수 있습니다.`;
    }
    if (counts.rejected > 0) return `화주 ${counts.rejected}곳이 거절했습니다. 다시 짜야 합니다.`;

    if (isCommitted) return `참여 화주 ${counts.total}곳이 모두 수락해 확정되었습니다.`;

    return `참여 화주 ${counts.total}곳이 모두 수락했습니다. 실행 지시 확정을 기다립니다.`;
  };

  return (
    <section className="m2-card" aria-label="화주 확인">
      <div className="m2-card-h">
        <div className="min-w-0">
          <h2 className="m2-h2">화주 확인</h2>
          <p className="m2-sub">{summary()}</p>
        </div>
        {state && counts.total > 0 ? (
          <span
            className={cn(
              'm2-chip m2-num shrink-0',
              isAwaiting && 'm2-chip-warn',
              !isAwaiting && counts.rejected === 0 && 'm2-chip-ok',
              !isAwaiting && counts.rejected > 0 && 'm2-chip-berry'
            )}
          >
            {isAwaiting ? `화주 확인 대기 ${counts.accepted}/${counts.total}` : '화주 확인 끝'}
          </span>
        ) : null}
      </div>

      {query.isPending && <Skeleton className="h-24 w-full rounded-[14px]" />}
      {query.isError && (
        <QueryError
          error={query.error}
          subject="화주 확인 현황을"
          onRetry={() => query.refetch()}
          isRetrying={query.isFetching}
        />
      )}

      {state && counts.total > 0 && (
        <ul className="flex flex-col gap-2" aria-label="화주별 수락 여부">
          {state.confirmations.map(row => {
            const chip = STATUS_CHIP[row.status];

            return (
              <li key={`${row.round}:${row.shipper_id}`} className="m2-block flex flex-col gap-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <b className="min-w-0 text-[13.5px] break-words">
                    {getShipperName(session.scenario, row.shipper_id)}
                  </b>
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className={cn('m2-chip', chip.className)}>{chip.label}</span>
                    {row.auto_accepted ? <span className="m2-chip">자동 수락</span> : null}
                  </span>
                </div>
                <span className="m2-num text-[11.5px] text-m2-muted">
                  출하 {row.lot_ids.length}건
                  {row.decided_at ? ` · ${formatKstMonthDayTime(row.decided_at)}` : ''}
                </span>
                {row.status === 'rejected' && row.reason ? (
                  <p className="m2-note m2-note-warn mt-1 text-[12.5px] break-words">
                    사유: {row.reason}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      {state && (counts.pending > 0 || counts.rejected > 0) && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {isSandbox && counts.pending > 0 && (
            <button
              type="button"
              className="m2-btn m2-btn-pri"
              disabled={isBusy}
              onClick={() => autoAccept.mutate()}
            >
              {autoAccept.isPending ? '수락 처리 중' : '전원 자동 수락'}
            </button>
          )}
          {counts.rejected > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button type="button" className="m2-btn m2-btn-sec" disabled={isBusy}>
                  {recompute.isPending ? '다시 짜는 중' : '거절한 화주 빼고 다시 짜기'}
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>거절한 화주를 빼고 다시 짤까요?</AlertDialogTitle>
                  <AlertDialogDescription>
                    거절한 화주의 출하를 계획에서 빼고 배정·집하 경로·정산을 다시 계산합니다. 남은
                    화주에게 새 확인 요청이 갑니다.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>취소</AlertDialogCancel>
                  <AlertDialogAction onClick={() => recompute.mutate({ auto_accept: false })}>
                    다시 짜기
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          {isSandbox && counts.pending > 0 && (
            <span className="m2-sub mt-0 text-[12px]">데모 환경에서만 보이는 버튼입니다.</span>
          )}
        </div>
      )}

      {recomputeConflict && (
        <div
          className="m2-note m2-note-warn mt-3 flex-col items-start gap-2 text-[12.5px]"
          role="alert"
        >
          <p className="break-words">{recomputeConflict}</p>
          {hasRejectedCandidate ? (
            <>
              <p>
                아래 &lsquo;재계획이 필요합니다&rsquo; 카드에서 거절한 화주 후보의 &lsquo;취소 ·
                다시 짜기&rsquo;로 거절한 화주를 뺄 수 있습니다. 이 안을 적용하면 거절한 화주의 취소
                부담금은 면제됩니다.
              </p>
              <button
                type="button"
                className="m2-btn m2-btn-sec m2-btn-sm"
                onClick={scrollToReplanCandidates}
              >
                재계획 후보로 이동
              </button>
            </>
          ) : (
            <p>재계획 후보가 생기면 아래 재최적화 영역에 나타납니다.</p>
          )}
        </div>
      )}
    </section>
  );
}
