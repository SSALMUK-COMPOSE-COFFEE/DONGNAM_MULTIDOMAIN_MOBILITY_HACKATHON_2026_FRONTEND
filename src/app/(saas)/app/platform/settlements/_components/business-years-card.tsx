'use client';

import { cn } from 'cn';
import { type ReactNode, useState } from 'react';

import { useBusinessYears } from '@/apis/saas/platform-metrics';
import {
  AssumptionBadge,
  SourceLine,
} from '@/app/(saas)/app/platform/_components/kpi/assumption-badge';
import {
  countText,
  isAssumed,
  shareText,
  signedWon,
} from '@/app/(saas)/app/platform/_components/kpi/metric-format';
import { won } from '@/app/(saas)/app/platform/_components/m2-format';
import { QueryError } from '@/app/(saas)/app/platform/_components/query-error';
import { SegTabs } from '@/app/(saas)/app/platform/_components/seg-tabs';
import { Skeleton } from '@/components/ui/skeleton';
import type { BusinessYearLineT, BusinessYearsT } from '@/types/saas-platform';

type FixedLevelT = BusinessYearLineT['fixed_level'];
type FeeModeT = BusinessYearLineT['base_fee_mode'];

const FEE_MODE_OPTIONS: { value: FeeModeT; label: string }[] = [
  { value: 'deducted', label: '차감형' },
  { value: 'additive', label: '가산형' },
];

const pickLine = (data: BusinessYearsT, fixed: FixedLevelT, mode: FeeModeT) =>
  data.lines.find(
    line => line.forwarder_share === 0 && line.fixed_level === fixed && line.base_fee_mode === mode
  ) ??
  data.lines.find(line => line.fixed_level === fixed && line.base_fee_mode === mode) ??
  null;

const yearText = (year: number | null) => (year === null ? '기간 안에 없음' : `${year}년 차`);

const netClass = (value: number) => (value < 0 ? 'text-m2-crit' : 'text-m2-ok-ink');

function YearsTable({ line }: { line: BusinessYearLineT }) {
  return (
    <div className="-mx-2.5 overflow-x-auto px-2.5">
      <table className="m2-table">
        <thead>
          <tr>
            <th>연차 · 단계</th>
            <th className="r">파렛트</th>
            <th className="r">매출</th>
            <th className="r">포워더 몫</th>
            <th className="r">고정비</th>
            <th className="r">지원금</th>
            <th className="r">순이익(지원 전 → 후)</th>
            <th className="r">누적(지원 후)</th>
          </tr>
        </thead>
        <tbody>
          {line.rows.map(row => (
            <tr key={row.year}>
              <td className="min-w-[180px]">
                <div className="font-semibold text-m2-ink">{row.year}년 차</div>
                <div className="text-[11.5px] leading-[1.4] text-m2-muted">
                  {row.stage.replace(/\(D13에 따라 /g, '(')}
                </div>
              </td>
              <td className="r m2-num">{countText(row.pallets)}</td>
              <td className="r m2-num">
                <div>{won(row.revenue)}</div>
                <div className="text-[11px] text-m2-muted">
                  성과보수 {won(row.performance_fee)} · 이용료 {won(row.usage_fee)}
                </div>
                {row.excluded_upside > 0 ? (
                  <div className="text-[11px] text-m2-muted">
                    확장 시 +{won(row.excluded_upside)}(매출 제외)
                  </div>
                ) : null}
              </td>
              <td className="r m2-num">{signedWon(-row.forwarder_cost)}</td>
              <td className="r m2-num">{signedWon(-row.fixed_cost)}</td>
              <td className="r m2-num">{won(row.subsidy)}</td>
              <td className="r m2-num">
                <span className={netClass(row.net_before_subsidy)}>
                  {signedWon(row.net_before_subsidy)}
                </span>
                <span className="text-m2-faint"> → </span>
                <span className={netClass(row.net_after_subsidy)}>
                  {signedWon(row.net_after_subsidy)}
                </span>
              </td>
              <td className={cn('r m2-num', netClass(row.cumulative_after_subsidy))}>
                {signedWon(row.cumulative_after_subsidy)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function YearsBody({ data }: { data: BusinessYearsT }) {
  const [fixed, setFixed] = useState<FixedLevelT>('full');
  const [mode, setMode] = useState<FeeModeT>('deducted');
  const line = pickLine(data, fixed, mode);
  const fixedLevel = data.fixed_levels.find(level => level.key === fixed) ?? null;
  const fixedOptions = data.fixed_levels.map(level => ({ value: level.key, label: level.label }));
  const volumeSources = [...new Set(data.volumes.map(volume => volume.source))];
  const subsidySources = [...new Set(data.subsidies.map(subsidy => subsidy.source))];

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {fixedOptions.length > 1 ? (
          <SegTabs label="고정비 기준" value={fixed} options={fixedOptions} onChange={setFixed} />
        ) : null}
        <SegTabs
          label="기본 이용료 방식"
          value={mode}
          options={FEE_MODE_OPTIONS}
          onChange={setMode}
        />
      </div>

      {line ? (
        <>
          <div className="m2-kv mb-3">
            <span>포워더 성과보수 배분 {shareText(line.forwarder_share)} · 운임은 별도 청구</span>
            <span>
              손익분기 {yearText(line.breakeven_year_before_subsidy)}(지원금 후{' '}
              {yearText(line.breakeven_year_after_subsidy)})
            </span>
            <span>
              누적 회수 {yearText(line.payback_year_before_subsidy)}(지원금 후{' '}
              {yearText(line.payback_year_after_subsidy)})
            </span>
          </div>
          <YearsTable line={line} />
        </>
      ) : (
        <p className="m2-sub">이 조합의 연차 손익이 없습니다.</p>
      )}

      <details className="mt-4 flex flex-col gap-1.5">
        <summary className="cursor-pointer font-semibold">계산 가정과 근거</summary>
        <SourceLine
          source={`과금: 성과보수 ${shareText(data.fee_rate)}, 파렛트 이용료 ${won(data.base_fee_per_pallet)}(${data.base_fee_from_year}년 차부터 전 품목)`}
        />
        {fixedLevel ? (
          <SourceLine
            assumed={isAssumed(fixedLevel.source)}
            source={`${fixedLevel.label} 연 ${won(fixedLevel.annual_cost)} — ${fixedLevel.source}`}
          />
        ) : null}
        <SourceLine assumed={isAssumed(data.savings_source)} source={data.savings_source} />
        {volumeSources.map(source => (
          <SourceLine key={source} assumed={isAssumed(source)} source={`물량: ${source}`} />
        ))}
        {subsidySources.map(source => (
          <SourceLine key={source} assumed={isAssumed(source)} source={`지원금: ${source}`} />
        ))}
        <SourceLine source={data.excluded_upside_source} />
        {data.rules.length > 0 ? (
          <details className="mt-1 text-[11.5px] text-m2-muted">
            <summary className="cursor-pointer font-semibold text-m2-ink-2">계산 규칙</summary>
            <ul className="mt-1 list-disc pl-4 leading-[1.5]">
              {data.rules.map(rule => (
                <li key={rule}>{rule.replace(/D13: /g, '')}</li>
              ))}
            </ul>
          </details>
        ) : null}
      </details>
    </>
  );
}

function YearsShell({ children }: { children: ReactNode }) {
  return (
    <section className="m2-card" aria-labelledby="business-years-title">
      <div className="m2-card-h">
        <h2 id="business-years-title" className="m2-h2">
          연도별 손익 전망
        </h2>
        <AssumptionBadge />
      </div>
      {children}
    </section>
  );
}

export function BusinessYearsCard() {
  const { data, isPending, isError, error, refetch, isFetching } = useBusinessYears();

  if (isError) {
    return (
      <YearsShell>
        <QueryError
          error={error}
          subject="연차별 손익을"
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      </YearsShell>
    );
  }
  if (isPending) {
    return (
      <YearsShell>
        <Skeleton className="h-72 rounded-[14px]" />
      </YearsShell>
    );
  }

  return (
    <YearsShell>
      <YearsBody data={data} />
    </YearsShell>
  );
}
