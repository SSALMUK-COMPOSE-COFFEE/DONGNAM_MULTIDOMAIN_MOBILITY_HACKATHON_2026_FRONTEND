import { HttpResponse, http } from 'msw';

import { api, authorize, canReadPlan, fail } from '@/mocks/saas/access';
import { powerPlanOf } from '@/mocks/saas/coldchain';
import { demoPlan } from '@/mocks/saas/demo-bridge';
import type { MockOrgT } from '@/mocks/saas/orgs';
import { nowIso, onMockReset } from '@/mocks/saas/state';
import type { ExecutionOrderT, PlanSessionT } from '@/types/api';
import type {
  ForwarderContainerExecutionT,
  ForwarderDocumentActionT,
  ForwarderExecutionCardT,
  ForwarderExecutionNumbersInputT,
  ForwarderGensetInstructionT,
  ForwarderOrderT,
  ForwarderSetpointT,
} from '@/types/saas-forwarder';

type NumberFieldT = keyof ForwarderExecutionNumbersInputT;
type EnteredT = Record<NumberFieldT, string | null> & { entered_at: string | null };

const PLAN_NOT_FOUND = '계획을 찾을 수 없습니다';
const CONTAINER_NOT_FOUND = '계획에 없는 컨테이너입니다';
const NO_CHANGES = 'booking_no·container_no·seal_no 중 하나 이상을 입력하세요';
const BOOKING_INVALID = '부킹 번호는 영문 대문자·숫자·하이픈 4~30자여야 합니다';
const SEAL_INVALID = '씰 번호는 영문 대문자·숫자·하이픈 4~20자여야 합니다';
const CONTAINER_INVALID =
  '컨테이너 번호는 ISO 6346 형식(소유자 코드 영문 3자 + 장비 구분 U/J/Z + 일련번호 6자리 + 체크디지트 1자리, 예: CSQU3054383)이어야 합니다';
const MOCK_NOTE =
  '모의값: 부킹·컨테이너·씰 번호는 실제 선사 발급 전이라 계획 id·컨테이너 id로 결정적으로 만든 값이다. 컨테이너 번호는 ISO 6346 형식(소유자 코드 + U + 일련번호 6자리 + 검사 숫자)';
const MOCK_OWNER_CODE = 'FRSU';
const DEFAULT_KIND = '40RH-CA';
const DEFAULT_PALLET_KG = 415;
const PALLET_TARE_KG = 25;
const PACKAGING_KG = 35;
const CONTAINER_TARE_KG = 4800;

const ASSUMED_WEIGHT_SOURCE = '가정(목업)';

const vgmBreakdown = (net: number, pallets: number, gross: number) => {
  const palletTare = pallets * PALLET_TARE_KG;
  const packaging = gross - net - palletTare;
  const items = [
    {
      name: '화물 순중량',
      kg: net,
      assumed: false,
      source: '품목 데이터 파렛트당 순중량(pallet_kg) × 로트별 파렛트',
    },
    { name: '파렛트', kg: palletTare, assumed: true, source: ASSUMED_WEIGHT_SOURCE },
    { name: '포장', kg: packaging, assumed: true, source: ASSUMED_WEIGHT_SOURCE },
    { name: '컨테이너 자중', kg: CONTAINER_TARE_KG, assumed: true, source: ASSUMED_WEIGHT_SOURCE },
  ];
  const marks = items
    .map(item => `${item.name} ${item.kg.toLocaleString('en-US')}kg${item.assumed ? '(가정)' : ''}`)
    .join(' + ');
  const total = gross + CONTAINER_TARE_KG;

  return {
    pallet_tare_kg: palletTare,
    packaging_kg: packaging,
    items,
    calculation: `VGM ${total.toLocaleString('en-US')}kg = ${marks}. 파렛트 ${pallets}개 × (파렛트 ${PALLET_TARE_KG}kg + 포장 ${PACKAGING_KG}kg)`,
  };
};

const SI_LEAD_HOURS = 24;
const VGM_LEAD_HOURS = 12;
const HOUR_MS = 60 * 60 * 1000;
const NUMBER_FIELDS: readonly NumberFieldT[] = ['booking_no', 'container_no', 'seal_no'];

const CONTAINER_NO_PATTERN = /^[A-Z]{3}[UJZ]\d{7}$/;
const BOOKING_NO_PATTERN = /^[A-Z0-9][A-Z0-9-]{3,29}$/;
const SEAL_NO_PATTERN = /^[A-Z0-9][A-Z0-9-]{3,19}$/;
const ISO6346_VALUES = Array.from({ length: 29 }, (_, index) => 10 + index).filter(
  value => value % 11 !== 0
);
const ISO6346_LETTERS = new Map(
  [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map((letter, index) => [letter, ISO6346_VALUES[index]])
);

const entered = new Map<string, Map<string, EnteredT>>();

onMockReset(() => entered.clear());

export const iso6346CheckDigit = (code: string) =>
  ([...code].reduce(
    (sum, ch, index) => sum + (ISO6346_LETTERS.get(ch) ?? Number(ch)) * 2 ** index,
    0
  ) %
    11) %
  10;

const containerNoError = (number: string) => {
  if (!CONTAINER_NO_PATTERN.test(number)) return CONTAINER_INVALID;

  const code = number.slice(0, 10);
  const expected = iso6346CheckDigit(code);
  if (Number(number[10]) === expected) return null;

  return `컨테이너 번호 체크디지트가 틀립니다: ${code}의 체크디지트는 ${expected}입니다(올바른 번호 ${code}${expected})`;
};

const digits = (planId: string, containerId: string, salt: string, width: number) => {
  let hash = 0;
  for (const ch of `${salt}:${planId}:${containerId}`) {
    hash = (hash * 31 + ch.charCodeAt(0)) % 1_000_000_007;
  }

  return String(hash % 10 ** width).padStart(width, '0');
};

const mockNumbers = (planId: string, containerId: string): Record<NumberFieldT, string> => {
  const code = `${MOCK_OWNER_CODE}${digits(planId, containerId, 'container', 6)}`;

  return {
    booking_no: `FSBK${digits(planId, containerId, 'booking', 8)}`,
    container_no: `${code}${iso6346CheckDigit(code)}`,
    seal_no: `FS${digits(planId, containerId, 'seal', 7)}`,
  };
};

const kstLabel = (iso: string) =>
  new Date(iso).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

const slashLabel = (iso: string) => {
  const parts = new Map(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Seoul',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(new Date(iso))
      .map(part => [part.type, part.value])
  );

  return `${parts.get('month')}/${parts.get('day')} ${parts.get('hour')}:${parts.get('minute')}`;
};

const shiftHours = (iso: string, hours: number) =>
  new Date(new Date(iso).getTime() - hours * HOUR_MS).toISOString();

type ScenarioT = PlanSessionT['scenario'];
type ProductT = ScenarioT['products'][number];

const setpointOf = (products: ProductT[], productIds: string[]): ForwarderSetpointT => {
  if (!products.length) {
    return {
      product_ids: productIds,
      set_temp_c: null,
      temp_min_c: null,
      temp_max_c: null,
      ventilation: '가정: 선사 기본 설정(품목 조건 없음)',
      o2_pct: null,
      co2_pct: null,
      ca_controlled: false,
      assumed: true,
      assumptions: ['가정: 시나리오에 품목 CA 조건이 없어 선사 기본 설정을 따른다'],
      source: '가정',
    };
  }

  let low = Math.max(...products.map(product => product.temp_min_c));
  let high = Math.min(...products.map(product => product.temp_max_c));
  const gas = products.find(product => product.o2_pct != null || product.co2_pct != null) ?? null;
  const assumptions = ['가정: 설정 온도 = 품목 허용 온도 범위 중앙값'];
  if (products.length > 1) {
    assumptions.push('가정: 혼적 품목의 허용 온도 범위 교집합을 쓴다');
  }
  if (low > high) {
    const [first] = products;
    low = first.temp_min_c;
    high = first.temp_max_c;
    assumptions.push(`가정: 혼적 품목 온도 범위가 겹치지 않아 ${first.name} 기준`);
  }
  assumptions.push(
    gas
      ? '가정: CA 제어 중에는 외기 환기구를 닫는다(품목 데이터에 환기 항목 없음)'
      : '가정: 기체 제어 없는 품목은 환기 최소(품목 데이터에 환기 항목 없음, SO2 처리 포도는 SO2 유지를 위해 최소)'
  );

  return {
    product_ids: productIds,
    set_temp_c: Math.round(((low + high) / 2) * 10) / 10,
    temp_min_c: low,
    temp_max_c: high,
    ventilation: gas ? '닫힘(CA 장치가 O₂·CO₂ 제어)' : '최소(0~5 CBM/h)',
    o2_pct: gas?.o2_pct ?? null,
    co2_pct: gas?.co2_pct ?? null,
    ca_controlled: !!gas,
    assumed: true,
    assumptions,
    source: products.map(product => `${product.name}: ${product.source ?? '가정'}`).join(' / '),
  };
};

const GENSET_PLAIN_TEXT =
  '항구 게이트에서 전기가 끊기는 시간이 길어 보여 배터리 냉각 장치를 미리 붙입니다. 냉장은 그대로 이어집니다.';

const gensetInstructions = (
  session: PlanSessionT,
  org: MockOrgT,
  containers: ForwarderContainerExecutionT[]
): ForwarderGensetInstructionT[] => {
  const numbers = new Map(containers.map(item => [item.container_id, item.container_no]));

  return powerPlanOf(session, org).candidates.map(candidate => {
    const nos = candidate.container_ids.map(id => numbers.get(id) ?? id);
    const where = candidate.truck_id ? `${candidate.truck_id} ${candidate.trip}회차` : '트럭 미정';
    const window =
      candidate.window_start && candidate.window_end
        ? `${slashLabel(candidate.window_start)}~${slashLabel(candidate.window_end)}`
        : '시각 미정';
    const units = candidate.container_ids.map((id, index) => `${id}(${nos[index]})`).join(', ');
    const text = [
      `[배터리 젯셋 사전 배정] ${candidate.voyage_id} ${where} ${units}`,
      `로트 ${candidate.lot_ids.join(', ')}: 무전원 예상 ${window}`,
      `${Math.round(candidate.unpowered_minutes)}분(기준 ${Math.round(candidate.threshold_minutes)}분).`,
      `${candidate.equipment}를 게이트 도착 전에 배정·연결합니다.`,
      candidate.gate_peak ? '게이트 혼잡 시간대 도착.' : '',
    ]
      .join(' ')
      .trimEnd();

    return {
      key: candidate.key,
      equipment: candidate.equipment,
      voyage_id: candidate.voyage_id,
      container_ids: candidate.container_ids,
      container_nos: nos,
      truck_id: candidate.truck_id,
      trip: candidate.trip,
      lot_ids: candidate.lot_ids,
      window_start: candidate.window_start,
      window_end: candidate.window_end,
      unpowered_minutes: candidate.unpowered_minutes,
      threshold_minutes: candidate.threshold_minutes,
      text,
      plain_text: GENSET_PLAIN_TEXT,
    };
  });
};

const buildCard = (session: PlanSessionT, org: MockOrgT): ForwarderExecutionCardT => {
  const { plan_id: planId, scenario, plan } = session;
  const saved = entered.get(planId);
  const voyages = new Map(scenario.voyages.map(voyage => [voyage.id, voyage]));
  const products = new Map(scenario.products.map(product => [product.id, product]));
  const lots = new Map(scenario.lots.map(lot => [lot.id, lot]));
  const kinds = new Map(scenario.containers.map(container => [container.id, container.kind]));

  const containers = plan.containers.flatMap((load): ForwarderContainerExecutionT[] => {
    const voyage = voyages.get(load.voyage_id);
    if (!load.used || !voyage) return [];

    const assignments = plan.assignments.filter(
      item => item.mode === 'sea' && item.container_id === load.container_id
    );
    const net = assignments.reduce((sum, item) => {
      const lot = lots.get(item.lot_id);
      const product = lot ? products.get(lot.product_id) : null;
      return sum + item.pallets * (product?.pallet_kg ?? DEFAULT_PALLET_KG);
    }, 0);
    const pallets = assignments.reduce((sum, item) => sum + item.pallets, 0);
    const gross = Math.round(net + pallets * (PALLET_TARE_KG + PACKAGING_KG));
    const actual = saved?.get(load.container_id) ?? null;
    const fallback = mockNumbers(planId, load.container_id);
    const value = (field: NumberFieldT) => actual?.[field] ?? null;
    const productIds = [...load.product_ids].sort();
    const found = load.product_ids.flatMap(id => products.get(id) ?? []);

    return [
      {
        container_id: load.container_id,
        voyage_id: voyage.id,
        vessel_name: voyage.vessel_name,
        terminal: voyage.terminal,
        kind: kinds.get(load.container_id) ?? DEFAULT_KIND,
        lot_ids: assignments.map(item => item.lot_id).sort(),
        booking_no: value('booking_no') ?? fallback.booking_no,
        container_no: value('container_no') ?? fallback.container_no,
        seal_no: value('seal_no') ?? fallback.seal_no,
        mock: NUMBER_FIELDS.some(field => value(field) === null),
        booking_no_mock: value('booking_no') === null,
        container_no_mock: value('container_no') === null,
        seal_no_mock: value('seal_no') === null,
        entered_at: actual?.entered_at ?? null,
        weight: {
          ...vgmBreakdown(Math.round(net), pallets, gross),
          pallets,
          net_kg: Math.round(net),
          pallet_packaging_kg: gross - Math.round(net),
          gross_cargo_kg: gross,
          container_tare_kg: CONTAINER_TARE_KG,
          vgm_kg: gross + CONTAINER_TARE_KG,
          basis: `화물 총중량 = 화물 순중량(품목 파렛트당 순중량 × 파렛트) + 파렛트당 (파렛트 ${PALLET_TARE_KG}kg + 포장 ${PACKAGING_KG}kg). VGM = 화물 총중량 + 컨테이너 자중 ${CONTAINER_TARE_KG.toLocaleString('ko-KR')}kg(별도 항목). 가정(목업)`,
        },
        setpoint: setpointOf(found, productIds),
        empty_pickup: {
          location: `${voyage.terminal} 선사 지정 공컨테이너 장치장`,
          assumed: true,
          basis:
            '가정: 시나리오에 공컨테이너 반출지 데이터가 없어 선적 터미널의 선사 지정 장치장으로 둔다. 부킹 확인서의 반출지(Empty pick-up) 확인 필요',
        },
        cutoffs: {
          si_cutoff: shiftHours(voyage.cy_cutoff, SI_LEAD_HOURS),
          vgm_cutoff: shiftHours(voyage.cy_cutoff, VGM_LEAD_HOURS),
          cy_cutoff: voyage.cy_cutoff,
          etd: voyage.etd,
          basis: `항차 ${voyage.id} ETD ${kstLabel(voyage.etd)}·CY 마감 ${kstLabel(voyage.cy_cutoff)} 기준. SI 마감 = CY 마감 − ${SI_LEAD_HOURS}시간(가정). VGM 마감 = CY 마감 − ${VGM_LEAD_HOURS}시간(가정)`,
        },
      },
    ];
  });

  return {
    plan_id: planId,
    version: session.version,
    mock: !containers.length || containers.some(item => item.mock),
    mock_note: MOCK_NOTE,
    containers,
    genset_instructions: gensetInstructions(session, org, containers),
  };
};

type MockRequestT = ExecutionOrderT['requests'][number];

const DOCUMENT_REQUEST_KINDS: readonly MockRequestT['kind'][] = [
  'booking_amendment',
  'booking_cancel',
  'booking_new',
];
const CONTAINER_COUNT_DELTA: Partial<Record<MockRequestT['kind'], number>> = {
  booking_new: 1,
  booking_cancel: -1,
};
const DOCUMENT_ACTION_LABEL: Record<ForwarderDocumentActionT, string> = {
  si_vgm_correction: 'SI·VGM 정정',
  booking_change: '부킹 변경',
};
const PLAIN_TEXT: Record<string, string> = {
  si_vgm_correction:
    '배에 싣는 짐 목록과 무게 신고만 고칩니다. 배 자리 예약과 컨테이너 대수는 그대로입니다.',
  booking_new:
    '배에 싣는 냉장 컨테이너를 1대 늘립니다. 선사가 받아 주면 늘어난 컨테이너에 실어 보냅니다.',
  booking_cancel:
    '배에 싣던 냉장 컨테이너 1대를 뺍니다. 짐이 어디로 옮겨 가는지는 변경 내용에서 확인하세요.',
  reefer_plug: '항구에 들어온 냉장 컨테이너에 바로 전기를 꽂아 달라고 터미널에 요청합니다.',
  cy_entry: '트럭이 항구 장치장에 짐을 들여놓는 예약 시간을 바꿉니다.',
  air_booking: '이 출하를 비행기로 보내려고 항공사에 화물칸 자리를 예약합니다.',
  air_cancel: '잡아 둔 비행기 화물칸 자리를 취소합니다. 이 출하는 비행기로 가지 않습니다.',
};

const swappedIndexes = (requests: MockRequestT[], scenario: ScenarioT) => {
  const kinds = new Map(scenario.containers.map(container => [container.id, container.kind]));
  const groups = new Map<string, number[]>();
  requests.forEach((request, index) => {
    if (!DOCUMENT_REQUEST_KINDS.includes(request.kind)) return;
    const kind = kinds.get(request.container_id ?? '');
    if (!kind) return;
    const key = `${request.voyage_id ?? ''}|${kind}`;
    groups.set(key, [...(groups.get(key) ?? []), index]);
  });

  const swapped = new Set<number>();
  groups.forEach(members => {
    const delta = members.reduce(
      (sum, index) => sum + (CONTAINER_COUNT_DELTA[requests[index].kind] ?? 0),
      0
    );
    if (delta !== 0) return;
    const cancels = members.filter(index => requests[index].kind === 'booking_cancel');
    const news = members.filter(index => requests[index].kind === 'booking_new');
    cancels.slice(0, news.length).forEach((index, pair) => {
      swapped.add(index);
      swapped.add(news[pair]);
    });
  });

  return swapped;
};

const documentActionOf = (request: MockRequestT, swapped: boolean) => {
  if (!DOCUMENT_REQUEST_KINDS.includes(request.kind)) return null;
  if (swapped || !CONTAINER_COUNT_DELTA[request.kind]) return 'si_vgm_correction';

  return 'booking_change';
};

export const withDocumentActions = async (
  planId: string,
  orders: ExecutionOrderT[]
): Promise<ForwarderOrderT[]> => {
  const { scenario } = (await demoPlan(planId)) as PlanSessionT;

  return orders.map(order => {
    const swapped = swappedIndexes(order.requests, scenario);

    return {
      ...order,
      requests: order.requests.map((request, index) => {
        const action = documentActionOf(request, swapped.has(index));

        return {
          ...request,
          document_action: action,
          document_action_label: action ? DOCUMENT_ACTION_LABEL[action] : null,
          plain_text:
            action === 'si_vgm_correction' ? PLAIN_TEXT[action] : PLAIN_TEXT[request.kind],
        };
      }),
    } as ForwarderOrderT;
  });
};

const normalized = (value: unknown) => {
  if (typeof value !== 'string') return null;

  return value.replace(/\s+/g, '').toUpperCase() || null;
};

const fieldError = (field: NumberFieldT, value: string) => {
  if (field === 'booking_no') return BOOKING_NO_PATTERN.test(value) ? null : BOOKING_INVALID;
  if (field === 'seal_no') return SEAL_NO_PATTERN.test(value) ? null : SEAL_INVALID;

  return containerNoError(value);
};

const validationFailure = (field: NumberFieldT, message: string) =>
  HttpResponse.json(
    {
      detail: [
        { type: 'value_error', loc: ['body', field], msg: `Value error, ${message}`, input: null },
      ],
    },
    { status: 422 }
  );

const readablePlan = async (request: Request, planId: string) => {
  const principal = authorize(request, 'forwarder');
  if (principal instanceof Response) return principal;
  if (!canReadPlan(planId, principal.org)) return fail(404, PLAN_NOT_FOUND);

  return { session: (await demoPlan(planId)) as PlanSessionT, org: principal.org };
};

export const executionNumberHandlers = [
  http.get(api('/saas/forwarder/plans/:planId/execution-card'), async ({ request, params }) => {
    const readable = await readablePlan(request, String(params.planId));
    if (readable instanceof Response) return readable;

    return HttpResponse.json(buildCard(readable.session, readable.org));
  }),

  http.put(
    api('/saas/forwarder/plans/:planId/execution-card/containers/:containerId'),
    async ({ request, params }) => {
      const planId = String(params.planId);
      const containerId = String(params.containerId);
      const readable = await readablePlan(request, planId);
      if (readable instanceof Response) return readable;
      const { session, org } = readable;

      const body = ((await request.json()) ?? {}) as Record<string, unknown>;
      const changes = new Map<NumberFieldT, string | null>();
      for (const field of NUMBER_FIELDS) {
        if (!(field in body)) continue;

        const value = normalized(body[field]);
        const error = value === null ? null : fieldError(field, value);
        if (error) return validationFailure(field, error);
        changes.set(field, value);
      }

      const active = buildCard(session, org).containers.map(item => item.container_id);
      if (!active.includes(containerId)) return fail(404, CONTAINER_NOT_FOUND);
      if (!changes.size) return fail(422, NO_CHANGES);

      const planNumbers = entered.get(planId) ?? new Map<string, EnteredT>();
      const containerNo = changes.get('container_no') ?? null;
      if (containerNo) {
        const taken = active.find(
          id => id !== containerId && planNumbers.get(id)?.container_no === containerNo
        );
        if (taken) {
          return fail(
            409,
            `컨테이너 번호 ${containerNo}는 이 계획의 컨테이너 ${taken}에 이미 입력돼 있습니다`
          );
        }
      }

      const previous = planNumbers.get(containerId) ?? {
        booking_no: null,
        container_no: null,
        seal_no: null,
        entered_at: null,
      };
      planNumbers.set(containerId, {
        ...previous,
        ...Object.fromEntries(changes),
        entered_at: nowIso(),
      });
      entered.set(planId, planNumbers);

      const saved = buildCard(session, org).containers.find(
        item => item.container_id === containerId
      );

      return HttpResponse.json(saved);
    }
  ),
];
