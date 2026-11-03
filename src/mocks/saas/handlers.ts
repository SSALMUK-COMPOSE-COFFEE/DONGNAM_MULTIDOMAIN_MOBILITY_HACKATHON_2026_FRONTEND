import { HttpResponse, delay, http, sse } from 'msw';

import { API_BASE_URL } from '@/consts/api';
import {
  BASE_PATH,
  SAAS_API_BASE,
  SAAS_ENDPOINTS,
  SAAS_HEADERS,
  SAAS_REQUESTED_WITH,
} from '@/consts/api-saas';
import { DEMO_EMAIL_DOMAIN } from '@/consts/sandbox-saas';
import alertsFixture from '@/mocks/fixtures/alerts.json';
import intakeStrawberryFixture from '@/mocks/fixtures/intake-strawberry.json';
import planSessionFixture from '@/mocks/fixtures/plan-session.json';
import twinFixture from '@/mocks/fixtures/twin.json';
import { createAnonymizer } from '@/mocks/saas/anonymize';
import {
  demoConfirm,
  demoCreatePlan,
  demoOrders,
  demoPlan,
  demoReset,
} from '@/mocks/saas/demo-bridge';
import airSeaFixture from '@/mocks/saas/fixtures/air-sea.json';
import arrivalFixture from '@/mocks/saas/fixtures/arrival.json';
import benchmarkFixture from '@/mocks/saas/fixtures/benchmark.json';
import delayForecastNormalFixture from '@/mocks/saas/fixtures/delay-forecast-normal.json';
import delayForecastTyphoonFixture from '@/mocks/saas/fixtures/delay-forecast-typhoon.json';
import fuelShockPlanFixture from '@/mocks/saas/fixtures/fuel-shock-plan.json';
import lossRatesFixture from '@/mocks/saas/fixtures/loss-rates.json';
import provenanceFixture from '@/mocks/saas/fixtures/provenance.json';
import scheduleCheckFixture from '@/mocks/saas/fixtures/schedule-check.json';
import settlementPreviewFixture from '@/mocks/saas/fixtures/settlement-preview.json';
import ulsanCongestionFixture from '@/mocks/saas/fixtures/ulsan-congestion.json';
import {
  MOCK_ORGS,
  type MockOrgT,
  PLATFORM_ORG_ID,
  findOrg,
  firstOrgOfType,
  meOf,
} from '@/mocks/saas/orgs';
import {
  type MockArrivalT,
  type MockBindingT,
  type MockDeviceT,
  type MockLotStatusT,
  type MockLotT,
  answerKey,
  clearSession,
  findAccount,
  mockDb,
  nowIso,
  readSession,
  resetMockDb,
  saveAccount,
  shipperOrgOfLot,
  writeSession,
} from '@/mocks/saas/state';
import type {
  AlertT,
  ExecutionOrderT,
  IntakePreviewT,
  IntakeRequestT,
  PlanSessionT,
  TwinStateT,
} from '@/types/api';
import type {
  DemoLoginRequest,
  LoginRequest,
  Me,
  OrgType,
  SignupOrgType,
  SignupRequest,
} from '@/types/saas';
import type {
  AirSeaComparisonT,
  ArrivalRequestT,
  ArrivalSettlementResultT,
  BenchmarkResultT,
  DelayForecastRequestT,
  DelayForecastResponseT,
  LossTableT,
  PlatformFuelShockResultT,
  PortCongestionT,
  ProvenanceCatalogT,
  ScheduleCheckResponseT,
  SettlementPreviewT,
} from '@/types/saas-analysis';
import type { PlanPreviewT } from '@/types/saas-platform';
import type { ShowcaseT } from '@/types/saas-public';
import type { SandboxResetT } from '@/types/saas-sandbox';

const api = (path: string) => `${SAAS_API_BASE}${path}`;

const MONEY_TOTALS = [
  'total_baseline_cost',
  'total_shared_cost',
  'total_savings',
  'total_fee',
  'total_operational_baseline_cost',
  'total_operational_cost',
  'total_operational_savings',
] as const;
const MONEY_LISTS = [
  'settlements',
  'container_settlements',
  'settlement_tariffs',
  'shipper_costs',
] as const;

const SSE_TICK_MS = 1_500;
const SIGNUP_ORG_TYPES: readonly SignupOrgType[] = ['shipper', 'forwarder'];

const twin = twinFixture as unknown as TwinStateT;
const previewSession = planSessionFixture as unknown as PlanSessionT;
const alerts = alertsFixture.alerts as unknown as AlertT[];

type PrincipalT = { org: MockOrgT; me: Me };

const fail = (status: number, detail: string) => HttpResponse.json({ detail }, { status });

const isSaasRequest = (request: Request) =>
  request.headers.get(SAAS_HEADERS.REQUESTED_WITH) === SAAS_REQUESTED_WITH;

const csrfFailure = (request: Request) =>
  request.method !== 'GET' && !isSaasRequest(request) ? fail(403, 'CSRF 헤더가 필요합니다') : null;

const authenticate = (request: Request): PrincipalT | Response => {
  const session = readSession();
  if (!session) return fail(401, '로그인이 필요합니다');

  const requestedOrg = request.headers.get(SAAS_HEADERS.ORG_ID);
  if (requestedOrg && requestedOrg !== session.org.org_id) {
    return fail(403, '이 조직에 속해 있지 않습니다');
  }

  return { org: session.org, me: meOf(session.org, session.email, session.name) };
};

const authorize = (request: Request, ...roles: OrgType[]): PrincipalT | Response => {
  const csrf = csrfFailure(request);
  if (csrf) return csrf;

  const principal = authenticate(request);
  if (principal instanceof Response) return principal;
  if (roles.length && !roles.includes(principal.org.org_type)) {
    return fail(403, '이 역할로는 접근할 수 없습니다');
  }

  return principal;
};

const startSession = (org: MockOrgT, email: string, name: string) => {
  writeSession({ org, email, name });

  return HttpResponse.json(meOf(org, email, name));
};

const firstVoyage = (session: PlanSessionT) => {
  const used = new Set(
    session.plan.containers.filter(container => container.used).map(c => c.voyage_id)
  );
  const voyage = session.scenario.voyages
    .filter(item => used.has(item.id))
    .sort((a, b) => a.etd.localeCompare(b.etd))[0];

  return { vessel: voyage?.vessel_name ?? null, departure: voyage?.etd ?? null };
};

const totalPallets = (session: PlanSessionT) =>
  session.plan.assignments.reduce((sum, assignment) => sum + assignment.pallets, 0);

const planIds = () => [...mockDb.planCreatedAt.keys()];

const forwarderRef = (planId: string) => {
  const org = findOrg(mockDb.forwarders.get(planId));

  return org ? { org_id: org.org_id, org_name: org.org_name } : null;
};

const planItem = (session: PlanSessionT) => ({
  plan_id: session.plan_id,
  created_at: mockDb.planCreatedAt.get(session.plan_id) ?? session.created_at,
  status: session.status,
  ...firstVoyage(session),
  shipper_count: new Set(session.scenario.lots.map(lot => lot.shipper_id)).size,
  total_pallets: totalPallets(session),
  forwarder: forwarderRef(session.plan_id),
});

const currentSessions = () => Promise.all(planIds().map(demoPlan));

const showcaseOf = (session: PlanSessionT): ShowcaseT => {
  const { scenario, plan, routes } = session;
  const packhouseOf = new Map(scenario.shippers.map(s => [s.id, s.packhouse_id]));
  const used = plan.containers.filter(container => container.used);
  const usedVoyages = new Set(used.map(container => container.voyage_id));
  const voyages = scenario.voyages
    .filter(voyage => usedVoyages.has(voyage.id))
    .sort((a, b) => a.etd.localeCompare(b.etd) || a.id.localeCompare(b.id));
  const portIds = new Set(voyages.flatMap(voyage => [voyage.origin, voyage.destination]));
  const assignedPackhouses = new Set(
    plan.assignments.flatMap(a => {
      const packhouseId = packhouseOf.get(a.shipper_id);

      return packhouseId ? [packhouseId] : [];
    })
  );
  const trucks = routes.flatMap(voyage =>
    voyage.pickup.routes.map(truck => ({ voyageId: voyage.voyage_id, truck }))
  );
  const shown = new Set([
    ...assignedPackhouses,
    ...trucks.flatMap(({ truck }) => truck.stops.map(stop => stop.packhouse_id)),
  ]);
  const productIds = new Set(plan.assignments.map(a => a.product_id));
  const air = new Map<string, number>();
  plan.assignments
    .filter(a => a.mode === 'air')
    .forEach(a => {
      const key = packhouseOf.get(a.shipper_id);
      if (key) air.set(key, (air.get(key) ?? 0) + a.pallets);
    });

  return {
    basis: 'default_scenario',
    saving_rate: plan.total_baseline_cost
      ? Math.round((plan.total_savings / plan.total_baseline_cost) * 1_000) / 1_000
      : 0,
    packhouse_count: assignedPackhouses.size,
    total_pallets: totalPallets(session),
    containers: used.map(container => ({
      container_id: container.container_id,
      voyage_id: container.voyage_id,
      product_ids: container.product_ids,
      pallets: container.pallets,
      capacity_pallets: container.capacity_pallets,
    })),
    air: [...air].map(([packhouse_id, pallets]) => ({ packhouse_id, pallets })),
    packhouses: scenario.packhouses
      .filter(packhouse => shown.has(packhouse.id))
      .map(({ id, name, lat, lon }) => ({ id, name, lat, lon })),
    ports: scenario.ports
      .filter(port => portIds.has(port.id))
      .map(({ id, name, lat, lon }) => ({ id, name, lat, lon })),
    products: scenario.products
      .filter(product => productIds.has(product.id))
      .map(({ id, name, so2_treated }) => ({ id, name, so2_treated })),
    voyages: voyages.map(({ id, vessel_name, origin, destination, transit_days }) => ({
      id,
      vessel_name,
      origin,
      destination,
      transit_days,
    })),
    routes: trucks.map(({ voyageId, truck }) => ({
      voyage_id: voyageId,
      truck_id: truck.truck_id,
      trip: truck.trip,
      cargo_group: truck.cargo_group ?? null,
      load_pallets: truck.load_pallets,
      stops: [...truck.stops]
        .sort((a, b) => a.sequence - b.sequence)
        .map(stop => stop.packhouse_id),
    })),
  };
};

const ownLotIds = (session: PlanSessionT, org: MockOrgT) => {
  const own = new Set(org.shipper_ids);

  return session.scenario.lots.filter(lot => own.has(lot.shipper_id)).map(lot => lot.id);
};

const shipperCanRead = (planId: string, org: MockOrgT) => {
  const lots = mockDb.planLots.get(planId);
  if (!lots) return false;

  return mockDb.lots.some(lot => lots.has(lot.id) && org.shipper_ids.includes(lot.shipper_id));
};

const canReadPlan = (planId: string, org: MockOrgT) => {
  if (!mockDb.planCreatedAt.has(planId)) return false;
  if (org.org_type === 'platform') return org.org_id === PLATFORM_ORG_ID;
  if (org.org_type === 'forwarder') return mockDb.forwarders.get(planId) === org.org_id;

  return shipperCanRead(planId, org);
};

const THIRD_PARTY_ROLES: readonly string[] = ['carrier', 'terminal', 'airline'];
const THIRD_PARTY_ANSWER_FORBIDDEN = '선사·터미널·항공사 요청의 회신은 배정된 포워더가 기록합니다';

const recordAnswer = async (request: Request, orderId: string, requestId: string) => {
  const { accepted, note } = (await request.json()) as {
    accepted: boolean;
    note?: string | null;
  };
  mockDb.answers.set(answerKey(orderId, requestId), {
    status: accepted ? 'accepted' : 'declined',
    note: note ?? null,
    answered_at: nowIso(),
  });
};

const withAnswers = (order: ExecutionOrderT): ExecutionOrderT => ({
  ...order,
  requests: order.requests.map(item => {
    const answer = mockDb.answers.get(answerKey(order.order_id, item.request_id));

    return answer ? { ...item, ...answer } : item;
  }),
});

const shipperOrders = (session: PlanSessionT, org: MockOrgT, orders: ExecutionOrderT[]) => {
  const own = new Set(org.shipper_ids);
  const myLots = new Set(ownLotIds(session, org));
  const anonymizer = createAnonymizer(session.scenario, org.shipper_ids);

  return orders
    .map(withAnswers)
    .filter(order => {
      const shippers = new Set([
        ...order.shipper_confirmations.map(item => item.shipper_id),
        ...order.notified_shipper_ids,
      ]);

      return (
        [...own].some(id => shippers.has(id)) ||
        order.requests.some(item => (item.lot_ids ?? []).some(id => myLots.has(id)))
      );
    })
    .map(
      order =>
        anonymizer.walk({
          ...order,
          shipper_confirmations: order.shipper_confirmations.filter(item =>
            own.has(item.shipper_id)
          ),
          notified_shipper_ids: order.notified_shipper_ids.filter(id => own.has(id)),
          requests: order.requests.filter(item => (item.lot_ids ?? []).some(id => myLots.has(id))),
        }) as ExecutionOrderT
    );
};

const withoutSettlement = (session: PlanSessionT): PlanSessionT => {
  const plan: Record<string, unknown> = { ...session.plan };
  MONEY_LISTS.forEach(key => {
    plan[key] = [];
  });
  MONEY_TOTALS.forEach(key => {
    plan[key] = null;
  });

  return { ...session, plan } as unknown as PlanSessionT;
};

const catalogFor = (session: PlanSessionT, org: MockOrgT) => {
  const scenario = session.scenario;
  if (org.org_type === 'platform') return { ...scenario, lots: [] };

  const shippers = scenario.shippers.filter(shipper => org.shipper_ids.includes(shipper.id));
  const packhouseIds = new Set(shippers.map(shipper => shipper.packhouse_id));

  return {
    ...scenario,
    shippers,
    packhouses: scenario.packhouses.filter(packhouse => packhouseIds.has(packhouse.id)),
    lots: [],
  };
};

const platformLot = (lot: MockLotT) => {
  const org = shipperOrgOfLot(lot);

  return { ...lot, shipper_org_id: org?.org_id ?? '', shipper_org_name: org?.org_name ?? '' };
};

const filterLots = (lots: MockLotT[], url: URL) => {
  const status = url.searchParams.get('status') as MockLotStatusT | null;
  const readyFrom = url.searchParams.get('ready_from');
  const readyTo = url.searchParams.get('ready_to');
  const offset = Number(url.searchParams.get('offset') ?? 0);
  const limit = Number(url.searchParams.get('limit') ?? 200);

  return lots
    .filter(lot => !status || lot.status === status)
    .filter(lot => !readyFrom || lot.ready_date >= readyFrom)
    .filter(lot => !readyTo || lot.ready_date <= readyTo)
    .slice(offset, offset + limit);
};

const ownLot = (lotId: string, org: MockOrgT) =>
  mockDb.lots.find(lot => lot.id === lotId && org.shipper_ids.includes(lot.shipper_id)) ?? null;

const addDays = (date: string, days: number) => {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);

  return value.toISOString().slice(0, 10);
};

const intakePreview = (lot: MockLotT, session: PlanSessionT): IntakePreviewT => {
  const preview = intakeStrawberryFixture as unknown as IntakePreviewT;
  const product = session.scenario.products.find(item => item.id === lot.product_id);
  const shipper = session.scenario.shippers.find(item => item.id === lot.shipper_id);
  const packhouse = session.scenario.packhouses.find(item => item.id === shipper?.packhouse_id);
  const port = session.scenario.ports.find(item => item.id === lot.destination);
  const lotBody = {
    source: lot.source,
    id: lot.id,
    shipper_id: lot.shipper_id,
    product_id: lot.product_id,
    pallets: lot.pallets,
    ready_date: lot.ready_date,
    destination: lot.destination,
    sell_by_date: lot.sell_by_date,
    sell_window: lot.sell_window,
  };

  return {
    ...preview,
    lot: lotBody,
    event: { type: 'add_lot', lot: lotBody },
    resolved: {
      ...preview.resolved,
      product_id: lot.product_id,
      product_name: product?.name ?? lot.product_id,
      shipper_id: lot.shipper_id,
      shipper_name: shipper?.name ?? lot.shipper_id,
      packhouse_id: packhouse?.id ?? '',
      packhouse_name: packhouse?.name ?? '',
      destination_port_id: lot.destination,
      destination_name: port?.name ?? lot.destination,
    },
  } as IntakePreviewT;
};

const platformSettlement = (session: PlanSessionT) => {
  const rows = session.plan.settlements;

  return {
    plan_id: session.plan_id,
    ...firstVoyage(session),
    total_saving_krw: rows.reduce((sum, row) => sum + row.savings, 0),
    platform_fee_krw: rows.reduce((sum, row) => sum + row.fee, 0),
    shippers: rows.map(row => ({
      shipper_id: row.shipper_id,
      shipper_org_name:
        MOCK_ORGS.find(org => org.shipper_ids.includes(row.shipper_id))?.org_name ?? null,
      saving_krw: row.savings,
      fee_krw: row.fee,
    })),
  };
};

const shipperSettlements = (session: PlanSessionT, org: MockOrgT) =>
  session.plan.settlements
    .filter(row => org.shipper_ids.includes(row.shipper_id))
    .map(row => ({
      ...row,
      fee_before_refund: row.fee,
      quality_refund: 0,
      plan_id: session.plan_id,
      version: session.version,
      ...firstVoyage(session),
    }));

const devicesOf = (orgId: string) => {
  const devices = mockDb.devices.get(orgId) ?? [];
  mockDb.devices.set(orgId, devices);

  return devices;
};

const deviceToken = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(24)), byte =>
    byte.toString(16).padStart(2, '0')
  ).join('');

const twinFor = (planId: string | null): TwinStateT => ({
  ...twin,
  plan_id: planId ?? twin.plan_id,
});

const twinSummary = (planId: string) => {
  const last = twin.timeline[twin.timeline.length - 1];

  return {
    container_id: twin.container_id,
    plan_id: planId,
    status: twin.status,
    reading_count: twin.reading_count,
    last_ts: last?.ts ?? null,
    temp_c: last?.temp_c ?? null,
    power_on: last?.power_on ?? null,
    cumulative_outage_minutes: twin.outage.cumulative_minutes,
    sensor_loss_rate: twin.loss.sensor_loss_rate,
    predicted_loss_rate: twin.loss.predicted_loss_rate,
    delta_krw: twin.loss.delta_krw,
    open_actions: twin.actions.length,
  };
};

const streamOverlapsDemo = () => {
  if (BASE_PATH || typeof window === 'undefined') return false;

  return new URL(API_BASE_URL, window.location.origin).origin === window.location.origin;
};

const authHandlers = [
  http.get(api(SAAS_ENDPOINTS.ME), ({ request }) => {
    const principal = authenticate(request);
    if (principal instanceof Response) return principal;

    return HttpResponse.json(principal.me);
  }),

  http.post(api(SAAS_ENDPOINTS.AUTH_LOGIN), async ({ request }) => {
    const csrf = csrfFailure(request);
    if (csrf) return csrf;

    const { email, password } = (await request.json()) as LoginRequest;
    const account = findAccount(email);
    if (account) {
      if (account.password !== password)
        return fail(401, '이메일 또는 비밀번호가 올바르지 않습니다');

      return startSession(account.org, email, account.name);
    }

    return fail(401, '이메일 또는 비밀번호가 올바르지 않습니다');
  }),

  http.post(api(SAAS_ENDPOINTS.AUTH_DEMO_LOGIN), async ({ request }) => {
    const csrf = csrfFailure(request);
    if (csrf) return csrf;

    const { org_type, org_id } = (await request.json()) as DemoLoginRequest;
    const org = org_id
      ? (MOCK_ORGS.find(
          item => item.sandbox && item.org_id === org_id && item.org_type === org_type
        ) ?? null)
      : firstOrgOfType(org_type);
    if (!org) return fail(404, '데모 계정이 없습니다');

    await delay(200);

    return startSession(org, `${org.org_id}@${DEMO_EMAIL_DOMAIN}`, org.org_name);
  }),

  http.post(api(SAAS_ENDPOINTS.AUTH_SIGNUP), async ({ request }) => {
    const csrf = csrfFailure(request);
    if (csrf) return csrf;

    const body = (await request.json()) as SignupRequest;
    if (!SIGNUP_ORG_TYPES.includes(body.org_type))
      return fail(422, '가입할 수 없는 조직 종류입니다');
    if (body.email.endsWith(`@${DEMO_EMAIL_DOMAIN}`)) {
      return fail(422, '데모 주소로는 가입할 수 없습니다');
    }

    if (findAccount(body.email)) {
      return fail(409, '이미 가입된 이메일입니다');
    }

    mockDb.lotSeq += 1;
    const org: MockOrgT = {
      org_id: `${body.org_type}-mock-${mockDb.lotSeq}`,
      org_type: body.org_type,
      org_name: body.org_name,
      shipper_ids: [],
      sandbox: false,
    };
    MOCK_ORGS.push(org);
    saveAccount({ org, email: body.email, name: body.name, password: body.password });

    return startSession(org, body.email, body.name);
  }),

  http.post(api(SAAS_ENDPOINTS.AUTH_LOGOUT), ({ request }) => {
    const csrf = csrfFailure(request);
    if (csrf) return csrf;

    clearSession();

    return new HttpResponse(null, { status: 204 });
  }),
];

const catalogHandlers = [
  http.get(api('/saas/catalog'), async ({ request }) => {
    const principal = authorize(request, 'platform', 'shipper');
    if (principal instanceof Response) return principal;

    return HttpResponse.json(catalogFor(await demoPlan(planIds()[0]), principal.org));
  }),

  http.get(api('/saas/orgs'), ({ request }) => {
    const principal = authorize(request, 'platform');
    if (principal instanceof Response) return principal;

    const type = new URL(request.url).searchParams.get('type');

    return HttpResponse.json(
      MOCK_ORGS.filter(org => org.org_type !== 'platform')
        .filter(org => !type || org.org_type === type)
        .map(({ org_id, org_type, org_name }) => ({ org_id, org_type, org_name }))
    );
  }),
];

const shipperHandlers = [
  http.get(api('/saas/shipper/lots'), ({ request }) => {
    const principal = authorize(request, 'shipper');
    if (principal instanceof Response) return principal;

    const own = mockDb.lots.filter(lot => principal.org.shipper_ids.includes(lot.shipper_id));

    return HttpResponse.json(filterLots(own, new URL(request.url)));
  }),

  http.post(api('/saas/shipper/lots'), async ({ request }) => {
    const principal = authorize(request, 'shipper');
    if (principal instanceof Response) return principal;

    const shipperId = principal.org.shipper_ids[0];
    if (!shipperId) return fail(422, '조직에 등록된 화주 정보가 없습니다');

    const body = (await request.json()) as IntakeRequestT;
    const session = await demoPlan(planIds()[0]);
    const now = nowIso();
    mockDb.lotSeq += 1;
    const lot: MockLotT = {
      id: body.lot_id || `lot-${shipperId.replace(/^sh-/, '')}-${body.product}-${mockDb.lotSeq}`,
      scenario_id: body.scenario_id,
      shipper_id: shipperId,
      product_id: body.product,
      pallets: body.pallets,
      ready_date: body.ready_date,
      destination: body.destination,
      sell_by_date: body.sell_by_date || addDays(body.ready_date, 7),
      sell_window: body.sell_window,
      packhouse:
        session.scenario.shippers.find(shipper => shipper.id === shipperId)?.packhouse_id ?? null,
      source: '화주 간편 등록',
      status: 'registered',
      created_at: now,
      updated_at: now,
    };
    mockDb.lots.unshift(lot);
    await delay(300);

    return HttpResponse.json(intakePreview(lot, session), { status: 201 });
  }),

  http.patch(api('/saas/shipper/lots/:lotId'), async ({ request, params }) => {
    const principal = authorize(request, 'shipper');
    if (principal instanceof Response) return principal;

    const lot = ownLot(String(params.lotId), principal.org);
    if (!lot) return fail(404, '출하를 찾을 수 없습니다');
    if (lot.status === 'planned') return fail(409, '계획에 들어간 출하는 바꿀 수 없습니다');

    const { product, ...patch } = (await request.json()) as Partial<MockLotT> & {
      product?: string;
    };
    if (patch.status && patch.status !== 'registered' && patch.status !== 'cancelled') {
      return fail(422, '화주는 등록·취소 상태로만 바꿀 수 있습니다');
    }

    Object.assign(lot, patch, product ? { product_id: product } : {}, {
      id: lot.id,
      shipper_id: lot.shipper_id,
      updated_at: nowIso(),
    });

    return HttpResponse.json(lot);
  }),

  http.delete(api('/saas/shipper/lots/:lotId'), ({ request, params }) => {
    const principal = authorize(request, 'shipper');
    if (principal instanceof Response) return principal;

    const lot = ownLot(String(params.lotId), principal.org);
    if (!lot) return fail(404, '출하를 찾을 수 없습니다');
    if (lot.status === 'planned') return fail(409, '계획에 들어간 출하는 바꿀 수 없습니다');

    mockDb.lots = mockDb.lots.filter(item => item !== lot);

    return new HttpResponse(null, { status: 204 });
  }),

  http.get(api('/saas/shipper/plans'), async ({ request }) => {
    const principal = authorize(request, 'shipper');
    if (principal instanceof Response) return principal;

    const sessions = (await currentSessions()).filter(session =>
      canReadPlan(session.plan_id, principal.org)
    );

    return HttpResponse.json(
      sessions.map(session => {
        const mine = new Set(ownLotIds(session, principal.org));

        return {
          plan_id: session.plan_id,
          created_at: mockDb.planCreatedAt.get(session.plan_id) ?? session.created_at,
          status: session.status,
          ...firstVoyage(session),
          my_lot_ids: [...mine],
          my_pallets: session.plan.assignments
            .filter(assignment => mine.has(assignment.lot_id))
            .reduce((sum, assignment) => sum + assignment.pallets, 0),
          total_pallets: totalPallets(session),
        };
      })
    );
  }),

  http.get(api('/saas/shipper/plans/:planId'), async ({ request, params }) => {
    const principal = authorize(request, 'shipper');
    if (principal instanceof Response) return principal;

    const planId = String(params.planId);
    if (!canReadPlan(planId, principal.org)) return fail(404, '계획을 찾을 수 없습니다');

    const session = await demoPlan(planId);

    return HttpResponse.json(
      createAnonymizer(session.scenario, principal.org.shipper_ids).session(session)
    );
  }),

  http.get(api('/saas/shipper/plans/:planId/orders'), async ({ request, params }) => {
    const principal = authorize(request, 'shipper');
    if (principal instanceof Response) return principal;

    const planId = String(params.planId);
    if (!canReadPlan(planId, principal.org)) return fail(404, '계획을 찾을 수 없습니다');

    const [session, orders] = await Promise.all([demoPlan(planId), demoOrders(planId)]);

    return HttpResponse.json(shipperOrders(session, principal.org, orders));
  }),

  http.post(
    api('/saas/shipper/plans/:planId/orders/:orderId/confirm'),
    async ({ request, params }) => {
      const principal = authorize(request, 'shipper');
      if (principal instanceof Response) return principal;

      const planId = String(params.planId);
      if (!canReadPlan(planId, principal.org)) return fail(404, '계획을 찾을 수 없습니다');

      const orders = await demoOrders(planId);
      if (!orders.some(order => order.order_id === params.orderId)) {
        return fail(404, '실행 지시를 찾을 수 없습니다');
      }

      const { accept, note } = (await request.json()) as { accept: boolean; note?: string | null };
      const order = await demoConfirm(planId, String(params.orderId), {
        actor: 'shipper',
        accept,
        note,
      });
      const session = await demoPlan(planId);

      return HttpResponse.json(shipperOrders(session, principal.org, [order])[0] ?? order);
    }
  ),

  http.post(
    api('/saas/shipper/plans/:planId/orders/:orderId/requests/:requestId'),
    async ({ request, params }) => {
      const principal = authorize(request, 'shipper');
      if (principal instanceof Response) return principal;

      const planId = String(params.planId);
      if (!canReadPlan(planId, principal.org)) return fail(404, '계획을 찾을 수 없습니다');

      const [session, orders] = await Promise.all([demoPlan(planId), demoOrders(planId)]);
      const order = orders.find(item => item.order_id === params.orderId);
      const target = order?.requests.find(item => item.request_id === params.requestId);
      if (!order || !target) return fail(404, '실행 지시 또는 요청을 찾을 수 없습니다');
      if (THIRD_PARTY_ROLES.includes(target.counterparty_role)) {
        return fail(403, THIRD_PARTY_ANSWER_FORBIDDEN);
      }

      await recordAnswer(request, order.order_id, target.request_id);

      return HttpResponse.json(shipperOrders(session, principal.org, [order])[0] ?? order);
    }
  ),

  http.get(api('/saas/shipper/settlements'), async ({ request }) => {
    const principal = authorize(request, 'shipper');
    if (principal instanceof Response) return principal;

    const sessions = (await currentSessions()).filter(session =>
      canReadPlan(session.plan_id, principal.org)
    );

    return HttpResponse.json(
      sessions.flatMap(session => shipperSettlements(session, principal.org))
    );
  }),

  http.post(api('/intake/lots'), async ({ request }) => {
    if (!isSaasRequest(request)) return;

    const principal = authorize(request, 'shipper');
    if (principal instanceof Response) return principal;

    const body = (await request.json()) as IntakeRequestT;
    if (!principal.org.shipper_ids.includes(body.shipper)) {
      return HttpResponse.json(
        { detail: [{ field: 'shipper', message: '내 조직의 화주가 아닙니다' }] },
        { status: 422 }
      );
    }

    const session = await demoPlan(planIds()[0]);
    const now = nowIso();
    const lot: MockLotT = {
      id: body.lot_id || `lot-${body.shipper.replace(/^sh-/, '')}-${body.product}-preview`,
      scenario_id: body.scenario_id,
      shipper_id: body.shipper,
      product_id: body.product,
      pallets: body.pallets,
      ready_date: body.ready_date,
      destination: body.destination,
      sell_by_date: body.sell_by_date || addDays(body.ready_date, 7),
      sell_window: body.sell_window,
      packhouse:
        session.scenario.shippers.find(shipper => shipper.id === body.shipper)?.packhouse_id ??
        null,
      source: '화주 간편 등록',
      status: 'registered',
      created_at: now,
      updated_at: now,
    };
    await delay(200);

    return HttpResponse.json({ ...intakePreview(lot, session), registered: null });
  }),
];

const platformHandlers = [
  http.get(api('/saas/platform/lots'), ({ request }) => {
    const principal = authorize(request, 'platform');
    if (principal instanceof Response) return principal;

    return HttpResponse.json(filterLots(mockDb.lots, new URL(request.url)).map(platformLot));
  }),

  http.post(api('/saas/platform/plans'), async ({ request }) => {
    const principal = authorize(request, 'platform');
    if (principal instanceof Response) return principal;

    const body = (await request.json()) as { lot_ids?: string[]; lots?: unknown };
    if (body.lots) return fail(422, 'SaaS 에서는 lot_ids 로만 계획을 만듭니다');

    const lotIds = body.lot_ids ?? [];
    if (!lotIds.length) return fail(422, '계획에 넣을 출하를 고르세요');

    const chosen = mockDb.lots.filter(lot => lotIds.includes(lot.id));
    if (chosen.length !== lotIds.length) return fail(404, '없는 출하가 있습니다');
    if (chosen.some(lot => lot.status !== 'registered')) {
      return fail(409, '등록 상태의 출하만 계획에 넣을 수 있습니다');
    }

    const session = await demoCreatePlan();
    const now = nowIso();
    chosen.forEach(lot => Object.assign(lot, { status: 'planned', updated_at: now }));
    const lots = mockDb.planLots.get(session.plan_id) ?? new Set<string>();
    lotIds.forEach(id => lots.add(id));
    mockDb.planLots.set(session.plan_id, lots);
    mockDb.planCreatedAt.set(session.plan_id, now);

    return HttpResponse.json(session, { status: 201 });
  }),

  http.post(api('/saas/platform/plans/preview'), async ({ request }) => {
    const principal = authorize(request, 'platform');
    if (principal instanceof Response) return principal;

    const body = (await request.json()) as { lot_ids?: string[] };
    const lotIds = body.lot_ids ?? [];
    if (!lotIds.length) return fail(422, '계획에 넣을 등록 출하가 없습니다');

    const chosen = mockDb.lots.filter(lot => lotIds.includes(lot.id));
    if (chosen.length !== lotIds.length) return fail(422, '등록되지 않은 로트입니다');
    if (chosen.some(lot => lot.status !== 'registered')) {
      return fail(409, '이미 계획에 들어갔거나 취소된 출하입니다');
    }

    await delay(400);
    const { scenario, plan, routes } = previewSession;
    const preview = { scenario, plan, routes } as unknown as PlanPreviewT;

    return HttpResponse.json(preview);
  }),

  http.get(api('/saas/platform/plans'), async ({ request }) => {
    const principal = authorize(request, 'platform');
    if (principal instanceof Response) return principal;

    return HttpResponse.json((await currentSessions()).map(planItem));
  }),

  http.get(api('/saas/platform/settlements'), async ({ request }) => {
    const principal = authorize(request, 'platform');
    if (principal instanceof Response) return principal;

    return HttpResponse.json((await currentSessions()).map(platformSettlement));
  }),

  http.put(api('/saas/platform/plans/:planId/forwarder'), async ({ request, params }) => {
    const principal = authorize(request, 'platform');
    if (principal instanceof Response) return principal;

    const planId = String(params.planId);
    if (!canReadPlan(planId, principal.org)) return fail(404, '계획을 찾을 수 없습니다');

    const { forwarder_org_id } = (await request.json()) as { forwarder_org_id: string };
    const forwarder = findOrg(forwarder_org_id);
    if (!forwarder || forwarder.org_type !== 'forwarder') {
      return fail(422, '포워더 조직이 아닙니다');
    }

    mockDb.forwarders.set(planId, forwarder.org_id);

    return HttpResponse.json({ plan_id: planId, forwarder: forwarderRef(planId) });
  }),

  http.delete(api('/saas/platform/plans/:planId/forwarder'), ({ request, params }) => {
    const principal = authorize(request, 'platform');
    if (principal instanceof Response) return principal;

    const planId = String(params.planId);
    if (!canReadPlan(planId, principal.org)) return fail(404, '계획을 찾을 수 없습니다');

    mockDb.forwarders.delete(planId);

    return new HttpResponse(null, { status: 204 });
  }),
];

const forwarderHandlers = [
  http.get(api('/saas/forwarder/plans'), async ({ request }) => {
    const principal = authorize(request, 'forwarder');
    if (principal instanceof Response) return principal;

    const sessions = (await currentSessions()).filter(session =>
      canReadPlan(session.plan_id, principal.org)
    );

    return HttpResponse.json(sessions.map(planItem));
  }),

  http.get(api('/saas/forwarder/plans/:planId'), async ({ request, params }) => {
    const principal = authorize(request, 'forwarder');
    if (principal instanceof Response) return principal;

    const planId = String(params.planId);
    if (!canReadPlan(planId, principal.org)) return fail(404, '계획을 찾을 수 없습니다');

    return HttpResponse.json(withoutSettlement(await demoPlan(planId)));
  }),

  http.get(api('/saas/forwarder/plans/:planId/orders'), async ({ request, params }) => {
    const principal = authorize(request, 'forwarder');
    if (principal instanceof Response) return principal;

    const planId = String(params.planId);
    if (!canReadPlan(planId, principal.org)) return fail(404, '계획을 찾을 수 없습니다');

    return HttpResponse.json((await demoOrders(planId)).map(withAnswers));
  }),

  http.post(
    api('/saas/forwarder/plans/:planId/orders/:orderId/confirm'),
    async ({ request, params }) => {
      const principal = authorize(request, 'forwarder');
      if (principal instanceof Response) return principal;

      const planId = String(params.planId);
      if (!canReadPlan(planId, principal.org)) return fail(404, '계획을 찾을 수 없습니다');

      const orders = await demoOrders(planId);
      if (!orders.some(order => order.order_id === params.orderId)) {
        return fail(404, '실행 지시를 찾을 수 없습니다');
      }

      const { accept, note } = (await request.json()) as { accept: boolean; note?: string | null };

      return HttpResponse.json(
        withAnswers(
          await demoConfirm(planId, String(params.orderId), { actor: 'forwarder', accept, note })
        )
      );
    }
  ),

  http.post(
    api('/saas/forwarder/plans/:planId/orders/:orderId/requests/:requestId'),
    async ({ request, params }) => {
      const principal = authorize(request, 'forwarder');
      if (principal instanceof Response) return principal;

      const planId = String(params.planId);
      if (!canReadPlan(planId, principal.org)) return fail(404, '계획을 찾을 수 없습니다');

      const order = (await demoOrders(planId)).find(item => item.order_id === params.orderId);
      const target = order?.requests.find(item => item.request_id === params.requestId);
      if (!order || !target) return fail(404, '실행 지시 또는 요청을 찾을 수 없습니다');

      await recordAnswer(request, order.order_id, target.request_id);

      return HttpResponse.json(withAnswers(order));
    }
  ),
];

const deviceHandlers = [
  http.get(api('/saas/devices'), ({ request }) => {
    const principal = authorize(request);
    if (principal instanceof Response) return principal;

    return HttpResponse.json(devicesOf(principal.org.org_id));
  }),

  http.post(api('/saas/devices'), async ({ request }) => {
    const principal = authorize(request);
    if (principal instanceof Response) return principal;

    const { device_id, name } = (await request.json()) as { device_id: string; name?: string };
    const taken = [...mockDb.devices.values()].some(devices =>
      devices.some(device => device.device_id === device_id)
    );
    if (taken) return fail(409, '이미 등록된 기기입니다');

    const device: MockDeviceT = {
      device_id,
      name: name ?? null,
      created_at: nowIso(),
      last_seen_at: null,
      binding: null,
    };
    devicesOf(principal.org.org_id).push(device);

    return HttpResponse.json({ ...device, device_token: deviceToken() }, { status: 201 });
  }),

  http.delete(api('/saas/devices/:deviceId'), ({ request, params }) => {
    const principal = authorize(request);
    if (principal instanceof Response) return principal;

    const devices = devicesOf(principal.org.org_id);
    const index = devices.findIndex(device => device.device_id === params.deviceId);
    if (index < 0) return fail(404, '기기를 찾을 수 없습니다');

    devices.splice(index, 1);

    return new HttpResponse(null, { status: 204 });
  }),
];

const coldchainHandlers = [
  http.post(api('/coldchain/bindings'), async ({ request }) => {
    if (!isSaasRequest(request)) return;

    const principal = authorize(request);
    if (principal instanceof Response) return principal;

    const body = (await request.json()) as Omit<MockBindingT, 'bound_at'>;
    const device = devicesOf(principal.org.org_id).find(item => item.device_id === body.device_id);
    if (!device) return fail(404, '조직에 등록된 기기가 아닙니다');

    const binding: MockBindingT = {
      device_id: body.device_id,
      container_id: body.container_id,
      plan_id: body.plan_id ?? null,
      stage: body.stage ?? null,
      bound_at: nowIso(),
    };
    device.binding = binding;

    return HttpResponse.json(binding, { status: 201 });
  }),

  http.get(api('/coldchain/containers'), ({ request }) => {
    if (!isSaasRequest(request)) return;

    const principal = authorize(request);
    if (principal instanceof Response) return principal;

    const requested = new URL(request.url).searchParams.get('plan_id');
    const readable = planIds().filter(planId => canReadPlan(planId, principal.org));
    const targets = requested ? readable.filter(planId => planId === requested) : readable;

    return HttpResponse.json(targets.map(twinSummary));
  }),

  http.get(api('/coldchain/containers/:containerId'), ({ request, params }) => {
    if (!isSaasRequest(request)) return;

    const principal = authorize(request);
    if (principal instanceof Response) return principal;
    if (params.containerId !== twin.container_id) return fail(404, 'no readings');

    const requested = new URL(request.url).searchParams.get('plan_id');
    if (requested && !canReadPlan(requested, principal.org)) {
      return fail(404, '계획을 찾을 수 없습니다');
    }

    return HttpResponse.json(twinFor(requested ?? planIds()[0] ?? null));
  }),
];

const streamHandlers = streamOverlapsDemo()
  ? []
  : [
      sse<{ alert: string }>(api('/coldchain/alerts/stream'), ({ client, request }) => {
        const url = new URL(request.url);
        const since = Number(url.searchParams.get('since') ?? 0);
        const pending = alerts.filter(alert => alert.seq > since);
        if (!readSession()) {
          client.error();

          return;
        }

        const timer = setInterval(() => {
          const alert = pending.shift();
          if (!alert) {
            clearInterval(timer);

            return;
          }

          client.send({
            id: String(alert.seq),
            event: 'alert',
            data: JSON.stringify({ ...alert, created_at: nowIso() }),
          });
        }, SSE_TICK_MS);
      }),
    ];

const publicHandlers = [
  http.get(api(SAAS_ENDPOINTS.PUBLIC_SHOWCASE), () =>
    HttpResponse.json(showcaseOf(previewSession))
  ),
];

const FIXTURE_PLAN_ID = 'mock-plan';
const SANDBOX_RESET_COOLDOWN_MS = 60_000;

const forPlan = <T>(fixture: unknown, planId: string): T =>
  JSON.parse(
    JSON.stringify(fixture).replaceAll(`"${FIXTURE_PLAN_ID}"`, JSON.stringify(planId))
  ) as T;

const airSeaByLot = airSeaFixture as unknown as Record<string, AirSeaComparisonT>;
const arrivalByLot = arrivalFixture as unknown as Record<string, ArrivalSettlementResultT>;
const LOT_NOT_FOUND = '로트를 찾을 수 없습니다';

type QualitySettlementT = ArrivalSettlementResultT['settlement_before'];

const baseSettlements = new Map(
  Object.values(arrivalByLot).map(item => [item.shipper_id, item.settlement_before])
);
const settlementPreview = settlementPreviewFixture as unknown as SettlementPreviewT;

let lastSandboxResetAt = 0;

const platformPlanRequest = (request: Request, planId: string) => {
  if (!isSaasRequest(request)) return null;

  const principal = authorize(request, 'platform');
  if (principal instanceof Response) return principal;
  if (!canReadPlan(planId, principal.org)) return fail(404, '계획을 찾을 수 없습니다');

  return principal;
};

const settlementPreviewFor = (planId: string, org: MockOrgT): SettlementPreviewT => {
  const preview = forPlan<SettlementPreviewT>(settlementPreview, planId);
  if (org.org_type !== 'shipper') return preview;

  const lots = preview.lots.filter(lot => org.shipper_ids.includes(lot.shipper_id));

  return {
    ...preview,
    lots,
    total_refund_change: lots.reduce((sum, lot) => sum + lot.refund_change, 0),
  };
};

const roundRate = (value: number) => Math.round(value * 1e6) / 1e6;

const withRefund = (settlement: QualitySettlementT, refund: number): QualitySettlementT => ({
  ...settlement,
  fee: settlement.fee_before_refund - refund,
  shipper_gain: settlement.shipper_gain - settlement.quality_refund + refund,
  quality_refund: refund,
});

const refundOf = (inspections: Map<string, MockArrivalT>, shipperId: string, fee: number) => {
  const excess = [...inspections.values()]
    .filter(item => item.shipper_id === shipperId)
    .reduce((sum, item) => sum + item.excess_loss_value, 0);

  return { refund: Math.min(Math.max(fee, 0), excess), excess };
};

const platformFeeOf = (inspections: Map<string, MockArrivalT>) =>
  [...baseSettlements.values()].reduce(
    (sum, settlement) =>
      sum +
      settlement.fee_before_refund -
      refundOf(inspections, settlement.shipper_id, settlement.fee_before_refund).refund,
    0
  );

const recordArrival = (
  planId: string,
  basis: ArrivalSettlementResultT,
  body: ArrivalRequestT
): ArrivalSettlementResultT => {
  const inspections = mockDb.arrivals.get(planId) ?? new Map<string, MockArrivalT>();
  const inspectedRate = body.inspected_loss_pct / 100;
  const excessRate = Math.max(0, inspectedRate - basis.planned_loss_rate);
  const excessValue = Math.round(basis.lot_value * excessRate);
  const updated = new Map(inspections).set(basis.lot_id, {
    shipper_id: basis.shipper_id,
    excess_loss_value: excessValue,
  });
  const settlement = baseSettlements.get(basis.shipper_id) ?? basis.settlement_before;
  const fee = settlement.fee_before_refund;
  const before = refundOf(inspections, basis.shipper_id, fee);
  const after = refundOf(updated, basis.shipper_id, fee);
  const platformBefore = platformFeeOf(inspections);
  const platformAfter = platformFeeOf(updated);
  mockDb.arrivals.set(planId, updated);

  return {
    ...basis,
    plan_id: planId,
    inspected_loss_rate: roundRate(inspectedRate),
    excess_loss_rate: roundRate(excessRate),
    excess_loss_value: excessValue,
    shipper_excess_loss_total: after.excess,
    refund_cap: Math.max(fee, 0),
    refund_before: before.refund,
    refund_after: after.refund,
    refund_change: after.refund - before.refund,
    capped: after.excess > after.refund,
    uncovered_loss: after.excess - after.refund,
    settlement_before: withRefund(settlement, before.refund),
    settlement_after: withRefund(settlement, after.refund),
    platform_fee_before: platformBefore,
    platform_fee_after: platformAfter,
    platform_net_change: platformAfter - platformBefore,
    note: body.note ?? null,
  };
};

const analysisHandlers = [
  http.post(api('/analysis/fuel-shock'), async ({ request }) => {
    if (!isSaasRequest(request)) return;

    const principal = authorize(request, 'platform');
    if (principal instanceof Response) return principal;

    const body = (await request.json()) as { plan_id?: string | null };
    if (body.plan_id && !canReadPlan(body.plan_id, principal.org)) {
      return fail(404, '계획을 찾을 수 없습니다');
    }
    await delay(400);

    return HttpResponse.json(
      forPlan<PlatformFuelShockResultT>(fuelShockPlanFixture, body.plan_id ?? FIXTURE_PLAN_ID)
    );
  }),

  http.post(api('/analysis/benchmark'), async ({ request }) => {
    if (!isSaasRequest(request)) return;

    const principal = authorize(request, 'platform');
    if (principal instanceof Response) return principal;

    const body = (await request.json()) as { plan_id?: string | null };
    if (body.plan_id && !canReadPlan(body.plan_id, principal.org)) {
      return fail(404, '계획을 찾을 수 없습니다');
    }
    await delay(300);

    return HttpResponse.json(benchmarkFixture as unknown as BenchmarkResultT);
  }),

  http.post(api('/compare/air-vs-sea'), async ({ request }) => {
    if (!isSaasRequest(request)) return;

    const principal = authorize(request);
    if (principal instanceof Response) return principal;

    const { org } = principal;
    if (org.org_type === 'forwarder') {
      return fail(403, '포워더는 항공·해상 비용 비교를 사용할 수 없습니다');
    }

    const body = (await request.json()) as { lot_id: string; plan_id?: string | null };
    const isShipper = org.org_type === 'shipper';
    if (isShipper && !body.plan_id) {
      return fail(403, '화주는 자기 계획의 출하만 비교할 수 있습니다');
    }
    if (body.plan_id && !canReadPlan(body.plan_id, org)) {
      return fail(404, '계획을 찾을 수 없습니다');
    }
    const comparison = airSeaByLot[body.lot_id];
    if (!comparison) return fail(404, LOT_NOT_FOUND);
    if (isShipper && !org.shipper_ids.includes(comparison.shipper_id)) {
      return fail(404, LOT_NOT_FOUND);
    }

    return HttpResponse.json(comparison);
  }),

  http.post(api('/plans/:planId/delay-forecast'), async ({ request, params }) => {
    const planId = String(params.planId);
    const principal = platformPlanRequest(request, planId);
    if (principal === null) return;
    if (principal instanceof Response) return principal;

    const body = (await request.json().catch(() => ({}))) as DelayForecastRequestT | null;
    const typhoon = body?.preset === 'typhoon' || body?.weather === 'typhoon';
    await delay(600);

    return HttpResponse.json(
      forPlan<DelayForecastResponseT>(
        typhoon ? delayForecastTyphoonFixture : delayForecastNormalFixture,
        planId
      )
    );
  }),

  http.post(api('/plans/:planId/schedule-check'), async ({ request, params }) => {
    const planId = String(params.planId);
    const principal = platformPlanRequest(request, planId);
    if (principal === null) return;
    if (principal instanceof Response) return principal;
    await delay(300);

    return HttpResponse.json(forPlan<ScheduleCheckResponseT>(scheduleCheckFixture, planId));
  }),

  http.post(api('/plans/:planId/settlement/arrival'), async ({ request, params }) => {
    const planId = String(params.planId);
    const principal = platformPlanRequest(request, planId);
    if (principal === null) return;
    if (principal instanceof Response) return principal;

    const body = (await request.json()) as ArrivalRequestT;
    if (!(body.inspected_loss_pct >= 0 && body.inspected_loss_pct <= 100)) {
      return fail(422, '검수 손실률은 0~100% 범위여야 합니다');
    }
    const basis = arrivalByLot[body.lot_id];
    if (!basis) return fail(422, '계획에 없는 로트입니다');

    return HttpResponse.json(recordArrival(planId, basis, body));
  }),

  http.get(api('/coldchain/containers/:containerId/settlement-preview'), ({ request, params }) => {
    if (!isSaasRequest(request)) return;

    const principal = authorize(request);
    if (principal instanceof Response) return principal;
    if (principal.org.org_type === 'forwarder') {
      return fail(403, '포워더는 정산 금액을 볼 수 없습니다');
    }

    const planId = new URL(request.url).searchParams.get('plan_id') ?? planIds()[0] ?? '';
    if (!canReadPlan(planId, principal.org)) return fail(404, '계획을 찾을 수 없습니다');
    if (params.containerId !== settlementPreview.container_id) {
      return fail(404, `센서 기록이 없는 컨테이너입니다: ${String(params.containerId)}`);
    }

    return HttpResponse.json(settlementPreviewFor(planId, principal.org));
  }),

  http.get(api('/vessels/ulsan/congestion'), ({ request }) => {
    if (!isSaasRequest(request)) return;

    const principal = authorize(request);
    if (principal instanceof Response) return principal;

    const congestion = ulsanCongestionFixture as unknown as PortCongestionT;
    const includeVessels = new URL(request.url).searchParams.get('include_vessels') !== 'false';

    return HttpResponse.json(includeVessels ? congestion : { ...congestion, vessels: [] });
  }),

  http.get(api('/data/provenance'), ({ request }) => {
    if (!isSaasRequest(request)) return;

    const principal = authorize(request);
    if (principal instanceof Response) return principal;

    return HttpResponse.json(provenanceFixture as unknown as ProvenanceCatalogT);
  }),

  http.get(api('/quality/loss-rates'), ({ request }) => {
    if (!isSaasRequest(request)) return;

    const principal = authorize(request);
    if (principal instanceof Response) return principal;

    return HttpResponse.json(lossRatesFixture as unknown as LossTableT);
  }),
];

const sandboxHandlers = [
  http.post(api('/saas/sandbox/reset'), async ({ request }) => {
    const principal = authorize(request, 'platform');
    if (principal instanceof Response) return principal;
    if (!principal.org.sandbox)
      return fail(403, '데모(sandbox) 조직에서만 데모 세계를 초기화할 수 있습니다');

    const now = Date.now();
    if (now - lastSandboxResetAt < SANDBOX_RESET_COOLDOWN_MS) {
      const wait = Math.ceil((SANDBOX_RESET_COOLDOWN_MS - (now - lastSandboxResetAt)) / 1000);

      return HttpResponse.json(
        { detail: `방금 초기화했습니다. ${wait}초 뒤에 다시 시도하세요` },
        { status: 429, headers: { 'Retry-After': String(wait) } }
      );
    }
    lastSandboxResetAt = now;
    resetMockDb();
    await demoReset();

    const body: SandboxResetT = {
      scope: 'sandbox',
      orgs: MOCK_ORGS.filter(org => org.sandbox).length,
      reset_at: nowIso(),
    };

    return HttpResponse.json(body);
  }),
];

export const saasHandlers = [
  ...authHandlers,
  ...publicHandlers,
  ...catalogHandlers,
  ...shipperHandlers,
  ...platformHandlers,
  ...forwarderHandlers,
  ...deviceHandlers,
  ...analysisHandlers,
  ...sandboxHandlers,
  ...coldchainHandlers,
  ...streamHandlers,
];
