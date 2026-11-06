import { cn } from 'cn';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { FuelShockCaseT, ScenarioT } from '@/types/api';
import { formatManwon, formatSignedManwon } from '@/utils/format';
import { getShipperName } from '@/utils/scenario';

type ShockShipperTablePropsT = {
  shockCase: FuelShockCaseT;
  scenario: ScenarioT;
};

/** 할증료가 오르면 항공 기준 비용이 커져 같은 공동적재라도 화주별 절감이 늘어난다 */
export function ShockShipperTable({ shockCase, scenario }: ShockShipperTablePropsT) {
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
              <TableHead className="text-right">해상</TableHead>
              <TableHead className="text-right">항공</TableHead>
              <TableHead className="text-right">혼자 항공</TableHead>
              <TableHead className="text-right">공동적재</TableHead>
              <TableHead className="text-right">절감</TableHead>
              <TableHead className="text-right">수수료 25%</TableHead>
              <TableHead className="text-right">화주 몫</TableHead>
              <TableHead className="text-right">기준 대비 절감</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shockCase.shippers.map(
              ({
                shipper_id,
                sea_pallets,
                air_pallets,
                baseline_cost,
                plan_cost,
                savings,
                fee,
                shipper_gain,
                savings_delta,
              }) => (
                <TableRow key={shipper_id} className="num">
                  <TableCell className="font-bold">
                    {getShipperName(scenario, shipper_id)}
                  </TableCell>
                  <TableCell className="text-right">{sea_pallets}</TableCell>
                  <TableCell className={cn('text-right', air_pallets > 0 && 'font-bold text-air')}>
                    {air_pallets}
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatManwon(baseline_cost)}
                  </TableCell>
                  <TableCell className="text-right">{formatManwon(plan_cost)}</TableCell>
                  <TableCell className="text-right font-bold">{formatManwon(savings)}</TableCell>
                  <TableCell className="text-right">{formatManwon(fee)}</TableCell>
                  <TableCell className="text-right">{formatManwon(shipper_gain)}</TableCell>
                  <TableCell className={cn('text-right font-bold', savings_delta > 0 && 'text-ok')}>
                    {formatSignedManwon(savings_delta)}
                  </TableCell>
                </TableRow>
              )
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
