import { HttpResponse, delay, http } from 'msw';

import planSessionFixture from '@/mocks/fixtures/plan-session.json';
import replanReduceFixture from '@/mocks/fixtures/replan-reduce.json';
import { api, authorize, canReadPlan, fail } from '@/mocks/saas/access';
import { demoApply, demoOrders, demoPlan, demoReplan } from '@/mocks/saas/demo-bridge';
import { type MockOrgT, orgOfShipper } from '@/mocks/saas/orgs';
import { SEEDED_AT, mockDb, nowIso, onMockReset } from '@/mocks/saas/state';
import type { SaasSchemaT } from '@/types/api-saas';
import type {
  ChangeRequestAppliedT,
  ChangeRequestApplyT,
  ChangeRequestRejectT,
  ChangeRequestReplanT,
  PlatformChangeRequestT,
} from '@/types/saas-platform';
import type {
  CancellationEstimateT,
  ChangeRequestCreateT,
  ChangeRequestTypeT,
  ShipperChangeRequestT,
  ShipperNotificationKindT,
  ShipperNotificationT,
} from '@/types/saas-shipper';

type ReplanT = SaasSchemaT<'ReplanResponse'>;
type PlanSessionT = SaasSchemaT<'PlanSession'>;
type AlternativeIdT = NonNullable<PlatformChangeRequestT['alternative_id']>;

const NOT_FOUND = '변경 요청을 찾을 수 없습니다';
const PLAN_NOT_FOUND = '계획을 찾을 수 없습니다';
const LOT_NOT_IN_PLAN = '계획에 없는 출하입니다';
const NOT_PLANNED = '계획에 배정된(planned) 자기 출하만 변경을 요청할 수 있습니다';
const ALREADY_OPEN = '이 출하에 처리 중인 변경 요청이 있습니다';
const ALREADY_AIR = '이미 항공으로 배정된 출하입니다';
const NOT_OPEN = '이미 처리된 변경 요청입니다';
const NO_REPLAN = '먼저 변경 요청으로 3안을 계산하세요';
const INFEASIBLE = '실행할 수 없는 대안입니다';

const SENDER = '[프레시스위치]';
const CHANNEL = '알림톡(모의)';
const SHIPPER_PLAN_PATH = '/app/shipper/plans/detail';
const CHANGE_TYPES: readonly ChangeRequestTypeT[] = ['reduce', 'cancel', 'air_switch'];
const DEFAULT_LIMIT = 100;

const seedSession = planSessionFixture as unknown as PlanSessionT;
const reduceReplan = replanReduceFixture as unknown as ReplanT;

type StateT = {
  requests: PlatformChangeRequestT[];
  replans: Map<string, ReplanT>;
  notifications: (ShipperNotificationT & { org_id: string })[];
  seq: number;
};

const shipperLink = (planId: string, orderId: string | null = null) => {
  const query = new URLSearchParams({ plan_id: planId });
  if (orderId) query.set('order_id', orderId);

  return `${SHIPPER_PLAN_PATH}?${query.toString()}`;
};

const changePhrase = (type: ChangeRequestTypeT, lotId: string, newPallets: number | null) => {
  if (type === 'reduce') return `출하 ${lotId} ${newPallets ?? 0}파렛트로 감량`;
  if (type === 'cancel') return `출하 ${lotId} 취소`;

  return `출하 ${lotId} 항공 전환`;
};

const toEvent = (
  type: ChangeRequestTypeT,
  lotId: string,
  newPallets: number | null
): PlatformChangeRequestT['event'] => {
  if (type === 'reduce') return { type, lot_id: lotId, new_pallets: newPallets ?? 0 };

  return { type, lot_id: lotId };
};

const estimateOf = (
  type: ChangeRequestTypeT,
  pallets: number,
  newPallets: number | null
): CancellationEstimateT | null => {
  if (type === 'air_switch') return null;

  const cancelled = type === 'cancel' ? pallets : pallets - (newPallets ?? pallets);
  const rateBase = reduceReplan.alternatives
    .filter(alternative => alternative.feasible)
    .map(alternative => alternative.diff.cancellation)
    .find(cancellation => cancellation && cancellation.dead_pallets > 0);
  const first = reduceReplan.alternatives[0]?.diff.cancellation;
  const perPallet = rateBase
    ? rateBase.fee / rateBase.dead_pallets
    : (first?.share_per_pallet_before ?? 0) * (first?.fee_rate ?? 0);
  const charges = reduceReplan.alternatives.flatMap(alternative => {
    const base = alternative.diff.cancellation;
    if (!alternative.feasible || !base) return [];

    const refilled = base.refilled_pallets > 0 ? Math.min(cancelled, base.refilled_pallets) : 0;
    const dead = cancelled - refilled;

    return [{ id: alternative.id, base, refilled, dead, fee: Math.round(perPallet * dead) }];
  });
  const chosen = charges.find(item => item.id === reduceReplan.recommended_id) ?? charges[0];
  if (!chosen) return null;

  const fees = charges.map(item => item.fee);

  return {
    alternative_id: chosen.id,
    fee: chosen.fee,
    fee_rate: chosen.base.fee_rate,
    cancelled_pallets: cancelled,
    refilled_pallets: chosen.refilled,
    dead_pallets: chosen.dead,
    min_fee: Math.min(...fees),
    max_fee: Math.max(...fees),
    rule: chosen.base.rule,
    source: chosen.base.source,
  };
};

const lotOf = (lotId: string) => seedSession.scenario.lots.find(lot => lot.id === lotId);

const seedRequest = (
  id: string,
  lotId: string,
  type: ChangeRequestTypeT,
  newPallets: number | null,
  reason: string,
  decided: { note: string } | null
): PlatformChangeRequestT => {
  const lot = lotOf(lotId);
  const org = orgOfShipper(lot?.shipper_id ?? '');

  return {
    request_id: id,
    plan_id: seedSession.plan_id,
    lot_id: lotId,
    shipper_id: lot?.shipper_id ?? '',
    type,
    new_pallets: newPallets,
    reason,
    status: decided ? 'rejected' : 'open',
    cancellation_estimate: estimateOf(type, lot?.pallets ?? 0, newPallets),
    alternative_id: null,
    order_id: null,
    order_status: null,
    decision_note: decided?.note ?? null,
    created_at: SEEDED_AT,
    updated_at: SEEDED_AT,
    decided_at: decided ? SEEDED_AT : null,
    shipper_org_id: org?.org_id ?? '',
    shipper_org_name: org?.org_name ?? '',
    event: toEvent(type, lotId, newPallets),
    replan_id: null,
  };
};

const seedNotifications = (rejected: PlatformChangeRequestT): StateT['notifications'] => {
  const shipperIds = [...new Set(seedSession.plan.assignments.map(item => item.shipper_id))];
  const planned = shipperIds.flatMap(shipperId => {
    const org = orgOfShipper(shipperId);
    if (!org) return [];
    const count = seedSession.plan.assignments.filter(a => a.shipper_id === shipperId).length;

    return [
      {
        org_id: org.org_id,
        notification_id: `ntf-seed-${shipperId}`,
        kind: 'plan_confirmation_requested' as const,
        channel: CHANNEL,
        shipper_id: shipperId,
        plan_id: seedSession.plan_id,
        order_id: null,
        change_request_id: null,
        title: '새 계획 확인 요청',
        body: `${SENDER} 새 공동적재 계획에 출하 ${count}건이 들어갔습니다. 확인 후 수락 또는 거절해 주세요.`,
        link: shipperLink(seedSession.plan_id),
        sent: false,
        created_at: SEEDED_AT,
      },
    ];
  });

  return [
    ...planned,
    {
      org_id: rejected.shipper_org_id,
      notification_id: `ntf-seed-${rejected.request_id}`,
      kind: 'change_request_rejected',
      channel: CHANNEL,
      shipper_id: rejected.shipper_id,
      plan_id: rejected.plan_id,
      order_id: null,
      change_request_id: rejected.request_id,
      title: '변경 요청 반려',
      body: `${SENDER} 요청하신 ${changePhrase(rejected.type, rejected.lot_id, rejected.new_pallets)}이(가) 반려되었습니다. 사유: ${rejected.decision_note ?? ''}`,
      link: shipperLink(rejected.plan_id),
      sent: false,
      created_at: SEEDED_AT,
    },
  ];
};

const seedState = (): StateT => {
  const rejected = seedRequest(
    'cr-seed-miryang',
    'lot-miryang-sb-1',
    'air_switch',
    null,
    '판매처 입고일이 당겨졌습니다',
    { note: '같은 날 항공 좌석이 남지 않아 해상으로 유지합니다' }
  );
  const open = seedRequest(
    'cr-seed-sancheong',
    'lot-sancheong-sb-1',
    'reduce',
    3,
    '수확량이 예상보다 2파렛트 적습니다',
    null
  );

  return {
    requests: [open, rejected],
    replans: new Map(),
    notifications: seedNotifications(rejected),
    seq: 0,
  };
};

const state = seedState();

onMockReset(() => Object.assign(state, seedState()));

const nextId = (prefix: string) => {
  state.seq += 1;

  return `${prefix}-mock-${state.seq}`;
};

const shipperView = ({
  shipper_org_id: _org,
  shipper_org_name: _name,
  event: _event,
  replan_id: _replan,
  ...rest
}: PlatformChangeRequestT): ShipperChangeRequestT => rest;

const notificationView = ({ org_id: _org, ...rest }: StateT['notifications'][number]) =>
  rest as ShipperNotificationT;

const page = <T>(items: T[], url: URL) => {
  const limit = Number(url.searchParams.get('limit') ?? DEFAULT_LIMIT);
  const offset = Number(url.searchParams.get('offset') ?? 0);

  return items.slice(offset, offset + limit);
};

const filterRequests = (items: PlatformChangeRequestT[], url: URL) => {
  const status = url.searchParams.get('status');
  const planId = url.searchParams.get('plan_id');
  const filtered = items
    .filter(item => !status || item.status === status)
    .filter(item => !planId || item.plan_id === planId)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  return page(filtered, url);
};

const notify = (
  orgId: string,
  draft: Omit<ShipperNotificationT, 'notification_id' | 'channel' | 'sent' | 'created_at'> & {
    kind: ShipperNotificationKindT;
  }
) => {
  const notification = {
    ...draft,
    org_id: orgId,
    notification_id: nextId('ntf'),
    channel: CHANNEL,
    sent: false,
    created_at: nowIso(),
  };
  state.notifications.push(notification);

  return notificationView(notification);
};

const platformRequest = (requestId: string, org: MockOrgT) => {
  const request = state.requests.find(item => item.request_id === requestId);

  return request && canReadPlan(request.plan_id, org) ? request : null;
};

const updateRequest = (request: PlatformChangeRequestT, patch: Partial<PlatformChangeRequestT>) =>
  Object.assign(request, patch, { updated_at: nowIso() });

const syncLot = (request: PlatformChangeRequestT) => {
  const lot = mockDb.lots.find(item => item.id === request.lot_id);
  if (!lot) return;

  if (request.type === 'cancel') lot.status = 'cancelled';
  if (request.type === 'reduce' && request.new_pallets) lot.pallets = request.new_pallets;
  lot.updated_at = nowIso();
};

const validateCreate = (body: ChangeRequestCreateT, pallets: number) => {
  if (!CHANGE_TYPES.includes(body.type))
    return '변경 종류는 reduce·cancel·air_switch 중 하나입니다';
  if (body.type !== 'reduce') return null;
  if (!body.new_pallets || body.new_pallets < 1 || body.new_pallets >= pallets) {
    return `감량 뒤 파렛트 수는 1 이상 ${pallets - 1} 이하여야 합니다`;
  }

  return null;
};

const shipperHandlers = [
  http.post(api('/saas/shipper/plans/:planId/change-requests'), async ({ request, params }) => {
    const principal = authorize(request, 'shipper');
    if (principal instanceof Response) return principal;

    const planId = String(params.planId);
    if (!canReadPlan(planId, principal.org)) return fail(404, PLAN_NOT_FOUND);

    const body = (await request.json()) as ChangeRequestCreateT;
    const session = (await demoPlan(planId)) as unknown as PlanSessionT;
    const lot = session.scenario.lots.find(item => item.id === body.lot_id);
    if (!lot || !principal.org.shipper_ids.includes(lot.shipper_id)) {
      return fail(404, LOT_NOT_IN_PLAN);
    }
    const invalid = validateCreate(body, lot.pallets);
    if (invalid) return fail(422, invalid);

    const stored = mockDb.lots.find(item => item.id === lot.id);
    const assignment = session.plan.assignments.find(item => item.lot_id === lot.id);
    if ((stored && stored.status !== 'planned') || !assignment) return fail(409, NOT_PLANNED);
    if (body.type === 'air_switch' && assignment.mode === 'air') return fail(409, ALREADY_AIR);
    if (state.requests.some(item => item.lot_id === lot.id && item.status === 'open')) {
      return fail(409, ALREADY_OPEN);
    }

    await delay(300);
    const newPallets = body.type === 'reduce' ? (body.new_pallets ?? null) : null;
    const now = nowIso();
    const created: PlatformChangeRequestT = {
      request_id: nextId('cr'),
      plan_id: planId,
      lot_id: lot.id,
      shipper_id: lot.shipper_id,
      type: body.type,
      new_pallets: newPallets,
      reason: body.reason ?? null,
      status: 'open',
      cancellation_estimate: estimateOf(body.type, lot.pallets, newPallets),
      alternative_id: null,
      order_id: null,
      order_status: null,
      decision_note: null,
      created_at: now,
      updated_at: now,
      decided_at: null,
      shipper_org_id: principal.org.org_id,
      shipper_org_name: principal.org.org_name,
      event: toEvent(body.type, lot.id, newPallets),
      replan_id: null,
    };
    state.requests.push(created);

    return HttpResponse.json(shipperView(created), { status: 201 });
  }),

  http.get(api('/saas/shipper/change-requests'), ({ request }) => {
    const principal = authorize(request, 'shipper');
    if (principal instanceof Response) return principal;

    const own = state.requests.filter(item => item.shipper_org_id === principal.org.org_id);

    return HttpResponse.json(filterRequests(own, new URL(request.url)).map(shipperView));
  }),

  http.get(api('/saas/shipper/notifications'), ({ request }) => {
    const principal = authorize(request, 'shipper');
    if (principal instanceof Response) return principal;

    const url = new URL(request.url);
    const planId = url.searchParams.get('plan_id');
    const own = state.notifications
      .filter(item => item.org_id === principal.org.org_id)
      .filter(item => !planId || item.plan_id === planId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    return HttpResponse.json(page(own, url).map(notificationView));
  }),
];

const confirmationNotices = async (planId: string, request: PlatformChangeRequestT) => {
  const order = (await demoOrders(planId)).at(-1) ?? null;
  if (!order) return { order, notices: [], confirmationSent: false };

  const pending = order.shipper_confirmations.filter(item => item.status === 'pending');
  const notices = pending.flatMap(confirmation => {
    const org = orgOfShipper(confirmation.shipper_id);
    if (!org) return [];
    const deadline = new Date(confirmation.deadline).toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });

    return [
      notify(org.org_id, {
        kind: 'order_confirmation_requested',
        shipper_id: confirmation.shipper_id,
        plan_id: planId,
        order_id: order.order_id,
        change_request_id: null,
        title: '계획 변경 확인 요청',
        body: `${SENDER} 공동적재 계획이 바뀌었습니다. ${deadline}까지 변경 내용을 확인하고 수락 또는 거절해 주세요.`,
        link: shipperLink(planId, order.order_id),
      }),
    ];
  });

  return {
    order,
    notices,
    confirmationSent: pending.some(item => item.shipper_id === request.shipper_id),
  };
};

const platformHandlers = [
  http.get(api('/saas/platform/change-requests'), ({ request }) => {
    const principal = authorize(request, 'platform');
    if (principal instanceof Response) return principal;

    const readable = state.requests.filter(item => canReadPlan(item.plan_id, principal.org));

    return HttpResponse.json(filterRequests(readable, new URL(request.url)));
  }),

  http.get(api('/saas/platform/change-requests/:requestId'), ({ request, params }) => {
    const principal = authorize(request, 'platform');
    if (principal instanceof Response) return principal;

    const found = platformRequest(String(params.requestId), principal.org);

    return found ? HttpResponse.json(found) : fail(404, NOT_FOUND);
  }),

  http.post(
    api('/saas/platform/change-requests/:requestId/replan'),
    async ({ request, params }) => {
      const principal = authorize(request, 'platform');
      if (principal instanceof Response) return principal;

      const found = platformRequest(String(params.requestId), principal.org);
      if (!found) return fail(404, NOT_FOUND);
      if (found.status !== 'open') return fail(409, NOT_OPEN);

      const result = (await demoReplan(found.plan_id, found.event)) as unknown as ReplanT;
      const replan: ReplanT = { ...result, plan_id: found.plan_id, event: found.event };
      state.replans.set(found.request_id, replan);
      updateRequest(found, { replan_id: replan.replan_id });

      const body: ChangeRequestReplanT = { change_request: found, replan };

      return HttpResponse.json(body);
    }
  ),

  http.post(api('/saas/platform/change-requests/:requestId/apply'), async ({ request, params }) => {
    const principal = authorize(request, 'platform');
    if (principal instanceof Response) return principal;

    const found = platformRequest(String(params.requestId), principal.org);
    if (!found) return fail(404, NOT_FOUND);

    const body = (await request.json()) as ChangeRequestApplyT;
    if (found.status === 'applied' && found.alternative_id === body.alternative_id) {
      const replayed: ChangeRequestAppliedT = {
        change_request: found,
        plan: (await demoPlan(found.plan_id)) as unknown as PlanSessionT,
        notifications: [],
      };

      return HttpResponse.json(replayed);
    }
    if (found.status !== 'open') return fail(409, NOT_OPEN);

    const replan = state.replans.get(found.request_id);
    if (!replan || !found.replan_id) return fail(409, NO_REPLAN);
    const alternative = replan.alternatives.find(item => item.id === body.alternative_id);
    if (!alternative?.feasible) return fail(422, INFEASIBLE);

    const plan = (await demoApply(found.plan_id, {
      alternative_id: body.alternative_id,
      replan_id: found.replan_id,
    })) as unknown as PlanSessionT;
    const { order, notices, confirmationSent } = await confirmationNotices(found.plan_id, found);
    const now = nowIso();
    updateRequest(found, {
      status: 'applied',
      alternative_id: body.alternative_id as AlternativeIdT,
      order_id: order?.order_id ?? null,
      order_status: order?.status ?? null,
      decision_note: body.note ?? null,
      decided_at: now,
    });
    syncLot(found);

    const followUp = confirmationSent
      ? '실행 지시 확인 요청을 함께 보냈습니다.'
      : '포워더 확정 뒤 집하·선적 일정이 확정됩니다.';
    const decision = notify(found.shipper_org_id, {
      kind: 'change_request_applied',
      shipper_id: found.shipper_id,
      plan_id: found.plan_id,
      order_id: found.order_id,
      change_request_id: found.request_id,
      title: '변경 요청 반영',
      body: `${SENDER} 요청하신 ${changePhrase(found.type, found.lot_id, found.new_pallets)}이(가) 계획에 반영되었습니다. ${followUp}`,
      link: shipperLink(found.plan_id, found.order_id),
    });

    const applied: ChangeRequestAppliedT = {
      change_request: found,
      plan,
      notifications: [...notices, decision],
    };

    return HttpResponse.json(applied);
  }),

  http.post(
    api('/saas/platform/change-requests/:requestId/reject'),
    async ({ request, params }) => {
      const principal = authorize(request, 'platform');
      if (principal instanceof Response) return principal;

      const found = platformRequest(String(params.requestId), principal.org);
      if (!found) return fail(404, NOT_FOUND);
      if (found.status !== 'open') return fail(409, NOT_OPEN);

      const { note = null } = ((await request.json().catch(() => ({}))) ??
        {}) as ChangeRequestRejectT;
      updateRequest(found, { status: 'rejected', decision_note: note, decided_at: nowIso() });
      notify(found.shipper_org_id, {
        kind: 'change_request_rejected',
        shipper_id: found.shipper_id,
        plan_id: found.plan_id,
        order_id: found.order_id,
        change_request_id: found.request_id,
        title: '변경 요청 반려',
        body: `${SENDER} 요청하신 ${changePhrase(found.type, found.lot_id, found.new_pallets)}이(가) 반려되었습니다.${note ? ` 사유: ${note}` : ''}`,
        link: shipperLink(found.plan_id, found.order_id),
      });

      return HttpResponse.json(found);
    }
  ),
];

export const changeRequestHandlers = [...shipperHandlers, ...platformHandlers];
