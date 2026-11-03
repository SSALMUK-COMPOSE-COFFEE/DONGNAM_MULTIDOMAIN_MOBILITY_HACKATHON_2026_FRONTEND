'use client';

import { cn } from 'cn';
import Link from 'next/link';
import { Fragment, type ReactNode } from 'react';

import { usePlatformCatalog, usePlatformSettlements } from '@/apis/saas/platform';
import {
  type BillingRuleT,
  billingChipClass,
  billingFieldsOf,
  billingRuleLabel,
  distinctRules,
  usageFeePerPalletOf,
} from '@/app/(saas)/app/platform/_components/billing';
import { EmptyState } from '@/app/(saas)/app/platform/_components/empty-state';
import { feeRateOf, won, wonNumber } from '@/app/(saas)/app/platform/_components/m2-format';
import { PLATFORM_PATHS } from '@/app/(saas)/app/platform/_components/paths';
import { PlatformHeader } from '@/app/(saas)/app/platform/_components/platform-header';
import { QueryError } from '@/app/(saas)/app/platform/_components/query-error';
import { StatTile } from '@/app/(saas)/app/platform/_components/stat-tile';
import { Skeleton } from '@/components/ui/skeleton';
import type { PlatformSettlementT } from '@/types/saas-platform';
import { formatKstMonthDayTime } from '@/utils/kst';
import { NO_VESSEL_LABEL } from '@/utils/plan-label';

const sumBy = (rows: PlatformSettlementT[], pick: (row: PlatformSettlementT) => number) =>
  rows.reduce((total, row) => total + pick(row), 0);

function SettlementShell({ children }: { children: ReactNode }) {
  return (
    <>
      <PlatformHeader
        eyebrow="정산"
        title="품목마다 정한 규칙으로만 받습니다"
        sub="항공을 대신하는 품목은 절감액의 성과보수, 이미 배로 가던 품목은 파렛트 이용료를 받습니다."
      />
      {children}
    </>
  );
}

export function SettlementView() {
  const { data, isPending, isError, error, refetch, isFetching } = usePlatformSettlements();
  const catalog = usePlatformCatalog().data ?? null;
  const feeRate = feeRateOf(catalog);
  const usagePerPallet = usageFeePerPalletOf(catalog);
  const ruleLabel = (rule: BillingRuleT | null) => billingRuleLabel(rule, feeRate, usagePerPallet);

  if (isError) {
    return (
      <SettlementShell>
        <QueryError
          error={error}
          subject="정산 내역을"
          onRetry={() => refetch()}
          isRetrying={isFetching}
        />
      </SettlementShell>
    );
  }
  if (isPending) {
    return (
      <SettlementShell>
        <Skeleton className="h-96 rounded-[18px]" />
      </SettlementShell>
    );
  }
  if (data.length === 0) {
    return (
      <SettlementShell>
        <EmptyState
          title="아직 정산할 계획이 없습니다"
          description="공동적재 계획을 만들면 화주별 절감액과 성과보수·이용료가 계산됩니다."
        />
      </SettlementShell>
    );
  }

  const totalSaving = sumBy(data, ({ total_saving_krw }) => total_saving_krw);
  const totalFee = sumBy(data, ({ platform_fee_krw }) => platform_fee_krw);
  const charged = data.filter(row => !billingFieldsOf(row).pilot);
  const piloted = data.filter(row => billingFieldsOf(row).pilot);
  const feeOf = (row: PlatformSettlementT) => {
    const billing = billingFieldsOf(row);
    return (billing.performanceFee ?? 0) + (billing.usageFee ?? 0);
  };
  const totalPerformance = sumBy(charged, row => billingFieldsOf(row).performanceFee ?? 0);
  const totalUsage = sumBy(charged, row => billingFieldsOf(row).usageFee ?? 0);
  const totalRefund = sumBy(data, ({ quality_refund_krw }) => quality_refund_krw ?? 0);
  const totalPilotWaived = sumBy(piloted, feeOf);
  const feeNote = [
    totalPerformance > 0 ? `성과보수 ${won(totalPerformance)}` : '',
    totalUsage > 0 ? `이용료 ${won(totalUsage)}` : '',
    totalRefund > 0 ? `품질 환급 −${won(totalRefund)}` : '',
    totalPilotWaived > 0 ? `시범 항차 면제 ${won(totalPilotWaived)}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <SettlementShell>
      <div className="mb-4 grid grid-cols-3 gap-4 max-[900px]:grid-cols-1">
        <StatTile label="화주 총비용 절감" value={wonNumber(totalSaving)} unit="원" />
        <StatTile label="플랫폼 수익" value={wonNumber(totalFee)} unit="원" note={feeNote} />
        <StatTile label="화주에게 돌아간 몫" value={wonNumber(totalSaving - totalFee)} unit="원" />
      </div>

      <section className="m2-card">
        <div className="m2-card-h">
          <h2 className="m2-h2">계획별 정산</h2>
          <span className="m2-chip">원 단위</span>
        </div>
        <div className="-mx-2.5 overflow-x-auto px-2.5">
          <table className="m2-table">
            <thead>
              <tr>
                <th>항차 · 화주</th>
                <th>출항</th>
                <th>과금 규칙 · 기준</th>
                <th className="r">절감</th>
                <th className="r">플랫폼 수익</th>
                <th className="r">화주 몫</th>
              </tr>
            </thead>
            <tbody>
              {data.map(row => (
                <Fragment key={row.plan_id}>
                  <tr className="font-semibold [&>td]:bg-[rgba(15,27,51,0.025)]">
                    <td>
                      <Link
                        href={PLATFORM_PATHS.PLAN(row.plan_id)}
                        className="text-m2-ink hover:text-m2-brand-ink hover:underline"
                      >
                        {row.vessel ?? NO_VESSEL_LABEL}
                      </Link>
                    </td>
                    <td className="m2-num">{formatKstMonthDayTime(row.departure)}</td>
                    <td>
                      <RuleChips
                        rules={chipRulesOf(distinctRules(row.shippers))}
                        pilot={billingFieldsOf(row).pilot}
                        labelOf={ruleLabel}
                      />
                    </td>
                    <td className="r m2-num text-m2-ok-ink">{won(row.total_saving_krw)}</td>
                    <td className="r m2-num">{won(row.platform_fee_krw)}</td>
                    <td className="r m2-num">{won(row.total_saving_krw - row.platform_fee_krw)}</td>
                  </tr>
                  {row.shippers.map(share => {
                    const billing = billingFieldsOf(share);
                    const label = ruleLabel(billing.billingRule);
                    return (
                      <tr key={`${row.plan_id}-${share.shipper_id}`}>
                        <td className="pl-6">{share.shipper_org_name ?? share.shipper_id}</td>
                        <td />
                        <td>
                          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                            {label ? (
                              <span
                                className={cn('m2-chip', billingChipClass(billing.billingRule))}
                              >
                                {label}
                              </span>
                            ) : null}
                            {billing.baselineLabel ? (
                              <span className="text-[11.5px] text-m2-muted">
                                {billing.baselineLabel}
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="r m2-num">{won(share.saving_krw)}</td>
                        <td className="r m2-num">{won(share.fee_krw)}</td>
                        <td className="r m2-num">{won(share.saving_krw - share.fee_krw)}</td>
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </SettlementShell>
  );
}

const chipRulesOf = (rules: BillingRuleT[]): BillingRuleT[] => {
  const expanded = rules.flatMap(rule =>
    rule === 'mixed' ? (['performance', 'usage_fee'] as const) : [rule]
  );
  return [...new Set(expanded)];
};

function RuleChips({
  rules,
  pilot,
  labelOf,
}: {
  rules: BillingRuleT[];
  pilot: boolean;
  labelOf: (rule: BillingRuleT | null) => string | null;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {pilot ? <span className="m2-chip m2-chip-ok">시범 항차</span> : null}
      {rules.map(rule => {
        const label = labelOf(rule);
        return label ? (
          <span key={rule} className={cn('m2-chip', billingChipClass(rule))}>
            {label}
          </span>
        ) : null;
      })}
    </div>
  );
}
