import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { ContainerLoadT, ScenarioT, SchemaT } from '@/types/api';
import { formatPercent } from '@/utils/format';

type ContainerCardPropsT = {
  container: ContainerLoadT;
  assignments: SchemaT<'Assignment'>[];
  scenario: ScenarioT;
};

export function ContainerCard({ container, assignments, scenario }: ContainerCardPropsT) {
  const loads = assignments.filter(({ container_id }) => container_id === container.container_id);
  const voyage = scenario.voyages.find(({ id }) => id === container.voyage_id);
  const productNames = container.product_ids.map(
    productId => scenario.products.find(({ id }) => id === productId)?.name ?? productId
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {container.container_id}
          {productNames.map(name => (
            <Badge key={name} variant="secondary">
              {name}
            </Badge>
          ))}
        </CardTitle>
        <CardDescription className="num">
          {voyage ? `${voyage.vessel_name} · ${voyage.destination} · ` : ''}
          {container.pallets} / {container.capacity_pallets} 파렛트 ·{' '}
          {formatPercent(container.utilization, 0)}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <Progress value={container.utilization * 100} />
        <div className="flex flex-wrap gap-2">
          {loads.map(({ lot_id, shipper_id, pallets }) => (
            <Badge key={lot_id} variant="outline">
              {scenario.shippers.find(({ id }) => id === shipper_id)?.name ?? shipper_id}
              <span className="num">{pallets}</span>
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
