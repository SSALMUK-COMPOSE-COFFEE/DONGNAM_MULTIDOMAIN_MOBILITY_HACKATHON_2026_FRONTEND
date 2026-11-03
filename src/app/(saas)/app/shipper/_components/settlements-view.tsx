'use client';

import { ArrowRightIcon } from 'lucide-react';
import Link from 'next/link';

import { useShipperSettlements } from '@/apis/saas/shipper';
import { EmptyState, QueryError } from '@/app/(saas)/app/shipper/_components/query-state';
import { SHIPPER_PATHS } from '@/app/(saas)/app/shipper/_components/shipper-paths';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { ShipperSettlementT } from '@/types/saas-shipper';
import { formatManwon } from '@/utils/format';
import { formatKstMonthDayTime } from '@/utils/kst';
import { NO_VESSEL_LABEL } from '@/utils/plan-label';

const BASIS_LABEL: Record<ShipperSettlementT['basis'], string> = {
  tariff: '정산표 단가',
  operational: '운영비 기준',
  mixed: '혼합',
};

const sumOf = (rows: ShipperSettlementT[], pick: (row: ShipperSettlementT) => number) =>
  rows.reduce((sum, row) => sum + pick(row), 0);

export function SettlementsView() {
  const settlements = useShipperSettlements();

  if (settlements.isError) {
    return (
      <QueryError
        message="정산 내역을 불러오지 못했습니다."
        onRetry={() => settlements.refetch()}
        isRetrying={settlements.isFetching}
      />
    );
  }
  if (settlements.isPending) return <Skeleton className="h-96" />;

  const rows = settlements.data;

  if (rows.length === 0) {
    return (
      <EmptyState
        title="아직 정산할 계획이 없습니다"
        description="공동적재 계획에 출하가 들어가면 아낀 금액과 수수료가 여기에 쌓입니다."
        action={{ href: SHIPPER_PATHS.PLANS, label: '운송계획 확인' }}
      />
    );
  }

  const totalSavings = sumOf(rows, ({ savings }) => savings);
  const totalFee = sumOf(rows, ({ fee }) => fee);
  const totalGain = sumOf(rows, ({ shipper_gain }) => shipper_gain);
  const totalRefund = sumOf(rows, ({ quality_refund }) => quality_refund);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-6 rounded-3xl bg-navy px-10 py-7 text-white">
        <p className="text-3xl font-bold">
          내 절감 합계 <span className="num text-cyan">{formatManwon(totalSavings)}만 원</span>
          <span className="mx-4">→</span>
          수수료 <span className="num">{formatManwon(totalFee)}만 원</span>
          <span className="mx-4">·</span>내 몫{' '}
          <span className="num">{formatManwon(totalGain)}만 원</span>
        </p>
        {totalRefund > 0 && (
          <p className="ml-auto text-sm text-white/70">
            품질 환급 <span className="num">{formatManwon(totalRefund)}만 원</span> 반영
          </p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            계획별 정산
            <span className="ml-2 text-base font-medium text-muted-foreground">만 원</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table className="[&_td]:whitespace-normal [&_th]:whitespace-normal">
            <TableHeader>
              <TableRow>
                <TableHead>선박 · 출항</TableHead>
                <TableHead>근거</TableHead>
                <TableHead className="text-right">해상 / 항공 파렛트</TableHead>
                <TableHead className="text-right">혼자 항공</TableHead>
                <TableHead className="text-right">공동적재</TableHead>
                <TableHead className="text-right">절감</TableHead>
                <TableHead className="text-right">수수료 25%</TableHead>
                <TableHead className="text-right">품질 환급</TableHead>
                <TableHead className="text-right">내 몫</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(row => (
                <TableRow key={`${row.plan_id}:${row.shipper_id}`}>
                  <TableCell>
                    <p className="font-bold text-navy">{row.vessel ?? NO_VESSEL_LABEL}</p>
                    <p className="text-sm num text-muted-foreground">
                      출항 {formatKstMonthDayTime(row.departure)} · v{row.version}
                    </p>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{BASIS_LABEL[row.basis]}</Badge>
                  </TableCell>
                  <TableCell className="text-right num">
                    {row.sea_pallets} / {row.air_pallets}
                  </TableCell>
                  <TableCell className="text-right num text-muted-foreground">
                    {formatManwon(row.baseline_cost)}
                  </TableCell>
                  <TableCell className="text-right num">{formatManwon(row.shared_cost)}</TableCell>
                  <TableCell className="text-right font-bold num text-ok">
                    {formatManwon(row.savings)}
                  </TableCell>
                  <TableCell className="text-right num">{formatManwon(row.fee)}</TableCell>
                  <TableCell className="text-right num">
                    {formatManwon(row.quality_refund)}
                  </TableCell>
                  <TableCell className="text-right font-bold num">
                    {formatManwon(row.shipper_gain)}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap!">
                    <Link
                      href={SHIPPER_PATHS.PLAN(row.plan_id)}
                      className={buttonVariants({ variant: 'outline', size: 'sm' })}
                    >
                      계획
                      <ArrowRightIcon />
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
