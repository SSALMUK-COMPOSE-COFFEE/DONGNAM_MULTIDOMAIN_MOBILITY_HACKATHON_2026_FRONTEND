import { Badge } from '@/components/ui/badge';

const PLAN_STATUS: Record<string, { label: string; className: string }> = {
  committed: { label: '확정', className: 'bg-ok' },
  pending_confirmation: { label: '확정 대기', className: 'bg-air' },
};

export function PlanStatusBadge({ status }: { status: string }) {
  const { label, className } = PLAN_STATUS[status] ?? { label: status, className: 'bg-slate' };

  return <Badge className={className}>{label}</Badge>;
}
