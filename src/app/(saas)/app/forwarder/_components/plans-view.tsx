'use client';

import { cn } from 'cn';
import Link from 'next/link';

import { useForwarderOrdersByPlans, useForwarderPlans } from '@/apis/saas/forwarder';
import { FORWARDER_PATHS } from '@/app/(saas)/app/forwarder/_components/forwarder-paths';
import {
  ORDER_STATUS_LABEL,
  PLAN_STATUS_LABEL,
  isAwaitingForwarder,
  latestOrder,
} from '@/app/(saas)/app/forwarder/_components/labels';
import { EmptyState, QueryError } from '@/app/(saas)/app/forwarder/_components/query-state';
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
import type { ForwarderOrderT } from '@/types/saas-forwarder';
import { formatKstMonthDayTime } from '@/utils/kst';

export function PlansView() {
  const plans = useForwarderPlans();
  const planIds = (plans.data ?? []).map(({ plan_id }) => plan_id);
  const orderQueries = useForwarderOrdersByPlans(planIds);

  if (plans.isPending) return <PlansSkeleton />;

  if (plans.isError) {
    return (
      <QueryError
        message="배정된 항차를 불러오지 못했습니다. 서버 연결을 확인하세요."
        onRetry={() => plans.refetch()}
        isRetrying={plans.isFetching}
      />
    );
  }

  if (plans.data.length === 0) {
    return (
      <EmptyState
        title="아직 배정된 항차가 없습니다"
        description="플랫폼이 공동적재 계획을 만들고 포워더를 배정하면 여기에 나타납니다."
      />
    );
  }

  const currentOrders = new Map<string, ForwarderOrderT | null>(
    planIds.map((planId, index) => [planId, latestOrder(orderQueries[index]?.data)])
  );
  const awaiting = [...currentOrders.values()].filter(isAwaitingForwarder).length;
  const totalPallets = plans.data.reduce((sum, { total_pallets }) => sum + total_pallets, 0);
  const isOrdersLoading = orderQueries.some(({ isPending }) => isPending);

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-6">
        <StatCard label="배정 항차" value={`${plans.data.length}건`} />
        <StatCard label="실을 파렛트" value={`${totalPallets}파렛트`} />
        <StatCard
          label="내 확정을 기다리는 실행 지시"
          value={isOrdersLoading ? '…' : `${awaiting}건`}
          isAlert={awaiting > 0}
          action={awaiting > 0 ? { href: FORWARDER_PATHS.ORDERS, label: '확정하러 가기' } : null}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>배정된 항차</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>선박</TableHead>
                <TableHead>출항</TableHead>
                <TableHead>계획</TableHead>
                <TableHead>실행 지시</TableHead>
                <TableHead className="text-right">화주</TableHead>
                <TableHead className="text-right">파렛트</TableHead>
                <TableHead>만든 시각</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.data.map(plan => {
                const order = currentOrders.get(plan.plan_id) ?? null;

                return (
                  <TableRow key={plan.plan_id}>
                    <TableCell className="font-bold text-navy">
                      {plan.vessel ?? '선박 미정'}
                    </TableCell>
                    <TableCell className="num">{formatKstMonthDayTime(plan.departure)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{PLAN_STATUS_LABEL[plan.status]}</Badge>
                    </TableCell>
                    <TableCell>
                      {order ? (
                        <Badge
                          variant={isAwaitingForwarder(order) ? 'default' : 'secondary'}
                          className={cn(isAwaitingForwarder(order) && 'bg-berry')}
                        >
                          {ORDER_STATUS_LABEL[order.status]}
                        </Badge>
                      ) : (
                        <span className="text-sm text-muted-foreground">없음</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right num">{plan.shipper_count}</TableCell>
                    <TableCell className="text-right num">{plan.total_pallets}</TableCell>
                    <TableCell className="num text-muted-foreground">
                      {formatKstMonthDayTime(plan.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={FORWARDER_PATHS.PLAN(plan.plan_id)}
                        className={buttonVariants({ variant: 'outline', size: 'sm' })}
                      >
                        상세
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

type StatCardPropsT = {
  label: string;
  value: string;
  isAlert?: boolean;
  action?: { href: string; label: string } | null;
};

function StatCard({ label, value, isAlert = false, action }: StatCardPropsT) {
  return (
    <Card>
      <CardContent className="flex items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground">{label}</p>
          <p className={cn('text-4xl font-black num', isAlert ? 'text-berry' : 'text-navy')}>
            {value}
          </p>
        </div>
        {action && (
          <Link href={action.href} className={buttonVariants({ size: 'sm' })}>
            {action.label}
          </Link>
        )}
      </CardContent>
    </Card>
  );
}

function PlansSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-6">
      <div className="grid grid-cols-3 gap-6">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-80" />
    </div>
  );
}
