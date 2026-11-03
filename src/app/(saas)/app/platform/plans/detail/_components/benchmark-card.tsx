'use client';

import { cn } from 'cn';
import { useState } from 'react';

import { usePlatformBenchmark } from '@/apis/saas/platform-analysis';
import { EmptyState } from '@/app/(saas)/app/platform/_components/empty-state';
import { won } from '@/app/(saas)/app/platform/_components/m2-format';
import { QueryError } from '@/app/(saas)/app/platform/_components/query-error';
import { SegTabs } from '@/app/(saas)/app/platform/_components/seg-tabs';
import { Skeleton } from '@/components/ui/skeleton';
import type { BenchmarkResultT } from '@/types/saas-analysis';

type MethodT = BenchmarkResultT['methods'][number];

type BasisT = 'operational' | 'settlement';

const OPTIMIZER = 'optimizer';

const BASIS_OPTIONS: { value: BasisT; label: string }[] = [
  { value: 'operational', label: '운영비 기준' },
  { value: 'settlement', label: '정산 기준' },
];

const BASIS_NOTE: Record<BasisT, string> = {
  operational: '실제로 드는 운임·집하·보관·손실 비용을 단독 발송과 비교한 절감입니다.',
  settlement: '화주에게 청구하는 정산 단가로 단독 발송과 비교한 절감입니다.',
};

const COLLECTION_LABEL: Record<string, string> = {
  route: '집하비는 실제 집하 경로 기준',
};

const savingsOf = (method: MethodT, basis: BasisT) =>
  basis === 'operational' ? method.total_operational_savings : method.total_savings;

const baselineOf = (method: MethodT, basis: BasisT) =>
  basis === 'operational' ? method.total_operational_baseline_cost : method.total_baseline_cost;

const savingsRate = (method: MethodT, basis: BasisT) => {
  const baseline = baselineOf(method, basis);

  return baseline > 0 ? `${((savingsOf(method, basis) / baseline) * 100).toFixed(1)}%` : '';
};

const gapText = (method: MethodT, optimizer: MethodT | null, basis: BasisT) => {
  if (!optimizer || method.method === OPTIMIZER) return '';
  const gap = savingsOf(optimizer, basis) - savingsOf(method, basis);
  if (gap > 0) return `최적화보다 ${won(gap)} 덜 아낌`;
  if (gap < 0) return `최적화보다 ${won(-gap)} 더 아낌`;

  return '최적화와 같음';
};

export function BenchmarkCard({ planId }: { planId: string }) {
  const { data, isPending, isError, error, refetch, isFetching } = usePlatformBenchmark(planId);
  const [basis, setBasis] = useState<BasisT>('operational');

  return (
    <section className="m2-card" aria-busy={isPending}>
      <div className="m2-card-h">
        <div>
          <h2 className="m2-h2">같은 출하, 다른 방법</h2>
          <p className="m2-sub">
            이 계획의 출하를 최적화·선착순·건별 최저비용·화주 단독으로 각각 배정해 비교합니다.
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          {data ? (
            <span className="m2-chip m2-num">계산 {data.solve_ms.toLocaleString('ko-KR')}ms</span>
          ) : null}
          <SegTabs<BasisT>
            label="절감 기준"
            value={basis}
            onChange={setBasis}
            options={BASIS_OPTIONS}
          />
        </div>
      </div>
      {isPending ? <Skeleton className="h-72 rounded-[14px]" /> : null}
      {isError ? (
        <QueryError
          error={error}
          subject="방법 비교를"
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      ) : null}
      {data && data.methods.length === 0 ? (
        <EmptyState compact title="비교할 방법이 없습니다" />
      ) : null}
      {data && data.methods.length > 0 ? <BenchmarkBody result={data} basis={basis} /> : null}
    </section>
  );
}

function BenchmarkBody({ result, basis }: { result: BenchmarkResultT; basis: BasisT }) {
  const optimizer = result.methods.find(({ method }) => method === OPTIMIZER) ?? null;
  const maxSavings = Math.max(...result.methods.map(method => savingsOf(method, basis)), 0);
  const collectionLabels = [
    ...new Set(result.methods.map(({ collection_basis }) => collection_basis)),
  ].map(key => COLLECTION_LABEL[key] ?? key);

  return (
    <>
      <div className="m2-note mb-3">
        <span>
          <b>{BASIS_OPTIONS.find(({ value }) => value === basis)?.label}</b> · {BASIS_NOTE[basis]}{' '}
          {collectionLabels.join(' · ')}
        </span>
      </div>
      <div className="flex flex-col gap-2.5">
        {result.methods.map(method => (
          <MethodRow
            key={method.method}
            method={method}
            basis={basis}
            ratio={maxSavings > 0 ? Math.max(savingsOf(method, basis), 0) / maxSavings : 0}
            gap={gapText(method, optimizer, basis)}
          />
        ))}
      </div>
      {result.replan ? (
        <div className="m2-lines">
          <div>
            <span>재최적화 비교 · 수작업(그대로 출항) 대비 추천안</span>
            <b className="text-m2-ok-ink">{won(result.replan.improvement_vs_manual)} 절감</b>
          </div>
        </div>
      ) : null}
    </>
  );
}

function MethodRow({
  method,
  basis,
  ratio,
  gap,
}: {
  method: MethodT;
  basis: BasisT;
  ratio: number;
  gap: string;
}) {
  const isOptimizer = method.method === OPTIMIZER;
  const savings = savingsOf(method, basis);
  const fill = Math.min(Math.max(method.avg_fill, 0), 1);
  const facts = [
    `컨테이너 ${method.containers_used}대`,
    method.air_pallets > 0 ? `항공 ${method.air_pallets}파렛트` : '',
    method.unassigned_pallets > 0 ? `미배정 ${method.unassigned_pallets}파렛트` : '',
    method.shippers_with_loss > 0 ? `손해 화주 ${method.shippers_with_loss}곳` : '',
    method.constraint_violations > 0 ? `제약 위반 ${method.constraint_violations}건` : '',
    `${method.solve_ms.toLocaleString('ko-KR')}ms`,
  ].filter(Boolean);

  return (
    <div className={cn('m2-block', isOptimizer && 'shadow-[0_0_0_1.5px_var(--m2-brand)]')}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="m2-h3">{method.label}</span>
          {isOptimizer ? <span className="m2-chip m2-chip-brand">이 계획</span> : null}
        </div>
        <div className="m2-num text-right">
          <b className={cn('text-[15px]', savings > 0 ? 'text-m2-ok-ink' : 'text-m2-ink-2')}>
            {won(savings)}
          </b>
          <span className="ml-1.5 text-[12px] text-m2-muted">{savingsRate(method, basis)}</span>
        </div>
      </div>
      <p className="m2-sub mt-1 text-[12px]">{method.description}</p>
      <div className="mt-2.5 grid grid-cols-[60px_minmax(0,1fr)_56px] items-center gap-x-2.5 gap-y-1.5 text-[12px]">
        <span className="text-m2-muted">최고 대비</span>
        <div className="m2-cmp-track">
          <div
            className="m2-cmp-bar"
            style={{ width: `${ratio * 100}%`, background: isOptimizer ? '#0f8a66' : '#b9c1cd' }}
          />
        </div>
        <span className="m2-num text-right font-semibold">{`${Math.round(ratio * 100)}%`}</span>
        <span className="text-m2-muted">적재율</span>
        <div className="m2-cmp-track">
          <div
            className="m2-cmp-bar"
            style={{ width: `${fill * 100}%`, background: isOptimizer ? '#1a7bff' : '#b9c1cd' }}
          />
        </div>
        <span className="m2-num text-right font-semibold">{`${(fill * 100).toFixed(1)}%`}</span>
      </div>
      <div className="m2-kv m2-num mt-2">
        {facts.map(fact => (
          <span key={fact}>{fact}</span>
        ))}
        {gap ? <span className="font-semibold text-m2-ink-2">{gap}</span> : null}
      </div>
      {method.violation_details.length > 0 ? (
        <p className="mt-1.5 text-[11.5px] leading-snug text-m2-warn-ink">
          {method.violation_details.slice(0, 3).join(' · ')}
        </p>
      ) : null}
    </div>
  );
}
