import {
  isSo2Product,
  kstDateKey,
  productOf,
  productShortName,
} from '@/app/(saas)/app/platform/_components/m2-format';
import type { PlanT, ScenarioT, SchemaT } from '@/types/api';
import { getShipperShortName } from '@/utils/scenario';

export type PlanSourceT = {
  scenario: ScenarioT;
  plan: PlanT;
  routes: SchemaT<'VoyagePickup'>[];
};

export type VoyageViewT = {
  id: string;
  vesselName: string;
  terminal: string | null;
  originName: string;
  destinationName: string;
  etd: string;
  cyCutoff: string;
};

const SHADES: Record<'berry' | 'grape', string[]> = {
  berry: ['#d93a40', '#ec8d90', '#f6c2c4'],
  grape: ['#6047d1', '#a597ea', '#cfc6f5'],
};

const BASIS_LABEL: Record<string, string> = {
  tariff: '정산표 기준',
  operational: '운영비 기준',
  mixed: '정산표·운영비 혼합',
};

export const usedVoyageId = (source: PlanSourceT) =>
  source.plan.containers.find(({ used }) => used)?.voyage_id ??
  source.routes.find(({ pickup }) => pickup.routes.length > 0)?.voyage_id ??
  source.plan.assignments.find(({ voyage_id }) => !!voyage_id)?.voyage_id ??
  null;

export const voyageView = (source: PlanSourceT): VoyageViewT | null => {
  const voyageId = usedVoyageId(source);
  const voyage = source.scenario.voyages.find(({ id }) => id === voyageId);
  if (!voyage) return null;
  const nameOf = (portId: string) =>
    source.scenario.ports.find(({ id }) => id === portId)?.name ?? portId;

  return {
    id: voyage.id,
    vesselName: voyage.vessel_name,
    terminal: voyage.terminal ?? null,
    originName: nameOf(voyage.origin),
    destinationName: nameOf(voyage.destination),
    etd: voyage.etd,
    cyCutoff: voyage.cy_cutoff,
  };
};

type ShipperSourceT = { id: string; packhouse_id: string };

export const packhouseOfShipper = (
  shippers: readonly ShipperSourceT[] | null | undefined,
  shipperId: string
) => shippers?.find(({ id }) => id === shipperId)?.packhouse_id ?? null;

export type VerdictT = {
  label: string;
  tone: 'ok' | 'warn' | 'muted';
  reason: string | null;
  mode: 'sea' | 'air' | 'out';
  afterCutoff: boolean;
  containerId: string | null;
};

export const verdictOf = (
  source: PlanSourceT,
  lotId: string,
  readyDate: string | null
): VerdictT | null => {
  const assignment = source.plan.assignments.find(({ lot_id }) => lot_id === lotId);
  if (assignment?.mode === 'sea') {
    const so2 = isSo2Product(source.scenario, assignment.product_id);
    return {
      label: `${assignment.container_id ?? '해상'}${so2 ? ' 분리' : ''}`,
      tone: 'ok',
      reason: null,
      mode: 'sea',
      afterCutoff: false,
      containerId: assignment.container_id ?? null,
    };
  }
  if (assignment?.mode === 'air') {
    const cutoff = voyageView(source)?.cyCutoff ?? null;
    const afterCutoff = !!readyDate && !!cutoff && readyDate.slice(0, 10) > kstDateKey(cutoff);
    return {
      label: afterCutoff ? '마감 이후 · 항공' : '항공',
      tone: 'warn',
      reason: null,
      mode: 'air',
      afterCutoff,
      containerId: null,
    };
  }
  const unassigned = source.plan.unassigned.find(({ lot_id }) => lot_id === lotId);
  if (unassigned) {
    return {
      label: '제외',
      tone: 'muted',
      reason: unassigned.reason,
      mode: 'out',
      afterCutoff: false,
      containerId: null,
    };
  }

  return null;
};

export type ContainerSegmentT = {
  key: string;
  label: string;
  pallets: number;
  color: string;
};

export type ContainerViewT = {
  id: string;
  kind: string | null;
  title: string;
  conditions: string;
  pallets: number;
  capacity: number;
  utilization: number;
  so2: boolean;
  segments: ContainerSegmentT[];
  keys: string[];
};

const conditionLabel = (product: ScenarioT['products'][number] | null) => {
  if (!product) return '';
  const temp = `${product.temp_min_c}~${product.temp_max_c}°C`;
  const hasGas = typeof product.o2_pct === 'number' || typeof product.co2_pct === 'number';
  if (!hasGas) return `${temp} · CA 가스 미적용`;

  return [
    temp,
    typeof product.o2_pct === 'number' ? `O₂ ${product.o2_pct}%` : '',
    typeof product.co2_pct === 'number' ? `CO₂ ${product.co2_pct}%` : '',
  ]
    .filter(Boolean)
    .join(' · ');
};

export const containerViews = (source: PlanSourceT): ContainerViewT[] => {
  const { plan, scenario } = source;

  return plan.containers
    .filter(({ used }) => used)
    .map(container => {
      const loads = plan.assignments.filter(
        ({ container_id, mode }) => mode === 'sea' && container_id === container.container_id
      );
      const productIds = [
        ...new Set([...container.product_ids, ...loads.map(({ product_id }) => product_id)]),
      ];
      const products = productIds.map(id => productOf(scenario, id));
      const so2 = products.some(product => !!product?.so2_treated);
      const shades = SHADES[so2 ? 'grape' : 'berry'];
      const byShipper = new Map<string, number>();
      loads.forEach(({ shipper_id, pallets }) =>
        byShipper.set(shipper_id, (byShipper.get(shipper_id) ?? 0) + pallets)
      );
      const segments = [...byShipper].map(([shipperId, pallets], index) => ({
        key: shipperId,
        label: getShipperShortName(scenario, shipperId),
        pallets,
        color: shades[index % shades.length],
      }));
      const kind = scenario.containers.find(({ id }) => id === container.container_id)?.kind;

      return {
        id: container.container_id,
        kind: kind ?? null,
        title: [
          container.container_id,
          productIds.map((id, index) => productShortName(products[index], id)).join(' · '),
        ]
          .filter(Boolean)
          .join(' · '),
        conditions: products.length === 1 ? conditionLabel(products[0]) : '',
        pallets: container.pallets,
        capacity: container.capacity_pallets,
        utilization: container.utilization,
        so2,
        segments,
        keys: [container.container_id, ...loads.map(({ lot_id }) => lot_id)],
      };
    });
};

export type SettlementSummaryT = {
  baseline: number;
  shared: number;
  savings: number;
  fee: number;
  gain: number;
  feeRate: number | null;
  runs: number;
  km: number;
  collectionCost: number;
  basisLabel: string | null;
};

export const settlementSummary = (source: PlanSourceT, feeRate: number | null) => {
  const { plan, routes } = source;
  const bases = new Set(
    (plan.container_settlements ?? []).flatMap(({ shippers }) => shippers.map(({ basis }) => basis))
  );
  const basisLabel = (() => {
    if (bases.size === 0) return null;
    if (bases.size > 1) return BASIS_LABEL.mixed;
    return BASIS_LABEL[[...bases][0]] ?? null;
  })();

  return {
    baseline: plan.total_baseline_cost,
    shared: plan.total_shared_cost,
    savings: plan.total_savings,
    fee: plan.total_fee,
    gain: plan.total_savings - plan.total_fee,
    feeRate,
    runs: routes.reduce((sum, { pickup }) => sum + pickup.routes.length, 0),
    km: routes.reduce((sum, { pickup }) => sum + pickup.total_km, 0),
    collectionCost: routes.reduce((sum, { pickup }) => sum + pickup.total_cost, 0),
    basisLabel,
  } satisfies SettlementSummaryT;
};

export const runKeysOfLot = (runs: readonly { key: string; lotIds: string[] }[], lotId: string) =>
  runs.filter(({ lotIds }) => lotIds.includes(lotId)).map(({ key }) => key);

export const verdictLinkKeys = (verdict: VerdictT | null, lotId: string) => [
  ...(verdict?.containerId ? [verdict.containerId] : []),
  ...(verdict?.mode === 'air' ? [`air:${lotId}`] : []),
];

export const previewLotIds = (source: PlanSourceT) => [
  ...source.plan.assignments.map(({ lot_id }) => lot_id),
  ...source.plan.unassigned.map(({ lot_id }) => lot_id),
];

export const airLots = (source: PlanSourceT) =>
  source.plan.assignments.filter(({ mode }) => mode === 'air');
