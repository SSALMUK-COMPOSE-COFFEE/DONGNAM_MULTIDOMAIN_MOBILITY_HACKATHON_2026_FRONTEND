import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

export function LossLotTable({ lots, scenario }: LossLotTablePropsT) {
  const totalDeltaKrw = lots.reduce((sum, lot) => sum + lot.delta_krw, 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2.5">
            <span>화주별 추가 손실</span>
            <span className="text-base font-medium text-muted-foreground">단위: 만 원</span>
            <Badge variant="secondary" className="text-navy">
              계획 단전 허용 시간(가정) 이내 손실 미반영 · 초과 단전분만 반영
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">컨테이너 총 추가 손실</span>
            <span className="text-xl font-black num text-berry">
              +{formatManwon(totalDeltaKrw)}만 원
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>화주</TableHead>
              <TableHead className="text-right">파렛트</TableHead>
              <TableHead className="text-right">화물 가치</TableHead>
              <TableHead className="text-right">계획 손실 (계획 단전 내)</TableHead>
              <TableHead className="text-right">예상 손실 (초과 단전 반영)</TableHead>
              <TableHead className="text-right">초과 단전 추가 손실</TableHead>
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
                  <TableCell className="font-bold text-navy">
                    {getShipperName(scenario, shipper_id)}
                  </TableCell>
                  <TableCell className="text-right">{pallets}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatManwon(lot_value)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatManwon(planned_loss_krw)}
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      ({formatPercent(planned_loss_rate)})
                    </span>
                  </TableCell>
                  <TableCell className="text-right font-semibold text-navy">
                    {formatManwon(predicted_loss_krw)}
                    <span className="ml-1.5 text-xs text-muted-foreground">
                      ({formatPercent(predicted_loss_rate)})
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
