'use client';

import { cn } from 'cn';
import type { ReactNode } from 'react';

import { usePlatformBusiness } from '@/apis/saas/platform-metrics';
import { EmptyState } from '@/app/(saas)/app/platform/_components/empty-state';
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
import { QueryError } from '@/app/(saas)/app/platform/_components/query-error';
import { Skeleton } from '@/components/ui/skeleton';
import type { PlatformBusinessLineT, PlatformBusinessT } from '@/types/saas-platform';

const VOYAGES_PER_YEAR_KEY = 'voyages_per_year';
const FIXED_COST_KEY = 'ops_cost_per_voyage';

type AssumptionT = PlatformBusinessT['assumptions'][number];

const assumptionOf = (data: PlatformBusinessT, key: string): AssumptionT | null =>
  data.assumptions.find(item => item.key === key) ?? null;

const baselineLine = (data: PlatformBusinessT) =>
  data.lines.find(line => line.forwarder_share === 0) ?? data.lines[0] ?? null;

function PnlRow({
  label,
  value,
  strong = false,
  assumed = false,
  title,
}: {
  label: ReactNode;
  value: ReactNode;
  strong?: boolean;
  assumed?: boolean;
  title?: string;
}) {
  return (
    <div title={title} className={cn(strong && 'border-t border-m2-line pt-2 text-m2-ink')}>
      <span className="flex min-w-0 items-center gap-1.5">
        {label}
        {assumed ? <AssumptionBadge /> : null}
      </span>
      <b className={cn(strong && 'text-[13.5px]')}>{value}</b>
    </div>
  );
}

function BreakevenBar({ line }: { line: PlatformBusinessLineT }) {
  const perVoyage = line.voyage_count > 0 ? line.pallets / line.voyage_count : 0;
  const target = line.breakeven_pallets_per_voyage;

  if (target === null) {
    return (
      <p className="m2-sub">손익분기 파렛트를 계산할 수 없습니다(항차당 공헌이익이 0원 이하).</p>
    );
  }

  const ratio = target > 0 ? Math.min(1, perVoyage / target) : 1;
  const passed = perVoyage >= target;
  const remaining = line.remaining_pallets_per_voyage;
  const remainingText =
    remaining !== null && remaining > 0 ? ` · ${countText(remaining, 1)}파렛트 남음` : '';

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-[12.5px]">
        <span className="font-semibold text-m2-ink">손익분기 진행률</span>
        <span className="m2-num text-m2-muted">
          항차당 {countText(perVoyage, 1)} / {countText(target, 1)}파렛트
          {passed ? ' · 손익분기 넘김' : remainingText}
        </span>
      </div>
      <div
        className="mt-1.5 h-2 overflow-hidden rounded-full bg-[rgba(15,27,51,0.06)]"
        role="progressbar"
        aria-label="손익분기 진행률"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(ratio * 100)}
      >
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-200 ease-[cubic-bezier(.2,.8,.2,1)] motion-reduce:transition-none',
            ratio >= 1 ? 'bg-m2-ok' : 'bg-m2-brand'
          )}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}

function PnlBody({ data, line }: { data: PlatformBusinessT; line: PlatformBusinessLineT }) {
  const voyagesPerYear = assumptionOf(data, VOYAGES_PER_YEAR_KEY);
  const fixedCost = assumptionOf(data, FIXED_COST_KEY);
  const annualRevenue =
    voyagesPerYear && line.voyage_count > 0
      ? (line.fee_revenue / line.voyage_count) * voyagesPerYear.value
      : null;
  const sensitivities = data.lines.filter(item => item !== line);

  return (
    <>
      <p className="m2-sub mt-0">
        {data.month} · {countText(line.voyage_count)}항차 · {countText(line.pallets)}파렛트
      </p>

      <div className="m2-lines">
        <PnlRow label="플랫폼 매출(성과보수·이용료)" value={signedWon(line.fee_revenue)} />
        <PnlRow
          label={`포워더 몫 ${shareText(line.forwarder_share)}`}
          value={signedWon(-line.forwarder_cost)}
          title={line.label}
        />
        {line.variable_cost !== 0 ? (
          <PnlRow label="변동비" value={signedWon(-line.variable_cost)} />
        ) : null}
        <PnlRow strong label="항차 공헌이익" value={signedWon(line.contribution_margin)} />
        <PnlRow
          label="고정비 배분"
          value={signedWon(-line.fixed_cost_allocation)}
          assumed={isAssumed(fixedCost?.source)}
          title={fixedCost?.source}
        />
        <PnlRow strong label="고정비 배분 후 순이익" value={signedWon(line.platform_net)} />
        <PnlRow
          label="정산 단가 − 운영비 차이"
          value={signedWon(line.settlement_gap)}
          title={data.tariff_operational_definition}
        />
        <PnlRow
          strong
          label="정산 차이 반영 순이익"
          value={signedWon(line.platform_net_with_settlement)}
        />
      </div>

      <p className="mt-1 text-[11.5px] text-m2-muted">{line.label}</p>

      <h3 className="m2-h3 mt-4">연 환산</h3>
      <div className="m2-lines mt-1">
        {annualRevenue !== null && voyagesPerYear ? (
          <PnlRow
            label={`연 환산 매출(항차 평균 × ${countText(voyagesPerYear.value)}항차)`}
            value={signedWon(annualRevenue)}
            assumed={isAssumed(voyagesPerYear.source)}
            title={voyagesPerYear.source}
          />
        ) : null}
        {line.annual_contribution !== null ? (
          <PnlRow label="연 공헌이익" value={signedWon(line.annual_contribution)} />
        ) : null}
        <PnlRow label="연 고정비" value={signedWon(-line.annual_fixed_cost)} />
        {line.annual_net !== null ? (
          <PnlRow strong label="연 순이익" value={signedWon(line.annual_net)} />
        ) : null}
        {line.annual_net_with_settlement !== null ? (
          <PnlRow
            label="정산 차이 반영 연 순이익"
            value={signedWon(line.annual_net_with_settlement)}
          />
        ) : null}
      </div>

      <BreakevenBar line={line} />

      {sensitivities.length > 0 ? (
        <div className="m2-note mt-4 flex-col gap-1">
          {sensitivities.map(item => (
            <div key={item.label} className="m2-num text-[12px]">
              <b className="font-semibold">{item.label}</b> · 포워더 몫{' '}
              {shareText(item.forwarder_share)} · 순이익 {signedWon(item.platform_net)}
              {item.breakeven_pallets_per_voyage !== null
                ? ` · 손익분기 항차당 ${countText(item.breakeven_pallets_per_voyage, 1)}파렛트`
                : ''}
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-1.5">
        <h3 className="m2-h3">가정과 출처</h3>
        {data.assumptions.map(item => (
          <SourceLine
            key={item.key}
            assumed={isAssumed(item.source)}
            source={`${countText(item.value)}${item.unit} — ${item.source}`}
          />
        ))}
        <SourceLine
          source={`빈 칸 비용 ${signedWon(data.empty_slot_cost)} — ${data.empty_slot_definition}`}
        />
      </div>
    </>
  );
}

function PnlShell({ children }: { children: ReactNode }) {
  return (
    <section className="m2-card" aria-labelledby="business-pnl-title">
      <div className="m2-card-h">
        <h2 id="business-pnl-title" className="m2-h2">
          사업 손익
        </h2>
        <span className="m2-chip">이번 달</span>
      </div>
      {children}
    </section>
  );
}

export function BusinessPnlCard() {
  const { data, isPending, isError, error, refetch, isFetching } = usePlatformBusiness();

  if (isError) {
    return (
      <PnlShell>
        <QueryError
          error={error}
          subject="사업 손익을"
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      </PnlShell>
    );
  }
  if (isPending) {
    return (
      <PnlShell>
        <Skeleton className="h-80 rounded-[14px]" />
      </PnlShell>
    );
  }

  const line = baselineLine(data);
  if (data.plan_count === 0 || !line) {
    return (
      <PnlShell>
        <EmptyState
          compact
          title={`${data.month}에 출항한 계획이 없습니다`}
          description="계획이 생기면 항차 공헌이익·고정비 배분·손익분기 진행률을 계산합니다."
        />
      </PnlShell>
    );
  }

  return (
    <PnlShell>
      <PnlBody data={data} line={line} />
    </PnlShell>
  );
}
