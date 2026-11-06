import type { SchemaT } from '@/types/api';

export const M2_COLORS = {
  ink: '#0f1b33',
  ink2: '#3a4658',
  muted: '#5b6577',
  navy: '#0d2a5e',
  brand: '#1a7bff',
  brandInk: '#0a5ad1',
  berry: '#d93a40',
  berryInk: '#a8262b',
  grape: '#6047d1',
  grapeInk: '#4a33b5',
  ok: '#0f8a66',
  warn: '#a85d00',
  warnInk: '#8a4b00',
  crit: '#b42318',
  anon: '#a9b0ba',
} as const;

export type SceneToneT = 'berry' | 'grape' | 'anon';

export const TONE_COLOR: Record<SceneToneT, string> = {
  berry: M2_COLORS.berry,
  grape: M2_COLORS.grape,
  anon: M2_COLORS.anon,
};

export type LatLngT = { lat: number; lng: number };

type PackhouseSourceT = Pick<SchemaT<'Packhouse'>, 'id' | 'name' | 'lat' | 'lon'>;
type PortSourceT = Pick<SchemaT<'Port'>, 'id' | 'name' | 'lat' | 'lon'> &
  Partial<Pick<SchemaT<'Port'>, 'gate_peak_windows'>>;
type ProductSourceT = Pick<SchemaT<'Product'>, 'id' | 'name' | 'so2_treated'>;
type VoyageSourceT = Pick<
  SchemaT<'Voyage'>,
  'id' | 'vessel_name' | 'origin' | 'destination' | 'etd' | 'cy_cutoff' | 'transit_days'
> &
  Partial<Pick<SchemaT<'Voyage'>, 'terminal' | 'original_etd'>>;
type LotSourceT = Pick<SchemaT<'Lot'>, 'id' | 'shipper_id' | 'product_id' | 'pallets'> &
  Partial<Pick<SchemaT<'Lot'>, 'ready_date' | 'sell_by_date'>>;
type ShipperSourceT = Pick<SchemaT<'Shipper'>, 'id' | 'name' | 'packhouse_id'>;
type AssignmentSourceT = Pick<
  SchemaT<'Assignment'>,
  'lot_id' | 'mode' | 'pallets' | 'container_id' | 'voyage_id'
>;
type ContainerLoadSourceT = Pick<
  SchemaT<'ContainerLoad'>,
  'container_id' | 'voyage_id' | 'used' | 'pallets' | 'capacity_pallets' | 'product_ids'
> &
  Partial<Pick<SchemaT<'ContainerLoad'>, 'lot_ids' | 'shipper_ids'>>;

export type PlanSceneSourceT = {
  scenario: {
    packhouses: PackhouseSourceT[];
    ports: PortSourceT[];
    products: ProductSourceT[];
    voyages: VoyageSourceT[];
    lots?: LotSourceT[];
    shippers?: ShipperSourceT[];
  };
  plan?: {
    assignments?: AssignmentSourceT[];
    containers?: ContainerLoadSourceT[];
  } | null;
  routes: SchemaT<'VoyagePickup'>[];
};

export type PlanSceneOptionsT = {
  voyageId?: string | null;
  includePackhouseIds?: readonly string[];
  dimPackhouseIds?: readonly string[];
  isAnonymous?: (packhouseId: string) => boolean;
};

export type SceneStopT = {
  key: string;
  packhouseId: string;
  name: string;
  sequence: number;
  pallets: number;
  lotIds: string[];
  readyAt: string;
  eta: string;
  latestArrival: string;
  hasPosition: boolean;
};

export type ScenePlaceT = {
  key: string;
  name: string;
  shortName: string;
  lat: number;
  lon: number;
  tone: SceneToneT;
  color: string;
  pallets: number;
  airPallets: number;
  radius: number;
  sublabel: string;
  dim: boolean;
  anonymous: boolean;
  onRoute: boolean;
  runKeys: string[];
  containerIds: string[];
  lotIds: string[];
  productIds: string[];
  readyAt: string | null;
  visits: { runKey: string; sequence: number; eta: string; pallets: number }[];
};

export type ScenePortT = {
  key: string;
  name: string;
  lat: number;
  lon: number;
  sublabel: string;
};

export type SceneRunT = {
  key: string;
  voyageId: string;
  truckId: string;
  trip: number;
  tripCount: number;
  label: string;
  cargoGroup: string | null;
  tone: SceneToneT;
  color: string;
  weight: number;
  path: LatLngT[];
  stopKeys: string[];
  stops: SceneStopT[];
  lotIds: string[];
  containerIds: string[];
  loadPallets: number;
  capacity: number;
  km: number;
  departAt: string;
  latestDepartAt: string;
  portEta: string;
  slack: number;
  gateStatus: SchemaT<'TruckRoute'>['gate_status'];
  gateWindow: string | null;
  gateDelayMinutes: number;
  gateSlotStart: string | null;
  gateSlotEnd: string | null;
};

export type SceneSeaLaneT = {
  key: string;
  vesselName: string;
  terminal: string | null;
  originId: string;
  destinationId: string;
  destinationName: string;
  label: string;
  etd: string;
  originalEtd: string | null;
  cyCutoff: string;
  transitDays: number;
  arrival: string;
};

export type SceneContainerT = {
  key: string;
  voyageId: string;
  pallets: number;
  capacity: number;
  productIds: string[];
  lotIds: string[];
  tone: SceneToneT;
  color: string;
};

export type SceneAirT = {
  key: string;
  lotId: string;
  packhouseId: string | null;
  anonymous: boolean;
  name: string;
  pallets: number;
  readyDate: string | null;
};

export type SceneGateWindowT = { start: string; end: string; label: string };

export type SceneVoyageT = {
  key: string;
  vesselName: string;
  etd: string;
};

export type MapSceneT = {
  port: ScenePortT | null;
  places: ScenePlaceT[];
  runs: SceneRunT[];
  allRuns: SceneRunT[];
  voyageId: string | null;
  voyages: SceneVoyageT[];
  seaLane: SceneSeaLaneT | null;
  containers: SceneContainerT[];
  air: SceneAirT[];
  gateWindows: SceneGateWindowT[];
  bounds: LatLngT[];
};

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const SO2_CARGO_GROUP = 'grape_so2';
const ANON_PREFIX = 'anon-';
const OTHER_SHIPPER_LABEL = '다른 화주';
const OTHER_VOYAGE_LABEL = '다른 항차';

export const hasPosition = (point: { lat: number | null; lon: number | null } | null | undefined) =>
  !!point &&
  typeof point.lat === 'number' &&
  typeof point.lon === 'number' &&
  Number.isFinite(point.lat) &&
  Number.isFinite(point.lon);

export const placeRadius = (pallets: number) => 5 + Math.sqrt(Math.max(pallets, 0)) * 2.2;

export const runWeight = (loadPallets: number) => 1.5 + Math.max(loadPallets, 2) * 0.28;

export const runKeyOf = (voyageId: string, truckId: string, trip: number) =>
  `${voyageId}:${truckId}:${trip}`;

export const shortPlaceName = (name: string) => name.split(' ')[0] || name;

export const toKstIso = (ms: number) =>
  `${new Date(ms + KST_OFFSET_MS).toISOString().slice(0, 19)}+09:00`;

export const addDaysIso = (iso: string, days: number) => {
  const ms = Date.parse(iso);

  return Number.isNaN(ms) ? iso : toKstIso(ms + days * DAY_MS);
};

const kstMonthDay = (iso: string | null) => {
  if (!iso) return '';
  const ms = Date.parse(iso.length <= 10 ? `${iso}T00:00:00+09:00` : iso);
  if (Number.isNaN(ms)) return '';
  const date = new Date(ms + KST_OFFSET_MS);

  return `${date.getUTCMonth() + 1}/${date.getUTCDate()}`;
};

const uniq = <T>(items: T[]) => [...new Set(items)];

const minIso = (values: string[]) => {
  const valid = values.filter(value => !Number.isNaN(Date.parse(value)));
  if (valid.length === 0) return null;

  return valid.reduce((min, value) => (Date.parse(value) < Date.parse(min) ? value : min));
};

const placeSublabelOf = (hasCargo: boolean, onOtherVoyage: boolean, parts: string[]) => {
  if (hasCargo) return parts.join(' · ');

  return onOtherVoyage ? OTHER_VOYAGE_LABEL : '이번 계획에서 제외';
};

export function buildPlanScene(
  session: PlanSceneSourceT,
  options: PlanSceneOptionsT = {}
): MapSceneT {
  const { scenario, routes } = session;
  const assignments = session.plan?.assignments ?? [];
  const containerLoads = session.plan?.containers ?? [];
  const lots = scenario.lots ?? [];
  const shippers = scenario.shippers ?? [];
  const isAnonymous =
    options.isAnonymous ?? ((packhouseId: string) => packhouseId.startsWith(ANON_PREFIX));
  const dimIds = new Set(options.dimPackhouseIds ?? []);

  const productById = new Map(scenario.products.map(product => [product.id, product]));
  const lotById = new Map(lots.map(lot => [lot.id, lot]));
  const packhouseById = new Map(scenario.packhouses.map(packhouse => [packhouse.id, packhouse]));
  const shipperById = new Map(shippers.map(shipper => [shipper.id, shipper]));
  const assignmentByLot = new Map(assignments.map(assignment => [assignment.lot_id, assignment]));

  const lotIsSo2 = (lotId: string) => {
    const lot = lotById.get(lotId);
    const product = lot ? productById.get(lot.product_id) : null;

    return !!product?.so2_treated;
  };
  const toneOf = (cargoGroup: string | null | undefined, lotIds: string[]): SceneToneT =>
    cargoGroup === SO2_CARGO_GROUP || lotIds.some(lotIsSo2) ? 'grape' : 'berry';
  const containersOfLots = (lotIds: string[]) =>
    uniq(
      lotIds.flatMap(lotId => {
        const containerId = assignmentByLot.get(lotId)?.container_id;
        return containerId ? [containerId] : [];
      })
    );

  const usedContainers = containerLoads.filter(({ used }) => used);
  const voyageId =
    options.voyageId ??
    routes.find(({ pickup }) => pickup.routes.length > 0)?.voyage_id ??
    routes[0]?.voyage_id ??
    usedContainers[0]?.voyage_id ??
    null;
  const voyage = scenario.voyages.find(({ id }) => id === voyageId) ?? null;
  const portSource =
    scenario.ports.find(({ id }) => id === voyage?.origin) ?? scenario.ports[0] ?? null;
  const portPosition = portSource && hasPosition(portSource) ? portSource : null;
  const portLatLng = portPosition ? { lat: portPosition.lat, lng: portPosition.lon } : null;

  const tripCounts = new Map<string, number>();
  routes.forEach(({ voyage_id, pickup }) =>
    pickup.routes.forEach(({ truck_id }) => {
      const countKey = `${voyage_id}:${truck_id}`;
      tripCounts.set(countKey, (tripCounts.get(countKey) ?? 0) + 1);
    })
  );

  const allRuns: SceneRunT[] = routes.flatMap(({ voyage_id, pickup }) =>
    pickup.routes.map(route => {
      const key = runKeyOf(voyage_id, route.truck_id, route.trip);
      const sortedStops = [...route.stops].sort((a, b) => a.sequence - b.sequence);
      const stops: SceneStopT[] = sortedStops.map(stop => {
        const packhouse = packhouseById.get(stop.packhouse_id);
        return {
          key: stop.stop_id,
          packhouseId: stop.packhouse_id,
          name: packhouse?.name ?? stop.packhouse_id,
          sequence: stop.sequence,
          pallets: stop.pallets,
          lotIds: stop.lot_ids,
          readyAt: stop.ready_at,
          eta: stop.eta,
          latestArrival: stop.latest_arrival,
          hasPosition: hasPosition(packhouse),
        };
      });
      const stopPath = sortedStops.flatMap(({ packhouse_id }) => {
        const packhouse = packhouseById.get(packhouse_id);
        return packhouse && hasPosition(packhouse)
          ? [{ lat: packhouse.lat, lng: packhouse.lon }]
          : [];
      });
      const lotIds = uniq(sortedStops.flatMap(({ lot_ids }) => lot_ids));
      const tone = toneOf(route.cargo_group, lotIds);
      const tripCount = tripCounts.get(`${voyage_id}:${route.truck_id}`) ?? 1;

      return {
        key,
        voyageId: voyage_id,
        truckId: route.truck_id,
        trip: route.trip,
        tripCount,
        label: tripCount > 1 ? `${route.truck_id} ${route.trip}회` : route.truck_id,
        cargoGroup: route.cargo_group ?? null,
        tone,
        color: TONE_COLOR[tone],
        weight: runWeight(route.load_pallets),
        path: portLatLng && stopPath.length > 0 ? [portLatLng, ...stopPath, portLatLng] : stopPath,
        stopKeys: uniq(sortedStops.map(({ packhouse_id }) => packhouse_id)),
        stops,
        lotIds,
        containerIds: containersOfLots(lotIds),
        loadPallets: route.load_pallets,
        capacity: route.capacity_pallets,
        km: route.km,
        departAt: route.earliest_departure,
        latestDepartAt: route.latest_departure,
        portEta: route.port_eta,
        slack: route.slack_minutes,
        gateStatus: route.gate_status,
        gateWindow: route.gate_window ?? null,
        gateDelayMinutes: route.gate_delay_minutes,
        gateSlotStart: route.gate_slot_start ?? null,
        gateSlotEnd: route.gate_slot_end ?? null,
      };
    })
  );

  const runs = voyageId ? allRuns.filter(run => run.voyageId === voyageId) : allRuns;
  const voyageById = new Map(scenario.voyages.map(item => [item.id, item]));
  const voyages: SceneVoyageT[] = uniq([
    ...routes.filter(({ pickup }) => pickup.routes.length > 0).map(({ voyage_id }) => voyage_id),
    ...usedContainers.map(({ voyage_id }) => voyage_id),
  ])
    .flatMap(id => {
      const item = voyageById.get(id);
      return item ? [{ key: item.id, vesselName: item.vessel_name, etd: item.etd }] : [];
    })
    .sort((a, b) => a.etd.localeCompare(b.etd));

  const packhouseOfLot = (lotId: string) => {
    const lot = lotById.get(lotId);
    const shipper = lot ? shipperById.get(lot.shipper_id) : null;

    return shipper?.packhouse_id ?? null;
  };

  const air: SceneAirT[] = assignments
    .filter(({ mode }) => mode === 'air')
    .map(assignment => {
      const packhouseId = packhouseOfLot(assignment.lot_id);
      const packhouse = packhouseId ? packhouseById.get(packhouseId) : null;
      const anonymous = !packhouse || !packhouseId || isAnonymous(packhouseId);
      return {
        key: `air:${assignment.lot_id}`,
        lotId: assignment.lot_id,
        packhouseId,
        anonymous,
        name: packhouse && !anonymous ? packhouse.name : OTHER_SHIPPER_LABEL,
        pallets: assignment.pallets,
        readyDate: lotById.get(assignment.lot_id)?.ready_date ?? null,
      };
    });

  const placeIds = uniq([
    ...allRuns.flatMap(({ stopKeys }) => stopKeys),
    ...air.flatMap(({ packhouseId }) => (packhouseId ? [packhouseId] : [])),
    ...(options.includePackhouseIds ?? []),
  ]);

  const places: ScenePlaceT[] = placeIds.flatMap(packhouseId => {
    const packhouse = packhouseById.get(packhouseId);
    if (!packhouse || !hasPosition(packhouse)) return [];

    const visits = runs.flatMap(run =>
      run.stops
        .filter(stop => stop.packhouseId === packhouseId)
        .map(stop => ({
          runKey: run.key,
          sequence: stop.sequence,
          eta: stop.eta,
          pallets: stop.pallets,
          lotIds: stop.lotIds,
          readyAt: stop.readyAt,
          tone: run.tone,
        }))
    );
    const airPallets = air
      .filter(item => item.packhouseId === packhouseId)
      .reduce((sum, item) => sum + item.pallets, 0);
    const pallets = visits.reduce((sum, visit) => sum + visit.pallets, 0);
    const lotIds = uniq([
      ...visits.flatMap(visit => visit.lotIds),
      ...air.filter(item => item.packhouseId === packhouseId).map(item => item.lotId),
    ]);
    const anonymous = isAnonymous(packhouseId);
    const tone: SceneToneT = anonymous ? 'anon' : (visits[0]?.tone ?? toneOf(null, lotIds));
    const containerIds = containersOfLots(lotIds);
    const readyAt = minIso(visits.map(visit => visit.readyAt));
    const onRoute = visits.length > 0;
    const onOtherVoyage =
      !onRoute && runs !== allRuns && allRuns.some(run => run.stopKeys.includes(packhouseId));
    const sublabelParts = [
      pallets > 0 ? `${pallets}P${airPallets > 0 ? `(+${airPallets}P 항공)` : ''}` : '',
      pallets === 0 && airPallets > 0 ? `${airPallets}P 항공` : '',
      kstMonthDay(readyAt),
      containerIds.join('·'),
    ].filter(Boolean);

    return [
      {
        key: packhouseId,
        name: packhouse.name,
        shortName: shortPlaceName(packhouse.name),
        lat: packhouse.lat,
        lon: packhouse.lon,
        tone,
        color: TONE_COLOR[tone],
        pallets,
        airPallets,
        radius: placeRadius(pallets + airPallets),
        sublabel: placeSublabelOf(onRoute || airPallets > 0, onOtherVoyage, sublabelParts),
        dim: anonymous || dimIds.has(packhouseId) || (!onRoute && airPallets === 0),
        anonymous,
        onRoute,
        runKeys: uniq(visits.map(visit => visit.runKey)),
        containerIds,
        lotIds,
        productIds: uniq(
          lotIds.flatMap(lotId => {
            const productId = lotById.get(lotId)?.product_id;
            return productId ? [productId] : [];
          })
        ),
        readyAt,
        visits: visits.map(({ runKey, sequence, eta, pallets: visitPallets }) => ({
          runKey,
          sequence,
          eta,
          pallets: visitPallets,
        })),
      },
    ];
  });

  const containers: SceneContainerT[] = usedContainers
    .filter(container => !voyageId || container.voyage_id === voyageId)
    .map(container => {
      const lotIds = container.lot_ids ?? [];
      const so2 = container.product_ids.some(productId => productById.get(productId)?.so2_treated);
      const tone: SceneToneT = so2 ? 'grape' : 'berry';
      return {
        key: container.container_id,
        voyageId: container.voyage_id,
        pallets: container.pallets,
        capacity: container.capacity_pallets,
        productIds: container.product_ids,
        lotIds,
        tone,
        color: TONE_COLOR[tone],
      };
    });

  const destinationName = voyage
    ? (scenario.ports.find(({ id }) => id === voyage.destination)?.name ?? voyage.destination)
    : '';
  const seaLane: SceneSeaLaneT | null = voyage
    ? {
        key: voyage.id,
        vesselName: voyage.vessel_name,
        terminal: voyage.terminal ?? null,
        originId: voyage.origin,
        destinationId: voyage.destination,
        destinationName,
        label: `${voyage.vessel_name} → ${destinationName}`,
        etd: voyage.etd,
        originalEtd: voyage.original_etd ?? null,
        cyCutoff: voyage.cy_cutoff,
        transitDays: voyage.transit_days,
        arrival: addDaysIso(voyage.etd, voyage.transit_days),
      }
    : null;

  const port: ScenePortT | null = portPosition
    ? {
        key: portPosition.id,
        name: voyage?.terminal || portPosition.name,
        lat: portPosition.lat,
        lon: portPosition.lon,
        sublabel: containers.map(({ key, pallets }) => `${key} ${pallets}P`).join(' · '),
      }
    : null;

  const pickup = routes.find(({ voyage_id }) => voyage_id === voyageId)?.pickup ?? null;
  const gateWindows: SceneGateWindowT[] = (
    pickup?.gate_windows ??
    portSource?.gate_peak_windows ??
    []
  ).map(({ start, end, label }) => ({ start, end, label }));

  const bounds: LatLngT[] = [
    ...places.filter(({ dim }) => !dim).map(({ lat, lon }) => ({ lat, lng: lon })),
    ...(portLatLng ? [portLatLng] : []),
  ];

  return {
    port,
    places,
    runs,
    allRuns,
    voyageId,
    voyages,
    seaLane,
    containers,
    air,
    gateWindows,
    bounds: bounds.length > 0 ? bounds : places.map(({ lat, lon }) => ({ lat, lng: lon })),
  };
}
