'use client';

import { cn } from 'cn';
import { ArrowRightIcon } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useMemo } from 'react';

import { useShipperCatalog, useShipperLots, useShipperSettlements } from '@/apis/saas/shipper';
import { lotLabelMap } from '@/app/(saas)/app/shipper/_components/lot-label';
import { ownScopeOf } from '@/app/(saas)/app/shipper/_components/my-plan';
import { plainWords } from '@/app/(saas)/app/shipper/_components/plain-words';
import {
  CardSkeleton,
  EmptyState,
  QueryError,
} from '@/app/(saas)/app/shipper/_components/query-state';
import { RequestList } from '@/app/(saas)/app/shipper/_components/request-list';
import { fmtBurden, fmtMonthDayTime } from '@/app/(saas)/app/shipper/_components/shipper-format';
import { SHIPPER_PATHS } from '@/app/(saas)/app/shipper/_components/shipper-paths';
import {
  isRequestAnswerable,
  isRequestAwaitingForwarder,
  useShipperTasks,
} from '@/app/(saas)/app/shipper/_components/use-shipper-tasks';
import {
  departureText,
  noVesselLabel,
  palletSplitByPlan,
  vesselText,
} from '@/app/(saas)/app/shipper/_components/vessel-label';
import { Skeleton } from '@/components/ui/skeleton';
import { NO_VESSEL_LABEL, planOptionLabel } from '@/utils/plan-label';

function Section({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <section className="m2-card">
      <div className="m2-card-h">
        <h2 className="m2-h2">{title}</h2>
      </div>
      {children}
    </section>
  );
}

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
  const catalog = useShipperCatalog();
  const lots = useShipperLots();
  const labels = useMemo(
    () => lotLabelMap(lots.data, catalog.data ?? null),
    [lots.data, catalog.data]
  );
  const ownShipperIds = useMemo(() => ownScopeOf(catalog.data).shipperIds, [catalog.data]);
  const splits = palletSplitByPlan(useShipperSettlements().data);

  if (plans.isError) {
    return (
      <QueryError
        message="운송계획 목록을 불러오지 못했습니다."
        onRetry={() => plans.refetch()}
        isRetrying={plans.isFetching}
      />
    );
  }
  if (plans.isPending) return <CardSkeleton height={360} />;
  if (plans.data.length === 0) {
    return (
      <div className="m2-card">
        <EmptyState
          title="응답할 요청이 없습니다"
          description="참여한 운송계획의 변경·확인 요청을 조회할 수 있습니다."
        />
      </div>
    );
  }

  const items = byPlan.flatMap(({ plan, orders }) =>
    orders.flatMap(order =>
      order.requests.map(request => ({
        planId: plan.plan_id,
        planLabel: planOptionLabel({ ...plan, plan_id: '' }).replace(
          NO_VESSEL_LABEL,
          noVesselLabel(splits.get(plan.plan_id))
        ),
        order,
        request,
      }))
    )
  );
  const pending = items.filter(({ order, request }) => isRequestAnswerable(order, request));
  const awaiting = items.filter(({ order, request }) => isRequestAwaitingForwarder(order, request));
  const closed = items.filter(
    ({ order, request }) =>
      !isRequestAnswerable(order, request) && !isRequestAwaitingForwarder(order, request)
  );

  return (
    <div className="flex flex-col gap-4">
      {isOrdersError && (
        <QueryError
          message="일부 계획의 실행 지시를 불러오지 못했습니다."
          onRetry={() => refetchOrders()}
          isRetrying={isOrdersFetching}
        />
      )}

      <Section
        title={
          <>
            확정할 실행 지시{' '}
            <span className="m2-num text-m2-brand-ink">{confirmations.length}</span>건
          </>
        }
      >
        {isOrdersLoading && <Skeleton className="h-24" />}
        {!isOrdersLoading && !isOrdersError && confirmations.length === 0 && (
          <p className="m2-sub mt-0">수락을 기다리는 실행 지시가 없습니다.</p>
        )}
        {confirmations.map(({ plan, order }) => {
          const mine = order.shipper_confirmations.filter(({ status }) => status === 'pending');

          return (
            <div
              key={order.order_id}
              className="m2-block is-lit flex items-start gap-4 max-[767.98px]:flex-col max-[767.98px]:items-start"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <p className="text-[14.5px] font-semibold">
                    {vesselText(plan.vessel, splits.get(plan.plan_id))}
                    <span className="m2-num ml-2 text-[12.5px] font-normal text-m2-muted">
                      {departureText(plan.departure, splits.get(plan.plan_id))}
                    </span>
                  </p>
                  {mine.map(({ shipper_id, reason_text }) => (
                    <div key={shipper_id} className="flex flex-wrap gap-1.5">
                      {reason_text.map(reason => (
                        <span key={reason} className="m2-chip">
                          {plainWords(reason, labels)}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
                {mine.map(({ shipper_id, net_cost_delta, deadline }) => (
                  <dl key={shipper_id} className="flex flex-wrap gap-x-8 gap-y-2">
                    <div className="flex flex-col gap-0.5">
                      <dt className="text-[11.5px] text-m2-muted">내 비용</dt>
                      <dd
                        className={cn(
                          'm2-num text-[13.5px] font-semibold',
                          net_cost_delta > 0 ? 'text-m2-berry-ink' : 'text-m2-ok-ink'
                        )}
                      >
                        {fmtBurden(net_cost_delta)}
                      </dd>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      <dt className="text-[11.5px] text-m2-muted">확정 기한</dt>
                      <dd className="m2-num text-[13.5px] font-semibold text-m2-ink">
                        {fmtMonthDayTime(deadline)}
                      </dd>
                    </div>
                  </dl>
                ))}
              </div>
              <Link href={SHIPPER_PATHS.PLAN(plan.plan_id)} className="m2-btn m2-btn-pri m2-btn-sm">
                계획에서 확정·거절
                <ArrowRightIcon size={14} />
              </Link>
            </div>
          );
        })}
      </Section>

      <Section
        title={
          <>
            응답할 요청 <span className="m2-num text-m2-brand-ink">{pending.length}</span>건
          </>
        }
      >
        {isOrdersLoading && <Skeleton className="h-24" />}
        {!isOrdersLoading && (!isOrdersError || pending.length > 0) && (
          <RequestList
            items={pending}
            labels={labels}
            emptyText="응답을 기다리는 요청이 없습니다."
          />
        )}
      </Section>

      {awaiting.length > 0 && (
        <Section
          title={
            <>
              발송·처리 대기 <span className="m2-num text-m2-muted">{awaiting.length}</span>건
            </>
          }
        >
          <RequestList
            items={awaiting}
            labels={labels}
            ownShipperIds={ownShipperIds}
            emptyText=""
          />
        </Section>
      )}

      {closed.length > 0 && (
        <Section title="지난 요청">
          <RequestList items={closed} labels={labels} emptyText="" />
        </Section>
      )}
    </div>
  );
}
