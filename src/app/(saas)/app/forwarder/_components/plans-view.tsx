'use client';

import { cn } from 'cn';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useForwarderOrdersByPlans, useForwarderPlans } from '@/apis/saas/forwarder';
import { dayTime, monthDayTime } from '@/app/(saas)/app/forwarder/_components/format';
import { ForwarderPageHeader } from '@/app/(saas)/app/forwarder/_components/forwarder-page-header';
import { FORWARDER_PATHS } from '@/app/(saas)/app/forwarder/_components/forwarder-paths';
import {
  ORDER_STATUS_LABEL,
  isAwaitingForwarder,
  latestOrder,
  planStatusLabel,
} from '@/app/(saas)/app/forwarder/_components/labels';
import { EmptyState, QueryError } from '@/app/(saas)/app/forwarder/_components/query-state';
import { useForwarderOrgName } from '@/app/(saas)/app/forwarder/_components/use-org-name';
import { Skeleton } from '@/components/ui/skeleton';
import type { ForwarderOrderT } from '@/types/saas-forwarder';
import { NO_VESSEL_LABEL } from '@/utils/plan-label';

const ORDER_CHIP: Record<ForwarderOrderT['status'], string> = {
  proposed: 'm2-chip',
  shipper_confirmed: 'm2-chip m2-chip-berry',
  forwarder_confirmed: 'm2-chip m2-chip-ok',
  executed: 'm2-chip m2-chip-ok',
  rejected: 'm2-chip',
  expired: 'm2-chip m2-chip-warn',
};

export function PlansView() {
  const router = useRouter();
  const orgName = useForwarderOrgName();
  const plans = useForwarderPlans();
  const planIds = (plans.data ?? []).map(({ plan_id }) => plan_id);
  const orderQueries = useForwarderOrdersByPlans(planIds);
  const eyebrow = orgName ? `공동적재 계획 · ${orgName}` : '공동적재 계획';

  if (plans.isPending) {
    return (
      <>
        <ForwarderPageHeader eyebrow={eyebrow} title="공동적재 계획" />
        <PlansSkeleton />
      </>
    );
  }

  if (plans.isError) {
    return (
      <>
        <ForwarderPageHeader eyebrow={eyebrow} title="공동적재 계획" />
        <QueryError
          message="배정된 항차를 불러오지 못했습니다. 서버 연결을 확인하세요."
          onRetry={() => plans.refetch()}
          isRetrying={plans.isFetching}
        />
      </>
    );
  }

  if (plans.data.length === 0) {
    return (
      <>
        <ForwarderPageHeader eyebrow={eyebrow} title="공동적재 계획">
          <Link href={FORWARDER_PATHS.POOL} className="m2-btn m2-btn-pri">
            출하 풀에서 계획 만들기
          </Link>
          <Link href={FORWARDER_PATHS.CONTAINERS} className="m2-btn m2-btn-sec">
            컨테이너 등록
          </Link>
        </ForwarderPageHeader>
        <EmptyState
          title="아직 공동적재 계획이 없습니다"
          description="컨테이너 공간과 항차를 등록하고 출하 풀에서 계획을 만드세요. 기존에 배정받은 계획도 함께 표시됩니다."
        />
      </>
    );
  }

  const currentOrders = new Map<string, ForwarderOrderT | null>(
    planIds.map((planId, index) => [planId, latestOrder(orderQueries[index]?.data)])
  );
  const awaiting = [...currentOrders.values()].filter(isAwaitingForwarder).length;
  const totalPallets = plans.data.reduce((sum, { total_pallets }) => sum + total_pallets, 0);
  const isOrdersLoading = orderQueries.some(({ isPending }) => isPending);
  const failedOrders = orderQueries.filter(({ isError }) => isError);
  const nextDeparture = plans.data
    .flatMap(({ departure }) => (departure ? [departure] : []))
    .sort((a, b) => a.localeCompare(b))[0];

  return (
    <>
      <ForwarderPageHeader
        eyebrow={eyebrow}
        title="공동적재 계획"
        sub={
          nextDeparture
            ? `${plans.data.length}항차 · 가장 이른 출항 ${dayTime(nextDeparture)}`
            : `${plans.data.length}항차`
        }
      >
        <Link href={FORWARDER_PATHS.POOL} className="m2-btn m2-btn-pri">
          출하 풀에서 계획 만들기
        </Link>
        {plans.isCapped ? (
          <span className="m2-chip m2-chip-warn">
            최근 {plans.limit.toLocaleString('ko-KR')}건 기준
          </span>
        ) : null}
        {awaiting > 0 ? (
          <Link href={FORWARDER_PATHS.ORDERS} className="m2-btn m2-btn-pri">
            확정할 실행 지시 {awaiting}건
          </Link>
        ) : null}
      </ForwarderPageHeader>

      <div className="m2-grid mb-4 grid-cols-3 max-[900px]:grid-cols-1">
        <StatCard label="배정 항차" value={plans.data.length} unit="건" />
        <StatCard label="실을 파렛트" value={totalPallets} unit="파렛트" />
        <StatCard
          label="내 확정을 기다리는 실행 지시"
          value={isOrdersLoading ? null : awaiting}
          unit="건"
          isAlert={awaiting > 0}
        />
      </div>

      {failedOrders.length > 0 && (
        <QueryError
          className="mb-4"
          message={`항차 ${failedOrders.length}건의 실행 지시를 불러오지 못했습니다.`}
          onRetry={() => failedOrders.forEach(query => query.refetch())}
          isRetrying={failedOrders.some(({ isFetching }) => isFetching)}
        />
      )}

      <section className="m2-card">
        <div className="m2-card-h">
          <div>
            <h2 className="m2-h2">항차 목록</h2>
            <div className="m2-sub">행을 누르면 집하 경로와 실행 지시가 열립니다</div>
          </div>
          {plans.isCapped ? (
            <span className="m2-chip m2-chip-warn">
              최근 {plans.limit.toLocaleString('ko-KR')}건만 표시
            </span>
          ) : null}
        </div>
        <div className="overflow-x-auto">
          <table className="m2-table">
            <thead>
              <tr>
                <th>선박</th>
                <th>출항</th>
                <th>계획</th>
                <th>실행 지시</th>
                <th className="r">화주</th>
                <th className="r">파렛트</th>
                <th>만든 시각</th>
                <th aria-label="상세" />
              </tr>
            </thead>
            <tbody>
              {plans.data.map((plan, index) => {
                const order = currentOrders.get(plan.plan_id) ?? null;
                const orderQuery = orderQueries[index] ?? null;
                const href = FORWARDER_PATHS.PLAN(plan.plan_id);

                return (
                  <tr
                    key={plan.plan_id}
                    className="cursor-pointer hover:[&>td]:bg-m2-brand-soft/60"
                    onClick={event => {
                      if ((event.target as Element).closest('a')) return;
                      router.push(href);
                    }}
                  >
                    <td>
                      <div className="m2-who">
                        {plan.vessel ?? NO_VESSEL_LABEL}
                        <small className="m2-mono">{plan.plan_id}</small>
                      </div>
                    </td>
                    <td className="m2-num">{monthDayTime(plan.departure)}</td>
                    <td>
                      <span className="m2-chip">{planStatusLabel(plan.status)}</span>
                    </td>
                    <td>
                      {order ? (
                        <span className={ORDER_CHIP[order.status]}>
                          {ORDER_STATUS_LABEL[order.status]}
                        </span>
                      ) : (
                        <OrderMissing
                          isPending={!!orderQuery?.isPending}
                          isError={!!orderQuery?.isError}
                        />
                      )}
                    </td>
                    <td className="r m2-num">{plan.shipper_count}</td>
                    <td className="r m2-num">
                      <b>{plan.total_pallets}</b>
                    </td>
                    <td className="m2-num text-m2-muted">{monthDayTime(plan.created_at)}</td>
                    <td className="r">
                      <Link href={href} className="m2-btn m2-btn-sec m2-btn-sm">
                        상세
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

function OrderMissing({ isPending, isError }: { isPending: boolean; isError: boolean }) {
  if (isError) return <span className="text-[12.5px] text-m2-crit">불러오지 못함</span>;

  return <span className="text-[12.5px] text-m2-muted">{isPending ? '불러오는 중' : '없음'}</span>;
}

type StatCardPropsT = {
  label: string;
  value: number | null;
  unit: string;
  isAlert?: boolean;
};

function StatCard({ label, value, unit, isAlert = false }: StatCardPropsT) {
  return (
    <div className="m2-card">
      <div className="m2-lbl">{label}</div>
      <div className={cn('m2-big mt-1.5', isAlert && 'text-m2-berry')}>
        {value === null ? '…' : value.toLocaleString('ko-KR')}
        <small>{unit}</small>
      </div>
    </div>
  );
}

function PlansSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-28 rounded-[18px]" />
        <Skeleton className="h-28 rounded-[18px]" />
        <Skeleton className="h-28 rounded-[18px]" />
      </div>
      <Skeleton className="h-80 rounded-[18px]" />
    </div>
  );
}
