import { ContainerLoadBar } from '@/components/container-load-bar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PlanT, ScenarioT } from '@/types/api';

type ContainerCardPropsT = {
  plan: PlanT;
  scenario: ScenarioT;
};

export function ContainerCard({ plan, scenario }: ContainerCardPropsT) {
  const usedContainers = plan.containers.filter(({ used }) => used);

  return (
    <Card>
      <CardHeader>
        <CardTitle>컨테이너 배정</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-7">
        {usedContainers.map(container => (
          <ContainerLoadBar
            key={container.container_id}
            container={container}
            plan={plan}
            scenario={scenario}
          />
        ))}
        <p className="text-sm text-muted-foreground">딸기·포도는 한 컨테이너에 섞지 않음</p>
      </CardContent>
    </Card>
  );
}
