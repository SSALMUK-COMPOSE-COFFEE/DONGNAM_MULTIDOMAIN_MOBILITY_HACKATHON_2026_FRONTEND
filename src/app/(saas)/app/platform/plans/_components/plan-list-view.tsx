'use client';

import Link from 'next/link';

import { usePlatformPlans } from '@/apis/saas/platform';
import { EmptyState } from '@/app/(saas)/app/platform/_components/empty-state';
import { PLATFORM_PATHS } from '@/app/(saas)/app/platform/_components/paths';
import { NO_VESSEL_LABEL } from '@/app/(saas)/app/platform/_components/plan-label';
import { PlanStatusBadge } from '@/app/(saas)/app/platform/_components/plan-status-badge';
import { QueryError } from '@/app/(saas)/app/platform/_components/query-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { formatKstMonthDayTime } from '@/utils/kst';

export function PlanListView() {
  const { data: plans, isPending, isError, error, refetch, isFetching } = usePlatformPlans();

  return (
    <Card>
      <CardHeader>
        <CardTitle>공동적재 계획</CardTitle>
      </CardHeader>
      <CardContent>
        {isError && (
          <QueryError
            error={error}
            subject="계획 목록을"
            onRetry={() => refetch()}
            isRetrying={isFetching}
          />
        )}
        {isPending && <Skeleton className="h-72" />}
        {plans?.length === 0 && (
          <EmptyState
            title="아직 만든 계획이 없습니다"
            description="출하 현황에서 출하를 골라 공동적재 계획을 만드세요."
          >
            <Button asChild variant="outline">
              <Link href={PLATFORM_PATHS.HOME}>출하 현황으로</Link>
            </Button>
          </EmptyState>
        )}
        {!!plans?.length && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>선박</TableHead>
                <TableHead>출항</TableHead>
                <TableHead className="text-right">화주</TableHead>
                <TableHead className="text-right">파렛트</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>포워더</TableHead>
                <TableHead>만든 시각</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map(plan => (
                <TableRow key={plan.plan_id}>
                  <TableCell className="font-bold">{plan.vessel ?? NO_VESSEL_LABEL}</TableCell>
                  <TableCell className="num">{formatKstMonthDayTime(plan.departure)}</TableCell>
                  <TableCell className="text-right num">{plan.shipper_count}곳</TableCell>
                  <TableCell className="text-right num">{plan.total_pallets}</TableCell>
                  <TableCell>
                    <PlanStatusBadge status={plan.status} />
                  </TableCell>
                  <TableCell>
                    {plan.forwarder ? (
                      plan.forwarder.org_name
                    ) : (
                      <Badge variant="outline" className="border-air text-air">
                        미배정
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="num text-muted-foreground">
                    {formatKstMonthDayTime(plan.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild size="sm" variant="outline">
                      <Link href={PLATFORM_PATHS.PLAN(plan.plan_id)}>상세</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
