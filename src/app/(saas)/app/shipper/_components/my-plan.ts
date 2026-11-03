import {
  type MapSceneT,
  type SceneRunT,
  type SceneStopT,
  buildPlanScene,
} from '@/components/map-hero/scene';
import type { ContainerLoadT, PlanSessionT, SchemaT, TariffSheetT } from '@/types/api';
import type { ShipperCatalogT, ShipperOrderT, ShipperSettlementT } from '@/types/saas-shipper';

export type OwnScopeT = {
  shipperIds: string[];
  packhouseIds: string[];
};

export const ownScopeOf = (catalog?: ShipperCatalogT | null): OwnScopeT => ({
  shipperIds: (catalog?.shippers ?? []).map(({ id }) => id),
  packhouseIds: [...new Set((catalog?.shippers ?? []).map(({ packhouse_id }) => packhouse_id))],
});

export type MyStopT = { stop: SceneStopT; run: SceneRunT };

export type RouteStopT = {
  key: string;
  sequence: number;
  eta: string;
  own: boolean;
  name: string;
  pallets: number;
};

export type MySettlementT = {
  baseline: number;
  shared: number;
  savings: number;
  fee: number;
  gain: number;
  refund: number;
  baselineLabel: string | null;
  baselineKind: string | null;
  performanceOnly: boolean;
};

const stringField = (row: object, key: string) => {
  const value: unknown = (row as Record<string, unknown>)[key];

  return typeof value === 'string' && value.trim() !== '' ? value : null;
};

export type OtherVoyageT = {
  voyage: SchemaT<'Voyage'> | null;
  voyageId: string;
  pallets: number;
  containerIds: string[];
  pickupEta: string | null;
  truckLabel: string | null;
};

export type MyPlanT = {
  session: PlanSessionT;
  scene: MapSceneT;
  voyage: SchemaT<'Voyage'> | null;
  destinationName: string;
  assignments: SchemaT<'Assignment'>[];
  seaPallets: number;
  firstVoyagePallets: number;
  otherVoyages: OtherVoyageT[];
  airPallets: number;
  container: ContainerLoadT | null;
  containerKind: string | null;
  myContainerPallets: number;
  otherShipperCount: number;
  products: SchemaT<'Product'>[];
  firstStop: MyStopT | null;
  routeStops: RouteStopT[];
  settlement: MySettlementT | null;
  tariffs: TariffSheetT[];
  sellBy: string | null;
  lotKeys: (lotId: string, packhouseId: string | null) => string[];
};

const uniq = <T>(items: T[]) => [...new Set(items)];

export function buildMyPlan(session: PlanSessionT, own: OwnScopeT): MyPlanT {
  const ownShippers = new Set(own.shipperIds);
  const ownPackhouses = new Set(own.packhouseIds);
  const { scenario, plan } = session;
  const voyageById = new Map(scenario.voyages.map(voyage => [voyage.id, voyage]));

  const assignments = plan.assignments.filter(({ shipper_id }) => ownShippers.has(shipper_id));
  const sea = assignments
    .filter(({ mode }) => mode === 'sea')
    .sort((a, b) =>
      (voyageById.get(a.voyage_id ?? '')?.etd ?? '').localeCompare(
        voyageById.get(b.voyage_id ?? '')?.etd ?? ''
      )
    );
  const voyageId = sea[0]?.voyage_id ?? null;
  const voyage = voyageId ? (voyageById.get(voyageId) ?? null) : null;

  const base = buildPlanScene(session, { voyageId });
  const runs = base.runs.filter(run => run.stopKeys.some(key => ownPackhouses.has(key)));
  const places = base.places.filter(({ key }) => ownPackhouses.has(key));
  const bounds = [
    ...places.map(({ lat, lon }) => ({ lat, lng: lon })),
    ...(base.port ? [{ lat: base.port.lat, lng: base.port.lon }] : []),
  ];
  const scene: MapSceneT = voyageId
    ? { ...base, runs, places, bounds }
    : {
        ...base,
        runs,
        places,
        bounds,
        seaLane: null,
        containers: [],
        port: base.port ? { ...base.port, sublabel: '' } : null,
      };

  const containerId = sea[0]?.container_id ?? null;
  const container =
    plan.containers.find(({ container_id, used }) => used && container_id === containerId) ?? null;
  const myContainerPallets = sea
    .filter(({ container_id }) => container_id === containerId)
    .reduce((sum, { pallets }) => sum + pallets, 0);
  const otherShipperCount = (container?.shipper_ids ?? []).filter(
    id => !ownShippers.has(id)
  ).length;

  const productIds = uniq(assignments.map(({ product_id }) => product_id));
  const products = scenario.products.filter(({ id }) => productIds.includes(id));

  const myStops: MyStopT[] = runs
    .filter(run => !voyageId || run.voyageId === voyageId)
    .flatMap(run =>
      run.stops.filter(stop => ownPackhouses.has(stop.packhouseId)).map(stop => ({ stop, run }))
    )
    .sort((a, b) => a.stop.eta.localeCompare(b.stop.eta));

  const firstRun = myStops[0]?.run ?? null;
  const routeStops: RouteStopT[] = (firstRun?.stops ?? []).map(stop => ({
    key: stop.key,
    sequence: stop.sequence,
    eta: stop.eta,
    own: ownPackhouses.has(stop.packhouseId),
    name: stop.name,
    pallets: stop.pallets,
  }));

  const ownSettlements = plan.settlements.filter(({ shipper_id }) => ownShippers.has(shipper_id));
  const settlement = ownSettlements.length
    ? ownSettlements.reduce<MySettlementT>(
        (sum, row) => ({
          baseline: sum.baseline + row.baseline_cost,
          shared: sum.shared + row.shared_cost,
          savings: sum.savings + row.savings,
          fee: sum.fee + row.fee,
          gain: sum.gain + row.shipper_gain,
          refund: 0,
          baselineLabel:
            sum.baselineLabel ??
            stringField(row, 'baseline_label') ??
            stringField(row, 'savings_baseline_label'),
          baselineKind: sum.baselineKind ?? stringField(row, 'baseline_kind'),
          performanceOnly:
            sum.performanceOnly &&
            (stringField(row, 'billing_rule') ?? 'performance') === 'performance' &&
            (row as Record<string, unknown>)['pilot'] !== true,
        }),
        {
          baseline: 0,
          shared: 0,
          savings: 0,
          fee: 0,
          gain: 0,
          refund: 0,
          baselineLabel: null,
          baselineKind: null,
          performanceOnly: true,
        }
      )
    : null;

  const ownLotIds = new Set(assignments.map(({ lot_id }) => lot_id));
  const sellBy =
    scenario.lots
      .filter(({ id }) => ownLotIds.has(id))
      .map(({ sell_by_date }) => sell_by_date ?? '')
      .filter(Boolean)
      .sort()[0] ?? null;

  const assignmentByLot = new Map(assignments.map(item => [item.lot_id, item]));
  const palletsOf = (items: SchemaT<'Assignment'>[]) =>
    items.reduce((sum, { pallets }) => sum + pallets, 0);
  const otherVoyages: OtherVoyageT[] = uniq(
    sea.map(({ voyage_id }) => voyage_id ?? '').filter(id => id && id !== voyageId)
  ).map(id => {
    const items = sea.filter(({ voyage_id }) => voyage_id === id);
    const pickup = base.allRuns
      .filter(run => run.voyageId === id)
      .flatMap(run =>
        run.stops.filter(stop => ownPackhouses.has(stop.packhouseId)).map(stop => ({ stop, run }))
      )
      .sort((a, b) => a.stop.eta.localeCompare(b.stop.eta))[0];

    return {
      voyage: voyageById.get(id) ?? null,
      voyageId: id,
      pallets: palletsOf(items),
      containerIds: uniq(items.map(({ container_id }) => container_id ?? '').filter(Boolean)),
      pickupEta: pickup?.stop.eta ?? null,
      truckLabel: pickup?.run.label ?? null,
    };
  });

  return {
    session,
    scene,
    voyage,
    destinationName: voyage
      ? (scenario.ports.find(({ id }) => id === voyage.destination)?.name ?? voyage.destination)
      : '',
    assignments,
    seaPallets: palletsOf(sea),
    firstVoyagePallets: palletsOf(sea.filter(({ voyage_id }) => voyage_id === voyageId)),
    otherVoyages,
    airPallets: assignments
      .filter(({ mode }) => mode === 'air')
      .reduce((sum, { pallets }) => sum + pallets, 0),
    container,
    containerKind: scenario.containers.find(({ id }) => id === containerId)?.kind ?? null,
    myContainerPallets,
    otherShipperCount,
    products,
    firstStop: myStops[0] ?? null,
    routeStops,
    settlement,
    tariffs: (plan.settlement_tariffs ?? []).filter(({ product_id }) =>
      productIds.includes(product_id)
    ),
    sellBy,
    lotKeys: (lotId, packhouseId) => {
      const assignment = assignmentByLot.get(lotId);
      const runKeys = runs.filter(run => run.lotIds.includes(lotId)).map(({ key }) => key);

      return uniq([
        ...(packhouseId ? [packhouseId] : []),
        ...runKeys,
        ...(assignment?.container_id ? [assignment.container_id] : []),
      ]);
    },
  };
}

const BASELINE_KIND_LABEL: Record<string, string> = {
  air_solo: '혼자 항공',
  sea_solo: '혼자 해상',
  mixed: '혼자 보낼 때',
};

export const baselineRowLabel = ({ baselineKind }: MySettlementT) =>
  BASELINE_KIND_LABEL[baselineKind ?? ''] ?? '혼자 항공';

export const myShareRate = ({ performanceOnly, savings, gain }: MySettlementT) =>
  performanceOnly && savings > 0 ? gain / savings : null;

export const myPendingConfirmations = (orders: ShipperOrderT[], own: OwnScopeT) => {
  const ownShippers = new Set(own.shipperIds);

  return orders
    .filter(order => order.status === 'proposed')
    .flatMap(order =>
      order.shipper_confirmations
        .filter(({ status, shipper_id }) => status === 'pending' && ownShippers.has(shipper_id))
        .map(confirmation => ({ order, confirmation }))
    );
};

export type ConfirmWaitT =
  'mine' | 'rejected' | 'replanning' | 'shippers' | 'forwarder' | 'others' | null;

export type OwnPlanConfirmT = 'pending' | 'rejected' | 'replanning' | 'none';

const AWAITING_SHIPPERS_STATUS = 'pending_shipper_confirmation';

export const isAwaitingShippers = (session: PlanSessionT) =>
  String(session.status) === AWAITING_SHIPPERS_STATUS;

const OPEN_CONFIRM_STATUSES: readonly ShipperOrderT['status'][] = ['proposed', 'shipper_confirmed'];

export const activeOrderOf = (session: PlanSessionT, orders: ShipperOrderT[]) => {
  const byId = session.active_order_id
    ? orders.find(({ order_id }) => order_id === session.active_order_id)
    : null;

  if (byId) return byId;

  return (
    orders
      .filter(({ status }) => OPEN_CONFIRM_STATUSES.includes(status))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null
  );
};

export const confirmWaitOf = (
  session: PlanSessionT,
  orders: ShipperOrderT[],
  pendingCount: number,
  ownPlan: OwnPlanConfirmT = 'none'
): ConfirmWaitT => {
  if (pendingCount > 0) return null;
  if (isAwaitingShippers(session)) {
    if (ownPlan === 'replanning') return 'replanning';
    if (ownPlan === 'pending') return 'mine';
    if (ownPlan === 'rejected') return 'rejected';

    return 'shippers';
  }

  const status = activeOrderOf(session, orders)?.status ?? null;

  if (status === 'shipper_confirmed') return 'forwarder';
  if (status === 'proposed') return 'others';
  if (status === null && session.status === 'pending_confirmation') return 'others';

  return null;
};

export const CONFIRM_WAIT_LABEL: Record<Exclude<ConfirmWaitT, null>, string> = {
  mine: '내 확인 필요',
  rejected: '거절함 · 재계획 대기',
  replanning: '다시 짜는 중',
  shippers: '화주 확인 대기',
  forwarder: '포워더 확정 대기',
  others: '다른 화주 확정 대기',
};

export const withSettlementRows = (
  settlement: MySettlementT | null,
  session: PlanSessionT,
  rows?: ShipperSettlementT[] | null
): MySettlementT | null => {
  const forPlan = (rows ?? []).filter(({ plan_id }) => plan_id === session.plan_id);
  const sameVersion = forPlan.filter(({ version }) => version === session.version);
  const picked = sameVersion.length > 0 ? sameVersion : forPlan;

  if (!settlement || picked.length === 0) return settlement;

  const sum = (pick: (row: ShipperSettlementT) => number) =>
    picked.reduce((total, row) => total + pick(row), 0);

  return {
    ...settlement,
    baseline: sum(({ baseline_cost }) => baseline_cost),
    shared: sum(({ shared_cost }) => shared_cost),
    savings: sum(({ savings }) => savings),
    fee: sum(({ fee }) => fee),
    gain: sum(({ shipper_gain }) => shipper_gain),
    refund: sum(({ quality_refund }) => quality_refund),
  };
};
