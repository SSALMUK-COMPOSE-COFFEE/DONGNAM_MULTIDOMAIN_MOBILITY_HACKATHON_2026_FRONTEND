import { PalletBar } from '@/components/pallet-bar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ContainerLoadT, ScenarioT, SchemaT } from '@/types/api';

/** 같은 컨테이너 안의 화주 색. 딸기는 파랑 계열, SO2 처리 포도는 보라 계열 */
const SHIPPER_COLORS = ['bg-navy', 'bg-brand', 'bg-cyan'];
const SO2_SHIPPER_COLORS = ['bg-grape', 'bg-grape-soft'];

type ContainerCardPropsT = {
  containers: ContainerLoadT[];
  assignments: SchemaT<'Assignment'>[];
  scenario: ScenarioT;
};

export function ContainerCard({ containers, assignments, scenario }: ContainerCardPropsT) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>컨테이너 배정</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-7">
        {containers.map(container => (
          <ContainerLoad
            key={container.container_id}
            container={container}
            assignments={assignments}
            scenario={scenario}
          />
        ))}
        <p className="text-sm text-muted-foreground">딸기·포도는 한 컨테이너에 섞지 않음</p>
      </CardContent>
    </Card>
  );
}

function ContainerLoad({
  container,
  assignments,
  scenario,
}: {
  container: ContainerLoadT;
  assignments: SchemaT<'Assignment'>[];
  scenario: ScenarioT;
}) {
  const loads = assignments.filter(({ container_id }) => container_id === container.container_id);
  const voyage = scenario.voyages.find(({ id }) => id === container.voyage_id);
  const port = scenario.ports.find(({ id }) => id === voyage?.destination);
  const products = container.product_ids.map(productId =>
    scenario.products.find(({ id }) => id === productId)
  );
  const productNames = products.map(
    (product, index) => product?.name ?? container.product_ids[index]
  );
  const colors = products.some(product => product?.so2_treated)
    ? SO2_SHIPPER_COLORS
    : SHIPPER_COLORS;

  const segments = loads.map(({ lot_id, shipper_id, pallets }, index) => {
    const shipperName = scenario.shippers.find(({ id }) => id === shipper_id)?.name ?? shipper_id;

    return {
      key: lot_id,
      // '진주 딸기 수출농가 A' → '진주'
      label: shipperName.split(' ')[0],
      pallets,
      colorClassName: colors[index % colors.length],
    };
  });

  return (
    <PalletBar
      title={[...productNames, port?.name, container.container_id].filter(Boolean).join(' · ')}
      description={voyage?.vessel_name}
      capacity={container.capacity_pallets}
      segments={segments}
    />
  );
}
