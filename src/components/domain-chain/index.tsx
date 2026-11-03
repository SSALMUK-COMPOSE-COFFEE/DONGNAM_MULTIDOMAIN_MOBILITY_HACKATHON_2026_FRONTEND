import { cn } from 'cn';
import type { ReactNode } from 'react';

import {
  type PackhouseChangeT,
  type PackhouseVisitT,
  type RouteChangeT,
  type VoyagePickupT,
  compareRoutes,
  readRouteChanges,
} from '@/components/domain-chain/route-diff';
import type { AlternativeT, PlanT, ScenarioT } from '@/types/api';
import { formatKstMonthDayTime } from '@/utils/kst';
import { getShipperShortName } from '@/utils/scenario';

export type { RouteChangeT, VoyagePickupT } from '@/components/domain-chain/route-diff';

const SPECIAL_LOCATIONS = new Set(['AIR', 'UNASSIGNED']);

const LOCATION_LABEL: Record<string, string> = {
  AIR: '항공',
  UNASSIGNED: '미배정',
};

const locationLabel = (location: string | null) =>
  location ? (LOCATION_LABEL[location] ?? location) : '–';

type DomainChainPropsT = {
  alternative: AlternativeT;
  scenario: ScenarioT;
  currentPlan: PlanT | null;
  currentRoutes: VoyagePickupT[] | null;
  focusContainerId: string | null;
};

const airPalletsOf = (plan: Pick<PlanT, 'assignments'>) =>
  plan.assignments
    .filter(({ mode }) => mode === 'air')
    .reduce((sum, { pallets }) => sum + pallets, 0);

const packhouseName = (scenario: ScenarioT, packhouseId: string) =>
  scenario.packhouses.find(({ id }) => id === packhouseId)?.name ?? packhouseId;

const truckLabel = (truckId: string, trip: number) =>
  trip > 1 ? `${truckId} ${trip}회차` : truckId;

const visitLabel = ({ truckId, trip, departure }: PackhouseVisitT) =>
  `${truckLabel(truckId, trip)} ${formatKstMonthDayTime(departure)} 출발`;

const kmLabel = (km: number) => `${km.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}km`;

export function DomainChain({
  alternative,
  scenario,
  currentPlan,
  currentRoutes,
  focusContainerId,
}: DomainChainPropsT) {
  return (
    <div className="flex flex-col gap-3 rounded-[12px] border border-m2-line bg-white/60 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h4 className="m2-h3">항공 → 해상 → 육상</h4>
        <span className="m2-num text-[11.5px] text-m2-faint">
          재계산 {alternative.solve_ms.toLocaleString('ko-KR')}ms
        </span>
      </div>
      <ol className="flex flex-col gap-3">
        <ChainStep tone="m2-chip-brand" label="항공">
          <AirStep alternative={alternative} scenario={scenario} currentPlan={currentPlan} />
        </ChainStep>
        <ChainStep tone="m2-chip-navy" label="해상">
          <SeaStep
            alternative={alternative}
            scenario={scenario}
            focusContainerId={focusContainerId}
          />
        </ChainStep>
        <ChainStep tone="m2-chip-ok" label="육상">
          <LandStep alternative={alternative} scenario={scenario} currentRoutes={currentRoutes} />
        </ChainStep>
      </ol>
    </div>
  );
}

function ChainStep({
  tone,
  label,
  children,
}: {
  tone: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <li className="grid grid-cols-[44px_minmax(0,1fr)] items-start gap-2">
      <span className={cn('m2-chip justify-center', tone)}>{label}</span>
      <div className="flex min-w-0 flex-col gap-1 text-[12.5px] text-m2-ink-2">{children}</div>
    </li>
  );
}

function AirStep({
  alternative,
  scenario,
  currentPlan,
}: Pick<DomainChainPropsT, 'alternative' | 'scenario' | 'currentPlan'>) {
  const moves = alternative.diff.moved_lots.filter(
    ({ from_location, to_location }) => from_location === 'AIR' || to_location === 'AIR'
  );
  const airAfter = airPalletsOf(alternative.plan);
  const airBefore = currentPlan ? airPalletsOf(currentPlan) : null;

  return (
    <>
      <p>
        항공{' '}
        {airBefore !== null && airBefore !== airAfter ? (
          <span className="m2-num font-semibold">
            {airBefore} → {airAfter}파렛트
          </span>
        ) : (
          <span className="m2-num font-semibold">{airAfter}파렛트</span>
        )}
        {airBefore === airAfter && <span className="text-m2-faint"> (변화 없음)</span>}
      </p>
      {moves.map(({ lot_id, shipper_id, pallets, from_location, to_location }) => (
        <p key={lot_id}>
          <span className="font-semibold">{getShipperShortName(scenario, shipper_id)}</span>{' '}
          <span className="m2-num">{pallets}</span>파렛트 {locationLabel(from_location)} →{' '}
          {locationLabel(to_location)}
        </p>
      ))}
    </>
  );
}

function SeaStep({
  alternative,
  scenario,
  focusContainerId,
}: Pick<DomainChainPropsT, 'alternative' | 'scenario' | 'focusContainerId'>) {
  const { containers, moved_lots: movedLots } = alternative.diff;
  const changed = containers.filter(
    ({ container_id, pallets_before, pallets_after }) =>
      pallets_before !== pallets_after || container_id === focusContainerId
  );
  const unassigned = movedLots.filter(
    ({ from_location, to_location }) => to_location === 'UNASSIGNED' && from_location !== 'AIR'
  );
  const loaded = movedLots.filter(
    ({ from_location, to_location }) =>
      from_location === 'UNASSIGNED' && !SPECIAL_LOCATIONS.has(to_location ?? '')
  );
  const shifted = movedLots.filter(
    ({ from_location, to_location }) =>
      !SPECIAL_LOCATIONS.has(from_location ?? '') &&
      !SPECIAL_LOCATIONS.has(to_location ?? '') &&
      from_location !== to_location
  );

  return (
    <>
      {changed.length === 0 && <p className="text-m2-faint">컨테이너 적재 변화 없음</p>}
      {changed.map(({ container_id, capacity_pallets, pallets_before, pallets_after }) => (
        <p key={container_id}>
          <span className="font-semibold">{container_id}</span>{' '}
          <span className="m2-num">
            {pallets_before} → {pallets_after}/{capacity_pallets}파렛트
          </span>
          {pallets_before === pallets_after && <span className="text-m2-faint"> (그대로)</span>}
        </p>
      ))}
      {shifted.map(({ lot_id, shipper_id, pallets, from_location, to_location }) => (
        <p key={lot_id}>
          <span className="font-semibold">{getShipperShortName(scenario, shipper_id)}</span>{' '}
          <span className="m2-num">{pallets}</span>파렛트 {from_location ?? '–'} →{' '}
          {to_location ?? '–'}
        </p>
      ))}
      {loaded.map(({ lot_id, shipper_id, pallets, to_location }) => (
        <p key={lot_id} className="text-m2-ok-ink">
          <span className="font-semibold">{getShipperShortName(scenario, shipper_id)}</span>{' '}
          <span className="m2-num">{pallets}</span>파렛트 미배정 → {locationLabel(to_location)} 새로
          실림
        </p>
      ))}
      {unassigned.map(({ lot_id, shipper_id, pallets, from_location }) => (
        <p key={lot_id} className="text-m2-berry-ink">
          <span className="font-semibold">{getShipperShortName(scenario, shipper_id)}</span>{' '}
          <span className="m2-num">{pallets}</span>파렛트 {locationLabel(from_location)}에서 빠짐
          (실을 곳 없음)
        </p>
      ))}
    </>
  );
}

function LandStep({
  alternative,
  scenario,
  currentRoutes,
}: Pick<DomainChainPropsT, 'alternative' | 'scenario' | 'currentRoutes'>) {
  const routeChanges = readRouteChanges(alternative.diff);
  if (routeChanges) return <RouteChangeList changes={routeChanges} scenario={scenario} />;

  const compare = compareRoutes(currentRoutes ?? [], alternative.routes ?? []);
  if (!compare) return <p className="text-m2-faint">집하 경로는 다시 계산하지 않았습니다</p>;

  const { trucksBefore, trucksAfter, tripsBefore, tripsAfter, kmBefore, kmAfter } = compare;
  const { changes, multiVoyage } = compare;
  const hasBefore = currentRoutes !== null;

  return (
    <>
      <p className="m2-num">
        트럭 {hasBefore ? `${trucksBefore} → ${trucksAfter}` : trucksAfter}대 ·{' '}
        {hasBefore ? `${tripsBefore} → ${tripsAfter}` : tripsAfter}회 운행 · 집하{' '}
        {hasBefore ? `${kmLabel(kmBefore)} → ${kmLabel(kmAfter)}` : kmLabel(kmAfter)}
      </p>
      {hasBefore && changes.length === 0 && (
        <p className="text-m2-faint">방문 선과장·출발 시각 그대로</p>
      )}
      {hasBefore &&
        changes.map(change => (
          <PackhouseChangeRow
            key={change.key}
            change={change}
            scenario={scenario}
            showVoyage={multiVoyage}
          />
        ))}
    </>
  );
}

function PackhouseChangeRow({
  change: { packhouseId, before, after },
  scenario,
  showVoyage,
}: {
  change: PackhouseChangeT;
  scenario: ScenarioT;
  showVoyage: boolean;
}) {
  const voyageId = (after ?? before)?.voyageId;
  const name =
    showVoyage && voyageId
      ? `${voyageId} ${packhouseName(scenario, packhouseId)}`
      : packhouseName(scenario, packhouseId);
  if (!before && after) {
    return (
      <p>
        <span className="font-semibold text-m2-ok-ink">+ {name}</span> 새로 방문 ·{' '}
        <span className="m2-num">{visitLabel(after)}</span>
      </p>
    );
  }
  if (before && !after) {
    return (
      <p>
        <span className="font-semibold text-m2-berry-ink">− {name}</span> 방문 안 함 (
        <span className="m2-num">{visitLabel(before)}</span>이었음)
      </p>
    );
  }
  if (!before || !after) return null;

  return (
    <p>
      <span className="font-semibold">{name}</span>{' '}
      <span className="m2-num">
        {visitLabel(before)} → {visitLabel(after)}
      </span>
    </p>
  );
}

function RouteChangeList({ changes, scenario }: { changes: RouteChangeT[]; scenario: ScenarioT }) {
  if (changes.length === 0) return <p className="text-m2-faint">집하 경로 변화 없음</p>;

  return (
    <>
      {changes.map(change => {
        const added = change.added_packhouse_ids ?? [];
        const removed = change.removed_packhouse_ids ?? [];
        const hasDeparture = !!change.departure_before || !!change.departure_after;
        const hasKm = typeof change.km_before === 'number' && typeof change.km_after === 'number';

        return (
          <div key={`${change.voyage_id ?? ''}-${change.truck_id}-${change.trip ?? 1}`}>
            <p className="font-semibold">{truckLabel(change.truck_id, change.trip ?? 1)}</p>
            {added.length > 0 && (
              <p className="text-m2-ok-ink">
                + {added.map(id => packhouseName(scenario, id)).join(', ')}
              </p>
            )}
            {removed.length > 0 && (
              <p className="text-m2-berry-ink">
                − {removed.map(id => packhouseName(scenario, id)).join(', ')}
              </p>
            )}
            {hasDeparture && (
              <p className="m2-num">
                출발 {formatKstMonthDayTime(change.departure_before)} →{' '}
                {formatKstMonthDayTime(change.departure_after)}
              </p>
            )}
            {hasKm && (
              <p className="m2-num">
                집하 {kmLabel(change.km_before ?? 0)} → {kmLabel(change.km_after ?? 0)}
              </p>
            )}
          </div>
        );
      })}
    </>
  );
}
