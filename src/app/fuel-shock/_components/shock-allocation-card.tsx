import { cn } from 'cn';
import { PlaneIcon } from 'lucide-react';

import { ContainerLoadBar, getShipperColor } from '@/components/container-load-bar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { FuelShockCaseT, ScenarioT } from '@/types/api';
import { getShipperShortName } from '@/utils/scenario';

const LOCATION_LABEL: Record<string, string> = {
  AIR: '항공',
  UNASSIGNED: '미배정',
};

const toLocationLabel = (location: string) => LOCATION_LABEL[location] ?? location;

type ShockAllocationCardPropsT = {
  shockCase: FuelShockCaseT;
  scenario: ScenarioT;
};

/** 고른 할증료에서 컨테이너별 적재와 항공으로 가는 물량, 기준 대비 옮겨진 로트 */
export function ShockAllocationCard({ shockCase, scenario }: ShockAllocationCardPropsT) {
  const { lots, containers, switches, plan_changed, air_pallets } = shockCase;
  const assignments = lots
    .filter(({ mode }) => mode === 'sea')
    .map(({ location, shipper_id, product_id, pallets }) => ({
      container_id: location,
      shipper_id,
      product_id,
      pallets,
    }));
  const airLots = lots.filter(({ mode }) => mode === 'air');
  const isSo2 = (productId: string) =>
    !!scenario.products.find(({ id }) => id === productId)?.so2_treated;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          컨테이너 배정
          {plan_changed && <Badge className="bg-ok">배정 바뀜</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-7">
        {containers.map(container => (
          <ContainerLoadBar
            key={container.container_id}
            container={container}
            plan={{ assignments }}
            scenario={scenario}
          />
        ))}

        <div className="flex items-center gap-4 rounded-2xl bg-panel px-5 py-4">
          <PlaneIcon className="size-5 text-air" />
          <p className="font-bold">
            항공 <span className="num text-air">{air_pallets}</span>파렛트
          </p>
          {airLots.length === 0 && <p className="text-muted-foreground">모두 해상 공동적재</p>}
          <div className="flex gap-4 text-sm">
            {airLots.map(({ lot_id, shipper_id, product_id, pallets }) => (
              <span key={lot_id} className="flex items-center gap-1.5">
                <span
                  className={cn(
                    'size-3 rounded-[2px]',
                    getShipperColor(scenario, shipper_id, isSo2(product_id))
                  )}
                />
                {getShipperShortName(scenario, shipper_id)} <span className="num">{pallets}</span>
              </span>
            ))}
          </div>
        </div>

        {switches.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {switches.map(({ lot_id, shipper_id, pallets, base, case: to }) => (
              <li key={lot_id}>
                <span className="font-bold">{getShipperShortName(scenario, shipper_id)}</span>{' '}
                <span className="num">{pallets}</span>파렛트 {toLocationLabel(base)} →{' '}
                <span className="font-bold text-brand">{toLocationLabel(to)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
