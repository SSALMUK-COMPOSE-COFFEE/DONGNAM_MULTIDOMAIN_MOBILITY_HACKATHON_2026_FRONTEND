import { cn } from 'cn';

import { ContainerCard } from '@/components/plan-detail/container-card';
import { PickupMap } from '@/components/plan-detail/pickup-map';
import { PlanSummary } from '@/components/plan-detail/plan-summary';
import { TariffCard } from '@/components/plan-detail/tariff-card';
import { SettlementTable } from '@/components/settlement-table';
import type { PlanSessionT } from '@/types/api';

type PlanDetailPropsT = {
  session: PlanSessionT;
  viewerShipperId?: string;
  isResponsive?: boolean;
};

export function PlanDetail({ session, viewerShipperId, isResponsive = false }: PlanDetailPropsT) {
  const { plan, scenario } = session;

  return (
    <div className={cn('flex flex-col gap-6', isResponsive && '@container')}>
      <PlanSummary plan={plan} />

      <div
        className={cn(
          'grid gap-6',
          isResponsive
            ? 'grid-cols-1 @min-[1200px]:grid-cols-[minmax(0,1fr)_560px]'
            : 'grid-cols-[1fr_560px]'
        )}
      >
        <div className="flex flex-col gap-6">
          <ContainerCard plan={plan} scenario={scenario} viewerShipperId={viewerShipperId} />
          <SettlementTable
            containerSettlements={plan.container_settlements ?? []}
            scenario={scenario}
            viewerShipperId={viewerShipperId}
          />
        </div>

        <div className="flex flex-col gap-6">
          {plan.settlement_tariffs?.map(tariff => (
            <TariffCard key={tariff.product_id} tariff={tariff} scenario={scenario} />
          ))}
          <PickupMap scenario={scenario} voyagePickups={session.routes} />
        </div>
      </div>
    </div>
  );
}
