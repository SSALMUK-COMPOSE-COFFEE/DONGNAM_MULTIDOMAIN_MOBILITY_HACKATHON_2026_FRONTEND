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
import type { ForwarderPlanSessionT } from '@/types/saas-forwarder';
import { formatMonthDayTime } from '@/utils/format';
import { getShipperName } from '@/utils/scenario';

const CARGO_GROUP_LABEL: Record<string, string> = {
  grape_so2: 'SO₂ 포도',
};

const formatCoordinate = (value: number) => value.toFixed(5);

export function PickupSchedule({ session }: { session: ForwarderPlanSessionT }) {
  const { scenario, routes } = session;
  const port = scenario.ports[0];
  const packhouseOf = (packhouseId: string) =>
    scenario.packhouses.find(({ id }) => id === packhouseId);
  const shippersOf = (lotIds: string[]) => [
    ...new Set(
      lotIds.flatMap(lotId => {
        const lot = scenario.lots.find(({ id }) => id === lotId);

        return lot ? [getShipperName(scenario, lot.shipper_id)] : [];
      })
    ),
  ];
  const voyageOf = (voyageId: string) => scenario.voyages.find(({ id }) => id === voyageId);
  const truckRoutes = routes.flatMap(({ voyage_id, pickup }) =>
    pickup.routes.map(route => ({ voyageId: voyage_id, route }))
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          집하 순서 · 선과장 위치
          {port && (
            <span className="ml-2 text-base font-medium text-muted-foreground">
              도착 {port.name}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-8">
        {truckRoutes.length === 0 && (
          <p className="text-muted-foreground">이 계획에는 트럭 집하 경로가 없습니다.</p>
        )}
        {truckRoutes.map(({ voyageId, route }) => {
          const voyage = voyageOf(voyageId);

          return (
            <section
              key={`${voyageId}-${route.truck_id}-${route.trip}`}
              className="flex flex-col gap-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg font-bold text-navy">
                  {route.truck_id} · {route.trip}회차
                </h3>
                {route.cargo_group && (
                  <Badge variant="secondary">
                    {CARGO_GROUP_LABEL[route.cargo_group] ?? route.cargo_group}
                  </Badge>
                )}
                <span className="text-sm num text-muted-foreground">
                  {voyage ? `${voyage.vessel_name} · ` : ''}
                  {route.load_pallets}/{route.capacity_pallets}파렛트 · {route.km.toFixed(1)}km ·
                  출발 {formatMonthDayTime(route.earliest_departure)}~
                  {formatMonthDayTime(route.latest_departure).slice(-5)} · 항구 도착{' '}
                  {formatMonthDayTime(route.port_eta)}
                </span>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">순서</TableHead>
                    <TableHead>선과장</TableHead>
                    <TableHead>지역</TableHead>
                    <TableHead>좌표 (위도, 경도)</TableHead>
                    <TableHead>화주</TableHead>
                    <TableHead className="text-right">파렛트</TableHead>
                    <TableHead>준비</TableHead>
                    <TableHead>도착 예정</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {route.stops.map(stop => {
                    const packhouse = packhouseOf(stop.packhouse_id);

                    return (
                      <TableRow key={stop.stop_id}>
                        <TableCell className="num">{stop.sequence}</TableCell>
                        <TableCell className="font-bold">
                          {packhouse?.name ?? stop.packhouse_id}
                        </TableCell>
                        <TableCell>{packhouse?.region ?? '–'}</TableCell>
                        <TableCell className="num text-muted-foreground">
                          {packhouse
                            ? `${formatCoordinate(packhouse.lat)}, ${formatCoordinate(packhouse.lon)}`
                            : '–'}
                        </TableCell>
                        <TableCell>{shippersOf(stop.lot_ids).join(', ') || '–'}</TableCell>
                        <TableCell className="text-right num">{stop.pallets}</TableCell>
                        <TableCell className="num">{formatMonthDayTime(stop.ready_at)}</TableCell>
                        <TableCell className="num">{formatMonthDayTime(stop.eta)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </section>
          );
        })}
      </CardContent>
    </Card>
  );
}
