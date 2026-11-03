import { cn } from 'cn';

import {
  AWAITING_SHIPPERS_STATUS,
  type PlanConfirmationStateT,
  confirmationCounts,
} from '@/apis/saas/platform-confirm';

const PLAN_STATUS: Record<string, { label: string; className: string }> = {
  committed: { label: '확정', className: 'm2-chip-ok' },
  pending_confirmation: { label: '확정 대기', className: 'm2-chip-warn' },
  pending_shipper_confirmation: { label: '화주 확인 대기', className: 'm2-chip-warn' },
};

type PlanStatusBadgePropsT = {
  status: string;
  confirmation?: PlanConfirmationStateT | null;
};

export function PlanStatusBadge({ status, confirmation = null }: PlanStatusBadgePropsT) {
  const { label, className } = PLAN_STATUS[status] ?? { label: status, className: '' };
  const counts = confirmationCounts(confirmation);
  const showCounts = status === AWAITING_SHIPPERS_STATUS && counts.total > 0;

  return (
    <>
      <span className={cn('m2-chip m2-num', className)}>
        {showCounts ? `${label} ${counts.accepted}/${counts.total}` : label}
      </span>
      {confirmation?.needs_replan ? (
        <span className="m2-chip m2-chip-berry">재계획 필요</span>
      ) : null}
      {!confirmation?.needs_replan && counts.rejected > 0 ? (
        <span className="m2-chip m2-chip-berry">거절 {counts.rejected}</span>
      ) : null}
    </>
  );
}
