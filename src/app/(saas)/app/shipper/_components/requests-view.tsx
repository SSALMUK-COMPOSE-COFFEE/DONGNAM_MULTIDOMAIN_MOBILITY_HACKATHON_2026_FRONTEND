'use client';

import { ArrowRightIcon } from 'lucide-react';
import Link from 'next/link';

import { EmptyState, QueryError } from '@/app/(saas)/app/shipper/_components/query-state';
import { RequestList } from '@/app/(saas)/app/shipper/_components/request-list';
import { SHIPPER_PATHS } from '@/app/(saas)/app/shipper/_components/shipper-paths';
import {
  isRequestAnswerable,
  isRequestAwaitingForwarder,
  useShipperTasks,
} from '@/app/(saas)/app/shipper/_components/use-shipper-tasks';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatSignedManwon } from '@/utils/format';
import { formatKstMonthDayTime } from '@/utils/kst';
import { NO_VESSEL_LABEL } from '@/utils/plan-label';

export function RequestsView() {
  const {
    plans,
    byPlan,
    confirmations,
    isOrdersLoading,
    isOrdersError,
    isOrdersFetching,
    refetchOrders,
  } = useShipperTasks();

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
  if (plans.data.length === 0) {
    return (
      <EmptyState
        title="응답할 요청이 없습니다"
        description="내 출하가 들어간 계획이 생기면 실행 지시와 요청이 여기에 모입니다."
      />
    );
  }

  const items = byPlan.flatMap(({ plan, orders }) =>
    orders.flatMap(order =>
      order.requests.map(request => ({ planId: plan.plan_id, order, request }))
    )
  );
  const pending = items.filter(({ order, request }) => isRequestAnswerable(order, request));
  const awaiting = items.filter(({ order, request }) => isRequestAwaitingForwarder(order, request));
  const closed = items.filter(
    ({ order, request }) =>
      !isRequestAnswerable(order, request) && !isRequestAwaitingForwarder(order, request)
  );

  return (
    <div className="flex flex-col gap-6">
      {isOrdersError && (
        <QueryError
          message="일부 계획의 실행 지시를 불러오지 못했습니다."
          onRetry={() => refetchOrders()}
          isRetrying={isOrdersFetching}
        />
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            확정할 실행 지시 <span className="num text-brand">{confirmations.length}</span>건
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isOrdersLoading && <Skeleton className="h-24" />}
          {!isOrdersLoading && confirmations.length === 0 && (
            <p className="text-sm text-muted-foreground">수락을 기다리는 실행 지시가 없습니다.</p>
          )}
          <ul className="flex flex-col gap-3">
            {confirmations.map(({ plan, order }) => {
              const mine = order.shipper_confirmations.filter(({ status }) => status === 'pending');

              return (
                <li key={order.order_id} className="flex items-center gap-4 rounded-xl border p-4">
                  <div className="flex flex-1 flex-col gap-1">
                    <p className="font-bold text-navy">
                      {plan.vessel ?? NO_VESSEL_LABEL}
                      <span className="ml-2 text-sm font-medium num text-muted-foreground">
                        출항 {formatKstMonthDayTime(plan.departure)}
                      </span>
                    </p>
                    {mine.map(({ shipper_id, reason_text, net_cost_delta, deadline }) => (
                      <p key={shipper_id} className="text-sm text-muted-foreground">
                        {reason_text.join(' · ')} · 부담{' '}
                        <span className="num text-foreground">
                          {formatSignedManwon(net_cost_delta)}만 원
                        </span>{' '}
                        · 기한 <span className="num">{formatKstMonthDayTime(deadline)}</span>
                      </p>
                    ))}
                  </div>
                  <Link
                    href={SHIPPER_PATHS.PLAN(plan.plan_id)}
                    className={buttonVariants({ size: 'sm' })}
                  >
                    계획에서 확정
                    <ArrowRightIcon />
                  </Link>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            응답할 요청 <span className="num text-brand">{pending.length}</span>건
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isOrdersLoading ? (
            <Skeleton className="h-24" />
          ) : (
            <RequestList items={pending} emptyText="응답을 기다리는 요청이 없습니다." />
          )}
        </CardContent>
      </Card>

      {awaiting.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              포워더 확정 대기 <span className="num text-muted-foreground">{awaiting.length}</span>
              건
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RequestList items={awaiting} emptyText="" />
          </CardContent>
        </Card>
      )}

      {closed.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>지난 요청</CardTitle>
          </CardHeader>
          <CardContent>
            <RequestList items={closed} emptyText="" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
