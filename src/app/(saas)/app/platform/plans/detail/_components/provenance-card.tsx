'use client';

import { cn } from 'cn';
import { useState } from 'react';

import { useProvenance, useVesselsCongestion } from '@/apis/saas/platform-analysis';
import { EmptyState } from '@/app/(saas)/app/platform/_components/empty-state';
import { so2Text } from '@/app/(saas)/app/platform/_components/m2-format';
import { QueryError } from '@/app/(saas)/app/platform/_components/query-error';
import { SegTabs } from '@/app/(saas)/app/platform/_components/seg-tabs';
import { Skeleton } from '@/components/ui/skeleton';
import type {
  PortCongestionT,
  ProvenanceAssetT,
  ProvenanceCatalogT,
  ProvenanceEntryT,
} from '@/types/saas-analysis';
import { formatKstMonthDayTime } from '@/utils/kst';

type ScopeT = 'cost' | 'scenario';
type KindFilterT = string;

const KIND_LABEL: Record<string, string> = {
  cited_unverified: '출처 인용',
  demo_or_business_rule: '제안서·사업 규칙',
  assumption_or_derived: '가정·추정',
  missing: '출처 없음',
};

const KIND_TONE: Record<string, string> = {
  cited_unverified: 'm2-chip-brand',
  demo_or_business_rule: 'm2-chip-navy',
  assumption_or_derived: 'm2-chip-warn',
  missing: 'm2-chip-berry',
};

const SCOPE_OPTIONS: { value: ScopeT; label: string }[] = [
  { value: 'cost', label: '비용·손실 값' },
  { value: 'scenario', label: '시나리오 입력' },
];

const COST_PREFIX = 'scenario.cost_params.';

const MOF_HISTORY = 'history/mof-busan-departures.json';
const MOF_SNAPSHOT_PREFIX = 'snapshots/mof/';

const kindLabel = (kind: string) => KIND_LABEL[kind] ?? kind;

const pathLabel = (path: string) =>
  path.startsWith(COST_PREFIX) ? path.slice(COST_PREFIX.length) : path.replace(/^scenario\./, '');

const FIELD_LABEL: Record<string, string> = {
  sea_freight_per_container_krw: '해상 운임(컨테이너당)',
  sea_ancillary_per_container_krw: '해상 부대비(컨테이너당)',
  air_freight_per_kg_krw: '항공 운임(kg당)',
  air_fuel_surcharge_per_kg_krw: '항공 유류할증료(kg당)',
  reefer_truck_cost_per_km_krw: '냉장트럭 운행비(km당)',
  reefer_truck_fixed_per_route_krw: '냉장트럭 고정비(경로당)',
  truck_capacity_pallets: '트럭 적재 용량',
  road_distance_factor: '도로 거리 보정 계수',
  air_trucking_km: '공항까지 육송 거리',
  storage_per_pallet_day_krw: '보관비(파렛트·일)',
  terminal_reefer_plug_per_container_day: '터미널 리퍼 전원비(컨테이너·일)',
  air_storage_days: '항공 보관 일수',
  air_transit_days: '항공 운송 일수',
  unassigned_penalty_per_pallet_krw: '미배정 벌점(파렛트당)',
  platform_fee_rate: '플랫폼 수수료율',
  usage_fee_per_pallet_krw: '파렛트 이용료',
  air_loss_rate: '항공 손실률',
  early_harvest_loss_rate_per_day: '조기 수확 손실률(일당)',
  loss_rate_per_wait_day: '대기 손실률(일당)',
  max_sea_loss_rate: '해상 최대 손실률',
  sea_base_loss_rate: '해상 기본 손실률',
  value_per_kg_krw: '품목 가치(kg당)',
  air_freight: '항공 운임',
  air_inland: '항공 내륙 운송',
  air_loss_risk: '항공 손실 위험',
  air_rate_basis_per_kg: '항공 운임 기준(kg당)',
  sea_freight: '해상 운임',
  sea_inland: '해상 내륙 운송',
  sea_loss_risk: '해상 손실 위험',
  sea_loss_risk_short_window: '해상 손실 위험(짧은 판매기간)',
  gate_peak_windows: '게이트 혼잡 시간대',
};

const COLLECTION_LABEL: Record<string, string> = {
  containers: '컨테이너',
  lots: '출하',
  packhouses: '출하 장소',
  ports: '항구',
  products: '품목',
  shippers: '화주',
  trucks: '냉장트럭',
  voyages: '항차',
};

const PRODUCT_LABEL: Record<string, string> = {
  strawberry: '딸기',
  grape_so2: 'SO₂ 포도',
};

const GROUP_LABEL: Record<string, (id: string) => string> = {
  product_costs: id => PRODUCT_LABEL[id] ?? id,
  pallet_tariffs: id => `${PRODUCT_LABEL[id] ?? id} 파렛트당`,
};

const GROUP_FIXED_LABEL: Record<string, string> = {
  default_product_cost: '기본 품목',
  billing: '',
};

const costLabel = (key: string) => {
  const parts = key.split('.');
  const field = parts.at(-1) ?? key;
  const fieldLabel = FIELD_LABEL[field];
  if (!fieldLabel) return null;
  const [group, id] = parts;
  const groupLabel = GROUP_LABEL[group];
  if (parts.length === 3 && groupLabel && id) return `${groupLabel(id)} ${fieldLabel}`;
  if (parts.length === 2 && group in GROUP_FIXED_LABEL) {
    return [GROUP_FIXED_LABEL[group], fieldLabel].filter(Boolean).join(' ');
  }

  return parts.length === 1 ? fieldLabel : null;
};

const scenarioLabel = (key: string) => {
  const match = /^([a-z_]+)\[[^\]]*\](?:\.([a-z_]+)\[[^\]]*\])?$/.exec(key);
  if (!match) return null;
  const collection = COLLECTION_LABEL[match[1]];
  if (!collection) return null;
  if (!match[2]) return collection;
  const child = FIELD_LABEL[match[2]];

  return child ? `${collection} ${child}` : null;
};

const entryLabel = (path: string) => {
  const key = pathLabel(path);
  const label = path.startsWith(COST_PREFIX) ? costLabel(key) : scenarioLabel(key);

  return { key, label };
};

const valueText = ({ values }: ProvenanceEntryT) => {
  const { value, unit, name } = values;
  if (typeof value === 'number') {
    const unitText = typeof unit === 'string' ? ` ${unit}` : '';
    return `${value.toLocaleString('ko-KR')}${unitText}`;
  }
  if (typeof name === 'string') return so2Text(name);

  return '';
};

const recordedDatesOf = (entry: ProvenanceEntryT) => {
  const { recorded_dates: dates } = entry as ProvenanceEntryT & { recorded_dates?: unknown };

  return Array.isArray(dates) ? dates.filter(date => typeof date === 'string') : [];
};

const metaString = (asset: ProvenanceAssetT | null, key: string) => {
  const value = asset?.metadata[key];

  return typeof value === 'string' ? value : null;
};

const metaNumber = (asset: ProvenanceAssetT | null, key: string) => {
  const value = asset?.metadata[key];

  return typeof value === 'number' ? value : null;
};

export function ProvenanceCard() {
  const { data, isPending, isError, error, refetch, isFetching } = useProvenance();

  return (
    <section className="m2-card" aria-busy={isPending}>
      <div className="m2-card-h">
        <div>
          <h2 className="m2-h2">데이터 출처</h2>
          <p className="m2-sub">
            계산에 쓴 값마다 실데이터 인용인지 가정인지, 어디서 왔는지 보여 줍니다.
          </p>
        </div>
      </div>
      <ExternalSources assets={data?.assets ?? []} isPending={isPending} />
      {isPending ? <Skeleton className="mt-4 h-64 rounded-[14px]" /> : null}
      {isError ? (
        <div className="mt-4">
          <QueryError
            error={error}
            subject="데이터 출처를"
            onRetry={() => refetch()}
            isRetrying={isFetching}
          />
        </div>
      ) : null}
      {data ? <EntryList catalog={data} /> : null}
    </section>
  );
}

function ExternalSources({
  assets,
  isPending,
}: {
  assets: ProvenanceAssetT[];
  isPending: boolean;
}) {
  const congestion = useVesselsCongestion(false);
  const mofHistory = assets.find(({ path }) => path === MOF_HISTORY) ?? null;
  const mofSnapshots = assets.filter(({ path }) => path.startsWith(MOF_SNAPSHOT_PREFIX));
  const latestMof =
    mofSnapshots
      .map(asset => metaString(asset, 'fetched_at'))
      .filter(at => at !== null)
      .sort()
      .at(-1) ?? null;

  return (
    <div className="grid grid-cols-1 gap-3 min-[900px]:grid-cols-2">
      <div className="m2-block">
        <div className="flex items-center justify-between gap-2">
          <span className="m2-h3">해수부 부산항 입출항</span>
          {mofHistory || mofSnapshots.length > 0 ? (
            <span className="m2-chip m2-chip-warn">스냅샷</span>
          ) : null}
        </div>
        {isPending ? <Skeleton className="mt-2 h-12 rounded-[10px]" /> : null}
        {!isPending && !mofHistory && mofSnapshots.length === 0 ? (
          <p className="m2-sub">저장된 해수부 자료가 없습니다.</p>
        ) : null}
        {mofHistory || mofSnapshots.length > 0 ? (
          <div className="m2-lines">
            {mofHistory ? (
              <div>
                <span>출항 지연 이력</span>
                <b>
                  {metaString(mofHistory, 'start')} ~ {metaString(mofHistory, 'end')} ·{' '}
                  {(metaNumber(mofHistory, 'count') ?? 0).toLocaleString('ko-KR')}건
                </b>
              </div>
            ) : null}
            {mofHistory ? (
              <div>
                <span>이력 갱신</span>
                <b>{formatKstMonthDayTime(metaString(mofHistory, 'updated_at'))}</b>
              </div>
            ) : null}
            {mofSnapshots.length > 0 ? (
              <div>
                <span>일자별 스냅샷</span>
                <b>
                  {mofSnapshots.length}개 · 최근 {formatKstMonthDayTime(latestMof)}
                </b>
              </div>
            ) : null}
          </div>
        ) : null}
        {metaString(mofHistory, 'source') ? (
          <p className="mt-2 text-[11.5px] leading-snug text-m2-muted">
            {metaString(mofHistory, 'source')}
          </p>
        ) : null}
      </div>
      <UlsanBlock
        congestion={congestion.data ?? null}
        isPending={congestion.isPending}
        isError={congestion.isError}
      />
    </div>
  );
}

function UlsanBlock({
  congestion,
  isPending,
  isError,
}: {
  congestion: PortCongestionT | null;
  isPending: boolean;
  isError: boolean;
}) {
  const isLive = congestion?.source === 'live';

  return (
    <div className="m2-block">
      <div className="flex items-center justify-between gap-2">
        <span className="m2-h3">울산항 혼잡</span>
        {congestion ? (
          <span className={cn('m2-chip', isLive ? 'm2-chip-ok' : 'm2-chip-warn')}>
            {isLive ? '실시간' : '스냅샷'}
          </span>
        ) : null}
      </div>
      {isPending ? <Skeleton className="mt-2 h-12 rounded-[10px]" /> : null}
      {isError ? <p className="m2-sub">울산항 혼잡 자료를 불러오지 못했습니다.</p> : null}
      {congestion ? (
        <>
          <div className="m2-lines">
            <div>
              <span>대기 비율</span>
              <b>
                {(congestion.waiting_ratio * 100).toFixed(0)}% · 대기 {congestion.counts.waiting}척
                · 접안 {congestion.counts.berthed}척
              </b>
            </div>
            <div>
              <span>받은 시각</span>
              <b>{formatKstMonthDayTime(congestion.fetched_at)}</b>
            </div>
            {congestion.observed_until ? (
              <div>
                <span>관측 기준</span>
                <b>{formatKstMonthDayTime(congestion.observed_until)}</b>
              </div>
            ) : null}
          </div>
          <p className="mt-2 text-[11.5px] leading-snug text-m2-muted">
            {congestion.dataset} · 부산신항 지연의 대리 지표(가정)
            {congestion.fallback_reason ? ` · ${congestion.fallback_reason}` : ''}
          </p>
        </>
      ) : null}
    </div>
  );
}

function EntryList({ catalog }: { catalog: ProvenanceCatalogT }) {
  const [scope, setScope] = useState<ScopeT>('cost');
  const [kind, setKind] = useState<KindFilterT>('all');
  const scoped = catalog.entries.filter(({ path }) =>
    scope === 'cost' ? path.startsWith(COST_PREFIX) : !path.startsWith(COST_PREFIX)
  );
  const kinds = [...new Set(scoped.map(entry => entry.kind))];
  const activeKind = kinds.includes(kind) ? kind : 'all';
  const rows = activeKind === 'all' ? scoped : scoped.filter(entry => entry.kind === activeKind);

  return (
    <div className="mt-4">
      <div className="m2-kv m2-num mb-3 text-[12px]">
        {Object.entries(catalog.counts).map(([key, count]) => (
          <span key={key}>
            <span className={cn('m2-chip', KIND_TONE[key] ?? '')}>{kindLabel(key)}</span>
            {count}개
          </span>
        ))}
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SegTabs<ScopeT>
          label="값 범위"
          value={scope}
          onChange={setScope}
          options={SCOPE_OPTIONS}
        />
        {kinds.length > 1 ? (
          <SegTabs<KindFilterT>
            label="출처 종류"
            value={activeKind}
            onChange={setKind}
            options={[
              { value: 'all', label: '전체' },
              ...kinds.map(value => ({ value, label: kindLabel(value) })),
            ]}
          />
        ) : null}
      </div>
      {rows.length === 0 ? (
        <EmptyState compact title="이 범위에 기록된 출처가 없습니다" />
      ) : (
        <div className="-mx-2.5 max-h-[420px] overflow-auto px-2.5">
          <table className="m2-table">
            <thead>
              <tr>
                <th>값</th>
                <th>구분</th>
                <th>출처</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(entry => {
                const dates = recordedDatesOf(entry);
                const { key, label } = entryLabel(entry.path);
                return (
                  <tr key={entry.path}>
                    <td className="whitespace-normal">
                      <div className="m2-who">
                        {label ? (
                          <>
                            <span className="block text-[12.5px] whitespace-normal">{label}</span>
                            <small className="m2-mono break-all whitespace-normal">{key}</small>
                          </>
                        ) : (
                          <span className="m2-mono text-[12px] break-all">{key}</span>
                        )}
                        <small className="m2-num">{valueText(entry)}</small>
                      </div>
                    </td>
                    <td>
                      <span className={cn('m2-chip', KIND_TONE[entry.kind] ?? '')}>
                        {kindLabel(entry.kind)}
                      </span>
                    </td>
                    <td className="min-w-[240px] text-[12px] leading-snug whitespace-normal">
                      {so2Text(entry.recorded_source) || '–'}
                      {dates.length > 0 ? (
                        <span className="mt-0.5 block text-[11.5px] text-m2-muted">
                          기준일 {dates.join(' · ')}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-2 text-[11.5px] leading-snug text-m2-muted">
        모든 값은 저장소에 기록된 출처이며 외부에서 다시 검증한 값이 아닙니다.
      </p>
    </div>
  );
}
