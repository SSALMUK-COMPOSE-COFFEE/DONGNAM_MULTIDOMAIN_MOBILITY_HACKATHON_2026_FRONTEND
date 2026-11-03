import { HttpResponse, type PathParams, http } from 'msw';

import type {
  ColdchainActionT,
  ColdchainAlertT,
  ColdchainLossT,
  ColdchainPresetT,
  ColdchainSummaryT,
  ColdchainTwinT,
} from '@/apis/saas/coldchain';
import { SAAS_API_BASE, SAAS_HEADERS, SAAS_REQUESTED_WITH } from '@/consts/api-saas';
import alertsFixture from '@/mocks/fixtures/alerts.json';
import twinFixture from '@/mocks/fixtures/twin.json';
import { demoPlan } from '@/mocks/saas/demo-bridge';
import { type MockOrgT, PLATFORM_ORG_ID } from '@/mocks/saas/orgs';
import { mockDb, nowIso, readSession } from '@/mocks/saas/state';
import type { PlanSessionT, SimulationRequestT, SimulationRunT } from '@/types/api';
import type {
  ColdchainActionHandlerT,
  ColdchainResidualRiskT,
  GensetCandidateT,
  LotPowerPlanT,
  PowerPlanT,
  PowerSegmentT,
} from '@/types/saas-platform';

const api = (path: string) => `${SAAS_API_BASE}${path}`;

const fail = (status: number, detail: string) => HttpResponse.json({ detail }, { status });

const isSaasRequest = (request: Request) =>
  request.headers.get(SAAS_HEADERS.REQUESTED_WITH) === SAAS_REQUESTED_WITH;

const SENSOR_CONTAINER_ID = 'CA-01';
const NO_DATA_CONTAINER_ID = 'CA-02';
const NOTE_MAX_LENGTH = 500;
const MINUTE_MS = 60_000;

const PLAN_NOT_FOUND = '계획을 찾을 수 없습니다';
const SHIPPER_ACTION_FORBIDDEN =
  '콜드체인 조치의 수락·완료는 플랫폼이나 배정된 포워더가 기록합니다';
const ACTION_DONE = '이미 완료된 조치입니다';
const noReadings = (containerId: string) => `센서 기록이 없는 컨테이너입니다: ${containerId}`;

const baseTwin = twinFixture as unknown as Omit<ColdchainTwinT, 'has_data' | 'residual_risks'>;
const baseAlerts = alertsFixture.alerts as unknown as ColdchainAlertT[];

const RESIDUAL_RISKS: ColdchainResidualRiskT[] = [
  {
    kind: 'heat_accumulation',
    level: 'warning',
    title: '적산 온도',
    value: 33.83,
    unit: '°C·시간',
    threshold: {
      value: 8.4,
      unit: '°C·시간',
      source:
        '가정: 적정 하한 위 적산 온도(°C·시간)가 적정 범위 중앙을 유지했을 때의 1.2배를 넘으면 도착 뒤 유통기한 단축 위험. 손실률 모델은 도착 시점 손실만 계산한다',
    },
    message:
      '적정 하한(0°C) 위 적산 33.8°C·시간, 범위 중앙 유지 시 7.0°C·시간. 도착 뒤 유통기한 단축은 손실률에 들어 있지 않다',
  },
  {
    kind: 'temperature_swing',
    level: 'warning',
    title: '온도 출렁임',
    value: 2.9,
    unit: '°C',
    threshold: {
      value: 1.0,
      unit: '°C',
      source:
        '가정: 품온 표준편차가 1°C를 넘으면 결로·호흡 변동 위험. 손실률 모델은 출렁임을 보지 않는다',
    },
    message:
      '품온 표준편차 2.90°C, 적정 상한 위로 넘어간 횟수 1회. 결로·호흡 변동은 손실률에 들어 있지 않다',
  },
  {
    kind: 'sensor_gap',
    level: 'info',
    title: '측정 공백',
    value: 0.0,
    unit: '분',
    threshold: {
      value: 60.0,
      unit: '분',
      source: '가정: 측정 간격이 이보다 길면 센서 공백으로 보고 이 시간까지만 앞 상태를 이어 센다',
    },
    message: '측정 간격이 60분을 넘은 공백 0분. 공백 동안 상태는 60분까지만 이어 센다',
  },
  {
    kind: 'door_open',
    level: 'info',
    title: '문 열림',
    value: 0.0,
    unit: '회',
    threshold: {
      value: 1.0,
      unit: '회',
      source:
        '가정: 문 열림 측정이 한 번이라도 있으면 외기 유입 위험. 손실률 모델은 문 열림을 보지 않는다',
    },
    message: '문 열림 측정 0회. 외기 유입은 손실률에 들어 있지 않다',
  },
];

const NO_DATA_LOSS: ColdchainLossT = {
  exposure_index: 0,
  sensor_loss_rate: 0.01,
  no_outage_loss_rate: 0.01,
  reference_outage_loss_rate: 0.07,
  planned_loss_rate: 0.016,
  predicted_loss_rate: 0.016,
  cargo_value: 90133020,
  planned_loss_krw: 1442128,
  predicted_loss_krw: 1442128,
  delta_krw: 0,
  lots: [
    {
      lot_id: 'lot-sangju-gr-1',
      shipper_id: 'sh-sangju',
      product_id: 'grape_so2',
      pallets: 13,
      lot_value: 65096070,
      planned_loss_rate: 0.016,
      sensor_loss_rate: 0.01,
      predicted_loss_rate: 0.016,
      planned_loss_krw: 1041537,
      predicted_loss_krw: 1041537,
      delta_krw: 0,
    },
    {
      lot_id: 'lot-pohang-gr-1',
      shipper_id: 'sh-pohang',
      product_id: 'grape_so2',
      pallets: 5,
      lot_value: 25036950,
      planned_loss_rate: 0.016,
      sensor_loss_rate: 0.01,
      predicted_loss_rate: 0.016,
      planned_loss_krw: 400591,
      predicted_loss_krw: 400591,
      delta_krw: 0,
    },
  ],
  shippers: [
    {
      shipper_id: 'sh-pohang',
      shipper_name: '포항 포도 수출농가 E',
      lot_ids: ['lot-pohang-gr-1'],
      lot_value: 25036950,
      planned_loss_krw: 400591,
      predicted_loss_krw: 400591,
      delta_krw: 0,
    },
    {
      shipper_id: 'sh-sangju',
      shipper_name: '상주 포도 수출농가 D',
      lot_ids: ['lot-sangju-gr-1'],
      lot_value: 65096070,
      planned_loss_krw: 1041537,
      predicted_loss_krw: 1041537,
      delta_krw: 0,
    },
  ],
  rule: baseTwin.loss.rule,
};

const PRESETS: ColdchainPresetT[] = [
  {
    id: 'power_cut_restore',
    title: '단전 복구 (4시간 단전)',
    description:
      '정상 1시간 → 터미널 단전 4시간(품온 상승) → 전원 복구 후 2시간 재냉각. 경고·위험, 우선 플러그·젯셋·반입 조정·현지 냉장창고 조치가 모두 뜬다',
    step_minutes: 5,
    readings: 85,
    outage_minutes: 240,
  },
  {
    id: 'short_outage',
    title: '짧은 단전 (45분)',
    description: '정상 1시간 → 단전 45분 → 복구 1시간. 경고와 우선 플러그·젯셋 조치까지만 뜬다',
    step_minutes: 5,
    readings: 34,
    outage_minutes: 45,
  },
  {
    id: 'normal',
    title: '정상 운송 (2시간)',
    description: '전원이 계속 켜져 있고 품온이 적정 범위 안. 경고·조치 없음',
    step_minutes: 5,
    readings: 25,
    outage_minutes: 0,
  },
];

const GATE_WAIT_OFF_PEAK_MINUTES = 20;
const GATE_WAIT_PEAK_MINUTES = 60;
const PLUG_WAIT_MINUTES = 30;
const PRE_ASSIGN_THRESHOLD_MINUTES = 60;
const GENSET_EQUIPMENT = '배터리 젯셋(Thermo King E-COOLPAC)';
const MOCK_PEAK_TRIPS = new Set(['RT-01:1']);

const POWER_PLAN_PARAMS: PowerPlanT['params'] = {
  gate_wait_off_peak_minutes: {
    value: GATE_WAIT_OFF_PEAK_MINUTES,
    unit: '분',
    source: '가정: 비혼잡 시간 터미널 게이트 대기. 대기 중 트럭 시동을 끄면 리퍼도 멈춘다',
  },
  gate_wait_peak_minutes: {
    value: GATE_WAIT_PEAK_MINUTES,
    unit: '분',
    source: '가정: 항만 게이트 혼잡 시간대(시나리오 gate_peak_windows)에 도착하면 게이트 대기',
  },
  plug_wait_minutes: {
    value: PLUG_WAIT_MINUTES,
    unit: '분',
    source: '가정: 게이트 통과 → 적입·장치장 이동 → 리퍼 플러그 연결까지 무전원',
  },
  pre_assign_threshold_minutes: {
    value: PRE_ASSIGN_THRESHOLD_MINUTES,
    unit: '분',
    source:
      '가정: 계획 시점 무전원 예상이 60분 이상이면 배터리 젯셋 사전 배정 후보. 실행 중 젯셋 배정 기준(연속 단전 30분)의 2배로 잡아 비혼잡 도착은 거른다',
  },
};

const POWER_PLAN_RULE =
  '로트마다 집하 경로의 항만 도착 시각에서 게이트 대기(혼잡 시간대면 혼잡 대기)와 게이트 통과 뒤 플러그 연결까지를 무전원 예상 구간으로 더한다. 트럭 운행 중에는 냉장트럭 리퍼가 돈다고 본다. 무전원 예상 분이 사전 배정 기준 이상이면 같은 트럭 회차 로트를 묶어 배터리 젯셋 사전 배정 후보로 낸다. 실행 지시로 바꾸지 않는다';

type ActionPatchT = Pick<
  ColdchainActionT,
  'status' | 'note' | 'accepted_at' | 'accepted_by' | 'done_at' | 'done_by'
>;

type PrincipalT = { org: MockOrgT; handler: ColdchainActionHandlerT | null };

const actionPatches = new Map<string, ActionPatchT>();
const simulationRuns = new Map<string, SimulationRunT>();

const patchKey = (planId: string, containerId: string, actionKey: string) =>
  `${planId}:${containerId}:${actionKey}`;

const clearPatches = (planId: string | null, containerId: string | null) => {
  if (!planId) {
    actionPatches.clear();

    return;
  }
  const prefix = containerId ? `${planId}:${containerId}:` : `${planId}:`;
  [...actionPatches.keys()]
    .filter(key => key.startsWith(prefix))
    .forEach(key => actionPatches.delete(key));
};

const authenticate = (request: Request): PrincipalT | Response => {
  if (request.method !== 'GET' && !isSaasRequest(request)) {
    return fail(403, '요청 출처를 확인할 수 없습니다');
  }

  const session = readSession();
  if (!session) return fail(401, '로그인이 필요합니다');

  const requestedOrg = request.headers.get(SAAS_HEADERS.ORG_ID);
  if (requestedOrg && requestedOrg !== session.org.org_id) {
    return fail(403, '이 조직에 속해 있지 않습니다');
  }

  const { org } = session;
  const handler: ColdchainActionHandlerT | null =
    org.org_type === 'platform' || org.org_type === 'forwarder'
      ? { org_type: org.org_type, org_id: org.org_id, user_id: `user-${org.org_id}` }
      : null;

  return { org, handler };
};

const planIds = () => [...mockDb.planCreatedAt.keys()];

const canReadPlan = (planId: string, org: MockOrgT) => {
  if (!mockDb.planCreatedAt.has(planId)) return false;
  if (org.org_type === 'platform') return org.org_id === PLATFORM_ORG_ID;
  if (org.org_type === 'forwarder') return mockDb.forwarders.get(planId) === org.org_id;

  const lots = mockDb.planLots.get(planId);
  if (!lots) return false;

  return mockDb.lots.some(lot => lots.has(lot.id) && org.shipper_ids.includes(lot.shipper_id));
};

const resolvePlan = (request: Request, org: MockOrgT, containerId: string) => {
  const requested = new URL(request.url).searchParams.get('plan_id');
  if (!requested) {
    const fallback = org.org_type === 'platform' ? planIds()[0] : null;

    return fallback ?? fail(404, noReadings(containerId));
  }
  if (!canReadPlan(requested, org)) return fail(404, PLAN_NOT_FOUND);

  return requested;
};

const sessionOf = async (planId: string): Promise<PlanSessionT | null> => {
  try {
    return await demoPlan(planId);
  } catch {
    return null;
  }
};

const planContainerIds = (session: PlanSessionT | null) =>
  new Set(
    (session?.plan.containers ?? [])
      .filter(container => container.used)
      .map(container => container.container_id)
  );

const mergedActions = (planId: string, containerId: string): ColdchainActionT[] =>
  baseTwin.actions.map(action => {
    const patch = actionPatches.get(patchKey(planId, containerId, action.key));

    return {
      ...action,
      status: 'open',
      note: null,
      accepted_at: null,
      accepted_by: null,
      done_at: null,
      done_by: null,
      ...patch,
    };
  });

const sensorTwin = (planId: string): ColdchainTwinT => ({
  ...baseTwin,
  plan_id: planId,
  actions: mergedActions(planId, SENSOR_CONTAINER_ID),
  alerts: baseTwin.alerts.map(alert => ({ ...alert, plan_id: planId })),
  has_data: true,
  residual_risks: RESIDUAL_RISKS,
});

const noDataTwin = (planId: string, containerId: string): ColdchainTwinT => ({
  ...baseTwin,
  container_id: containerId,
  plan_id: planId,
  device_ids: [],
  products: [{ product_id: 'grape_so2', name: '포도(SO2 처리)', temp_min_c: -1, temp_max_c: 1 }],
  status: 'no_data',
  current: null,
  outage: {
    ...baseTwin.outage,
    cumulative_minutes: 0,
    current_continuous_minutes: 0,
    longest_continuous_minutes: 0,
    episodes: 0,
    insurance_eligible: false,
  },
  excursion: {
    ...baseTwin.excursion,
    degree_minutes: 0,
    minutes_above_band: 0,
    max_temp_c: null,
  },
  loss:
    containerId === NO_DATA_CONTAINER_ID
      ? NO_DATA_LOSS
      : {
          ...NO_DATA_LOSS,
          cargo_value: null,
          planned_loss_krw: null,
          predicted_loss_krw: null,
          delta_krw: null,
          lots: [],
          shippers: [],
        },
  reading_count: 0,
  timeline: [],
  actions: [],
  alerts: [],
  has_data: false,
  residual_risks: [],
});

const sumOrNull = (values: number[]) =>
  values.length ? values.reduce((total, value) => total + value, 0) : null;

const scopedLoss = (loss: ColdchainLossT, org: MockOrgT): ColdchainLossT => {
  if (org.org_type === 'platform') return loss;
  if (org.org_type === 'forwarder') {
    return {
      ...loss,
      cargo_value: null,
      planned_loss_krw: null,
      predicted_loss_krw: null,
      delta_krw: null,
      lots: [],
      shippers: [],
    };
  }

  const own = new Set(org.shipper_ids);
  const lots = (loss.lots ?? []).filter(lot => own.has(lot.shipper_id));

  return {
    ...loss,
    cargo_value: sumOrNull(lots.map(lot => lot.lot_value)),
    planned_loss_krw: sumOrNull(lots.map(lot => lot.planned_loss_krw)),
    predicted_loss_krw: sumOrNull(lots.map(lot => lot.predicted_loss_krw)),
    delta_krw: sumOrNull(lots.map(lot => lot.delta_krw)),
    lots,
    shippers: (loss.shippers ?? []).filter(shipper => own.has(shipper.shipper_id)),
  };
};

const scopedTwin = (twin: ColdchainTwinT, org: MockOrgT): ColdchainTwinT => ({
  ...twin,
  loss: scopedLoss(twin.loss, org),
});

const downsample = <T>(items: T[], points: number) => {
  if (points <= 0) return [];
  if (items.length <= points) return items;
  if (points === 1) return items.slice(-1);

  const step = (items.length - 1) / (points - 1);

  return Array.from({ length: points }, (_, index) => items[Math.round(index * step)]);
};

const summaryOf = (twin: ColdchainTwinT): ColdchainSummaryT => {
  const last = twin.timeline.at(-1);

  return {
    container_id: twin.container_id,
    plan_id: twin.plan_id,
    status: twin.status,
    reading_count: twin.reading_count,
    last_ts: last?.ts ?? null,
    temp_c: last?.temp_c ?? null,
    power_on: last?.power_on ?? null,
    cumulative_outage_minutes: twin.outage.cumulative_minutes,
    sensor_loss_rate: twin.loss.sensor_loss_rate,
    predicted_loss_rate: twin.loss.predicted_loss_rate ?? null,
    delta_krw: twin.loss.delta_krw ?? null,
    open_actions: twin.actions.filter(action => action.status !== 'done').length,
  };
};

const containerTwin = async (planId: string, containerId: string) => {
  if (containerId === SENSOR_CONTAINER_ID) return sensorTwin(planId);

  return planContainerIds(await sessionOf(planId)).has(containerId)
    ? noDataTwin(planId, containerId)
    : null;
};

const shipperOwnsContainer = (org: MockOrgT, twin: ColdchainTwinT) =>
  (twin.loss.lots ?? []).some(lot => org.shipper_ids.includes(lot.shipper_id));

const readNote = async (request: Request) => {
  const raw = await request.text();
  if (!raw || raw === 'null') return { present: false, note: null };

  const body = JSON.parse(raw) as { note?: unknown } | null;
  if (!body || !('note' in body)) return { present: false, note: null };

  return { present: true, note: typeof body.note === 'string' ? body.note : null };
};

const nextPatch = (
  current: ColdchainActionT,
  step: 'accept' | 'complete',
  note: string | null,
  handler: ColdchainActionHandlerT
): ActionPatchT => {
  const at = nowIso();
  const accepted = {
    accepted_at: current.accepted_at ?? at,
    accepted_by: current.accepted_by ?? handler,
  };
  if (step === 'complete') {
    return { status: 'done', note, ...accepted, done_at: at, done_by: handler };
  }

  return {
    status: 'accepted',
    note,
    ...accepted,
    done_at: null,
    done_by: null,
  };
};

const transition = async (request: Request, params: PathParams, step: 'accept' | 'complete') => {
  const principal = authenticate(request);
  if (principal instanceof Response) return principal;

  const containerId = String(params.containerId);
  const actionKey = String(params.actionKey);
  const planId = resolvePlan(request, principal.org, containerId);
  if (planId instanceof Response) return planId;
  if (!principal.handler) return fail(403, SHIPPER_ACTION_FORBIDDEN);
  if (containerId !== SENSOR_CONTAINER_ID) return fail(404, noReadings(containerId));

  const current = mergedActions(planId, containerId).find(action => action.key === actionKey);
  if (!current) return fail(404, `조치를 찾을 수 없습니다: ${actionKey}`);
  if (current.status === 'done') return fail(409, ACTION_DONE);

  let body: Awaited<ReturnType<typeof readNote>>;
  try {
    body = await readNote(request);
  } catch {
    return fail(422, '요청 본문을 읽을 수 없습니다');
  }
  if (body.note && body.note.length > NOTE_MAX_LENGTH) {
    return fail(422, `메모는 ${NOTE_MAX_LENGTH}자 이하로 적어 주세요`);
  }

  const note = body.present ? body.note : (current.note ?? null);
  const patch = nextPatch(current, step, note, principal.handler);
  actionPatches.set(patchKey(planId, containerId, actionKey), patch);

  return HttpResponse.json({ ...current, ...patch });
};

const csvCell = (value: unknown) =>
  value === null || typeof value === 'undefined' ? '' : String(value);

const csvRows = (header: string, rows: unknown[][]) =>
  `${[header, ...rows.map(row => row.map(csvCell).join(','))].join('\n')}\n`;

const fixed1 = (value: number) => value.toFixed(1);

const readingsCsv = (twin: ColdchainTwinT) =>
  csvRows(
    'ts,device_id,temp_c,power_on,humidity_pct,door_open,source',
    twin.timeline.map(point => [
      point.ts,
      twin.device_ids[0] ?? '',
      point.temp_c,
      point.power_on,
      point.humidity_pct,
      point.door_open,
      'raw',
    ])
  );

type EpisodeT = { start: string; end: string; ongoing: boolean; temps: number[] };

const outageEpisodes = (twin: ColdchainTwinT) => {
  const episodes: EpisodeT[] = [];
  let open: EpisodeT | null = null;

  twin.timeline.forEach(point => {
    if (!point.power_on) {
      if (!open) {
        open = { start: point.ts, end: point.ts, ongoing: true, temps: [] };
        episodes.push(open);
      }
      open.end = point.ts;
      open.temps.push(point.temp_c);

      return;
    }
    if (open) {
      open.end = point.ts;
      open.ongoing = false;
      open.temps.push(point.temp_c);
      open = null;
    }
  });

  return episodes;
};

const outagesCsv = (twin: ColdchainTwinT) =>
  csvRows(
    'episode,start,end,minutes,ongoing,start_temp_c,max_temp_c,end_temp_c',
    outageEpisodes(twin).map((episode, index) => [
      index + 1,
      episode.start,
      episode.end,
      fixed1((Date.parse(episode.end) - Date.parse(episode.start)) / MINUTE_MS),
      episode.ongoing,
      episode.temps[0] ?? null,
      episode.temps.length ? Math.max(...episode.temps) : null,
      episode.temps.at(-1) ?? null,
    ])
  );

const csvHandler = (kind: 'readings' | 'outages') =>
  http.get(api(`/coldchain/containers/:containerId/${kind}.csv`), async ({ request, params }) => {
    if (!isSaasRequest(request)) return;

    const principal = authenticate(request);
    if (principal instanceof Response) return principal;

    const containerId = String(params.containerId);
    const planId = resolvePlan(request, principal.org, containerId);
    if (planId instanceof Response) return planId;

    const twin = await containerTwin(planId, containerId);
    if (!twin?.has_data) return fail(404, noReadings(containerId));
    if (principal.org.org_type === 'shipper' && !shipperOwnsContainer(principal.org, twin)) {
      return fail(404, noReadings(containerId));
    }

    return new HttpResponse(kind === 'readings' ? readingsCsv(twin) : outagesCsv(twin), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${containerId}-${kind}.csv"`,
      },
    });
  });

const addMinutes = (iso: string, minutes: number) => {
  const shifted = new Date(Date.parse(iso) + minutes * MINUTE_MS);
  const offset = /([+-]\d{2}:\d{2}|Z)$/.exec(iso)?.[1] ?? 'Z';
  if (offset === 'Z') return shifted.toISOString().replace('.000Z', 'Z');

  const sign = offset.startsWith('-') ? -1 : 1;
  const [hours, mins] = offset.slice(1).split(':').map(Number);
  const local = new Date(shifted.getTime() + sign * (hours * 60 + mins) * MINUTE_MS);

  return `${local.toISOString().slice(0, 19)}${offset}`;
};

type TruckRouteT = PlanSessionT['routes'][number]['pickup']['routes'][number];

const gateBasis = (gateStatus: TruckRouteT['gate_status']) => {
  if (gateStatus === 'peak') return POWER_PLAN_PARAMS.gate_wait_peak_minutes.source ?? '';
  const base = POWER_PLAN_PARAMS.gate_wait_off_peak_minutes.source ?? '';

  return gateStatus === 'avoided' ? `${base}. 경로가 혼잡 시간대를 피해 출발을 옮겼다` : base;
};

const lotPowerPlan = (
  lot: PlanSessionT['plan']['assignments'][number],
  voyageId: string,
  route: TruckRouteT
): LotPowerPlanT => {
  const stop = route.stops.find(item => item.lot_ids.includes(lot.lot_id));
  const gateStatus = MOCK_PEAK_TRIPS.has(`${route.truck_id}:${route.trip}`)
    ? 'peak'
    : route.gate_status;
  const gateMinutes = gateStatus === 'peak' ? GATE_WAIT_PEAK_MINUTES : GATE_WAIT_OFF_PEAK_MINUTES;
  const gateEnd = addMinutes(route.port_eta, gateMinutes);
  const plugEnd = addMinutes(gateEnd, PLUG_WAIT_MINUTES);
  const truckStart = stop?.eta ?? route.port_eta;
  const segments: PowerSegmentT[] = [
    {
      stage: 'trucking',
      start: truckStart,
      end: route.port_eta,
      minutes: (Date.parse(route.port_eta) - Date.parse(truckStart)) / MINUTE_MS,
      powered: true,
      basis: '계획 집하 경로(VRP): 산지 상차 도착 → 항만 도착. 가정: 냉장트럭 리퍼 가동',
    },
    {
      stage: 'gate',
      start: route.port_eta,
      end: gateEnd,
      minutes: gateMinutes,
      powered: false,
      basis: gateBasis(gateStatus),
    },
    {
      stage: 'plug',
      start: gateEnd,
      end: plugEnd,
      minutes: PLUG_WAIT_MINUTES,
      powered: false,
      basis: POWER_PLAN_PARAMS.plug_wait_minutes.source ?? '',
    },
  ];
  const unpowered = gateMinutes + PLUG_WAIT_MINUTES;

  return {
    lot_id: lot.lot_id,
    shipper_id: lot.shipper_id,
    container_id: lot.container_id ?? '',
    voyage_id: voyageId,
    truck_id: route.truck_id,
    trip: route.trip,
    gate_status: gateStatus,
    segments,
    unpowered_minutes: unpowered,
    threshold_minutes: PRE_ASSIGN_THRESHOLD_MINUTES,
    exceeds: unpowered >= PRE_ASSIGN_THRESHOLD_MINUTES,
  };
};

const gensetCandidates = (lots: LotPowerPlanT[]): GensetCandidateT[] => {
  const groups = new Map<string, LotPowerPlanT[]>();
  lots
    .filter(lot => lot.exceeds)
    .forEach(lot => {
      const key = `genset:${lot.voyage_id}:${lot.truck_id}:${lot.trip}`;
      groups.set(key, [...(groups.get(key) ?? []), lot]);
    });

  return [...groups.entries()].map(([key, group]) => {
    const [first] = group;
    const unpowered = Math.max(...group.map(lot => lot.unpowered_minutes));
    const windowStart = first.segments.find(item => !item.powered)?.start ?? null;
    const windowEnd = first.segments.at(-1)?.end ?? null;
    const peak = group.some(lot => lot.gate_status === 'peak');

    return {
      key,
      equipment: GENSET_EQUIPMENT,
      voyage_id: first.voyage_id,
      container_ids: [...new Set(group.map(lot => lot.container_id))],
      truck_id: first.truck_id,
      trip: first.trip,
      lot_ids: group.map(lot => lot.lot_id),
      window_start: windowStart,
      window_end: windowEnd,
      unpowered_minutes: unpowered,
      threshold_minutes: PRE_ASSIGN_THRESHOLD_MINUTES,
      reason: `${first.truck_id} ${first.trip}회차 무전원 예상 ${unpowered}분(기준 ${PRE_ASSIGN_THRESHOLD_MINUTES}분).${peak ? ' 게이트 혼잡 시간대 도착' : ''}`,
    };
  });
};

const powerPlanOf = (session: PlanSessionT, org: MockOrgT): PowerPlanT => {
  const own = new Set(org.shipper_ids);
  const lots = session.plan.assignments
    .filter(lot => lot.mode === 'sea' && lot.container_id && lot.voyage_id)
    .filter(lot => org.org_type !== 'shipper' || own.has(lot.shipper_id))
    .flatMap(lot => {
      const voyage = session.routes.find(item => item.voyage_id === lot.voyage_id);
      const route = voyage?.pickup.routes.find(item =>
        item.stops.some(stop => stop.lot_ids.includes(lot.lot_id))
      );

      return voyage && route ? [lotPowerPlan(lot, voyage.voyage_id, route)] : [];
    });

  return {
    plan_id: session.plan_id,
    lots,
    candidates: gensetCandidates(lots),
    params: POWER_PLAN_PARAMS,
    rule: POWER_PLAN_RULE,
  };
};

const simulationRun = (
  body: Partial<SimulationRequestT>,
  planId: string | null,
  containerId: string
): SimulationRunT => {
  const preset = PRESETS.find(item => item.id === body.preset) ?? PRESETS[0];
  const interval = body.interval_seconds ?? 0;
  const first = baseTwin.timeline[0]?.ts ?? nowIso();
  const last = baseTwin.timeline.at(-1)?.ts ?? first;
  const state =
    planId && containerId === SENSOR_CONTAINER_ID ? summaryOf(sensorTwin(planId)) : null;

  return {
    run_id: Math.random().toString(16).slice(2, 14),
    preset: preset.id,
    container_id: containerId,
    plan_id: planId,
    device_id: body.device_id ?? 'sim-01',
    mode: interval > 0 ? 'stream' : 'instant',
    total: preset.readings,
    sent: preset.readings,
    interval_seconds: interval,
    done: true,
    start: first,
    end: last,
    state,
    error: null,
  } as SimulationRunT;
};

export const coldchainActionHandlers = [
  http.post(api('/saas/sandbox/reset'), () => {
    actionPatches.clear();
    simulationRuns.clear();
  }),

  http.get(api('/coldchain/containers'), async ({ request }) => {
    if (!isSaasRequest(request)) return;

    const principal = authenticate(request);
    if (principal instanceof Response) return principal;

    const requested = new URL(request.url).searchParams.get('plan_id');
    if (requested && !canReadPlan(requested, principal.org)) {
      return fail(404, PLAN_NOT_FOUND);
    }
    if (!requested && principal.org.org_type !== 'platform') return HttpResponse.json([]);

    const targets = requested
      ? [requested]
      : planIds().filter(planId => canReadPlan(planId, principal.org));

    return HttpResponse.json(
      targets.map(planId => summaryOf(scopedTwin(sensorTwin(planId), principal.org)))
    );
  }),

  http.get(api('/coldchain/containers/:containerId'), async ({ request, params }) => {
    if (!isSaasRequest(request)) return;

    const principal = authenticate(request);
    if (principal instanceof Response) return principal;

    const containerId = String(params.containerId);
    const planId = resolvePlan(request, principal.org, containerId);
    if (planId instanceof Response) return planId;

    const twin = await containerTwin(planId, containerId);
    if (!twin) return fail(404, noReadings(containerId));

    const points = Number(new URL(request.url).searchParams.get('points') ?? 720);
    const scoped = scopedTwin(twin, principal.org);

    return HttpResponse.json({
      ...scoped,
      timeline: downsample(scoped.timeline, Number.isFinite(points) ? points : 720),
    });
  }),

  http.post(
    api('/coldchain/containers/:containerId/actions/:actionKey/accept'),
    ({ request, params }) => transition(request, params, 'accept')
  ),

  http.post(
    api('/coldchain/containers/:containerId/actions/:actionKey/complete'),
    ({ request, params }) => transition(request, params, 'complete')
  ),

  csvHandler('readings'),
  csvHandler('outages'),

  http.get(api('/coldchain/plans/:planId/power-plan'), async ({ request, params }) => {
    if (!isSaasRequest(request)) return;

    const principal = authenticate(request);
    if (principal instanceof Response) return principal;

    const planId = String(params.planId);
    if (!canReadPlan(planId, principal.org)) return fail(404, PLAN_NOT_FOUND);

    const session = await sessionOf(planId);
    if (!session) return fail(404, PLAN_NOT_FOUND);

    return HttpResponse.json(powerPlanOf(session, principal.org));
  }),

  http.get(api('/coldchain/alerts'), ({ request }) => {
    if (!isSaasRequest(request)) return;

    const principal = authenticate(request);
    if (principal instanceof Response) return principal;

    const url = new URL(request.url);
    const planId = url.searchParams.get('plan_id');
    if (planId && !canReadPlan(planId, principal.org)) return fail(404, PLAN_NOT_FOUND);
    if (!planId && principal.org.org_type !== 'platform') {
      return HttpResponse.json({ alerts: [], next_since: 0 });
    }

    const since = Number(url.searchParams.get('since') ?? 0);
    const containerId = url.searchParams.get('container_id');
    const limit = Number(url.searchParams.get('limit') ?? 100);
    const items = baseAlerts
      .filter(alert => alert.seq > since)
      .filter(alert => !containerId || alert.container_id === containerId)
      .slice(0, limit)
      .map(alert => ({ ...alert, plan_id: planId ?? planIds()[0] ?? null }));

    return HttpResponse.json({ alerts: items, next_since: items.at(-1)?.seq ?? since });
  }),

  http.get(api('/coldchain/simulate/presets'), ({ request }) => {
    if (!isSaasRequest(request)) return;

    const principal = authenticate(request);
    if (principal instanceof Response) return principal;

    return HttpResponse.json(PRESETS);
  }),

  http.post(api('/coldchain/simulate'), async ({ request }) => {
    if (!isSaasRequest(request)) return;

    const principal = authenticate(request);
    if (principal instanceof Response) return principal;

    const body = (await request.json()) as Partial<SimulationRequestT>;
    const planId = body.plan_id ?? null;
    if (principal.org.org_type !== 'platform') return fail(404, PLAN_NOT_FOUND);
    if (planId && !canReadPlan(planId, principal.org)) return fail(404, PLAN_NOT_FOUND);
    if (!principal.org.sandbox) {
      return fail(403, '데모(sandbox) 조직에서만 시뮬레이션을 실행할 수 있습니다');
    }

    const containerId = body.container_id ?? SENSOR_CONTAINER_ID;
    if (body.reset !== false) clearPatches(planId, containerId);

    const run = simulationRun(body, planId, containerId);
    simulationRuns.set(run.run_id, run);

    return HttpResponse.json(run);
  }),

  http.get(api('/coldchain/simulate/:runId'), ({ request, params }) => {
    if (!isSaasRequest(request)) return;

    const principal = authenticate(request);
    if (principal instanceof Response) return principal;

    const run = simulationRuns.get(String(params.runId));

    return run ? HttpResponse.json(run) : fail(404, '시뮬레이션 실행을 찾을 수 없습니다');
  }),
];
