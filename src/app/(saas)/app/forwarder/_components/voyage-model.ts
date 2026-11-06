import { runKeyOf, shortPlaceName } from '@/components/map-hero/scene';
import type { ForwarderPlanSessionT } from '@/types/saas-forwarder';

type ScenarioT = ForwarderPlanSessionT['scenario'];

export const usedVoyages = ({ plan, scenario }: ForwarderPlanSessionT) => {
  const used = new Set(
    plan.containers.filter(({ used }) => used).map(({ voyage_id }) => voyage_id)
  );

  return scenario.voyages
    .filter(({ id }) => used.has(id))
    .sort((a, b) => a.etd.localeCompare(b.etd));
};

export const firstVoyage = (session: ForwarderPlanSessionT) => usedVoyages(session)[0] ?? null;

export const voyageSlice = (
  session: ForwarderPlanSessionT,
  voyageId: string | null
): ForwarderPlanSessionT =>
  voyageId
    ? {
        ...session,
        routes: session.routes.filter(({ voyage_id }) => voyage_id === voyageId),
        plan: {
          ...session.plan,
          containers: session.plan.containers.filter(({ voyage_id }) => voyage_id === voyageId),
        },
      }
    : session;

export const usedContainers = (session: ForwarderPlanSessionT) =>
  session.plan.containers.filter(({ used }) => used);

export const productName = (scenario: ScenarioT, productId: string) =>
  scenario.products.find(({ id }) => id === productId)?.name ?? productId;

export const isSo2Product = (scenario: ScenarioT, productId: string) =>
  !!scenario.products.find(({ id }) => id === productId)?.so2_treated;

export const portName = (scenario: ScenarioT, portId: string) =>
  scenario.ports.find(({ id }) => id === portId)?.name ?? portId;

export const shortPortName = (name: string) => shortPlaceName(name);

export const lotProductIds = (scenario: ScenarioT, lotIds: readonly string[]) => [
  ...new Set(
    lotIds.flatMap(lotId => {
      const productId = scenario.lots.find(({ id }) => id === lotId)?.product_id;
      return productId ? [productId] : [];
    })
  ),
];

export const lotPackhouseIds = (scenario: ScenarioT, lotIds: readonly string[]) => [
  ...new Set(
    lotIds.flatMap(lotId => {
      const lot = scenario.lots.find(({ id }) => id === lotId);
      const packhouseId = lot
        ? scenario.shippers.find(({ id }) => id === lot.shipper_id)?.packhouse_id
        : null;
      return packhouseId ? [packhouseId] : [];
    })
  ),
];

export const truckRunKeys = (session: ForwarderPlanSessionT, truckId: string) =>
  session.routes.flatMap(({ voyage_id, pickup }) =>
    pickup.routes
      .filter(({ truck_id }) => truck_id === truckId)
      .map(({ truck_id, trip }) => runKeyOf(voyage_id, truck_id, trip))
  );

export const containerKind = (scenario: ScenarioT, containerId: string) =>
  scenario.containers.find(({ id }) => id === containerId)?.kind ?? null;

export const productCondition = (scenario: ScenarioT, productId: string) => {
  const product = scenario.products.find(({ id }) => id === productId);
  if (!product) return '';
  const gas = [
    typeof product.o2_pct === 'number' ? `O₂ ${product.o2_pct}%` : '',
    typeof product.co2_pct === 'number' ? `CO₂ ${product.co2_pct}%` : '',
  ].filter(Boolean);

  return [`${product.temp_min_c}~${product.temp_max_c}°C`, ...gas].join(' · ');
};
