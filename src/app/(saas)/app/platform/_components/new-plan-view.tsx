'use client';

import { useQueryClient } from '@tanstack/react-query';
import { cn } from 'cn';
import { CircleAlertIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useMemo, useState } from 'react';
import { toast } from 'sonner';

import { saasErrorDetail, saasErrorStatus } from '@/apis/saas/errors';
import {
  PLATFORM_LOTS_LIMIT,
  platformKeys,
  useCreatePlatformPlan,
  usePlatformCatalog,
  usePlatformLots,
  usePlatformOrgId,
  usePlatformPlanPreview,
  usePlatformPlans,
} from '@/apis/saas/platform';
import { ContainerPlanCard } from '@/app/(saas)/app/platform/_components/container-plan-card';
import { EmptyState } from '@/app/(saas)/app/platform/_components/empty-state';
import {
  LOT_STATUS_LABEL,
  LotStatusBadge,
} from '@/app/(saas)/app/platform/_components/lot-status-badge';
import {
  errorDetailOf,
  isSo2Product,
  kstDayTime,
  monthDay,
  portName,
  productOf,
  productShortName,
} from '@/app/(saas)/app/platform/_components/m2-format';
import { PLATFORM_PATHS } from '@/app/(saas)/app/platform/_components/paths';
import { PlanHero, type PlanHeroStateT } from '@/app/(saas)/app/platform/_components/plan-hero';
import {
  type PlanSourceT,
  type VerdictT,
  packhouseOfShipper,
  previewLotIds,
  runKeysOfLot,
  verdictLinkKeys,
  verdictOf,
} from '@/app/(saas)/app/platform/_components/plan-model';
import { PlatformHeader } from '@/app/(saas)/app/platform/_components/platform-header';
import { QueryError } from '@/app/(saas)/app/platform/_components/query-error';
import {
  SceneVoyageTabs,
  buildPickedScene,
} from '@/app/(saas)/app/platform/_components/scene-voyage-tabs';
import { SegTabs } from '@/app/(saas)/app/platform/_components/seg-tabs';
import { SettlementPreviewCard } from '@/app/(saas)/app/platform/_components/settlement-preview-card';
import { useDebouncedValue } from '@/app/(saas)/app/platform/_components/use-debounced-value';
import {
  type MapSceneT,
  type PlanSceneSourceT,
  type ScenePlaceT,
  type StepItemT,
  Steps,
} from '@/components/map-hero';
import { MapLinkProvider, useMapLinkTarget } from '@/components/map-link';
import { Skeleton } from '@/components/ui/skeleton';
import type { ScenarioT } from '@/types/api';
import type { LotStatusT, PlatformLotT } from '@/types/saas-platform';
import { getShipperName } from '@/utils/scenario';

type FilterT = LotStatusT | 'all';

const FILTERS: FilterT[] = ['registered', 'planned', 'shipped', 'cancelled', 'all'];
const FILTER_OPTIONS = FILTERS.map(value => ({
  value,
  label: value === 'all' ? '전체' : LOT_STATUS_LABEL[value],
}));
const ID_SEPARATOR = '\n';
const PREVIEW_DEBOUNCE_MS = 500;
const EMPTY_LOTS: PlatformLotT[] = [];
const HERO_LABEL = '단독 발송 대비 절감 · 선택 화물 기준';
const STALE_LOT_STATUSES = [409, 422];

const sumPallets = (lots: readonly { pallets: number }[]) =>
  lots.reduce((total, { pallets }) => total + pallets, 0);

const mergeById = <T extends { id: string }>(primary: T[], extra: readonly T[]) => {
  const ids = new Set(primary.map(({ id }) => id));

  return [...primary, ...extra.filter(({ id }) => !ids.has(id))];
};

const sceneWithFullBounds = (scene: MapSceneT): MapSceneT => {
  const points = [
    ...scene.places.map(({ lat, lon }) => ({ lat, lng: lon })),
    ...(scene.port ? [{ lat: scene.port.lat, lng: scene.port.lon }] : []),
  ];

  return points.length > 0 ? { ...scene, bounds: points } : scene;
};

export function NewPlanView({ afterHeader = null }: { afterHeader?: ReactNode }) {
  const orgId = usePlatformOrgId();

  return (
    <MapLinkProvider key={orgId}>
      <NewPlanScreen afterHeader={afterHeader} />
    </MapLinkProvider>
  );
}

function NewPlanScreen({ afterHeader }: { afterHeader: ReactNode }) {
  const [filter, setFilter] = useState<FilterT>('registered');
  const lotsQuery = usePlatformLots();
  const registeredQuery = usePlatformLots('registered');
  const tabQuery = usePlatformLots(filter === 'all' ? null : filter);
  const plansQuery = usePlatformPlans();
  const catalogQuery = usePlatformCatalog();
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const router = useRouter();
  const createPlan = useCreatePlatformPlan();
  const queryClient = useQueryClient();
  const orgId = usePlatformOrgId();

  const catalog = catalogQuery.data ?? null;
  const registered = registeredQuery.data ?? EMPTY_LOTS;
  const selectedLots = registered.filter(({ id }) => selected.has(id));
  const selectedIds = [...new Set(selectedLots.map(({ id }) => id))].sort();
  const selectionKey = selectedIds.join(ID_SEPARATOR);
  const debouncedKey = useDebouncedValue(selectionKey, PREVIEW_DEBOUNCE_MS);
  const previewIds = useMemo(
    () => (debouncedKey ? debouncedKey.split(ID_SEPARATOR) : []),
    [debouncedKey]
  );
  const previewQuery = usePlatformPlanPreview(previewIds);
  const previewData = previewQuery.data ?? null;
  const isPreviewForSelection =
    !!previewData && previewLotIds(previewData).some(id => selectedIds.includes(id));
  const preview: PlanSourceT | null =
    selectedIds.length > 0 && isPreviewForSelection ? previewData : null;
  const isRecalculating =
    !!preview &&
    (previewQuery.isFetching || previewQuery.isPlaceholderData || debouncedKey !== selectionKey);

  const heroState = ((): PlanHeroStateT => {
    if (selectedIds.length === 0) return 'idle';
    if (preview) return 'ready';
    if (previewQuery.isError && debouncedKey === selectionKey) return 'error';
    return 'loading';
  })();

  const shippers = useMemo(
    () => mergeById(preview?.scenario.shippers ?? [], catalog?.shippers ?? []),
    [preview, catalog]
  );
  const packhouseIdOf = (lot: PlatformLotT) =>
    packhouseOfShipper(shippers, lot.shipper_id) ??
    (catalog?.packhouses.some(({ id }) => id === lot.packhouse) ? lot.packhouse : null) ??
    null;

  const poolPackhouseKey = [...new Set(registered.flatMap(lot => packhouseIdOf(lot) ?? []))]
    .sort()
    .join(ID_SEPARATOR);
  const poolPackhouseIds = useMemo(
    () => (poolPackhouseKey ? poolPackhouseKey.split(ID_SEPARATOR) : []),
    [poolPackhouseKey]
  );

  const [pickedVoyageId, setPickedVoyageId] = useState<string | null>(null);
  const sceneSource = useMemo<PlanSceneSourceT | null>(() => {
    const extraPackhouses = catalog?.packhouses ?? [];
    if (preview) {
      return {
        ...preview,
        scenario: {
          ...preview.scenario,
          packhouses: mergeById(preview.scenario.packhouses, extraPackhouses),
        },
      };
    }
    if (catalog) return { scenario: catalog, plan: null, routes: [] };
    return null;
  }, [preview, catalog]);
  const scene = useMemo(
    () =>
      sceneSource
        ? sceneWithFullBounds(
            buildPickedScene(sceneSource, { includePackhouseIds: poolPackhouseIds }, pickedVoyageId)
          )
        : null,
    [sceneSource, poolPackhouseIds, pickedVoyageId]
  );

  const poolByPackhouse = new Map<string, { pallets: number; selected: boolean }>();
  registered.forEach(lot => {
    const packhouseId = packhouseIdOf(lot);
    if (!packhouseId) return;
    const current = poolByPackhouse.get(packhouseId) ?? { pallets: 0, selected: false };
    poolByPackhouse.set(packhouseId, {
      pallets: current.pallets + lot.pallets,
      selected: current.selected || selected.has(lot.id),
    });
  });
  const placeSublabel = (place: ScenePlaceT) => {
    if (place.onRoute || place.airPallets > 0) return place.sublabel;
    const pool = poolByPackhouse.get(place.key);
    if (!pool) return place.sublabel;
    if (pool.selected && preview) return '이번 계획에서 제외';

    return `대기 ${pool.pallets}P · 선택 안 함`;
  };

  const toggle = (lotId: string) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(lotId)) next.delete(lotId);
      else next.add(lotId);

      return next;
    });
  const tabLots = tabQuery.data ?? EMPTY_LOTS;
  const selectableIds =
    filter === 'registered' || filter === 'all'
      ? tabLots.filter(({ status }) => status === 'registered').map(({ id }) => id)
      : [];
  const isAllSelected = selectableIds.length > 0 && selectableIds.every(id => selected.has(id));
  const toggleAll = () =>
    setSelected(prev => {
      const next = new Set(prev);
      selectableIds.forEach(id => {
        if (isAllSelected) next.delete(id);
        else next.add(id);
      });

      return next;
    });

  const retryPreview = () => {
    if (STALE_LOT_STATUSES.includes(saasErrorStatus(previewQuery.error) ?? 0)) {
      queryClient.invalidateQueries({ queryKey: platformKeys.lots(orgId) });
    }
    previewQuery.refetch();
  };

  const submit = () =>
    createPlan.mutate(
      { lot_ids: selectedIds },
      {
        onSuccess: session => {
          setSelected(new Set());
          toast.success('공동적재 계획을 만들었습니다.');
          router.push(PLATFORM_PATHS.PLAN(session.plan_id));
        },
        onError: error => toast.error(errorDetailOf(error) ?? '계획을 만들지 못했습니다.'),
      }
    );

  const lane = preview ? (scene?.seaLane ?? null) : null;
  const shipperCount = new Set(selectedLots.map(({ shipper_org_id }) => shipper_org_id)).size;

  return (
    <>
      <PlatformHeader
        eyebrow="공동적재 계획 · 새 계획"
        title={
          lane ? `${lane.vesselName} 항차에 묶을 화물 고르기` : '출하를 골라 공동적재 계획 만들기'
        }
        sub={
          lane
            ? `${lane.key} · ${lane.terminal ?? scene?.port?.name ?? ''} → ${lane.destinationName} · ETD ${kstDayTime(lane.etd)} · CY 마감 ${kstDayTime(lane.cyCutoff)}`
            : '등록된 출하를 고르면 항차·컨테이너·집하 경로·정산을 저장하지 않고 미리 계산합니다.'
        }
      >
        <button
          type="button"
          className="m2-btn m2-btn-sec"
          disabled={selectedIds.length === 0 || createPlan.isPending}
          onClick={() => setSelected(new Set())}
        >
          선택 초기화
        </button>
        <button
          type="button"
          className="m2-btn m2-btn-pri"
          disabled={selectedIds.length === 0 || createPlan.isPending}
          onClick={submit}
        >
          {createPlan.isPending ? '계획 짜는 중' : '계획 생성'}
        </button>
      </PlatformHeader>

      {afterHeader}

      <Steps
        items={planSteps({
          count: selectedIds.length,
          pallets: sumPallets(selectedLots),
          shipperCount,
          heroState,
          isRecalculating,
          isCreating: createPlan.isPending,
          preview,
        })}
      />

      <SceneVoyageTabs scene={scene} onPick={setPickedVoyageId} />

      <PlanHero
        source={preview}
        sceneSource={sceneSource}
        scene={scene}
        state={heroState}
        label={HERO_LABEL}
        hint="지점을 누르면 아래 출하 행으로 이동합니다"
        idleText="출하 풀에서 화물을 고르면 절감액을 바로 계산합니다."
        isRecalculating={isRecalculating}
        onRetry={retryPreview}
        isRetrying={previewQuery.isFetching}
        errorText={heroState === 'error' ? saasErrorDetail(previewQuery.error) : null}
        placeSublabel={placeSublabel}
      />

      {catalogQuery.isError ? (
        <div className="mb-4">
          <QueryError
            error={catalogQuery.error}
            subject="카탈로그를"
            onRetry={() => catalogQuery.refetch()}
            isRetrying={catalogQuery.isFetching}
          />
        </div>
      ) : null}

      <div className="m2-grid grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] max-[1180px]:grid-cols-1">
        <section className="m2-card">
          <PoolHeader lots={tabLots} catalog={catalog} />
          <SegTabs
            label="출하 상태"
            value={filter}
            options={FILTER_OPTIONS}
            onChange={setFilter}
            className="mb-3"
          />
          <PoolBody
            isPending={tabQuery.isPending}
            error={tabQuery.isError ? tabQuery.error : null}
            onRetry={() => tabQuery.refetch()}
            isRetrying={tabQuery.isFetching}
            lots={tabLots}
            isEmptyPool={lotsQuery.isSuccess && (lotsQuery.data ?? []).length === 0}
          >
            <table className="m2-table">
              <thead>
                <tr>
                  <th className="w-9">
                    <input
                      type="checkbox"
                      aria-label="등록된 출하 모두 선택"
                      className="m2-cb"
                      disabled={selectableIds.length === 0}
                      checked={isAllSelected}
                      onChange={toggleAll}
                    />
                  </th>
                  <th>화주 · 로트</th>
                  <th>품목</th>
                  <th className="r">파렛트</th>
                  <th>준비일</th>
                  <th>판매기한</th>
                  <th>{filter === 'registered' ? '판정' : '상태'}</th>
                </tr>
              </thead>
              <tbody>
                {tabLots.map(lot => {
                  const packhouseId = packhouseIdOf(lot);
                  const isPreviewed = previewIds.includes(lot.id);
                  const verdict =
                    preview && isPreviewed ? verdictOf(preview, lot.id, lot.ready_date) : null;
                  const runKeys = scene ? runKeysOfLot(scene.runs, lot.id) : [];
                  return (
                    <PoolRow
                      key={lot.id}
                      lot={lot}
                      catalog={catalog}
                      keys={[
                        ...(packhouseId ? [packhouseId] : []),
                        ...runKeys,
                        lot.id,
                        ...verdictLinkKeys(verdict, lot.id),
                      ]}
                      isChecked={selected.has(lot.id)}
                      onToggle={() => toggle(lot.id)}
                      showVerdict={filter === 'registered'}
                      verdict={verdict}
                      isCalculating={
                        selected.has(lot.id) && (heroState === 'loading' || isRecalculating)
                      }
                    />
                  );
                })}
              </tbody>
            </table>
          </PoolBody>
          {preview ? <PoolNotes source={preview} lots={registered} /> : null}
          <PoolStats
            registered={registeredQuery.isSuccess ? registered : null}
            lots={lotsQuery.isSuccess ? (lotsQuery.data ?? EMPTY_LOTS) : null}
            planCount={plansQuery.isSuccess ? plansQuery.data.length : null}
            unassignedCount={
              plansQuery.isSuccess
                ? plansQuery.data.filter(({ forwarder }) => !forwarder).length
                : null
            }
          />
        </section>

        <div className="m2-col">
          <ContainerPlanCard
            source={preview}
            isPending={heroState === 'loading'}
            isStale={isRecalculating}
            emptyText={
              heroState === 'error'
                ? '미리 계산하지 못했습니다. 지도 패널에서 다시 계산하세요.'
                : '출하를 고르면 컨테이너별 적재안과 이용률을 보여줍니다.'
            }
          />
          <SettlementPreviewCard
            title="정산 미리보기"
            source={preview}
            isPending={heroState === 'loading'}
            isStale={isRecalculating}
            emptyText="출하를 고르면 단독 발송 대비 공동적재 비용을 비교합니다."
            footer={
              <p className="m2-sub mt-3 text-[12px]">
                계획을 만든 뒤 상세 화면에서 포워더를 배정합니다.
              </p>
            }
          />
        </div>
      </div>
    </>
  );
}

type PlanStepsInputT = {
  count: number;
  pallets: number;
  shipperCount: number;
  heroState: PlanHeroStateT;
  isRecalculating: boolean;
  isCreating: boolean;
  preview: PlanSourceT | null;
};

const reviewSub = ({ heroState, isRecalculating, preview }: PlanStepsInputT) => {
  if (heroState === 'idle') return '선택하면 미리 계산';
  if (heroState === 'error') return '계산 실패 · 다시 시도';
  if (heroState === 'loading' || isRecalculating || !preview) return '재계산 중';
  const used = preview.plan.containers.filter(({ used }) => used).length;
  const air = preview.plan.assignments.filter(({ mode }) => mode === 'air').length;
  const out = preview.plan.unassigned.length;

  return [`컨테이너 ${used}대`, air > 0 ? `항공 ${air}건` : '', out > 0 ? `제외 ${out}건` : '']
    .filter(Boolean)
    .join(' · ');
};

const planSteps = (input: PlanStepsInputT): StepItemT[] => {
  const hasSelection = input.count > 0;

  return [
    {
      title: '화물 선택',
      sub: hasSelection
        ? `${input.count}건 · ${input.pallets}파렛트 · 화주 ${input.shipperCount}곳`
        : '출하 풀에서 고르세요',
      state: hasSelection ? 'done' : 'cur',
    },
    {
      title: '조건 검토',
      sub: reviewSub(input),
      state: (input.isCreating && 'done') || (hasSelection ? 'cur' : 'todo'),
    },
    {
      title: '계획 생성',
      sub: '계획 확정 · 상세에서 재최적화',
      state: input.isCreating ? 'cur' : 'todo',
    },
    { title: '포워더 배정', sub: '상세에서 배정', state: 'todo' },
  ];
};

function PoolHeader({ lots, catalog }: { lots: PlatformLotT[]; catalog: ScenarioT | null }) {
  const destinations = [...new Set(lots.map(({ destination }) => destination))].map(id =>
    portName(catalog, id)
  );
  const readyDates = lots.map(({ ready_date }) => ready_date).sort();
  const productCounts = new Map<string, number>();
  lots.forEach(({ product_id }) =>
    productCounts.set(product_id, (productCounts.get(product_id) ?? 0) + 1)
  );
  const range =
    readyDates.length > 0
      ? `준비일 ${monthDay(readyDates[0])}${readyDates.length > 1 && readyDates[0] !== readyDates[readyDates.length - 1] ? `–${monthDay(readyDates[readyDates.length - 1])}` : ''}`
      : '';

  return (
    <div className="m2-card-h items-start">
      <div className="min-w-0">
        <h2 className="m2-h2">출하 풀</h2>
        <div className="m2-sub m2-num">
          {[
            destinations.length > 0 ? `목적지 ${destinations.join('·')}` : '',
            range,
            `${lots.length}건 ${sumPallets(lots)}파렛트`,
          ]
            .filter(Boolean)
            .join(' · ')}
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-1.5">
        {[...productCounts].map(([productId, count]) => {
          const so2 = isSo2Product(catalog, productId);
          return (
            <span
              key={productId}
              className={cn('m2-chip', so2 ? 'm2-chip-grape' : 'm2-chip-berry')}
            >
              <span className="m2-dot" />
              {productShortName(productOf(catalog, productId), productId)} {count}
            </span>
          );
        })}
      </div>
    </div>
  );
}

type PoolRowPropsT = {
  lot: PlatformLotT;
  catalog: ScenarioT | null;
  keys: string[];
  isChecked: boolean;
  onToggle: () => void;
  showVerdict: boolean;
  verdict: VerdictT | null;
  isCalculating: boolean;
};

function PoolRow({
  lot,
  catalog,
  keys,
  isChecked,
  onToggle,
  showVerdict,
  verdict,
  isCalculating,
}: PoolRowPropsT) {
  const { className: linkClassName, ...link } = useMapLinkTarget(keys);
  const product = productOf(catalog, lot.product_id);
  const isRegistered = lot.status === 'registered';

  return (
    <tr {...link} className={cn(verdict?.mode === 'out' && 'is-dis', linkClassName)}>
      <td>
        <input
          type="checkbox"
          aria-label={`${lot.shipper_org_name} ${lot.id} 선택`}
          className="m2-cb"
          disabled={!isRegistered}
          checked={isChecked}
          onChange={onToggle}
        />
      </td>
      <td>
        <div className="m2-who">
          {lot.shipper_org_name}
          <small className="m2-mono">{lot.id}</small>
        </div>
      </td>
      <td>
        <span className={cn('m2-chip', product?.so2_treated ? 'm2-chip-grape' : 'm2-chip-berry')}>
          <span className="m2-dot" />
          {productShortName(product, lot.product_id)}
        </span>
      </td>
      <td className="r m2-num font-bold">{lot.pallets}</td>
      <td className="m2-num">{monthDay(lot.ready_date)}</td>
      <td className="m2-num">
        {monthDay(lot.sell_by_date)}
        {lot.sell_window === 'short' ? (
          <span className="m2-chip m2-chip-warn ml-1.5">짧음</span>
        ) : null}
      </td>
      <td>
        {showVerdict ? (
          <VerdictChip verdict={verdict} isChecked={isChecked} isCalculating={isCalculating} />
        ) : (
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <LotStatusBadge status={lot.status} />
            {isRegistered && isChecked && (!!verdict || isCalculating) && (
              <VerdictChip verdict={verdict} isChecked={isChecked} isCalculating={isCalculating} />
            )}
          </span>
        )}
      </td>
    </tr>
  );
}

function VerdictChip({
  verdict,
  isChecked,
  isCalculating,
}: {
  verdict: VerdictT | null;
  isChecked: boolean;
  isCalculating: boolean;
}) {
  if (!isChecked) return <span className="text-m2-faint">–</span>;
  if (!verdict) {
    return <span className="text-[12px] text-m2-muted">{isCalculating ? '계산 중' : '–'}</span>;
  }
  const toneClass = { ok: 'm2-chip-ok', warn: 'm2-chip-warn', muted: '' }[verdict.tone];

  return (
    <span
      className={cn('m2-chip', toneClass, isCalculating && 'opacity-60')}
      title={verdict.reason ?? verdict.label}
    >
      {verdict.label}
    </span>
  );
}

function PoolNotes({ source, lots }: { source: PlanSourceT; lots: PlatformLotT[] }) {
  const { plan, scenario } = source;
  const lotById = new Map(lots.map(lot => [lot.id, lot]));
  const cutoff = scenario.voyages.find(
    ({ id }) => id === plan.containers.find(({ used }) => used)?.voyage_id
  )?.cy_cutoff;
  const notes: ReactNode[] = [
    ...plan.assignments
      .filter(({ mode }) => mode === 'air')
      .map(assignment => {
        const lot = lotById.get(assignment.lot_id);
        const verdict = verdictOf(source, assignment.lot_id, lot?.ready_date ?? null);
        const name = lot?.shipper_org_name ?? getShipperName(scenario, assignment.shipper_id);
        const product = productShortName(
          productOf(scenario, assignment.product_id),
          assignment.product_id
        );
        return (
          <span key={`air:${assignment.lot_id}`}>
            {name} {product} {assignment.pallets}파렛트
            {verdict?.afterCutoff && lot && cutoff
              ? `는 ${monthDay(lot.ready_date)} 준비라 CY 마감(${kstDayTime(cutoff)}) 이후입니다. 이번 배는 항공으로 보냅니다.`
              : '는 이번 계획에서 항공으로 보냅니다.'}
          </span>
        );
      }),
    ...plan.unassigned.map(item => {
      const lot = lotById.get(item.lot_id);
      const name = lot?.shipper_org_name ?? getShipperName(scenario, item.shipper_id);
      const product = lot
        ? productShortName(productOf(scenario, lot.product_id), lot.product_id)
        : '';
      return (
        <span key={`out:${item.lot_id}`}>
          {[name, product, `${item.pallets}파렛트`].filter(Boolean).join(' ')}는 제외됐습니다 ·{' '}
          {item.reason}
        </span>
      );
    }),
  ];
  if (notes.length === 0) return null;

  return (
    <div className="m2-note m2-note-warn">
      <CircleAlertIcon size={16} strokeWidth={1.5} aria-hidden />
      <div className="flex flex-col gap-1">{notes}</div>
    </div>
  );
}

function PoolStats({
  registered,
  lots,
  planCount,
  unassignedCount,
}: {
  registered: PlatformLotT[] | null;
  lots: PlatformLotT[] | null;
  planCount: number | null;
  unassignedCount: number | null;
}) {
  const totalLabel =
    lots && lots.length >= PLATFORM_LOTS_LIMIT ? `${lots.length}+` : (lots?.length ?? '–');
  const items: { k: string; v: string; d: ReactNode }[] = [
    {
      k: '계획을 기다리는 출하',
      v: registered ? `${registered.length}건` : '–',
      d: registered ? `${sumPallets(registered)}파렛트` : '',
    },
    {
      k: '전체 출하',
      v: lots ? `${totalLabel}건` : '–',
      d: lots ? `화주 ${new Set(lots.map(({ shipper_org_id }) => shipper_org_id)).size}곳` : '',
    },
    { k: '공동적재 계획', v: planCount === null ? '–' : `${planCount}개`, d: '' },
    {
      k: '포워더 미배정 계획',
      v: unassignedCount === null ? '–' : `${unassignedCount}개`,
      d: (
        <Link href={PLATFORM_PATHS.PLANS} className="text-m2-brand-ink hover:underline">
          계획 목록에서 배정
        </Link>
      ),
    },
  ];

  return (
    <div className="mt-4 grid grid-cols-4 gap-3 border-t border-m2-line pt-3 max-[700px]:grid-cols-2">
      {items.map(item => (
        <div key={item.k} className="min-w-0">
          <div className="m2-lbl">{item.k}</div>
          <div className="m2-num text-[17px] font-bold">{item.v}</div>
          {item.d ? <div className="text-[11.5px] text-m2-muted">{item.d}</div> : null}
        </div>
      ))}
    </div>
  );
}

type PoolBodyPropsT = {
  isPending: boolean;
  error: unknown;
  onRetry: () => void;
  isRetrying: boolean;
  lots: PlatformLotT[];
  isEmptyPool: boolean;
  children: ReactNode;
};

function PoolBody({
  isPending,
  error,
  onRetry,
  isRetrying,
  lots,
  isEmptyPool,
  children,
}: PoolBodyPropsT) {
  if (error) {
    return (
      <QueryError error={error} subject="출하 목록을" onRetry={onRetry} isRetrying={isRetrying} />
    );
  }
  if (isPending) return <Skeleton className="h-72 rounded-[14px]" />;
  if (isEmptyPool) {
    return (
      <EmptyState
        title="아직 등록된 출하가 없습니다"
        description="화주가 출하 5개 항목을 등록하면 여기에 모입니다."
      />
    );
  }
  if (lots.length === 0) return <EmptyState compact title="이 상태의 출하가 없습니다" />;

  return <div className="-mx-2.5 overflow-x-auto px-2.5">{children}</div>;
}
