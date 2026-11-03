'use client';

import { cn } from 'cn';
import type { ReactNode } from 'react';

import { usePlatformMetrics } from '@/apis/saas/platform-metrics';
import { EmptyState } from '@/app/(saas)/app/platform/_components/empty-state';
import { AssumptionBadge } from '@/app/(saas)/app/platform/_components/kpi/assumption-badge';
import {
  EMPTY_VALUE,
  FILL_TARGET,
  countText,
  isAssumed,
  metricRatioText,
  percentText,
} from '@/app/(saas)/app/platform/_components/kpi/metric-format';
import { wonNumber } from '@/app/(saas)/app/platform/_components/m2-format';
import { QueryError } from '@/app/(saas)/app/platform/_components/query-error';
import { Skeleton } from '@/components/ui/skeleton';
import type { PlatformMetricT, PlatformMetricsT } from '@/types/saas-platform';

const TILE_COUNT = 6;
const GRID =
  'grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 min-[768px]:grid-cols-3 min-[1300px]:grid-cols-6';

const RAW_KEY = /\s*\((?:committed|[a-z]+(?:_[a-z]+)+)\)/g;
const STATUS_PHRASES: readonly (readonly [string, string])[] = [
  ['화주 확인 대기(pending_confirmation)', '변경 확정 대기'],
];
const definitionTextOf = (definition: string) =>
  STATUS_PHRASES.reduce((text, [from, to]) => text.replaceAll(from, to), definition).replace(
    RAW_KEY,
    ''
  );

type KpiTilePropsT = {
  label: string;
  value: ReactNode;
  unit?: string;
  basis: ReactNode;
  definition: string;
  tone?: 'ok' | 'warn' | 'muted' | null;
  assumed?: boolean;
  children?: ReactNode;
};

function KpiTile({
  label,
  value,
  unit,
  basis,
  definition,
  tone,
  assumed = false,
  children,
}: KpiTilePropsT) {
  const definitionText = definitionTextOf(definition);

  return (
    <div className="m2-card flex min-w-0 flex-col gap-1 p-4" title={definitionText}>
      <dt className="m2-lbl flex items-center gap-1.5">
        {label}
        {assumed ? <AssumptionBadge /> : null}
      </dt>
      <dd
        className={cn(
          'm2-num text-[22px] leading-[1.2] font-bold break-words text-m2-ink',
          tone === 'ok' && 'text-m2-ok-ink',
          tone === 'warn' && 'text-m2-warn-ink',
          tone === 'muted' && 'text-m2-faint'
        )}
      >
        {value}
        {unit ? <small className="ml-0.5 text-[13px] font-semibold">{unit}</small> : null}
      </dd>
      {children ? <dd>{children}</dd> : null}
      <dd className="m2-num text-[11.5px] leading-[1.45] text-m2-muted">{basis}</dd>
      <dd className="sr-only">{definitionText}</dd>
    </div>
  );
}

const rateTile = (label: string, metric: PlatformMetricT, unit: string) => {
  const ratio = metricRatioText(metric, unit);
  const isEmpty = metric.value === null;

  return (
    <KpiTile
      key={label}
      label={label}
      value={percentText(metric.value)}
      basis={isEmpty ? (metric.reason ?? '아직 집계할 기록이 없습니다') : ratio}
      definition={metric.definition}
      tone={isEmpty ? 'muted' : null}
    />
  );
};

function FillBar({ value }: { value: number | null }) {
  const width = value === null ? 0 : Math.min(1, Math.max(0, value)) * 100;

  return (
    <div className="relative mt-1 h-1.5 rounded-full bg-[rgba(15,27,51,0.07)]" aria-hidden="true">
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-200 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none',
          value !== null && value >= FILL_TARGET ? 'bg-m2-ok' : 'bg-m2-warn'
        )}
        style={{ width: `${width}%` }}
      />
      <div
        className="absolute -top-1 h-3.5 w-0.5 rounded bg-m2-ink"
        style={{ left: `${FILL_TARGET * 100}%` }}
      />
    </div>
  );
}

function KpiTiles({ data }: { data: PlatformMetricsT }) {
  const fill = data.average_fill;
  const replan = data.average_replan_ms;
  const fillRatio = metricRatioText(fill, '파렛트');
  const co2 = data.co2;
  const co2Basis = [
    `항공 대신 해상 ${countText(co2.air_avoided_pallets)}파렛트`,
    co2.skipped_pallets > 0 ? `제외 ${countText(co2.skipped_pallets)}파렛트` : '',
  ]
    .filter(Boolean)
    .join(' · ');
  const co2Assumed = isAssumed(co2.distance_source) || isAssumed(co2.factor_source);
  const fillTone = fill.value !== null && fill.value >= FILL_TARGET ? 'ok' : 'warn';

  return (
    <dl className={GRID}>
      <KpiTile
        label="이번 달 화주 절감"
        value={wonNumber(data.shipper_savings_krw)}
        unit="원"
        tone="ok"
        basis={`계획 ${countText(data.plan_count)}건 · 출하 ${countText(data.shipment_count)}건`}
        definition={data.month_basis}
      />
      <KpiTile
        label="평균 적재율"
        value={percentText(fill.value)}
        tone={fill.value === null ? 'muted' : fillTone}
        basis={[fillRatio, `목표 ${percentText(FILL_TARGET, 0)}`].filter(Boolean).join(' · ')}
        definition={fill.definition}
      >
        <FillBar value={fill.value} />
      </KpiTile>
      <KpiTile
        label="CO₂ 감축"
        value={co2.saved_t_co2.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}
        unit="t"
        basis={co2Basis}
        assumed={co2Assumed}
        definition={`${data.air_avoided_definition}. ${co2.factor_source}. ${co2.distance_source}`}
      >
        <details className="text-[11.5px] leading-[1.45] text-m2-muted">
          <summary className="cursor-pointer select-none">배출계수·거리 출처</summary>
          <p className="mt-1 break-words">{co2.factor_source}</p>
          <p className="mt-1 break-words">{co2.distance_source}</p>
        </details>
      </KpiTile>
      <KpiTile
        label="평균 재계산 시간"
        value={replan.value === null ? EMPTY_VALUE : countText(replan.value)}
        unit={replan.value === null ? '' : 'ms'}
        tone={replan.value === null ? 'muted' : null}
        basis={
          replan.value === null
            ? (replan.reason ?? '아직 적용한 재계산이 없습니다')
            : `적용 ${countText(replan.denominator)}건 평균`
        }
        definition={replan.definition}
      />
      {rateTile('실행 지시 확정률', data.order_confirmation_rate, '건')}
      {rateTile('화주 재이용률', data.shipper_reuse_rate, '곳')}
    </dl>
  );
}

function KpiShell({ basis, children }: { basis?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby="platform-kpi-title" className="mb-6">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="platform-kpi-title" className="m2-h2">
          이번 달 운영 지표
        </h2>
        {basis ? <span className="m2-num text-[12px] text-m2-muted">{basis}</span> : null}
      </div>
      {children}
    </section>
  );
}

export function PlatformKpiStrip() {
  const { data, isPending, isError, error, refetch, isFetching } = usePlatformMetrics();

  if (isError) {
    return (
      <KpiShell>
        <QueryError
          error={error}
          subject="운영 지표를"
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      </KpiShell>
    );
  }
  if (isPending) {
    return (
      <KpiShell>
        <div className={GRID}>
          {Array.from({ length: TILE_COUNT }, (_, index) => (
            <Skeleton key={index} className="h-[112px] rounded-[18px]" />
          ))}
        </div>
      </KpiShell>
    );
  }

  const basis = (
    <span title={data.month_basis}>
      {data.month} 기준 · 계획 {countText(data.plan_count)}건
    </span>
  );

  if (data.plan_count === 0) {
    return (
      <KpiShell basis={basis}>
        <EmptyState
          compact
          title="이번 달 계획이 아직 없습니다"
          description="공동적재 계획을 만들면 절감·적재율·CO₂ 감축이 여기에 쌓입니다."
        />
      </KpiShell>
    );
  }

  return (
    <KpiShell basis={basis}>
      <KpiTiles data={data} />
    </KpiShell>
  );
}
