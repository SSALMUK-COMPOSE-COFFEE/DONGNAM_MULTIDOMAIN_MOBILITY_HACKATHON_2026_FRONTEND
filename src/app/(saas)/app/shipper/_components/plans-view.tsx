'use client';

import { ArrowRightIcon } from 'lucide-react';
import Link from 'next/link';

import { useShipperPlans } from '@/apis/saas/shipper';
import { PLAN_STATUS_LABEL } from '@/app/(saas)/app/shipper/_components/labels';
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
import { formatMonthDayTime } from '@/utils/format';

export function PlansView() {
  const plans = useShipperPlans();

  if (plans.isError) {
    return (
      <QueryError
        message="운송계획 목록을 불러오지 못했습니다."
        onRetry={() => plans.refetch()}
        isRetrying={plans.isFetching}
      />
    );
  }
  if (plans.isPending) return <Skeleton className="h-96" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          내 출하가 들어간 계획 <span className="num text-brand">{plans.data.length}</span>건
        </CardTitle>
      </CardHeader>
      <CardContent>
        {plans.data.length === 0 ? (
          <EmptyState
            title="아직 들어간 운송계획이 없습니다"
            description="출하를 등록하면 플랫폼이 다른 화주 출하와 묶어 계획을 만듭니다."
            action={{ href: SHIPPER_PATHS.LOTS, label: '출하 등록하기' }}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>선박</TableHead>
                <TableHead className="text-right">출항</TableHead>
                <TableHead>상태</TableHead>
                <TableHead className="text-right">내 출하</TableHead>
                <TableHead className="text-right">내 파렛트 / 전체</TableHead>
                <TableHead className="text-right">만든 시각</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.data.map(
                ({
                  plan_id,
                  vessel,
                  departure,
                  status,
                  my_lot_ids,
                  my_pallets,
                  total_pallets,
                  created_at,
                }) => (
                  <TableRow key={plan_id}>
                    <TableCell className="font-bold text-navy">{vessel ?? '선박 미정'}</TableCell>
                    <TableCell className="text-right num">
                      {formatMonthDayTime(departure)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={status === 'committed' ? 'default' : 'secondary'}>
                        {PLAN_STATUS_LABEL[status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right num">{my_lot_ids.length}건</TableCell>
                    <TableCell className="text-right num">
                      <span className="font-bold">{my_pallets}</span>
                      <span className="text-muted-foreground"> / {total_pallets}</span>
                    </TableCell>
                    <TableCell className="text-right num text-muted-foreground">
                      {formatMonthDayTime(created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={SHIPPER_PATHS.PLAN(plan_id)}
                        className={buttonVariants({ variant: 'outline', size: 'sm' })}
                      >
                        상세
                        <ArrowRightIcon />
                      </Link>
                    </TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
