import { HttpResponse, delay, http } from 'msw';

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
import type {
  ConfirmRequestT,
  ExecutionOrderT,
  PlanEventT,
  PlanSessionT,
  ReplanResponseT,
} from '@/types/api';

const initialSession = planSessionFixture as unknown as PlanSessionT;

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

export const handlers = [
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

  http.post('*/api/demo/reset', () => {
    resetPlanStage();

    return HttpResponse.json({ cleared_sessions: 1 });
  }),
];
