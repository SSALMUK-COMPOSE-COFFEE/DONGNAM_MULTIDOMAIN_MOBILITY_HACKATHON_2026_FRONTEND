'use client';

import { ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

import {
  useShipperCatalog,
  useShipperLots,
  useShipperPlan,
  useShipperPlanOrders,
} from '@/apis/saas/shipper';
import {
  viewerShipperIdOf,
  withLocatedPackhouses,
} from '@/app/(saas)/app/shipper/_components/catalog';
import { PLAN_STATUS_LABEL } from '@/app/(saas)/app/shipper/_components/labels';
import { type LotLabelMapT, lotLabelMap } from '@/app/(saas)/app/shipper/_components/lot-label';
import {
  type MyPlanT,
  type OwnScopeT,
  buildMyPlan,
  myPendingConfirmations,
  ownScopeOf,
} from '@/app/(saas)/app/shipper/_components/my-plan';
import {
  CardSkeleton,
  EmptyState,
  QueryError,
  errorStatus,
} from '@/app/(saas)/app/shipper/_components/query-state';
import { RequestList } from '@/app/(saas)/app/shipper/_components/request-list';
import { ShipperMapHero } from '@/app/(saas)/app/shipper/_components/shipper-map-hero';
import { ShipperOrderCard } from '@/app/(saas)/app/shipper/_components/shipper-order-card';
import { ShipperPageHeader } from '@/app/(saas)/app/shipper/_components/shipper-page-header';
import { SHIPPER_PATHS } from '@/app/(saas)/app/shipper/_components/shipper-paths';
import { ShipperPlanCard } from '@/app/(saas)/app/shipper/_components/shipper-plan-card';
import { useNowMinute } from '@/app/(saas)/app/shipper/_components/use-now';
import { MapLinkProvider } from '@/components/map-link';
import { ContainerCard } from '@/components/plan-detail/container-card';
import { PlanSummary } from '@/components/plan-detail/plan-summary';
import { TariffCard } from '@/components/plan-detail/tariff-card';
import { SectionErrorBoundary } from '@/components/section-error-boundary';
import { SettlementTable } from '@/components/settlement-table';
import { planSessionLabel } from '@/utils/plan-label';

export function PlanDetailView() {
  const planId = useSearchParams().get('plan_id') ?? '';
  const plan = useShipperPlan(planId);
  const session = useMemo(() => plan.data && withLocatedPackhouses(plan.data), [plan.data]);
  const catalog = useShipperCatalog();
  const orders = useShipperPlanOrders(planId);
  const lots = useShipperLots();
  const now = useNowMinute();
  const own: OwnScopeT = useMemo(() => ownScopeOf(catalog.data), [catalog.data]);
  const myPlan = useMemo(
    () => (plan.data && catalog.data ? buildMyPlan(plan.data, own) : null),
    [plan.data, catalog.data, own]
  );
  const pending = orders.data ? myPendingConfirmations(orders.data, own) : null;
  const viewerShipperId = viewerShipperIdOf(catalog.data);
  const labels = useMemo(
    () => lotLabelMap(lots.data, catalog.data ?? null),
    [lots.data, catalog.data]
  );
  const backLink = (
    <Link href={SHIPPER_PATHS.PLANS} className="m2-btn m2-btn-sec">
      <ArrowLeftIcon size={16} />
      계획 목록
    </Link>
  );

  const header = (
    <ShipperPageHeader
      eyebrow="계획 상세"
      title={myPlan ? headlineTitle(myPlan) : '운송계획 상세'}
      sub={
        plan.data ? (
          <span className="inline-flex flex-wrap items-center gap-2">
            <span
              className={
                plan.data.status === 'committed' ? 'm2-chip m2-chip-ok' : 'm2-chip m2-chip-warn'
              }
            >
              {PLAN_STATUS_LABEL[plan.data.status] ?? plan.data.status}
            </span>
            <span className="m2-num">
              {planSessionLabel(plan.data)} · v{plan.data.version}
            </span>
            <span>다른 화주는 익명으로 보입니다</span>
          </span>
        ) : null
      }
    >
      {backLink}
    </ShipperPageHeader>
  );

  if (!planId) {
    return (
      <>
        {header}
        <div className="m2-card">
          <EmptyState
            title="볼 계획을 고르세요"
            description="계획 목록에서 계획을 선택하면 상세가 열립니다."
            action={{ href: SHIPPER_PATHS.PLANS, label: '계획 목록으로' }}
          />
        </div>
      </>
    );
  }

  return (
    <MapLinkProvider>
      {header}

      <div className="flex flex-col gap-4">
        {errorStatus(plan.error) === 404 && (
          <div className="m2-card">
            <EmptyState
              title="계획을 찾을 수 없습니다"
              description="내 출하가 들어간 계획이 아니거나 지워진 계획입니다."
              action={{ href: SHIPPER_PATHS.PLANS, label: '계획 목록으로' }}
            />
          </div>
        )}
        {plan.isError && errorStatus(plan.error) !== 404 && (
          <QueryError
            message="운송계획을 불러오지 못했습니다. 서버 연결을 확인하세요."
            onRetry={() => plan.refetch()}
            isRetrying={plan.isFetching}
          />
        )}
        {(plan.isPending || catalog.isPending) && !plan.isError && !catalog.isError && (
          <CardSkeleton height={392} />
        )}
        {catalog.isError && (
          <QueryError
            message="내 화주 정보를 불러오지 못했습니다."
            onRetry={() => catalog.refetch()}
            isRetrying={catalog.isFetching}
          />
        )}

        {plan.data && session && catalog.data && myPlan && (
          <>
            <SectionErrorBoundary message="지도를 그리지 못했습니다." className="h-[392px]">
              <ShipperMapHero myPlan={myPlan} now={now} />
            </SectionErrorBoundary>

            <SectionErrorBoundary message="계획 카드를 그리지 못했습니다." className="h-64">
              <ShipperPlanCard
                myPlan={myPlan}
                own={own}
                pending={pending}
                showDetailLink={false}
                showDecision={false}
              />
            </SectionErrorBoundary>

            <SectionErrorBoundary message="운송계획을 그리지 못했습니다." className="h-96">
              <div className="@container flex min-w-0 flex-col gap-4 overflow-x-auto">
                <PlanSummary plan={session.plan} showAirLots />
                <div className="grid grid-cols-1 gap-4 @min-[1100px]:grid-cols-[minmax(0,1fr)_minmax(0,440px)]">
                  <div className="flex min-w-0 flex-col gap-4">
                    <ContainerCard
                      plan={session.plan}
                      scenario={session.scenario}
                      viewerShipperId={viewerShipperId}
                      showAirLots
                    />
                    <SettlementTable
                      containerSettlements={session.plan.container_settlements ?? []}
                      scenario={session.scenario}
                      viewerShipperId={viewerShipperId}
                      airSettlements={session.plan.settlements}
                    />
                  </div>
                  <div className="flex min-w-0 flex-col gap-4">
                    {session.plan.settlement_tariffs?.map(tariff => (
                      <TariffCard
                        key={tariff.product_id}
                        tariff={tariff}
                        scenario={session.scenario}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </SectionErrorBoundary>

            <SectionErrorBoundary message="실행 지시를 그리지 못했습니다." className="h-64">
              <PlanOrders planId={plan.data.plan_id} own={own} labels={labels} />
            </SectionErrorBoundary>
          </>
        )}
      </div>
    </MapLinkProvider>
  );
}

const headlineTitle = ({ voyage, destinationName }: MyPlanT) =>
  voyage ? `${voyage.vessel_name} → ${destinationName}` : '운송계획 상세';

function PlanOrders({
  planId,
  own,
  labels,
}: {
  planId: string;
  own: OwnScopeT;
  labels: LotLabelMapT;
}) {
  const orders = useShipperPlanOrders(planId);

  if (orders.isError) {
    return (
      <QueryError
        message="실행 지시를 불러오지 못했습니다."
        onRetry={() => orders.refetch()}
        isRetrying={orders.isFetching}
      />
    );
  }
  if (orders.isPending) return <CardSkeleton height={256} />;

  const latestFirst = [...orders.data].reverse();
  const requestItems = latestFirst.flatMap(order =>
    order.requests.map(request => ({ planId, order, request }))
  );

  return (
    <div className="flex flex-col gap-4">
      {latestFirst.length === 0 ? (
        <section className="m2-card">
          <div className="m2-card-h">
            <h2 className="m2-h2">실행 지시</h2>
          </div>
          <EmptyState
            title="확인할 실행 지시가 없습니다"
            description="취소·항공 전환으로 계획이 바뀌면 여기서 수락하거나 거절합니다."
          />
        </section>
      ) : (
        latestFirst.map(order => (
          <ShipperOrderCard
            key={order.order_id}
            planId={planId}
            order={order}
            own={own}
            labels={labels}
          />
        ))
      )}

      <section className="m2-card">
        <div className="m2-card-h">
          <h2 className="m2-h2">요청 응답</h2>
        </div>
        <RequestList
          items={requestItems}
          labels={labels}
          emptyText="내 출하와 관련된 요청이 없습니다."
        />
      </section>
    </div>
  );
}
