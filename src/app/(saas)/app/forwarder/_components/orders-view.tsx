'use client';

import Link from 'next/link';

import { useForwarderOrdersByPlans, useForwarderPlans } from '@/apis/saas/forwarder';
import { ForwarderOrderPanel } from '@/app/(saas)/app/forwarder/_components/forwarder-order-panel';
import { FORWARDER_PATHS } from '@/app/(saas)/app/forwarder/_components/forwarder-paths';
import {
  OPEN_ORDER_STATUSES,
  ORDER_PRIORITY,
  ORDER_STATUS_LABEL,
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
import type { ForwarderOrderT, ForwarderPlanItemT } from '@/types/saas-forwarder';
import { formatKstMonthDayTime } from '@/utils/kst';

type PlanOrderT = {
  plan: ForwarderPlanItemT;
  order: ForwarderOrderT;
  history: number;
};

export function OrdersView() {
  const plans = useForwarderPlans();
  const planList = plans.data ?? [];
  const orderQueries = useForwarderOrdersByPlans(planList.map(({ plan_id }) => plan_id));

  if (plans.isPending || orderQueries.some(({ isPending }) => isPending)) {
    return (
      <div aria-busy className="flex flex-col gap-6">
        <Skeleton className="h-72" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (plans.isError) {
    return (
      <QueryError
        message="배정된 항차를 불러오지 못했습니다. 서버 연결을 확인하세요."
        onRetry={() => plans.refetch()}
        isRetrying={plans.isFetching}
      />
    );
  }

  const failed = orderQueries.filter(({ isError }) => isError);
  const items: PlanOrderT[] = planList.flatMap((plan, index) => {
    const orders = orderQueries[index]?.data;
    const order = latestOrder(orders);

    return order ? [{ plan, order, history: (orders?.length ?? 1) - 1 }] : [];
  });
  const open = items
    .filter(({ order }) => OPEN_ORDER_STATUSES.includes(order.status))
    .sort((a, b) => ORDER_PRIORITY[a.order.status] - ORDER_PRIORITY[b.order.status]);
  const closed = items.filter(({ order }) => !OPEN_ORDER_STATUSES.includes(order.status));

  return (
    <div className="flex flex-col gap-8">
      {failed.length > 0 && (
        <QueryError
          message={`항차 ${failed.length}건의 실행 지시를 불러오지 못했습니다.`}
          onRetry={() => failed.forEach(query => query.refetch())}
          isRetrying={failed.some(({ isFetching }) => isFetching)}
        />
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold text-navy">진행 중인 실행 지시</h2>
        {open.length === 0 ? (
          <EmptyState
            title="확정할 실행 지시가 없습니다"
            description="플랫폼이 재최적화 대안을 적용하면 실행 지시가 여기에 옵니다."
            action={{ href: FORWARDER_PATHS.HOME, label: '배정된 항차 보기' }}
          />
        ) : (
          open.map(({ plan, order }) => (
            <div key={order.order_id} className="flex flex-col gap-3">
              <PlanLine plan={plan} />
              <ForwarderOrderPanel planId={plan.plan_id} order={order} />
            </div>
          ))
        )}
      </section>

      {closed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>끝난 실행 지시</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>선박</TableHead>
                  <TableHead>출항</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>마지막 변경</TableHead>
                  <TableHead className="text-right">이전 지시</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {closed.map(({ plan, order, history }) => (
                  <TableRow key={order.order_id}>
                    <TableCell className="font-bold text-navy">
                      {plan.vessel ?? '선박 미정'}
                    </TableCell>
                    <TableCell className="num">{formatKstMonthDayTime(plan.departure)}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{ORDER_STATUS_LABEL[order.status]}</Badge>
                    </TableCell>
                    <TableCell className="num text-muted-foreground">
                      {formatKstMonthDayTime(order.updated_at)}
                    </TableCell>
                    <TableCell className="text-right num">{history}건</TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={FORWARDER_PATHS.PLAN(plan.plan_id)}
                        className={buttonVariants({ variant: 'outline', size: 'sm' })}
                      >
                        항차 상세
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PlanLine({ plan }: { plan: ForwarderPlanItemT }) {
  return (
    <div className="flex items-center gap-3">
      <p className="text-lg font-bold text-navy">
        {plan.vessel ?? '선박 미정'}
        <span className="ml-2 text-base font-medium num text-muted-foreground">
          출항 {formatKstMonthDayTime(plan.departure)} · 화주 {plan.shipper_count} ·{' '}
          {plan.total_pallets}파렛트
        </span>
      </p>
      <Link
        href={FORWARDER_PATHS.PLAN(plan.plan_id)}
        className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'ml-auto' })}
      >
        항차 상세
      </Link>
    </div>
  );
}
