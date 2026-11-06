import type { AlternativeT, SchemaT } from '@/types/api';

export type VoyagePickupT = SchemaT<'VoyagePickup'>;

export type RouteChangeT = {
  truck_id: string;
  voyage_id?: string | null;
  trip?: number | null;
  added_packhouse_ids?: string[];
  removed_packhouse_ids?: string[];
  departure_before?: string | null;
  departure_after?: string | null;
  km_before?: number | null;
  km_after?: number | null;
  cost_before?: number | null;
  cost_after?: number | null;
};

export type PackhouseVisitT = {
  voyageId: string;
  packhouseId: string;
  truckId: string;
  trip: number;
  departure: string;
};

export type PackhouseChangeT = {
  key: string;
  packhouseId: string;
  before: PackhouseVisitT | null;
  after: PackhouseVisitT | null;
};

export type RouteCompareT = {
  trucksBefore: number;
  trucksAfter: number;
  tripsBefore: number;
  tripsAfter: number;
  multiVoyage: boolean;
  kmBefore: number;
  kmAfter: number;
  changes: PackhouseChangeT[];
};

const isRouteChange = (value: unknown): value is RouteChangeT =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { truck_id?: unknown }).truck_id === 'string';

export const readRouteChanges = (diff: AlternativeT['diff']): RouteChangeT[] | null => {
  const raw = (diff as { route_changes?: unknown }).route_changes;
  if (!Array.isArray(raw)) return null;

  return raw.filter(isRouteChange);
};

const routesOf = (pickups: VoyagePickupT[], voyageIds: Set<string>) =>
  pickups
    .filter(({ voyage_id }) => voyageIds.has(voyage_id))
    .flatMap(({ voyage_id, pickup }) => pickup.routes.map(route => ({ ...route, voyage_id })))
    .filter(({ stops }) => stops.length > 0);

type VoyageRouteT = ReturnType<typeof routesOf>[number];

const countTrucks = (routes: VoyageRouteT[]) =>
  new Set(routes.map(({ voyage_id, truck_id }) => `${voyage_id}:${truck_id}`)).size;

const visitKey = (voyageId: string, packhouseId: string) => `${voyageId}:${packhouseId}`;

const visitsOf = (pickups: VoyagePickupT[], voyageIds: Set<string>) => {
  const visits = new Map<string, PackhouseVisitT>();
  routesOf(pickups, voyageIds).forEach(
    ({ voyage_id, truck_id, trip, earliest_departure, stops }) => {
      stops.forEach(({ packhouse_id }) => {
        const key = visitKey(voyage_id, packhouse_id);
        const known = visits.get(key);
        if (!known || Date.parse(earliest_departure) < Date.parse(known.departure)) {
          visits.set(key, {
            voyageId: voyage_id,
            packhouseId: packhouse_id,
            truckId: truck_id,
            trip,
            departure: earliest_departure,
          });
        }
      });
    }
  );

  return visits;
};

const isSameVisit = (before: PackhouseVisitT, after: PackhouseVisitT) =>
  before.truckId === after.truckId &&
  before.trip === after.trip &&
  Date.parse(before.departure) === Date.parse(after.departure);

export const compareRoutes = (
  beforePickups: VoyagePickupT[],
  afterPickups: VoyagePickupT[]
): RouteCompareT | null => {
  if (afterPickups.length === 0) return null;
  const voyageIds = new Set(afterPickups.map(({ voyage_id }) => voyage_id));
  const beforeRoutes = routesOf(beforePickups, voyageIds);
  const afterRoutes = routesOf(afterPickups, voyageIds);
  const beforeVisits = visitsOf(beforePickups, voyageIds);
  const afterVisits = visitsOf(afterPickups, voyageIds);
  const keys = [...new Set([...beforeVisits.keys(), ...afterVisits.keys()])];
  const changes = keys
    .map(key => {
      const before = beforeVisits.get(key) ?? null;
      const after = afterVisits.get(key) ?? null;

      return { key, packhouseId: (after ?? before)?.packhouseId ?? key, before, after };
    })
    .filter(({ before, after }) => !before || !after || !isSameVisit(before, after));
  const sumKm = (routes: VoyageRouteT[]) => routes.reduce((sum, { km }) => sum + km, 0);

  return {
    trucksBefore: countTrucks(beforeRoutes),
    trucksAfter: countTrucks(afterRoutes),
    tripsBefore: beforeRoutes.length,
    tripsAfter: afterRoutes.length,
    multiVoyage: voyageIds.size > 1,
    kmBefore: sumKm(beforeRoutes),
    kmAfter: sumKm(afterRoutes),
    changes,
  };
};
