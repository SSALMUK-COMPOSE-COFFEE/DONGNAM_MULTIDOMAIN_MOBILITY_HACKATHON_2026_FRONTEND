import { BASE_PATH } from '@/consts/api-saas';
import { SESSION_COOKIE_NAME } from '@/consts/route-saas';
import planSessionFixture from '@/mocks/fixtures/plan-session.json';
import {
  DEFAULT_FORWARDER_ORG_ID,
  MOCK_ORGS,
  type MockOrgT,
  findOrg,
  orgOfShipper,
} from '@/mocks/saas/orgs';
import type { PlanSessionT } from '@/types/api';

export type MockLotStatusT = 'registered' | 'planned' | 'shipped' | 'cancelled';

export type MockLotT = {
  id: string;
  scenario_id: string;
  shipper_id: string;
  product_id: string;
  pallets: number;
  ready_date: string;
  destination: string;
  sell_by_date: string;
  sell_window: 'normal' | 'short';
  packhouse: string | null;
  source: string;
  status: MockLotStatusT;
  created_at: string;
  updated_at: string;
};

export type MockBindingT = {
  device_id: string;
  container_id: string;
  plan_id: string | null;
  stage: 'trucking' | 'gate' | 'terminal' | 'vessel' | null;
  bound_at: string;
};

export type MockDeviceT = {
  device_id: string;
  name: string | null;
  created_at: string;
  last_seen_at: string | null;
  binding: MockBindingT | null;
};

export type MockArrivalT = {
  shipper_id: string;
  excess_loss_value: number;
};

export type MockSessionT = {
  org: MockOrgT;
  email: string;
  name: string;
  role?: string;
};

type MockRequestAnswerT = {
  status: 'accepted' | 'declined';
  note: string | null;
  answered_at: string;
};

const SESSION_STORAGE_KEY = 'fs.saas.mock.session';
const ACCOUNTS_STORAGE_KEY = 'fs.saas.mock.accounts';

const initialSession = planSessionFixture as unknown as PlanSessionT;
export const SEEDED_AT = initialSession.created_at;

const packhouseOf = (shipperId: string) =>
  initialSession.scenario.shippers.find(shipper => shipper.id === shipperId)?.packhouse_id ?? null;

const seedLot = (
  lot: Omit<MockLotT, 'scenario_id' | 'packhouse' | 'created_at' | 'updated_at'>
): MockLotT => ({
  ...lot,
  scenario_id: initialSession.scenario_id,
  packhouse: packhouseOf(lot.shipper_id),
  created_at: SEEDED_AT,
  updated_at: SEEDED_AT,
});

const seedLots = (): MockLotT[] => [
  ...initialSession.scenario.lots.map(lot =>
    seedLot({
      id: lot.id,
      shipper_id: lot.shipper_id,
      product_id: lot.product_id,
      pallets: lot.pallets,
      ready_date: lot.ready_date,
      destination: lot.destination,
      sell_by_date: lot.sell_by_date ?? lot.ready_date,
      sell_window: lot.sell_window ?? 'normal',
      source: lot.source ?? '시드',
      status: 'planned',
    })
  ),
  seedLot({
    id: 'lot-jinju-sb-2',
    shipper_id: 'sh-jinju',
    product_id: 'strawberry',
    pallets: 3,
    ready_date: '2026-11-19',
    destination: 'HKHKG',
    sell_by_date: '2026-11-26',
    sell_window: 'normal',
    source: '화주 간편 등록',
    status: 'registered',
  }),
  seedLot({
    id: 'lot-pohang-gr-2',
    shipper_id: 'sh-pohang',
    product_id: 'grape_so2',
    pallets: 4,
    ready_date: '2026-11-19',
    destination: 'HKHKG',
    sell_by_date: '2027-01-03',
    sell_window: 'normal',
    source: '화주 간편 등록',
    status: 'registered',
  }),
];

const seedDevices = (): Map<string, MockDeviceT[]> =>
  new Map([
    [
      'freshswitch',
      [
        {
          device_id: 'sensor-ca01-a',
          name: 'CA-01 리퍼 센서',
          created_at: SEEDED_AT,
          last_seen_at: SEEDED_AT,
          binding: {
            device_id: 'sensor-ca01-a',
            container_id: 'CA-01',
            plan_id: initialSession.plan_id,
            stage: 'terminal',
            bound_at: SEEDED_AT,
          },
        },
      ],
    ],
  ]);

const seedDb = () => ({
  lots: seedLots(),
  planLots: new Map<string, Set<string>>([
    [initialSession.plan_id, new Set(initialSession.scenario.lots.map(lot => lot.id))],
  ]),
  planCreatedAt: new Map<string, string>([[initialSession.plan_id, initialSession.created_at]]),
  forwarders: new Map<string, string>([[initialSession.plan_id, DEFAULT_FORWARDER_ORG_ID]]),
  devices: seedDevices(),
  answers: new Map<string, MockRequestAnswerT>(),
  arrivals: new Map<string, Map<string, MockArrivalT>>(),
  lotSeq: 0,
});

export const mockDb = seedDb();

const resetListeners: (() => void)[] = [];

export const onMockReset = (listener: () => void) => {
  resetListeners.push(listener);
};

export const resetMockDb = () => {
  Object.assign(mockDb, seedDb());
  resetListeners.forEach(listener => listener());
};

export const nowIso = () => new Date().toISOString();

export const shipperOrgOfLot = (lot: Pick<MockLotT, 'shipper_id'>) => orgOfShipper(lot.shipper_id);

const sessionCookiePath = () => BASE_PATH || '/';

const writeSessionCookie = (value: string | null) => {
  const path = sessionCookiePath();
  document.cookie = value
    ? `${SESSION_COOKIE_NAME}=${value}; path=${path}; SameSite=Lax`
    : `${SESSION_COOKIE_NAME}=; path=${path}; max-age=0; SameSite=Lax`;
};

export const readSession = (): MockSessionT | null => {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;

    const session = JSON.parse(raw) as MockSessionT;
    if (!findOrg(session.org.org_id)) MOCK_ORGS.push(session.org);

    return session;
  } catch {
    return null;
  }
};

export const writeSession = (session: MockSessionT) => {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  writeSessionCookie(`mock-${session.org.org_id}`);
};

export const clearSession = () => {
  localStorage.removeItem(SESSION_STORAGE_KEY);
  writeSessionCookie(null);
};

type MockAccountT = MockSessionT & { password: string };

const readAccounts = (): MockAccountT[] => {
  try {
    const raw = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    const accounts = raw ? (JSON.parse(raw) as MockAccountT[]) : [];
    accounts.forEach(account => {
      if (!findOrg(account.org.org_id)) MOCK_ORGS.push(account.org);
    });

    return accounts;
  } catch {
    return [];
  }
};

export const findAccount = (email: string) =>
  readAccounts().find(account => account.email === email);

export const saveAccount = (account: MockAccountT) => {
  const accounts = readAccounts().filter(item => item.email !== account.email);
  localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify([...accounts, account]));
};

export const answerKey = (orderId: string, requestId: string) => `${orderId}:${requestId}`;

export const listAccounts = () => readAccounts();

export const moveSessionOrg = (org: MockOrgT) => {
  const session = readSession();
  if (!session) return;

  const index = MOCK_ORGS.findIndex(item => item.org_id === org.org_id);
  if (index < 0) MOCK_ORGS.push(org);
  else MOCK_ORGS[index] = org;

  writeSession({ ...session, org });
  const accounts = readAccounts().map(account =>
    account.org.org_id === org.org_id ? { ...account, org } : account
  );
  localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
};
