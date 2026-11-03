'use client';

import Link from 'next/link';
import { Fragment } from 'react';

import { usePlatformSettlements } from '@/apis/saas/platform';
import { EmptyState } from '@/app/(saas)/app/platform/_components/empty-state';
import { PLATFORM_PATHS } from '@/app/(saas)/app/platform/_components/paths';
import { NO_VESSEL_LABEL } from '@/app/(saas)/app/platform/_components/plan-label';
import { QueryError } from '@/app/(saas)/app/platform/_components/query-error';
import { StatTile } from '@/app/(saas)/app/platform/_components/stat-tile';
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
import type { PlatformSettlementT } from '@/types/saas-platform';
import { formatManwon } from '@/utils/format';
import { formatKstMonthDayTime } from '@/utils/kst';

const sumBy = (rows: PlatformSettlementT[], pick: (row: PlatformSettlementT) => number) =>
  rows.reduce((total, row) => total + pick(row), 0);

export function SettlementView() {
  const { data, isPending, isError, error, refetch, isFetching } = usePlatformSettlements();

  if (isError) {
    return (
      <QueryError
        error={error}
        subject="정산 내역을"
        onRetry={() => refetch()}
        isRetrying={isFetching}
      />
    );
  }
  if (isPending) return <Skeleton className="h-96" />;
  if (data.length === 0) {
    return (
      <EmptyState
        title="아직 정산할 계획이 없습니다"
        description="공동적재 계획을 만들면 화주별 절감액과 성과보수가 계산됩니다."
      />
    );
  }

  const totalSaving = sumBy(data, ({ total_saving_krw }) => total_saving_krw);
  const totalFee = sumBy(data, ({ platform_fee_krw }) => platform_fee_krw);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-6">
        <StatTile label="화주 총비용 절감" value={formatManwon(totalSaving)} unit="만 원" />
        <StatTile
          label="플랫폼 성과보수"
          value={formatManwon(totalFee)}
          unit="만 원"
          note="절감액의 25%"
        />
        <StatTile
          label="화주에게 돌아간 몫"
          value={formatManwon(totalSaving - totalFee)}
          unit="만 원"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            계획별 정산
            <span className="ml-2 text-base font-medium text-muted-foreground">만 원</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>항차 · 화주</TableHead>
                <TableHead>출항</TableHead>
                <TableHead className="text-right">절감</TableHead>
                <TableHead className="text-right">성과보수 25%</TableHead>
                <TableHead className="text-right">화주 몫</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map(row => (
                <Fragment key={row.plan_id}>
                  <TableRow className="bg-panel font-bold hover:bg-panel">
                    <TableCell>
                      <Link
                        href={PLATFORM_PATHS.PLAN(row.plan_id)}
                        className="text-navy hover:text-brand"
                      >
                        {row.vessel ?? NO_VESSEL_LABEL}
                      </Link>
                    </TableCell>
                    <TableCell className="num">{formatKstMonthDayTime(row.departure)}</TableCell>
                    <TableCell className="text-right num text-ok">
                      {formatManwon(row.total_saving_krw)}
                    </TableCell>
                    <TableCell className="text-right num">
                      {formatManwon(row.platform_fee_krw)}
                    </TableCell>
                    <TableCell className="text-right num">
                      {formatManwon(row.total_saving_krw - row.platform_fee_krw)}
                    </TableCell>
                  </TableRow>
                  {row.shippers.map(share => (
                    <TableRow key={`${row.plan_id}-${share.shipper_id}`}>
                      <TableCell className="pl-8">
                        {share.shipper_org_name ?? share.shipper_id}
                      </TableCell>
                      <TableCell />
                      <TableCell className="text-right num">
                        {formatManwon(share.saving_krw)}
                      </TableCell>
                      <TableCell className="text-right num">
                        {formatManwon(share.fee_krw)}
                      </TableCell>
                      <TableCell className="text-right num">
                        {formatManwon(share.saving_krw - share.fee_krw)}
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
