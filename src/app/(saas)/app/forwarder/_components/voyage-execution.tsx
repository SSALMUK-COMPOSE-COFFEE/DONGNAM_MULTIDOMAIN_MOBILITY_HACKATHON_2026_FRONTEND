'use client';

import { cn } from 'cn';
import { type ReactNode, useState } from 'react';

import { useForwarderPlanOrders } from '@/apis/saas/forwarder';
import { ContainerLoadsCard } from '@/app/(saas)/app/forwarder/_components/container-loads';
import { ForwarderExecutionCard } from '@/app/(saas)/app/forwarder/_components/execution-card';
import {
  type RemainingT,
  circled,
  dayTime,
  formatKm,
  hourMinute,
  monthDayTime,
  remainingUntil,
} from '@/app/(saas)/app/forwarder/_components/format';
import { useForwarderOrderActions } from '@/app/(saas)/app/forwarder/_components/forwarder-order-panel';
import { ForwarderPageHeader } from '@/app/(saas)/app/forwarder/_components/forwarder-page-header';
import {
  CLOSED_ORDER_STATUSES,
  ORDER_STATUS_LABEL,
  isOrderInProgress,
  latestOrder,
  planStatusLabel,
} from '@/app/(saas)/app/forwarder/_components/labels';
import { OrderCard, orderProgress } from '@/app/(saas)/app/forwarder/_components/order-card';
import { PickupSchedule } from '@/app/(saas)/app/forwarder/_components/pickup-schedule';
import { PlanChecklist } from '@/app/(saas)/app/forwarder/_components/plan-checklist';
import { QueryError } from '@/app/(saas)/app/forwarder/_components/query-state';
import { RouteCards, sortedRuns } from '@/app/(saas)/app/forwarder/_components/route-cards';
import { useNow } from '@/app/(saas)/app/forwarder/_components/use-now';
import { useVoyageScene } from '@/app/(saas)/app/forwarder/_components/use-voyage-scene';
import { VoyageColdchainCard } from '@/app/(saas)/app/forwarder/_components/voyage-coldchain-card';
import {
  portName,
  productName,
  usedContainers,
} from '@/app/(saas)/app/forwarder/_components/voyage-model';
import {
  HeroPanel,
  M2_COLORS,
  MapHero,
  MapLegend,
  type MapLegendItemT,
  type MapSceneT,
  type ScenePlaceT,
  type StepItemT,
  Steps,
  Timeline,
  type TimelineDataT,
} from '@/components/map-hero';
import { MapLinkProvider } from '@/components/map-link';
import { SectionErrorBoundary } from '@/components/section-error-boundary';
import { Skeleton } from '@/components/ui/skeleton';
import type { ForwarderOrderT, ForwarderPlanSessionT } from '@/types/saas-forwarder';
import { NO_VESSEL_LABEL } from '@/utils/plan-label';

const MAP_HEIGHT = 380;
const PANEL_RUN_ROWS = 4;

type VoyageExecutionPropsT = {
  session: ForwarderPlanSessionT;
  eyebrow: ReactNode;
};

const remainingNode = (remaining: RemainingT): ReactNode => {
  if (remaining.kind === 'unknown') return '–';
  if (remaining.kind === 'passed') return '마감 지남';
  return (
    <>
      {remaining.hours}
      <small>시간</small> {remaining.minutes}
      <small>분</small>
    </>
  );
};

const passed = (iso: string | null | undefined, now: number | null) =>
  !!iso && now !== null && Date.parse(iso) <= now;

type OrderQueryStateT = {
  order: ForwarderOrderT | null;
  isPending: boolean;
  isError: boolean;
};

const buildSteps = (
  session: ForwarderPlanSessionT,
  voyage: ForwarderPlanSessionT['scenario']['voyages'][number] | null,
  orders: OrderQueryStateT,
  now: number | null
): StepItemT[] => {
  const { order } = orders;
  const orderOpen = !!order && isOrderInProgress(order);
  const cyPassed = passed(voyage?.cy_cutoff, now);
  const etdPassed = passed(voyage?.etd, now);
  const progress = order ? orderProgress(order) : null;
  const isUnapplied = !!order && (order.status === 'rejected' || order.status === 'expired');
  const awaitingShipper = session.status === 'pending_shipper_confirmation';

  const orderSub = (() => {
    if (orders.isPending) return '불러오는 중';
    if (orders.isError) return '불러오지 못함';
    if (awaitingShipper && !orderOpen) return '화주 확인 대기';
    if (!order || !progress) return '변경 지시 없음 · 계획대로';
    if (isUnapplied) return `${ORDER_STATUS_LABEL[order.status]} · 계획대로`;
    return progress.total > 0
      ? `${ORDER_STATUS_LABEL[order.status]} · ${progress.done}/${progress.total} 완료`
      : ORDER_STATUS_LABEL[order.status];
  })();

  const orderState = (): StepItemT['state'] => {
    if (orders.isPending || orders.isError || awaitingShipper) return 'cur';
    return orderOpen ? 'cur' : 'done';
  };
  const cyState = (): StepItemT['state'] => {
    if (cyPassed) return 'done';
    return orderState() === 'done' ? 'cur' : 'todo';
  };
  const etdState = (): StepItemT['state'] => {
    if (etdPassed) return 'done';
    return cyPassed ? 'cur' : 'todo';
  };

  return [
    { title: '배정', sub: monthDayTime(session.created_at), state: 'done' },
    { title: '실행 지시', sub: orderSub, state: orderState() },
    {
      title: 'CY 반입',
      sub: voyage ? `${monthDayTime(voyage.cy_cutoff)} 마감` : '항차 없음',
      state: cyState(),
    },
    {
      title: '선적·출항',
      sub: voyage ? monthDayTime(voyage.etd) : '항차 없음',
      state: etdState(),
    },
  ];
};

export function VoyageExecution({ session, eyebrow }: VoyageExecutionPropsT) {
  const now = useNow();
  const orders = useForwarderPlanOrders(session.plan_id);
  const order = orders.data ? latestOrder(orders.data) : null;
  const actions = useForwarderOrderActions(session.plan_id, order?.order_id ?? '');

  const [pickedVoyageId, setPickedVoyageId] = useState<string | null>(null);
  const { voyages, voyage, slice, scene, timeline } = useVoyageScene(session, pickedVoyageId);

  const containers = usedContainers(slice);
  const { scenario } = session;
  const route = voyage
    ? `${voyage.terminal || portName(scenario, voyage.origin)} → ${portName(scenario, voyage.destination)}`
    : null;
  const containerSummary = containers.map(
    ({ container_id, product_ids, pallets }) =>
      `${container_id} ${product_ids.map(id => productName(scenario, id)).join('·')} ${pallets}P`
  );
  const sub = [route, voyage ? `ETD ${monthDayTime(voyage.etd)}` : null, ...containerSummary]
    .filter(Boolean)
    .join(' · ');

  const isClosed = !!order && CLOSED_ORDER_STATUSES.includes(order.status);
  const confirmLabel = (() => {
    if (!order) return '';
    if (isClosed) return `확정됨 · v${order.target_version}`;
    if (order.status === 'proposed') return '화주 확인 대기';
    if (order.status === 'shipper_confirmed') return '실행 지시 확정';
    return ORDER_STATUS_LABEL[order.status];
  })();

  return (
    <MapLinkProvider key={voyage?.id ?? ''}>
      <ForwarderPageHeader
        eyebrow={eyebrow}
        title={
          voyage ? `${voyage.id} ${voyage.vessel_name} 실행` : `${NO_VESSEL_LABEL} · 항차 실행`
        }
        sub={sub || null}
      >
        <span className="m2-chip self-center">
          {planStatusLabel(session.status ?? 'committed')} · v{session.version}
        </span>
        {order ? (
          <button
            type="button"
            className="m2-btn m2-btn-pri"
            disabled={actions.isConfirming || order.status !== 'shipper_confirmed'}
            onClick={actions.confirm}
          >
            {confirmLabel}
          </button>
        ) : null}
      </ForwarderPageHeader>

      {voyages.length > 1 ? (
        <div role="tablist" aria-label="항차" className="mb-3 flex flex-wrap gap-1.5">
          {voyages.map(item => {
            const isActive = item.id === voyage?.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setPickedVoyageId(item.id)}
                className={cn('m2-btn m2-btn-sm', isActive ? 'm2-btn-pri' : 'm2-btn-sec')}
              >
                <span className="m2-mono">{item.id}</span> {item.vessel_name} · ETD{' '}
                {monthDayTime(item.etd)}
              </button>
            );
          })}
        </div>
      ) : null}

      <Steps
        items={buildSteps(
          session,
          voyage,
          { order, isPending: orders.isPending, isError: orders.isError },
          now
        )}
      />

      <VoyageHero session={slice} scene={scene} timeline={timeline} now={now} />

      <div className="m2-grid grid-cols-2 max-[1180px]:grid-cols-1">
        <RouteCards session={slice} scene={scene} />
        <div className="m2-col">
          {orders.isPending ? <Skeleton className="h-80 rounded-[18px]" /> : null}
          {orders.isError ? (
            <QueryError
              message="실행 지시를 불러오지 못했습니다."
              onRetry={() => orders.refetch()}
              isRetrying={orders.isFetching}
            />
          ) : null}
          {orders.isSuccess && order ? (
            <OrderCard
              order={order}
              session={session}
              answer={actions.answer}
              busyRequestId={actions.busyRequestId}
            />
          ) : null}
          {orders.isSuccess && !order ? <PlanChecklist session={slice} scene={scene} /> : null}
          <ContainerLoadsCard session={slice} />
        </div>
      </div>

      <ForwarderExecutionCard planId={session.plan_id} />

      <VoyageColdchainCard
        planId={session.plan_id}
        planContainerIds={usedContainers(session).map(({ container_id }) => container_id)}
      />

      <div className="mt-4">
        <SectionErrorBoundary message="집하 순서를 그리지 못했습니다." className="h-40">
          <PickupSchedule session={slice} scene={scene} />
        </SectionErrorBoundary>
      </div>
    </MapLinkProvider>
  );
}

type VoyageHeroPropsT = {
  session: ForwarderPlanSessionT;
  scene: MapSceneT;
  timeline: TimelineDataT | null;
  now: number | null;
};

function VoyageHero({ session, scene, timeline, now }: VoyageHeroPropsT) {
  const lane = scene.seaLane;
  const runs = sortedRuns(scene);
  const totalKm = session.routes.reduce((sum, { pickup }) => sum + pickup.total_km, 0);
  const runLabel = new Map(scene.runs.map(run => [run.key, run.label]));

  const rows = runs.slice(0, PANEL_RUN_ROWS).map(run => ({
    k: run.label,
    v: `${run.loadPallets}P · ${monthDayTime(run.portEta)} 도착`,
  }));
  if (runs.length > PANEL_RUN_ROWS) {
    rows.push({ k: '그 밖', v: `${runs.length - PANEL_RUN_ROWS}운행` });
  }

  const legend: MapLegendItemT[] = [
    ...(runs.some(({ tone }) => tone === 'berry')
      ? [{ label: '딸기 운행', color: M2_COLORS.berry }]
      : []),
    ...(runs.some(({ tone }) => tone === 'grape')
      ? [{ label: 'SO₂ 포도 운행', color: M2_COLORS.grape }]
      : []),
    ...(lane ? [{ label: '해상 항로', color: M2_COLORS.brand, dash: true }] : []),
    ...(scene.air.length > 0 ? [{ label: '항공 전환', color: M2_COLORS.warn, dash: true }] : []),
  ];

  const placeSublabel = (place: ScenePlaceT) => {
    const visits = place.visits.map(
      visit =>
        `${runLabel.get(visit.runKey) ?? visit.runKey} ${circled(visit.sequence)} ${visit.pallets}P · ${hourMinute(visit.eta)} 상차`
    );
    const air = place.airPallets > 0 ? [`항공 ${place.airPallets}P`] : [];

    return [...visits, ...air].join(' / ') || place.sublabel;
  };

  return (
    <MapHero
      scene={scene}
      height={MAP_HEIGHT}
      panel={
        <HeroPanel
          label="CY 반입 마감까지"
          value={remainingNode(remainingUntil(lane?.cyCutoff, now))}
          sub={[
            lane ? dayTime(lane.cyCutoff) : null,
            `집하 ${runs.length}운행 ${formatKm(totalKm)}`,
          ]
            .filter(Boolean)
            .join(' · ')}
          rows={rows}
        />
      }
      legend={<MapLegend items={legend} />}
      hint="경로를 누르면 운행 카드로 이동합니다"
      pinText={place => (place.visits[0] ? String(place.visits[0].sequence) : null)}
      placeSublabel={placeSublabel}
      footer={
        timeline ? (
          <Timeline
            title="운행 시간축"
            span={timeline.span}
            rows={timeline.rows}
            bands={timeline.bands}
            cuts={timeline.cuts}
            now={now}
          />
        ) : null
      }
    />
  );
}
