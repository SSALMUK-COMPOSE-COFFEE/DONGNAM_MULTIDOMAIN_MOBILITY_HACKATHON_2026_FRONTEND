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
                return (
                  <tr key={entry.path}>
                    <td className="whitespace-normal">
                      <div className="m2-who">
                        <span className="m2-mono text-[12px] break-all">
                          {pathLabel(entry.path)}
                        </span>
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
