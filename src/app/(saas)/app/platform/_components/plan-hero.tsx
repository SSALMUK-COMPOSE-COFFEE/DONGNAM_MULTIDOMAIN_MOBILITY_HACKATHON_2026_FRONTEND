'use client';

import { cn } from 'cn';

import {
  productOf,
  productShortName,
  ratioPercent,
  wonNumber,
} from '@/app/(saas)/app/platform/_components/m2-format';
import {
  type PlanSourceT,
  airLots,
  containerViews,
} from '@/app/(saas)/app/platform/_components/plan-model';
import {
  HeroPanel,
  M2_COLORS,
  MapHero,
  MapLegend,
  type MapLegendItemT,
  type MapSceneT,
  type PlanSceneSourceT,
  type ScenePlaceT,
  Timeline,
  timelineFromScene,
} from '@/components/map-hero';
import { getShipperShortName } from '@/utils/scenario';

export type PlanHeroStateT = 'idle' | 'loading' | 'error' | 'ready';

const MAX_CONTAINER_ROWS = 2;
const PANEL_FIT_CLASS = 'min-h-0 overflow-y-auto';

type PlanHeroPropsT = {
  source: PlanSourceT | null;
  sceneSource: PlanSceneSourceT | null;
  scene: MapSceneT | null;
  state: PlanHeroStateT;
  label: string;
  hint: string;
  idleText: string;
  isRecalculating?: boolean;
  onRetry?: () => void;
  isRetrying?: boolean;
  errorText?: string | null;
  placeSublabel?: (place: ScenePlaceT) => string;
};

export function PlanHero({
  source,
  sceneSource,
  scene,
  state,
  label,
  hint,
  idleText,
  isRecalculating = false,
  onRetry,
  isRetrying = false,
  errorText = null,
  placeSublabel,
}: PlanHeroPropsT) {
  const timeline = scene && state === 'ready' ? timelineFromScene(sceneSource, scene) : null;
  const ready = state === 'ready' && source ? source : null;

  return (
    <MapHero
      scene={scene}
      height={380}
      mapId="m2-platform-plan-map"
      hint={isRecalculating ? '재계산 중…' : hint}
      placeSublabel={placeSublabel}
      panel={
        ready ? (
          <ReadyPanel source={ready} label={label} isRecalculating={isRecalculating} />
        ) : (
          <PendingPanel
            label={label}
            state={state}
            idleText={idleText}
            onRetry={onRetry}
            isRetrying={isRetrying}
            errorText={errorText}
          />
        )
      }
      legend={ready ? <PlanLegend source={ready} /> : null}
      footer={
        timeline ? (
          <Timeline title="출하·집하 시간축" {...timeline} />
        ) : (
          <div className="m2-tl-empty">
            {state === 'ready'
              ? '집하 운행이 없어 시간축을 그리지 않습니다.'
              : '출하를 고르면 출하 준비·집하 트럭·CY 마감·ETD 를 시간축에 그립니다.'}
          </div>
        )
      }
    />
  );
}

function ReadyPanel({
  source,
  label,
  isRecalculating,
}: {
  source: PlanSourceT;
  label: string;
  isRecalculating: boolean;
}) {
  const { plan, scenario } = source;
  const containers = containerViews(source);
  const air = airLots(source);
  const airByShipper = new Map<string, number>();
  air.forEach(({ shipper_id, pallets }) =>
    airByShipper.set(shipper_id, (airByShipper.get(shipper_id) ?? 0) + pallets)
  );
  const airText = [...airByShipper]
    .map(([shipperId, pallets]) => `${getShipperShortName(scenario, shipperId)} ${pallets}파렛트`)
    .join(' · ');
  const unassignedPallets = plan.unassigned.reduce((sum, { pallets }) => sum + pallets, 0);
  const containerRows =
    containers.length > MAX_CONTAINER_ROWS
      ? [
          {
            k: `컨테이너 ${containers.length}대`,
            v: `${containers.reduce((sum, { pallets }) => sum + pallets, 0)} / ${containers.reduce((sum, { capacity }) => sum + capacity, 0)} 파렛트`,
          },
        ]
      : containers.map(container => ({
          k: container.title,
          v: `${container.pallets} / ${container.capacity} 파렛트`,
        }));

  return (
    <HeroPanel
      label={label}
      value={
        <>
          {wonNumber(plan.total_savings)}
          <small>원</small>
        </>
      }
      sub={`단독 대비 총비용 −${ratioPercent(plan.total_savings, plan.total_baseline_cost)}`}
      rows={[
        ...containerRows,
        ...(airText ? [{ k: '항공 전환', v: airText }] : []),
        ...(plan.unassigned.length > 0
          ? [
              {
                k: '이번 계획에서 제외',
                v: `${plan.unassigned.length}건 · ${unassignedPallets}파렛트`,
              },
            ]
          : []),
      ]}
      className={cn(PANEL_FIT_CLASS, isRecalculating && 'opacity-70')}
    >
      {isRecalculating ? (
        <div className="mt-2">
          <span className="m2-chip m2-chip-brand" role="status">
            재계산 중
          </span>
        </div>
      ) : null}
    </HeroPanel>
  );
}

function PendingPanel({
  label,
  state,
  idleText,
  onRetry,
  isRetrying,
  errorText,
}: {
  label: string;
  state: PlanHeroStateT;
  idleText: string;
  onRetry?: () => void;
  isRetrying: boolean;
  errorText: string | null;
}) {
  if (state === 'error') {
    return (
      <HeroPanel
        label={label}
        value="–"
        sub={
          errorText
            ? `미리 계산하지 못했습니다. ${errorText}`
            : '미리 계산하지 못했습니다. 잠시 뒤 다시 시도하세요.'
        }
        className={PANEL_FIT_CLASS}
      >
        {onRetry ? (
          <button
            type="button"
            className="m2-btn m2-btn-sec m2-btn-sm mt-3"
            disabled={isRetrying}
            onClick={onRetry}
          >
            {isRetrying ? '다시 계산 중' : '다시 계산'}
          </button>
        ) : null}
      </HeroPanel>
    );
  }
  if (state === 'loading') {
    return (
      <HeroPanel
        label={label}
        value={<span className="text-[28px]">계산 중</span>}
        sub="선택한 출하로 공동적재 계획을 미리 계산합니다."
      >
        <div className="mt-2">
          <span className="m2-chip m2-chip-brand" role="status">
            재계산 중
          </span>
        </div>
      </HeroPanel>
    );
  }

  return <HeroPanel label={label} value="–" sub={idleText} />;
}

function PlanLegend({ source }: { source: PlanSourceT }) {
  const containers = containerViews(source);
  const toneItem = (so2: boolean, color: string): MapLegendItemT[] => {
    const productIds = [
      ...new Set(
        source.plan.containers
          .filter(
            ({ used, container_id }) =>
              used && containers.some(({ id, so2: isSo2 }) => id === container_id && isSo2 === so2)
          )
          .flatMap(({ product_ids }) => product_ids)
      ),
    ];
    if (productIds.length === 0) return [];
    const names = [
      ...new Set(productIds.map(id => productShortName(productOf(source.scenario, id), id))),
    ];

    return [{ label: `${names.join('·')} 집하`, color }];
  };
  const items: MapLegendItemT[] = [
    ...toneItem(false, M2_COLORS.berry),
    ...toneItem(true, M2_COLORS.grape),
    ...(airLots(source).length > 0 ? [{ label: '항공 전환' }] : []),
    ...(containers.length > 0 ? [{ label: '해상 항로', color: M2_COLORS.brand, dash: true }] : []),
  ];

  return <MapLegend items={items} note="선 굵기 = 파렛트" />;
}
