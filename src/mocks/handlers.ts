import { HttpResponse, delay, http, sse } from 'msw';

import { SIMULATION_INTERVAL_SECONDS } from '@/consts/demo';
import alertsFixture from '@/mocks/fixtures/alerts.json';
import orderForwarderConfirmedFixture from '@/mocks/fixtures/order-forwarder-confirmed.json';
import orderProposedFixture from '@/mocks/fixtures/order-proposed.json';
import orderShipperConfirmedFixture from '@/mocks/fixtures/order-shipper-confirmed.json';
import planAppliedFixture from '@/mocks/fixtures/plan-applied.json';
import planCommittedFixture from '@/mocks/fixtures/plan-committed.json';
import planSessionFixture from '@/mocks/fixtures/plan-session.json';
import replanReduceFixture from '@/mocks/fixtures/replan-reduce.json';
import twinFixture from '@/mocks/fixtures/twin.json';
import type {
  AlertT,
  ConfirmRequestT,
  ExecutionOrderT,
  PlanSessionT,
  ReplanResponseT,
  TwinStateT,
} from '@/types/api';

/**
 * 백엔드가 죽었을 때 쓰는 시연 백업.
 * fixtures 는 실제 백엔드 응답을 그대로 저장한 것이다 (기본 시나리오 + 4시간 단전 시뮬레이션).
 */
const twin = twinFixture as unknown as TwinStateT;
const alerts = alertsFixture.alerts as unknown as AlertT[];

/**
 * 취소 재최적화 시연(산청 5→3, 당겨 채우기 적용 → 밀양 수락 → 포워더 확정)을 그대로 재생한다.
 * 계획 v1 → 적용(v2 확정 대기) → 확정(v2) 순서로 상태만 넘긴다
 */
const planSessions = {
  initial: planSessionFixture as unknown as PlanSessionT,
  applied: planAppliedFixture as unknown as PlanSessionT,
  committed: planCommittedFixture as unknown as PlanSessionT,
};
const replanReduce = replanReduceFixture as unknown as ReplanResponseT;
const orderStages = {
  proposed: orderProposedFixture as unknown as ExecutionOrderT,
  shipperConfirmed: orderShipperConfirmedFixture as unknown as ExecutionOrderT,
  forwarderConfirmed: orderForwarderConfirmedFixture as unknown as ExecutionOrderT,
};

let planStage: keyof typeof planSessions = 'initial';
let currentOrder: ExecutionOrderT | null = null;

const resetPlanStage = () => {
  planStage = 'initial';
  currentOrder = null;
};

const TICK_MS = SIMULATION_INTERVAL_SECONDS * 1_000;

/** 시뮬레이션 시작 시각. 이후 경과 시간만큼 측정값을 재생한다 */
let simulationStartedAt: number | null = null;

const getPlayedCount = () =>
  simulationStartedAt === null
    ? 0
    : Math.min(twin.timeline.length, Math.floor((Date.now() - simulationStartedAt) / TICK_MS) + 1);

export const handlers = [
  http.post('*/api/plans', async () => {
    await delay(600);
    resetPlanStage();

    return HttpResponse.json(planSessions.initial, { status: 201 });
  }),

  http.get('*/api/plans/:planId', () => HttpResponse.json(planSessions[planStage])),

  http.post('*/api/plans/:planId/events', async () => {
    await delay(300);

    return HttpResponse.json(replanReduce);
  }),

  http.post('*/api/plans/:planId/apply', () => {
    planStage = 'applied';
    currentOrder = orderStages.proposed;

    return HttpResponse.json(planSessions.applied);
  }),

  http.get('*/api/plans/:planId/orders', () =>
    HttpResponse.json(currentOrder ? [currentOrder] : [])
  ),

  http.post('*/api/plans/:planId/orders/:orderId/confirm', async ({ request }) => {
    const { actor } = (await request.json()) as ConfirmRequestT;
    if (actor === 'forwarder') {
      planStage = 'committed';
      currentOrder = orderStages.forwarderConfirmed;
    } else {
      currentOrder = orderStages.shipperConfirmed;
    }

    return HttpResponse.json(currentOrder);
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
