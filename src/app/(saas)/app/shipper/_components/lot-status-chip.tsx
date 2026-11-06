import { cn } from 'cn';

import { LOT_STATUS_LABEL } from '@/app/(saas)/app/shipper/_components/labels';
import type { ShipperLotStatusT } from '@/types/saas-shipper';

const STATUS_CHIP: Record<ShipperLotStatusT, string> = {
  registered: '',
  planned: 'm2-chip-navy',
  shipped: 'm2-chip-ok',
  cancelled: 'opacity-70',
};

export function LotStatusChip({
  status,
  awaitingConfirm = false,
}: {
  status: ShipperLotStatusT;
  awaitingConfirm?: boolean;
}) {
  if (status === 'planned' && awaitingConfirm) {
    return <span className="m2-chip m2-chip-brand">계획 확정 대기</span>;
  }

  return <span className={cn('m2-chip', STATUS_CHIP[status])}>{LOT_STATUS_LABEL[status]}</span>;
}
