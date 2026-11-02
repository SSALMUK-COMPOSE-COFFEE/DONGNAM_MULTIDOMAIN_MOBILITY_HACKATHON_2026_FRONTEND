import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ScenarioT, TwinStateT } from '@/types/api';
import { formatManwon, formatPercent } from '@/utils/format';
import { getShipperName } from '@/utils/scenario';

type LossLotTablePropsT = {
  lots: NonNullable<TwinStateT['loss']['lots']>;
  scenario: ScenarioT;
};

/** 이 컨테이너에 실린 화주별로 계획 손실 대비 센서 기준 예상 손실이 얼마나 늘었는지 */
export function LossLotTable({ lots, scenario }: LossLotTablePropsT) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>화주별 추가 손실</CardTitle>
        <CardDescription>계획에 넣은 손실률 대비 센서 기준 예상 손실 · 만 원</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>화주</TableHead>
              <TableHead className="text-right">파렛트</TableHead>
              <TableHead className="text-right">화물 가치</TableHead>
              <TableHead className="text-right">계획 손실</TableHead>
              <TableHead className="text-right">예상 손실</TableHead>
              <TableHead className="text-right">추가 손실</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lots.map(
              ({
                lot_id,
                shipper_id,
                pallets,
                lot_value,
                planned_loss_rate,
                planned_loss_krw,
                predicted_loss_rate,
                predicted_loss_krw,
                delta_krw,
              }) => (
                <TableRow key={lot_id} className="num">
                  <TableCell className="font-bold">
                    {getShipperName(scenario, shipper_id)}
                  </TableCell>
                  <TableCell className="text-right">{pallets}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatManwon(lot_value)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatManwon(planned_loss_krw)}
                    <span className="ml-1 text-xs text-muted-foreground">
                      {formatPercent(planned_loss_rate)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {formatManwon(predicted_loss_krw)}
                    <span className="ml-1 text-xs text-muted-foreground">
                      {formatPercent(predicted_loss_rate)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-bold text-berry">
                    +{formatManwon(delta_krw)}
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
