'use client';

import Link from 'next/link';

import { useForwarderOrdersByPlans, useForwarderPlans } from '@/apis/saas/forwarder';
import { monthDayTime } from '@/app/(saas)/app/forwarder/_components/format';
import { ForwarderOrderPanel } from '@/app/(saas)/app/forwarder/_components/forwarder-order-panel';
import { ForwarderPageHeader } from '@/app/(saas)/app/forwarder/_components/forwarder-page-header';
import { FORWARDER_PATHS } from '@/app/(saas)/app/forwarder/_components/forwarder-paths';
import {
  OPEN_ORDER_STATUSES,
  ORDER_PRIORITY,
  ORDER_STATUS_LABEL,
  latestOrder,
} from '@/app/(saas)/app/forwarder/_components/labels';
import { EmptyState, QueryError } from '@/app/(saas)/app/forwarder/_components/query-state';
import { useForwarderOrgName } from '@/app/(saas)/app/forwarder/_components/use-org-name';
import { Skeleton } from '@/components/ui/skeleton';
import type { ForwarderOrderT, ForwarderPlanItemT } from '@/types/saas-forwarder';
import { NO_VESSEL_LABEL } from '@/utils/plan-label';

type PlanOrderT = {
  plan: ForwarderPlanItemT;
  order: ForwarderOrderT;
  history: number;
};

export function OrdersView() {
  const orgName = useForwarderOrgName();
  const plans = useForwarderPlans();
  const planList = plans.data ?? [];
  const orderQueries = useForwarderOrdersByPlans(planList.map(({ plan_id }) => plan_id));
  const eyebrow = orgName ? `실행 지시 · ${orgName}` : '실행 지시';
  const header = (sub?: string) => (
    <ForwarderPageHeader eyebrow={eyebrow} title="화주가 수락한 변경을 확정합니다" sub={sub} />
  );

  if (plans.isPending || orderQueries.some(({ isPending }) => isPending)) {
    return (
      <>
        {header()}
        <div aria-busy className="flex flex-col gap-4">
          <Skeleton className="h-72 rounded-[18px]" />
          <Skeleton className="h-48 rounded-[18px]" />
        </div>
      </>
    );
  }

  if (plans.isError) {
    return (
      <>
        {header()}
        <QueryError
          message="배정된 항차를 불러오지 못했습니다. 서버 연결을 확인하세요."
          onRetry={() => plans.refetch()}
          isRetrying={plans.isFetching}
        />
      </>
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
  const awaiting = open.filter(({ order }) => order.status === 'shipper_confirmed').length;

  return (
    <>
      {header(
        `진행 중 ${open.length}건 · 내 확정 대기 ${awaiting}건 · 끝난 지시 ${closed.length}건`
      )}

      <div className="flex flex-col gap-4">
        {failed.length > 0 && (
          <QueryError
            message={`항차 ${failed.length}건의 실행 지시를 불러오지 못했습니다.`}
            onRetry={() => failed.forEach(query => query.refetch())}
            isRetrying={failed.some(({ isFetching }) => isFetching)}
          />
        )}

        <h2 className="m2-h2 mt-1">진행 중인 실행 지시</h2>
        {open.length === 0 ? (
          <EmptyState
            title="확정할 실행 지시가 없습니다"
            description="플랫폼이 재최적화 대안을 적용하면 실행 지시가 여기에 옵니다."
            action={{ href: FORWARDER_PATHS.HOME, label: '배정된 항차 보기' }}
          />
        ) : (
          open.map(({ plan, order }) => (
            <div key={order.order_id} className="flex flex-col gap-2">
              <PlanLine plan={plan} />
              <ForwarderOrderPanel planId={plan.plan_id} order={order} />
            </div>
          ))
        )}

        {closed.length > 0 && (
          <section className="m2-card mt-2">
            <div className="m2-card-h">
              <h2 className="m2-h2">끝난 실행 지시</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="m2-table">
                <thead>
                  <tr>
                    <th>선박</th>
                    <th>출항</th>
                    <th>상태</th>
                    <th>마지막 변경</th>
                    <th className="r">이전 지시</th>
                    <th aria-label="항차 상세" />
                  </tr>
                </thead>
                <tbody>
                  {closed.map(({ plan, order, history }) => (
                    <tr key={order.order_id}>
                      <td className="font-semibold">{plan.vessel ?? NO_VESSEL_LABEL}</td>
                      <td className="m2-num">{monthDayTime(plan.departure)}</td>
                      <td>
                        <span className="m2-chip">{ORDER_STATUS_LABEL[order.status]}</span>
                      </td>
                      <td className="m2-num text-m2-muted">{monthDayTime(order.updated_at)}</td>
                      <td className="r m2-num">{history}건</td>
                      <td className="r">
                        <Link
                          href={FORWARDER_PATHS.PLAN(plan.plan_id)}
                          className="m2-btn m2-btn-sec m2-btn-sm"
                        >
                          항차 상세
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </>
  );
}

function PlanLine({ plan }: { plan: ForwarderPlanItemT }) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-1">
      <p className="text-[14px] font-semibold">
        {plan.vessel ?? NO_VESSEL_LABEL}
        <span className="m2-num ml-2 text-[12.5px] font-medium text-m2-muted">
          출항 {monthDayTime(plan.departure)} · 화주 {plan.shipper_count} · {plan.total_pallets}
          파렛트
        </span>
      </p>
      <Link
        href={FORWARDER_PATHS.PLAN(plan.plan_id)}
        className="m2-btn m2-btn-sec m2-btn-sm ml-auto"
      >
        항차 상세
      </Link>
    </div>
  );
}
