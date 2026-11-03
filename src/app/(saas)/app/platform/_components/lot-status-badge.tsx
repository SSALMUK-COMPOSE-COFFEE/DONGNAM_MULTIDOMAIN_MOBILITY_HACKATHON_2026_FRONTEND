import { cn } from 'cn';

import type { LotStatusT } from '@/types/saas-platform';

export const LOT_STATUS_LABEL: Record<LotStatusT, string> = {
  registered: '등록',
  planned: '계획 포함',
  shipped: '출하',
  cancelled: '취소',
};

const LOT_STATUS_CLASS: Record<LotStatusT, string> = {
  registered: 'm2-chip-brand',
  planned: 'm2-chip-navy',
  shipped: 'm2-chip-ok',
  cancelled: '',
};

export function LotStatusBadge({ status }: { status: LotStatusT }) {
  return (
    <span className={cn('m2-chip', LOT_STATUS_CLASS[status])}>{LOT_STATUS_LABEL[status]}</span>
  );
}
