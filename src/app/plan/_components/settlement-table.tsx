import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ContainerSettlementT, ScenarioT } from '@/types/api';
import { formatManwon } from '@/utils/format';
import { getShipperName } from '@/utils/scenario';

/** 정산 근거. 딸기는 팀 확정 정산표 단가, 포도는 최적화 운영비 기준이다 */
const BASIS_LABEL: Record<string, string> = {
  tariff: '정산표 단가',
  operational: '운영비 기준',
};

type SettlementTablePropsT = {
  containerSettlements: ContainerSettlementT[];
  scenario: ScenarioT;
};

export function SettlementTable({ containerSettlements, scenario }: SettlementTablePropsT) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>화주별 총비용 절감액</CardTitle>
        <CardDescription>항공으로 혼자 보낼 때 대비 · 성과보수 25% · 만 원</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>화주</TableHead>
              <TableHead className="text-right">파렛트</TableHead>
              <TableHead className="text-right">항공 기준</TableHead>
              <TableHead className="text-right">공동적재</TableHead>
              <TableHead className="text-right">절감</TableHead>
              <TableHead className="text-right">수수료</TableHead>
              <TableHead className="text-right">화주 몫</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {containerSettlements.map(container => (
              <ContainerRows
                key={container.container_id}
                container={container}
                scenario={scenario}
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ContainerRows({
  container,
  scenario,
}: {
  container: ContainerSettlementT;
  scenario: ScenarioT;
}) {
  const basis = container.shippers[0]?.basis ?? '';

  return (
    <>
      <TableRow className="bg-panel hover:bg-panel">
        <TableCell colSpan={7} className="font-bold text-navy">
          {container.container_id}
          <span className="ml-2 text-xs font-medium text-muted-foreground">
            {container.pallets}/{container.capacity_pallets} 파렛트 · {BASIS_LABEL[basis] ?? basis}
          </span>
        </TableCell>
      </TableRow>
      {container.shippers.map(
        ({ shipper_id, pallets, baseline_cost, shared_cost, savings, fee, shipper_gain }) => (
          <TableRow key={shipper_id}>
            <TableCell>{getShipperName(scenario, shipper_id)}</TableCell>
            <TableCell className="text-right num">{pallets}</TableCell>
            <TableCell className="text-right num text-muted-foreground">
              {formatManwon(baseline_cost)}
            </TableCell>
            <TableCell className="text-right num">{formatManwon(shared_cost)}</TableCell>
            <TableCell className="text-right font-semibold num">{formatManwon(savings)}</TableCell>
            <TableCell className="text-right num">{formatManwon(fee)}</TableCell>
            <TableCell className="text-right font-semibold num text-ok">
              {formatManwon(shipper_gain)}
            </TableCell>
          </TableRow>
        )
      )}
      <TableRow className="font-bold">
        <TableCell colSpan={4} className="text-right text-muted-foreground">
          {container.container_id} 합계
        </TableCell>
        <TableCell className="text-right num text-brand">
          {formatManwon(container.total_savings)}
        </TableCell>
        <TableCell className="text-right num">{formatManwon(container.total_fee)}</TableCell>
        <TableCell className="text-right num text-ok">
          {formatManwon(container.total_shipper_gain)}
        </TableCell>
      </TableRow>
    </>
  );
}
