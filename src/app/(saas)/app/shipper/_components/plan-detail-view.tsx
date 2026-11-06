'use client';

import { ArrowLeftIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

import { useShipperQuantityPolicies } from '@/apis/saas/quantity-reservations';
import {
  useShipperCatalog,
  useShipperLots,
  useShipperPlan,
  useShipperPlanOrders,
} from '@/apis/saas/shipper';
import { isReplanPending } from '@/apis/saas/shipper-confirm';
import {
  viewerShipperIdOf,
  withLocatedPackhouses,
} from '@/app/(saas)/app/shipper/_components/catalog';
import { ContainerNumbersCard } from '@/app/(saas)/app/shipper/_components/container-numbers-card';
import { settlementFeeLabel } from '@/app/(saas)/app/shipper/_components/fee-label';
import { PLAN_STATUS_LABEL } from '@/app/(saas)/app/shipper/_components/labels';
import {
  type LotLabelMapT,
  lotDayLabel,
  lotLabelMap,
} from '@/app/(saas)/app/shipper/_components/lot-label';
import {
  type MyPlanT,
  type OwnScopeT,
  activeOrderOf,
  buildMyPlan,
  myPendingConfirmations,
  ownScopeOf,
} from '@/app/(saas)/app/shipper/_components/my-plan';
import {
  DecisionButtons,
  RejectForm,
  useOrderDecision,
} from '@/app/(saas)/app/shipper/_components/order-decision';
import { plainWords, so2Text } from '@/app/(saas)/app/shipper/_components/plain-words';
import { PlanConfirmCard } from '@/app/(saas)/app/shipper/_components/plan-confirm-card';
import { QuantityReservationSection } from '@/app/(saas)/app/shipper/_components/quantity-reservation-section';
import {
  CardSkeleton,
  EmptyState,
  QueryError,
  errorStatus,
} from '@/app/(saas)/app/shipper/_components/query-state';
import { RequestList } from '@/app/(saas)/app/shipper/_components/request-list';
import { fmtBurden } from '@/app/(saas)/app/shipper/_components/shipper-format';
import { ShipperMapHero } from '@/app/(saas)/app/shipper/_components/shipper-map-hero';
import { ShipperOrderCard } from '@/app/(saas)/app/shipper/_components/shipper-order-card';
import { ShipperPageHeader } from '@/app/(saas)/app/shipper/_components/shipper-page-header';
import { SHIPPER_PATHS } from '@/app/(saas)/app/shipper/_components/shipper-paths';
import { ShipperPlanCard } from '@/app/(saas)/app/shipper/_components/shipper-plan-card';
import { useNowMinute } from '@/app/(saas)/app/shipper/_components/use-now';
import { isRequestAnswerable } from '@/app/(saas)/app/shipper/_components/use-shipper-tasks';
import { ContainerAllocationPreview } from '@/components/container-allocation-preview';
import { MapLinkProvider } from '@/components/map-link';
import { AirLots } from '@/components/plan-detail/air-lots';
import { ContainerCard } from '@/components/plan-detail/container-card';
import { PlanSummary } from '@/components/plan-detail/plan-summary';
import { TariffCard } from '@/components/plan-detail/tariff-card';
import { SectionErrorBoundary } from '@/components/section-error-boundary';
import { SettlementTable } from '@/components/settlement-table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { SaasPlanSessionT } from '@/types/api-saas';
import { formatKstMonthDayTime } from '@/utils/kst';
import { planSessionLabel } from '@/utils/plan-label';

import './plan-detail.css';

export function PlanDetailView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const planId = searchParams.get('plan_id') ?? '';
  const tabRequested = searchParams.get('tab') ?? 'shipments';
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
  const hasCost = !!(
    session?.plan.settlements.length ||
    session?.plan.container_settlements?.length ||
    session?.plan.settlement_tariffs?.length
  );
  const hasTransport = !!(session?.plan.containers.length || session?.plan.assignments.length);
  const availableTabs = [
    'shipments',
    ...(hasTransport ? ['transport'] : []),
    ...(hasCost ? ['cost'] : []),
    ...(orders.data?.length ? ['changes'] : []),
  ];
  const airLotLabel = (lotId: string) => {
    const lot =
      lots.data?.find(({ id }) => id === lotId) ??
      session?.scenario.lots.find(({ id }) => id === lotId) ??
      null;

    return lotDayLabel(lot ? lot.ready_date : null);
  };
  const backLink = (
    <Link href={SHIPPER_PATHS.PLANS} className="m2-btn m2-btn-sec">
      <ArrowLeftIcon size={16} />
      계획 목록
    </Link>
  );

  const header = (
    <header className="shipper-plan-detail-header">
      <nav aria-label="계획 상세 상위 이동">{backLink}</nav>
      <ShipperPageHeader
        eyebrow="계획 상세"
        title={myPlan ? headlineTitle(myPlan) : '운송계획 상세'}
        sub={
          plan.data ? (
            <div>
              <div className="shipper-plan-detail-meta">
                <span
                  className={
                    plan.data.status === 'committed' ? 'm2-chip m2-chip-ok' : 'm2-chip m2-chip-warn'
                  }
                >
                  {PLAN_STATUS_LABEL[plan.data.status] ?? plan.data.status}
                </span>
                <span className="m2-num">
                  {myPlan?.voyage
                    ? `출항 ${formatKstMonthDayTime(myPlan.voyage.etd)} KST`
                    : '해상 배정 없음'}
                </span>
                <span className="m2-num">
                  생성 {formatKstMonthDayTime(plan.data.created_at)} KST
                </span>
                <span className="m2-num">v{plan.data.version}</span>
              </div>
              <p className="shipper-plan-detail-note">다른 화주는 익명으로 보입니다</p>
            </div>
          ) : null
        }
      />
    </header>
  );

  if (!planId) {
    return (
      <div className="shipper-plan-detail">
        {header}
        <div className="m2-card">
          <EmptyState
            title="볼 계획을 고르세요"
            description="계획 목록에서 계획을 선택하면 상세가 열립니다."
            action={{ href: SHIPPER_PATHS.PLANS, label: '계획 목록으로' }}
          />
        </div>
      </div>
    );
  }

  return (
    <MapLinkProvider>
      <div className="shipper-plan-detail">
        {header}

        <div className="shipper-plan-detail-sections">
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
              <RequiredActions session={session} own={own} labels={labels} />
              <Tabs
                value={availableTabs.includes(tabRequested) ? tabRequested : 'shipments'}
                onValueChange={tab => {
                  const next = new URLSearchParams(searchParams.toString());
                  if (tab === 'shipments') next.delete('tab');
                  else next.set('tab', tab);
                  router.replace(`/app/shipper/plans/detail?${next.toString()}`, { scroll: false });
                }}
                className="shipper-plan-tabs"
              >
                <TabsList aria-label="계획 상세 분류" className="shipper-plan-tab-list">
                  <TabsTrigger value="shipments">내 출하·수량</TabsTrigger>
                  {hasTransport && <TabsTrigger value="transport">운송·배정</TabsTrigger>}
                  {hasCost && <TabsTrigger value="cost">비용·정산</TabsTrigger>}
                  {!!orders.data?.length && <TabsTrigger value="changes">변경 내역</TabsTrigger>}
                </TabsList>
                <TabsContent value="shipments" className="shipper-plan-tab-content">
                  <section className="m2-card">
                    <h2 className="m2-h2">이 계획의 내 출하</h2>
                    <ul className="shipper-plan-own-lots">
                      {[...new Set(myPlan.assignments.map(item => item.lot_id))].map(id => (
                        <li key={id}>{labels.get(id) ?? id}</li>
                      ))}
                    </ul>
                  </section>
                  <QuantityReservationSection
                    planId={session.plan_id}
                    labelOf={id => labels.get(id) ?? id}
                  />
                  <details className="shipper-plan-disclosure">
                    <summary>최초 계획 확인 기록</summary>
                    <PlanConfirmCard
                      planId={session.plan_id}
                      labels={labels}
                      planLabel={planSessionLabel({ ...session, plan_id: '' })}
                      replanPending={isReplanPending(session)}
                      readOnly
                    />
                  </details>
                  <details className="shipper-plan-disclosure">
                    <summary>내 운송 조건·예상 비용 상세</summary>
                    <ShipperPlanCard
                      myPlan={myPlan}
                      own={own}
                      pending={pending}
                      orders={orders.data ?? null}
                      showDetailLink={false}
                      showDecision={false}
                    />
                  </details>
                </TabsContent>
                <TabsContent value="transport" className="shipper-plan-tab-content">
                  <SectionErrorBoundary message="지도를 그리지 못했습니다." className="h-[392px]">
                    <ShipperMapHero myPlan={myPlan} now={now} />
                  </SectionErrorBoundary>
                  <ContainerNumbersCard session={session} />
                  <details className="shipper-plan-disclosure">
                    <summary>적재 미리보기 (2D·3D)</summary>
                    <ContainerAllocationPreview
                      plan={session.plan}
                      scenario={session.scenario}
                      viewerShipperId={viewerShipperId}
                    />
                  </details>
                  <details className="shipper-plan-disclosure">
                    <summary>컨테이너별 배정·혼적 조건</summary>
                    <div className="shipper-plan-tab-content">
                      <PlanSummary plan={session.plan} showAirLots />
                      <ContainerCard
                        plan={session.plan}
                        scenario={session.scenario}
                        viewerShipperId={viewerShipperId}
                      />
                      <AirLots
                        plan={session.plan}
                        scenario={session.scenario}
                        viewerShipperId={viewerShipperId}
                        lotLabel={id => airLotLabel(id)}
                        productLabel={so2Text}
                      />
                    </div>
                  </details>
                </TabsContent>
                <TabsContent value="cost" className="shipper-plan-tab-content">
                  <SettlementTable
                    containerSettlements={session.plan.container_settlements ?? []}
                    scenario={session.scenario}
                    viewerShipperId={viewerShipperId}
                    airSettlements={session.plan.settlements}
                    feeLabel={settlementFeeLabel(session)}
                  />
                  {session.plan.settlement_tariffs?.map(tariff => (
                    <details className="shipper-plan-disclosure" key={tariff.product_id}>
                      <summary>
                        품목별 정산 기준 ·{' '}
                        {so2Text(
                          session.scenario.products.find(
                            product => product.id === tariff.product_id
                          )?.name ?? tariff.product_id
                        )}
                      </summary>
                      <TariffCard tariff={tariff} scenario={session.scenario} />
                    </details>
                  ))}
                  <Link href={SHIPPER_PATHS.SETTLEMENTS} className="m2-btn m2-btn-sec self-start">
                    내 정산 내역
                  </Link>
                </TabsContent>
                {!!orders.data?.length && (
                  <TabsContent value="changes" className="shipper-plan-tab-content">
                    <PlanOrders planId={session.plan_id} own={own} labels={labels} />
                  </TabsContent>
                )}
              </Tabs>
            </>
          )}
        </div>
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
    order.requests
      .filter(request => !isRequestAnswerable(order, request))
      .map(request => ({ planId, order, request }))
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
          <details className="shipper-plan-disclosure" key={order.order_id}>
            <summary>
              실행 지시 · {formatKstMonthDayTime(order.created_at)} ·{' '}
              {EXECUTION_LABEL[order.status] ?? order.status}
            </summary>
            <ShipperOrderCard planId={planId} order={order} own={own} labels={labels} readOnly />
          </details>
        ))
      )}

      <section className="m2-card">
        <div className="m2-card-h">
          <h2 className="m2-h2">요청 응답</h2>
        </div>
        <RequestList
          items={requestItems}
          labels={labels}
          ownShipperIds={own.shipperIds}
          emptyText="내 출하와 관련된 요청이 없습니다."
        />
      </section>
    </div>
  );
}

function RequiredActions({
  session,
  own,
  labels,
}: {
  session: SaasPlanSessionT;
  own: OwnScopeT;
  labels: LotLabelMapT;
}) {
  const orders = useShipperPlanOrders(session.plan_id);
  const policies = useShipperQuantityPolicies(session.plan_id);
  const mine = orders.data ? myPendingConfirmations(orders.data, own) : [];
  const decision = useOrderDecision(session.plan_id, mine);
  const active = orders.data ? activeOrderOf(session, orders.data) : null;
  const requests = (orders.data ?? []).flatMap(order =>
    order.requests
      .filter(request => isRequestAnswerable(order, request))
      .map(request => ({ planId: session.plan_id, order, request }))
  );
  const pendingQuantity =
    policies.data?.filter(voyage => voyage.reservations.some(item => item.pending_adjustment)) ??
    [];

  return (
    <div className="shipper-plan-required-actions">
      <PlanConfirmCard
        planId={session.plan_id}
        labels={labels}
        replanPending={isReplanPending(session)}
        actionOnly
      />
      {orders.isError && (
        <QueryError
          message="현재 확인할 실행 지시를 불러오지 못했습니다."
          onRetry={() => orders.refetch()}
          isRetrying={orders.isFetching}
        />
      )}
      {mine.length > 0 && (
        <section className="m2-card" aria-label="현재 필요한 변경 확인">
          <h2 className="m2-h2">변경 계획 확인이 필요합니다</h2>
          <p className="m2-sub">
            내 출하의 비용·일정이 바뀌는 요청입니다. 내용을 확인하고 응답하세요.
          </p>
          <ul className="shipper-plan-action-list">
            {mine.map(({ order, confirmation }) => (
              <li key={`${order.order_id}:${confirmation.shipper_id}`}>
                <span>{plainWords(confirmation.reason_text.join(' · '), labels)}</span>
                <span>
                  내 비용 {fmtBurden(confirmation.net_cost_delta)} · 응답 기한{' '}
                  {formatKstMonthDayTime(confirmation.deadline)} KST
                </span>
              </li>
            ))}
          </ul>
          <DecisionButtons decision={decision} acceptLabel="변경 계획 수락" className="mt-3" />
          <RejectForm decision={decision} />
        </section>
      )}
      {mine.length === 0 &&
        active &&
        (active.status === 'proposed' || active.status === 'shipper_confirmed') && (
          <p role="status" className="m2-note mt-0">
            변경 실행 지시:{' '}
            {active.status === 'shipper_confirmed' ? '포워더 확정 대기' : '화주 확인 대기'}. 현재
            내게 요청된 변경 확인은 없습니다.
          </p>
        )}
      {pendingQuantity.length > 0 && (
        <p role="status" className="m2-note mt-0">
          수량 변경 요청이 포워더 적용을 기다리고 있습니다.{' '}
          {pendingQuantity
            .map(voyage => `변경 마감 ${formatKstMonthDayTime(voyage.policy.cutoff)} KST`)
            .join(' · ')}
        </p>
      )}
      {requests.length > 0 && (
        <section className="m2-card" aria-label="지금 응답할 요청">
          <h2 className="m2-h2 mb-3">지금 응답할 요청</h2>
          <RequestList
            items={requests}
            labels={labels}
            ownShipperIds={own.shipperIds}
            emptyText="지금 응답할 요청이 없습니다."
          />
        </section>
      )}
    </div>
  );
}

const EXECUTION_LABEL: Record<string, string> = {
  proposed: '화주 확인 대기',
  shipper_confirmed: '포워더 확정 대기',
  forwarder_confirmed: '확정 완료',
  executed: '실행 완료',
  rejected: '거절됨',
  expired: '기한 만료',
};
