import { Badge } from '@/components/ui/badge';
import type { LotStatusT } from '@/types/saas-platform';

export const LOT_STATUS_LABEL: Record<LotStatusT, string> = {
  registered: '등록',
  planned: '계획 배정',
  shipped: '선적',
  cancelled: '취소',
};

const LOT_STATUS_CLASS: Record<LotStatusT, string> = {
  registered: 'bg-brand',
  planned: 'bg-navy',
  shipped: 'bg-ok',
  cancelled: 'bg-slate',
};

export function LotStatusBadge({ status }: { status: LotStatusT }) {
  return <Badge className={LOT_STATUS_CLASS[status]}>{LOT_STATUS_LABEL[status]}</Badge>;
}
