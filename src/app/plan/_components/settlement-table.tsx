import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ScenarioT, SchemaT } from '@/types/api';
import { formatManwon } from '@/utils/format';

type SettlementTablePropsT = {
  settlements: SchemaT<'Settlement'>[];
  scenario: ScenarioT;
};

export function SettlementTable({ settlements, scenario }: SettlementTablePropsT) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>화주별 실제 절감액</CardTitle>
        <CardDescription>운임 + 집하·보관비 + 품질 손실 위험 기준 · 만 원</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>화주</TableHead>
              <TableHead className="text-right">아낀 돈</TableHead>
              <TableHead className="text-right">수수료</TableHead>
              <TableHead className="text-right">화주 몫</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {settlements.map(({ shipper_id, savings, fee, shipper_gain }) => (
              <TableRow key={shipper_id}>
                <TableCell>
                  {scenario.shippers.find(({ id }) => id === shipper_id)?.name ?? shipper_id}
                </TableCell>
                <TableCell className="text-right num">{formatManwon(savings)}</TableCell>
                <TableCell className="text-right num">{formatManwon(fee)}</TableCell>
                <TableCell className="text-right num font-semibold text-ok">
                  {formatManwon(shipper_gain)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
