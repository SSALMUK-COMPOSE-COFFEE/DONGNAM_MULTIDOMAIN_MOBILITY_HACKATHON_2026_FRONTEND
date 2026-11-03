import { ContainerCard } from '@/components/plan-detail/container-card';
import { PickupMap } from '@/components/plan-detail/pickup-map';
import { PlanSummary } from '@/components/plan-detail/plan-summary';
import { TariffCard } from '@/components/plan-detail/tariff-card';
import { SettlementTable } from '@/components/settlement-table';
import type { PlanSessionT } from '@/types/api';

type PlanDetailPropsT = {
  session: PlanSessionT;
  viewerShipperId?: string;
};

export function PlanDetail({ session, viewerShipperId }: PlanDetailPropsT) {
  const { plan, scenario } = session;

  return (
    <div className="flex flex-col gap-6">
      <PlanSummary plan={plan} />

      <div className="grid grid-cols-[1fr_560px] gap-6">
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
