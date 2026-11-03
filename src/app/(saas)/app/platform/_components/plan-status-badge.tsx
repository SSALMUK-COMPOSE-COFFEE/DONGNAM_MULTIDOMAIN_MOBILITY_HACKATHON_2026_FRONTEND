import { cn } from 'cn';

const PLAN_STATUS: Record<string, { label: string; className: string }> = {
  committed: { label: '확정', className: 'm2-chip-ok' },
  pending_confirmation: { label: '확정 대기', className: 'm2-chip-warn' },
};

export function PlanStatusBadge({ status }: { status: string }) {
  const { label, className } = PLAN_STATUS[status] ?? { label: status, className: '' };

  return <span className={cn('m2-chip', className)}>{label}</span>;
}
