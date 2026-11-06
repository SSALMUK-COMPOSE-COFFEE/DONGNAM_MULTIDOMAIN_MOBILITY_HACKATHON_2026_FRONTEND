import { HttpResponse, delay, http, sse } from 'msw';

import { SIMULATION_INTERVAL_SECONDS } from '@/consts/demo';
import alertsFixture from '@/mocks/fixtures/alerts.json';
import fuelShockFixture from '@/mocks/fixtures/fuel-shock.json';
import intakeGrapeFixture from '@/mocks/fixtures/intake-grape.json';
import intakeStrawberryFixture from '@/mocks/fixtures/intake-strawberry.json';
import orderAirForwarderConfirmedFixture from '@/mocks/fixtures/order-air-forwarder-confirmed.json';
import orderAirProposedFixture from '@/mocks/fixtures/order-air-proposed.json';
import orderAirShipperConfirmedFixture from '@/mocks/fixtures/order-air-shipper-confirmed.json';
import orderForwarderConfirmedFixture from '@/mocks/fixtures/order-forwarder-confirmed.json';
import orderProposedFixture from '@/mocks/fixtures/order-proposed.json';
import orderShipperConfirmedFixture from '@/mocks/fixtures/order-shipper-confirmed.json';
import planAirAppliedFixture from '@/mocks/fixtures/plan-air-applied.json';
import planAirCommittedFixture from '@/mocks/fixtures/plan-air-committed.json';
import planAppliedFixture from '@/mocks/fixtures/plan-applied.json';
import planCommittedFixture from '@/mocks/fixtures/plan-committed.json';
import planSessionFixture from '@/mocks/fixtures/plan-session.json';
import replanAirSwitchFixture from '@/mocks/fixtures/replan-air-switch.json';
import replanReduceFixture from '@/mocks/fixtures/replan-reduce.json';
import scenarioFuelShockFixture from '@/mocks/fixtures/scenario-fuel-shock.json';
import twinFixture from '@/mocks/fixtures/twin.json';
import type {
  AlertT,
  ConfirmRequestT,
  ExecutionOrderT,
  FuelShockResultT,
  IntakePreviewT,
  IntakeRequestT,
  PlanEventT,
  PlanSessionT,
  ReplanResponseT,
  ScenarioT,
  TwinStateT,
} from '@/types/api';

/**
 * 백엔드가 죽었을 때 쓰는 시연 백업.
 * fixtures 는 실제 백엔드 응답을 그대로 저장한 것이다 (기본 시나리오 + 4시간 단전 시뮬레이션).
 */
const twin = twinFixture as unknown as TwinStateT;
const alerts = alertsFixture.alerts as unknown as AlertT[];

const initialSession = planSessionFixture as unknown as PlanSessionT;

/**
 * 재최적화 시연 두 가지를 그대로 재생한다. 각각 실제 백엔드에서 처음 계획부터 끝까지 돌린 응답이다.
 * - reduce: 산청 5→3 → 당겨 채우기 적용 → 밀양 수락 → 포워더 확정
 * - air_switch: 산청 항공 전환 → 당겨 채우기 적용 → 밀양 수락 → 포워더 확정
 * 계획은 v1 → 적용(v2 확정 대기) → 확정(v2) 순서로 상태만 넘긴다
 */
const replanFlows = {
  reduce: {
    replan: replanReduceFixture,
    applied: planAppliedFixture,
    committed: planCommittedFixture,
    proposed: orderProposedFixture,
    shipperConfirmed: orderShipperConfirmedFixture,
    forwarderConfirmed: orderForwarderConfirmedFixture,
  },
  air_switch: {
    replan: replanAirSwitchFixture,
    applied: planAirAppliedFixture,
    committed: planAirCommittedFixture,
    proposed: orderAirProposedFixture,
    shipperConfirmed: orderAirShipperConfirmedFixture,
    forwarderConfirmed: orderAirForwarderConfirmedFixture,
  },
};
type ReplanFlowKeyT = keyof typeof replanFlows;

/** 마지막으로 보낸 변동. 적용·확정은 이 흐름의 응답으로 이어진다 */
let activeFlow: ReplanFlowKeyT = 'reduce';
let planStage: 'initial' | 'applied' | 'committed' = 'initial';
let currentOrder: ExecutionOrderT | null = null;

const resetPlanStage = () => {
  planStage = 'initial';
  currentOrder = null;
};

const getPlanSession = () =>
  (planStage === 'initial'
    ? initialSession
    : replanFlows[activeFlow][planStage]) as unknown as PlanSessionT;

const TICK_MS = SIMULATION_INTERVAL_SECONDS * 1_000;

/** 시뮬레이션 시작 시각. 이후 경과 시간만큼 측정값을 재생한다 */
let simulationStartedAt: number | null = null;

const getPlayedCount = () =>
  simulationStartedAt === null
    ? 0
    : Math.min(twin.timeline.length, Math.floor((Date.now() - simulationStartedAt) / TICK_MS) + 1);

export const handlers = [
  // 운임 쇼크는 다음 배 후속 딸기 3로트가 더 있는 별도 시나리오다
  http.get('*/api/scenarios/:scenarioId', ({ params }) =>
    HttpResponse.json(
      params.scenarioId === 'fuel-shock'
        ? (scenarioFuelShockFixture as unknown as ScenarioT)
        : initialSession.scenario
    )
  ),

  // 저장한 미리보기는 딸기(산청 2파렛트)와 SO2 포도(포항 3파렛트) 두 가지다
  http.post('*/api/intake/lots', async ({ request }) => {
    const { product } = (await request.json()) as IntakeRequestT;
    await delay(300);

    return HttpResponse.json(
      (product === 'grape_so2' ? intakeGrapeFixture : intakeStrawberryFixture) as IntakePreviewT
    );
  }),

  http.post('*/api/plans', async () => {
    await delay(600);
    resetPlanStage();

    return HttpResponse.json(initialSession, { status: 201 });
  }),

  http.get('*/api/plans/:planId', () => HttpResponse.json(getPlanSession())),

  http.post('*/api/plans/:planId/events', async ({ request }) => {
    const { event } = (await request.json()) as { event: PlanEventT };
    activeFlow = event.type === 'air_switch' ? 'air_switch' : 'reduce';
    await delay(300);

    return HttpResponse.json(replanFlows[activeFlow].replan as unknown as ReplanResponseT);
  }),

  http.post('*/api/plans/:planId/apply', () => {
    planStage = 'applied';
    currentOrder = replanFlows[activeFlow].proposed as unknown as ExecutionOrderT;

    return HttpResponse.json(getPlanSession());
  }),

  http.get('*/api/plans/:planId/orders', () =>
    HttpResponse.json(currentOrder ? [currentOrder] : [])
  ),

  http.post('*/api/plans/:planId/orders/:orderId/confirm', async ({ request }) => {
    const { actor } = (await request.json()) as ConfirmRequestT;
    const flow = replanFlows[activeFlow];
    if (actor === 'forwarder') {
      planStage = 'committed';
      currentOrder = flow.forwarderConfirmed as unknown as ExecutionOrderT;
    } else {
      currentOrder = flow.shipperConfirmed as unknown as ExecutionOrderT;
    }

    return HttpResponse.json(currentOrder);
  }),

  // 저장한 응답은 시연 값(470 → 2,060원) 한 가지다
  http.post('*/api/analysis/fuel-shock', async () => {
    await delay(600);

    return HttpResponse.json(fuelShockFixture as unknown as FuelShockResultT);
  }),

  http.post('*/api/demo/reset', () => {
    simulationStartedAt = null;
    resetPlanStage();

    return HttpResponse.json({ cleared_sessions: 1 });
  }),

  http.post('*/api/coldchain/bindings', () => HttpResponse.json({}, { status: 201 })),

  http.post('*/api/coldchain/simulate', () => {
    simulationStartedAt = Date.now();

    return HttpResponse.json({ done: false });
  }),

  http.get('*/api/coldchain/containers/:containerId', () => {
    const played = getPlayedCount();
    if (played === 0) return HttpResponse.json({ detail: 'no readings' }, { status: 404 });

    const timeline = twin.timeline.slice(0, played);
    const last = timeline[timeline.length - 1];

    return HttpResponse.json({
      ...twin,
      reading_count: played,
      timeline,
      current: twin.current && {
        ...twin.current,
        ts: last.ts,
        temp_c: last.temp_c,
        power_on: last.power_on,
      },
      // 재생 중인 시각까지 발생한 조치만 보여준다
      actions: twin.actions.filter(action => action.triggered_at <= last.ts),
    } satisfies TwinStateT);
  }),

  sse<{ alert: string }>('*/api/coldchain/alerts/stream', ({ client }) => {
    const sent = new Set<number>();

    const timer = setInterval(() => {
      const played = getPlayedCount();
      if (played === 0) return;

      const lastTs = twin.timeline[played - 1].ts;
      alerts
        .filter(alert => alert.at <= lastTs && !sent.has(alert.seq))
        .forEach(alert => {
          sent.add(alert.seq);
          // 실제 서버처럼 보낸 시각을 created_at 으로 찍는다 (화면은 이 값으로 지난 알림을 거른다)
          const sentAlert = { ...alert, created_at: new Date().toISOString() };
          client.send({ id: String(alert.seq), event: 'alert', data: JSON.stringify(sentAlert) });
        });

      if (sent.size === alerts.length) clearInterval(timer);
    }, TICK_MS);
  }),
];
