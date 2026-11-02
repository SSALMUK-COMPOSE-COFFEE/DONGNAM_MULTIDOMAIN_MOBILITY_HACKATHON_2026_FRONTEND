import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ScenarioT } from '@/types/api';
import { formatMonthDay } from '@/utils/format';
import { getPortName, getProductName, getShipperName } from '@/utils/scenario';

/** 이번 주 출하로 등록된 로트. 계획은 이 출하들을 한 번에 푼다 */
export function ShipmentList({ scenario }: { scenario: ScenarioT }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>화주</TableHead>
          <TableHead>품목</TableHead>
          <TableHead className="text-right">파렛트</TableHead>
          <TableHead className="text-right">출하일</TableHead>
          <TableHead className="text-right">판매기한</TableHead>
          <TableHead>목적지</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {scenario.lots.map(
          ({ id, shipper_id, product_id, pallets, ready_date, sell_by_date, destination }) => (
            <TableRow key={id}>
              <TableCell>{getShipperName(scenario, shipper_id)}</TableCell>
              <TableCell>{getProductName(scenario, product_id)}</TableCell>
              <TableCell className="text-right num">{pallets}</TableCell>
              <TableCell className="text-right num">{formatMonthDay(ready_date)}</TableCell>
              <TableCell className="text-right num">{formatMonthDay(sell_by_date)}</TableCell>
              <TableCell>{getPortName(scenario, destination)}</TableCell>
            </TableRow>
          )
        )}
      </TableBody>
    </Table>
  );
}
