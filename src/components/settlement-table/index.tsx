import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ContainerSettlementT, ScenarioT, SettlementT } from '@/types/api';
import { formatManwon } from '@/utils/format';
import { getOtherShipperLabel, getShipperName } from '@/utils/scenario';

/** 정산 근거. 딸기는 팀 확정 정산표 단가, 포도는 최적화 운영비 기준이다 */
const BASIS_LABEL: Record<string, string> = {
  tariff: '정산표 단가',
  operational: '운영비 기준',
  mixed: '혼합',
};
type SettlementTablePropsT = {
  containerSettlements: ContainerSettlementT[];
  scenario: ScenarioT;
  viewerShipperId?: string;
  airSettlements?: SettlementT[];
};

type AirSettlementRowT = Omit<SettlementT, 'sea_pallets' | 'air_pallets' | 'basis'> & {
  pallets: number;
};

const toAirRows = (
  settlements: SettlementT[],
  containerSettlements: ContainerSettlementT[]
): AirSettlementRowT[] =>
  settlements
    .filter(({ air_pallets }) => air_pallets > 0)
    .map(settlement => {
      const seaRows = containerSettlements.flatMap(({ shippers }) =>
        shippers.filter(({ shipper_id }) => shipper_id === settlement.shipper_id)
      );
      const seaSum = (key: 'baseline_cost' | 'shared_cost' | 'savings' | 'fee' | 'shipper_gain') =>
        seaRows.reduce((sum, row) => sum + row[key], 0);

      return {
        shipper_id: settlement.shipper_id,
        pallets: settlement.air_pallets,
        baseline_cost: settlement.baseline_cost - seaSum('baseline_cost'),
        shared_cost: settlement.shared_cost - seaSum('shared_cost'),
        savings: settlement.savings - seaSum('savings'),
        fee: settlement.fee - seaSum('fee'),
        shipper_gain: settlement.shipper_gain - seaSum('shipper_gain'),
      };
    });

export function SettlementTable({
  containerSettlements,
  scenario,
  viewerShipperId,
  airSettlements = [],
}: SettlementTablePropsT) {
  const airRows = toAirRows(airSettlements, containerSettlements);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          화주별 총비용 절감액
          <span className="ml-2 text-base font-medium text-muted-foreground">만 원</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>화주</TableHead>
              <TableHead className="text-right">파렛트</TableHead>
              <TableHead className="text-right">혼자 항공</TableHead>
              <TableHead className="text-right">공동적재</TableHead>
              <TableHead className="text-right">절감</TableHead>
              <TableHead className="text-right">수수료 25%</TableHead>
              <TableHead className="text-right">화주 몫</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {containerSettlements.map(container => (
              <ContainerRows
                key={container.container_id}
                container={container}
                scenario={scenario}
                viewerShipperId={viewerShipperId}
              />
            ))}
            {airRows.length > 0 && (
              <AirRows rows={airRows} scenario={scenario} viewerShipperId={viewerShipperId} />
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ContainerRows({
  container,
  scenario,
  viewerShipperId,
}: {
  container: ContainerSettlementT;
  scenario: ScenarioT;
  viewerShipperId?: string;
}) {
  const basis = container.shippers[0]?.basis ?? '';

  return (
    <>
      <TableRow className="bg-panel hover:bg-panel">
        <TableCell colSpan={7} className="font-bold text-navy">
          {container.container_id}
          <span className="ml-2 text-sm font-medium text-muted-foreground">
            {container.pallets}/{container.capacity_pallets} 파렛트 · {BASIS_LABEL[basis] ?? basis}
          </span>
        </TableCell>
      </TableRow>
      {container.shippers.map(
        ({ shipper_id, pallets, baseline_cost, shared_cost, savings, fee, shipper_gain }) => (
          <TableRow key={shipper_id}>
            <TableCell>
              {!viewerShipperId || shipper_id === viewerShipperId
                ? getShipperName(scenario, shipper_id)
                : getOtherShipperLabel(scenario, shipper_id)}
            </TableCell>
            <TableCell className="text-right num">{pallets}</TableCell>
            <TableCell className="text-right num text-muted-foreground">
              {formatManwon(baseline_cost)}
            </TableCell>
            <TableCell className="text-right num">{formatManwon(shared_cost)}</TableCell>
            <TableCell className="text-right font-bold num text-ok">
              {formatManwon(savings)}
            </TableCell>
            <TableCell className="text-right num">{formatManwon(fee)}</TableCell>
            <TableCell className="text-right num">{formatManwon(shipper_gain)}</TableCell>
          </TableRow>
        )
      )}
      <TableRow className="font-bold">
        <TableCell colSpan={4} className="text-right text-muted-foreground">
          {container.container_id} 합계
        </TableCell>
        <TableCell className="text-right num text-ok">
          {formatManwon(container.total_savings)}
        </TableCell>
        <TableCell className="text-right num">{formatManwon(container.total_fee)}</TableCell>
        <TableCell className="text-right num">
          {formatManwon(container.total_shipper_gain)}
        </TableCell>
      </TableRow>
    </>
  );
}

function AirRows({
  rows,
  scenario,
  viewerShipperId,
}: {
  rows: AirSettlementRowT[];
  scenario: ScenarioT;
  viewerShipperId?: string;
}) {
  const pallets = rows.reduce((sum, row) => sum + row.pallets, 0);

  return (
    <>
      <TableRow className="bg-panel hover:bg-panel">
        <TableCell colSpan={7} className="font-bold text-air">
          항공
          <span className="ml-2 text-sm font-medium text-muted-foreground">
            {pallets} 파렛트 · 공동적재 없이 단독 항공 운임
          </span>
        </TableCell>
      </TableRow>
      {rows.map(
        ({ shipper_id, pallets, baseline_cost, shared_cost, savings, fee, shipper_gain }) => (
          <TableRow key={shipper_id}>
            <TableCell>
              {!viewerShipperId || shipper_id === viewerShipperId
                ? getShipperName(scenario, shipper_id)
                : getOtherShipperLabel(scenario, shipper_id)}
            </TableCell>
            <TableCell className="text-right num">{pallets}</TableCell>
            <TableCell className="text-right num text-muted-foreground">
              {formatManwon(baseline_cost)}
            </TableCell>
            <TableCell className="text-right num">{formatManwon(shared_cost)}</TableCell>
            <TableCell className="text-right font-bold num">{formatManwon(savings)}</TableCell>
            <TableCell className="text-right num">{formatManwon(fee)}</TableCell>
            <TableCell className="text-right num">{formatManwon(shipper_gain)}</TableCell>
          </TableRow>
        )
      )}
    </>
  );
}
