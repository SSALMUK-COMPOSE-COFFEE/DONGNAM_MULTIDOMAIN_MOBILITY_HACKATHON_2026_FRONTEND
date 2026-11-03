'use client';

import { cn } from 'cn';
import { ArrowRightIcon } from 'lucide-react';
import Link from 'next/link';

import { useShipperSettlements } from '@/apis/saas/shipper';
import {
  CARD_HIDE,
  CARD_MAIN,
  CARD_PUSH,
  CARD_TABLE,
  MOBILE_BLOCK,
} from '@/app/(saas)/app/shipper/_components/mobile';
import {
  CardSkeleton,
  EmptyState,
  QueryError,
} from '@/app/(saas)/app/shipper/_components/query-state';
import {
  fmtCount,
  fmtMonthDayTime,
  fmtWon,
} from '@/app/(saas)/app/shipper/_components/shipper-format';
import { SHIPPER_PATHS } from '@/app/(saas)/app/shipper/_components/shipper-paths';
import type { ShipperSettlementT } from '@/types/saas-shipper';
import { NO_VESSEL_LABEL } from '@/utils/plan-label';

const BASIS_LABEL: Record<ShipperSettlementT['basis'], string> = {
  tariff: '정산표 단가',
  operational: '운영비 기준',
  mixed: '혼합',
};

const BASELINE_KIND_LABEL: Record<string, string> = {
  air_solo: '단독 항공 대비',
  sea_solo: '단독 해상 대비',
  mixed: '단독 운송 대비',
};
const MANWON = 10_000;

const sumOf = (rows: ShipperSettlementT[], pick: (row: ShipperSettlementT) => number) =>
  rows.reduce((sum, row) => sum + pick(row), 0);

const fieldOf = (row: ShipperSettlementT, key: string): unknown =>
  (row as unknown as Record<string, unknown>)[key];

const numberOf = (row: ShipperSettlementT, key: string) => {
  const value = fieldOf(row, key);

  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};

const textOf = (row: ShipperSettlementT, key: string) => {
  const value = fieldOf(row, key);

  return typeof value === 'string' && value.trim() !== '' ? value : null;
};

const billingRuleOf = (row: ShipperSettlementT) => textOf(row, 'billing_rule') ?? 'performance';

const baselineKindOf = (row: ShipperSettlementT) =>
  textOf(row, 'baseline_kind') ?? (billingRuleOf(row) === 'usage_fee' ? 'sea_solo' : 'air_solo');

const baselineLabelOf = (row: ShipperSettlementT) =>
  textOf(row, 'savings_baseline_label') ??
  textOf(row, 'baseline_label') ??
  BASELINE_KIND_LABEL[baselineKindOf(row)] ??
  '단독 항공 대비';

const fmtManwon = (krw: number) =>
  `${(krw / MANWON).toLocaleString('ko-KR', { maximumFractionDigits: 1 })}만 원`;

const performanceLabel = (row: ShipperSettlementT) => {
  const fee = numberOf(row, 'performance_fee') ?? row.fee;
  if (row.savings > 0 && fee > 0) return `성과보수 ${Math.round((fee / row.savings) * 100)}%`;

  return '성과보수';
};

const usageLabel = (row: ShipperSettlementT) => {
  const fee = numberOf(row, 'usage_fee') ?? 0;
  if (fee > 0 && row.sea_pallets > 0) return `이용료 파렛트당 ${fmtManwon(fee / row.sea_pallets)}`;

  return '파렛트 이용료';
};

const billingLabelOf = (row: ShipperSettlementT) => {
  const rule = billingRuleOf(row);
  if (rule === 'usage_fee') return usageLabel(row);
  if (rule === 'mixed') return `${performanceLabel(row)} + 이용료`;

  return performanceLabel(row);
};

const isPilot = (row: ShipperSettlementT) => fieldOf(row, 'pilot') === true;

function Stat({
  label,
  value,
  tone,
  note,
}: {
  label: string;
  value: number;
  tone?: string;
  note?: string;
}) {
  return (
    <div className="m2-card min-w-0">
      <div className="m2-lbl">{label}</div>
      <div
        className="m2-num mt-1.5 text-[26px] leading-tight font-bold tracking-[-0.02em] max-[767.98px]:text-[20px]"
        style={tone ? { color: tone } : {}}
      >
        {fmtCount(Math.round(value))}
        <small className="ml-0.5 text-[14px] font-semibold text-m2-ink-2">원</small>
      </div>
      {note ? <div className="m2-sub mt-1 text-[12px]">{note}</div> : null}
    </div>
  );
}

export function SettlementsView() {
  const settlements = useShipperSettlements();

  if (settlements.isError) {
    return (
      <QueryError
        message="정산 내역을 불러오지 못했습니다."
        onRetry={() => settlements.refetch()}
        isRetrying={settlements.isFetching}
      />
    );
  }
  if (settlements.isPending) return <CardSkeleton height={360} />;

  const rows = settlements.data;

  if (rows.length === 0) {
    return (
      <div className="m2-card">
        <EmptyState
          title="아직 정산할 계획이 없습니다"
          description="공동적재 계획에 출하가 들어가면 아낀 금액과 수수료가 여기에 쌓입니다."
          action={{ href: SHIPPER_PATHS.PLANS, label: '계획 확인' }}
        />
      </div>
    );
  }

  const totalSavings = sumOf(rows, ({ savings }) => savings);
  const totalFee = sumOf(rows, ({ fee }) => fee);
  const totalGain = sumOf(rows, ({ shipper_gain }) => shipper_gain);
  const totalRefund = sumOf(rows, ({ quality_refund }) => quality_refund);
  const baselineLabels = [...new Set(rows.map(baselineLabelOf))];

  return (
    <div className="flex flex-col gap-4">
      <div className="m2-grid grid-cols-4 max-[1180px]:grid-cols-2">
        <Stat
          label="내 절감 합계"
          value={totalSavings}
          tone="var(--m2-ok-ink)"
          note={baselineLabels.length === 1 ? baselineLabels[0] : '계획마다 기준이 다릅니다'}
        />
        <Stat label="수수료" value={totalFee} />
        <Stat label="내 몫" value={totalGain} tone="var(--m2-navy)" />
        <Stat label="품질 환급" value={totalRefund} />
      </div>

      <section className="m2-card" aria-label="계획별 정산">
        <div className="m2-card-h">
          <h2 className="m2-h2">계획별 정산</h2>
          <span className="m2-sub mt-0">원</span>
        </div>
        <div className="overflow-x-auto">
          <table className={cn('m2-table', CARD_TABLE)}>
            <thead>
              <tr>
                <th>선박 · 출항</th>
                <th>근거 · 과금</th>
                <th className="r">해상 / 항공 파렛트</th>
                <th className="r">비교 기준</th>
                <th className="r">공동적재</th>
                <th className="r">절감</th>
                <th className="r">수수료</th>
                <th className="r">품질 환급</th>
                <th className="r">내 몫</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.map(row => {
                const pilot = isPilot(row);
                const baselineLabel = baselineLabelOf(row);

                return (
                  <tr key={`${row.plan_id}:${row.shipper_id}`}>
                    <td className={CARD_MAIN}>
                      <div className="m2-who">
                        {row.vessel ?? NO_VESSEL_LABEL}
                        <small className="m2-num">
                          출항 {fmtMonthDayTime(row.departure)} · v{row.version}
                        </small>
                      </div>
                    </td>
                    <td className={CARD_MAIN}>
                      <div className="flex flex-wrap gap-1.5">
                        <span className="m2-chip">{BASIS_LABEL[row.basis] ?? row.basis}</span>
                        <span className="m2-chip m2-chip-brand">{billingLabelOf(row)}</span>
                        {pilot && (
                          <span className="m2-chip m2-chip-ok">시범 항차 · 수수료 0원</span>
                        )}
                      </div>
                    </td>
                    <td className={cn('r m2-num', CARD_HIDE)}>
                      {row.sea_pallets} / {row.air_pallets}
                    </td>
                    <td className={cn('r m2-num text-m2-muted', CARD_HIDE)}>
                      <div className="m2-who font-normal">
                        {fmtWon(row.baseline_cost)}
                        <small>{baselineLabel}</small>
                      </div>
                    </td>
                    <td className={cn('r m2-num', CARD_HIDE)}>{fmtWon(row.shared_cost)}</td>
                    <td className={cn('r m2-num font-semibold text-m2-ok-ink', CARD_HIDE)}>
                      {fmtWon(row.savings)}
                    </td>
                    <td className={cn('r m2-num', CARD_HIDE)}>{fmtWon(row.fee)}</td>
                    <td className={cn('r m2-num', CARD_HIDE)}>{fmtWon(row.quality_refund)}</td>
                    <td className={cn('r m2-num font-semibold', CARD_HIDE)}>
                      {fmtWon(row.shipper_gain)}
                    </td>
                    <td className={cn(MOBILE_BLOCK, CARD_MAIN)}>
                      <div className="m2-lines m2-num mt-0">
                        <div>
                          <span>{baselineLabel}</span>
                          <b>{fmtWon(row.baseline_cost)}</b>
                        </div>
                        <div>
                          <span>공동적재</span>
                          <b>{fmtWon(row.shared_cost)}</b>
                        </div>
                        <div>
                          <span>절감</span>
                          <b className="text-m2-ok-ink">{fmtWon(row.savings)}</b>
                        </div>
                        <div>
                          <span>수수료 · 품질 환급</span>
                          <b>
                            {fmtWon(row.fee)} · {fmtWon(row.quality_refund)}
                          </b>
                        </div>
                        <div>
                          <span>내 몫</span>
                          <b>{fmtWon(row.shipper_gain)}</b>
                        </div>
                      </div>
                    </td>
                    <td className={cn('r', CARD_PUSH)}>
                      <Link
                        href={SHIPPER_PATHS.PLAN(row.plan_id)}
                        className="m2-btn m2-btn-sec m2-btn-sm"
                      >
                        계획
                        <ArrowRightIcon size={14} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
