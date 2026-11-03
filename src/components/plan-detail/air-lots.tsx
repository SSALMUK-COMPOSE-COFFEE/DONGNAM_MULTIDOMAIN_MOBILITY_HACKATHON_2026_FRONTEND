import { cn } from 'cn';
import { PlaneIcon } from 'lucide-react';

import { getShipperColor } from '@/components/container-load-bar';
import type { PlanT, ScenarioT } from '@/types/api';
import { getOtherShipperLabel, getProductName, getShipperShortName } from '@/utils/scenario';

const OTHER_SHIPPER_COLOR = 'bg-slate';

type AirLotsPropsT = {
  plan: Pick<PlanT, 'assignments'>;
  scenario: ScenarioT;
  viewerShipperId?: string;
  lotLabel?: (lotId: string) => string;
  productLabel?: (productName: string) => string;
};

export const getAirAssignments = (plan: Pick<PlanT, 'assignments'>) =>
  plan.assignments.filter(({ mode }) => mode === 'air');

export function AirLots({
  plan,
  scenario,
  viewerShipperId,
  lotLabel,
  productLabel,
}: AirLotsPropsT) {
  const airAssignments = getAirAssignments(plan);

  if (airAssignments.length === 0) return null;

  const airPallets = airAssignments.reduce((sum, { pallets }) => sum + pallets, 0);
  const isSo2 = (productId: string) =>
    !!scenario.products.find(({ id }) => id === productId)?.so2_treated;

  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-panel px-5 py-4">
      <p className="flex items-center gap-2 font-bold">
        <PlaneIcon className="size-5 text-air" />
        항공 <span className="num text-air">{airPallets}</span>파렛트
        <span className="text-sm font-medium text-muted-foreground">
          컨테이너에 싣지 않고 항공으로 보냄
        </span>
      </p>
      <ul className="flex flex-col gap-1.5 text-sm">
        {airAssignments.map(({ lot_id, shipper_id, product_id, pallets }) => {
          const isOwn = !viewerShipperId || shipper_id === viewerShipperId;

          return (
            <li key={lot_id} className="flex items-center gap-2">
              <span
                className={cn(
                  'size-3 rounded-[2px]',
                  isOwn
                    ? getShipperColor(scenario, shipper_id, isSo2(product_id))
                    : OTHER_SHIPPER_COLOR
                )}
              />
              <span className="font-bold">
                {isOwn
                  ? getShipperShortName(scenario, shipper_id)
                  : getOtherShipperLabel(scenario, shipper_id)}
              </span>
              <span>
                {productLabel
                  ? productLabel(getProductName(scenario, product_id))
                  : getProductName(scenario, product_id)}
              </span>
              <span className="num">{pallets}파렛트</span>
              {isOwn && (
                <span className="num text-muted-foreground">
                  {lotLabel ? lotLabel(lot_id) : lot_id}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
