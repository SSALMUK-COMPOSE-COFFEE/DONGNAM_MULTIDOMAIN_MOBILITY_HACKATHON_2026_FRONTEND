'use client';

import { cn } from 'cn';

import { useBusinessYears } from '@/apis/saas/platform-metrics';
import { type BillingRuleT, billingFieldsOf } from '@/app/(saas)/app/platform/_components/billing';
import { won } from '@/app/(saas)/app/platform/_components/m2-format';
import { Skeleton } from '@/components/ui/skeleton';
import type { BusinessYearLineT, BusinessYearsT, PlatformSettlementT } from '@/types/saas-platform';
import { formatKstMonthDayTime } from '@/utils/kst';
import { NO_VESSEL_LABEL } from '@/utils/plan-label';

type StageT = { stage: string; from: number; to: number };

export const baselineYearLine = (data: BusinessYearsT): BusinessYearLineT | null =>
  data.lines.find(
    line =>
      line.forwarder_share === 0 && line.base_fee_mode === 'deducted' && line.fixed_level === 'full'
  ) ??
  data.lines[0] ??
  null;

const stagesOf = (line: BusinessYearLineT | null): StageT[] => {
  if (!line) return [];

  return line.rows.reduce<StageT[]>((stages, row) => {
    const last = stages.at(-1);
    if (last && last.stage === row.stage) {
      return [...stages.slice(0, -1), { ...last, to: row.year }];
    }
    return [...stages, { stage: row.stage, from: row.year, to: row.year }];
  }, []);
};

const yearRange = ({ from, to }: StageT) => (from === to ? `${from}년 차` : `${from}~${to}년 차`);

function StageTrack() {
  const { data, isPending, isError } = useBusinessYears();

  if (isPending) return <Skeleton className="h-14 rounded-[14px]" />;
  if (isError) {
    return <p className="text-[12px] text-m2-muted">BM 단계 정보를 불러오지 못했습니다.</p>;
  }

  const stages = stagesOf(baselineYearLine(data));
  if (stages.length === 0) return null;

  return (
    <ol className="grid gap-2 min-[700px]:grid-cols-3" aria-label="BM 단계">
      {stages.map(stage => (
        <li
          key={stage.stage}
          className="rounded-[12px] bg-[rgba(15,27,51,0.035)] px-3 py-2 text-m2-ink-2"
        >
          <div className="text-[11.5px] font-semibold">{yearRange(stage)}</div>
          <div className="mt-0.5 text-[12px] leading-[1.45]">{stage.stage}</div>
        </li>
      ))}
    </ol>
  );
}

type MixRowT = {
  planId: string;
  vessel: string;
  departure: string;
  performance: number;
  usage: number;
  refund: number;
  fee: number;
  pilot: boolean;
};

const mixRowOf = (row: PlatformSettlementT): MixRowT => {
  const billing = billingFieldsOf(row);

  return {
    planId: row.plan_id,
    vessel: row.vessel ?? NO_VESSEL_LABEL,
    departure: formatKstMonthDayTime(row.departure),
    performance: billing.performanceFee ?? 0,
    usage: billing.usageFee ?? 0,
    refund: row.quality_refund_krw,
    fee: row.platform_fee_krw,
    pilot: billing.pilot,
  };
};

type RevenueMixCardPropsT = {
  rows: PlatformSettlementT[];
  labelOf: (rule: BillingRuleT | null) => string | null;
};

export function RevenueMixCard({ rows, labelOf }: RevenueMixCardPropsT) {
  const mix = rows.map(mixRowOf);
  const performanceLabel = labelOf('performance') ?? '성과보수';
  const usageLabel = labelOf('usage_fee') ?? '파렛트 이용료';
  const charged = mix.filter(row => !row.pilot);
  const totalPerformance = charged.reduce((sum, row) => sum + row.performance, 0);
  const totalUsage = charged.reduce((sum, row) => sum + row.usage, 0);
  const totalRefund = charged.reduce((sum, row) => sum + row.refund, 0);
  const scale = Math.max(1, ...mix.map(row => row.performance + row.usage));

  return (
    <section className="m2-card" aria-labelledby="revenue-mix-title">
      <div className="m2-card-h">
        <h2 id="revenue-mix-title" className="m2-h2">
          수익 구성
        </h2>
        <span className="m2-chip">항차별 · 전체 계획</span>
      </div>

      <StageTrack />

      <div className="m2-kv mt-4">
        <span>
          <i className="m2-sq text-m2-brand" aria-hidden="true" />
          {performanceLabel}
        </span>
        <span>
          <i className="m2-sq text-m2-grape" aria-hidden="true" />
          {usageLabel}
        </span>
      </div>

      <ul className="mt-2 flex flex-col gap-2.5">
        {mix.map(row => {
          const gross = row.performance + row.usage;
          return (
            <li key={row.planId} className="min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-[12.5px]">
                <span className="min-w-0 truncate font-semibold text-m2-ink">
                  {row.vessel}
                  <span className="m2-num ml-1.5 font-normal text-m2-muted">{row.departure}</span>
                </span>
                {row.pilot ? (
                  <span className="m2-num text-m2-muted">
                    <s>{won(gross)}</s>
                    <span className="ml-1.5 font-semibold text-m2-ok-ink">면제</span>
                  </span>
                ) : (
                  <span className="m2-num font-semibold">{won(row.fee)}</span>
                )}
              </div>
              <div
                className="mt-1 flex h-2 overflow-hidden rounded-full bg-[rgba(15,27,51,0.06)]"
                role="img"
                aria-label={`${performanceLabel} ${won(row.performance)}, ${usageLabel} ${won(row.usage)}${row.pilot ? ', 시범 항차 면제' : ''}`}
              >
                <div
                  className={cn('h-full', row.pilot ? 'bg-m2-faint opacity-40' : 'bg-m2-brand')}
                  style={{ width: `${(row.performance / scale) * 100}%` }}
                />
                <div
                  className={cn('h-full', row.pilot ? 'bg-m2-faint opacity-25' : 'bg-m2-grape')}
                  style={{ width: `${(row.usage / scale) * 100}%` }}
                />
              </div>
              <div className="m2-num mt-1 flex flex-wrap gap-x-3 text-[11.5px] text-m2-muted">
                <span>성과보수 {won(row.performance)}</span>
                <span>이용료 {won(row.usage)}</span>
                {row.refund > 0 && !row.pilot ? <span>품질 환급 −{won(row.refund)}</span> : null}
                {row.pilot ? <span className="text-m2-ok-ink">시범 항차 면제</span> : null}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="m2-lines">
        <div>
          <span>성과보수 합계 · 시범 항차 제외</span>
          <b>{won(totalPerformance)}</b>
        </div>
        <div>
          <span>파렛트 이용료 합계 · 시범 항차 제외</span>
          <b>{won(totalUsage)}</b>
        </div>
        {totalRefund > 0 ? (
          <div>
            <span>품질 환급 합계</span>
            <b>−{won(totalRefund)}</b>
          </div>
        ) : null}
      </div>
    </section>
  );
}
