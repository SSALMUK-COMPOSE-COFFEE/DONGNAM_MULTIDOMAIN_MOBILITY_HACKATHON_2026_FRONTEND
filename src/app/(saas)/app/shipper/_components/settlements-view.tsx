'use client';

import { cn } from 'cn';
import { ArrowRightIcon } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useId } from 'react';

import { useShipperPlans, useShipperSettlements } from '@/apis/saas/shipper';
import {
  CARD_HIDE,
  CARD_MAIN,
  CARD_PUSH,
  CARD_TABLE,
  MOBILE_BLOCK,
} from '@/app/(saas)/app/shipper/_components/mobile';
import { QuantityStatementSection } from '@/app/(saas)/app/shipper/_components/quantity-statement';
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
import {
  AIR_PLACEHOLDER,
  UNASSIGNED_PLACEHOLDER,
} from '@/app/(saas)/app/shipper/_components/vessel-label';
import type { ShipperSettlementT } from '@/types/saas-shipper';

const BASIS_LABEL: Record<ShipperSettlementT['basis'], string> = {
  tariff: '정산표 단가',
  operational: '운영비 기준',
  mixed: '혼합',
};

const BASIS_HINT: Record<ShipperSettlementT['basis'], string> = {
  tariff: '팀이 정한 정산표 단가(일부 가정 포함)로 계획 시점 비용을 추정했습니다',
  operational: '트럭·보관·운임 운영비 모델(일부 가정 포함)로 계획 시점 비용을 추정했습니다',
  mixed: '품목마다 정산표 단가와 운영비 모델을 섞어 계획 시점 비용을 추정했습니다',
};

const RULE_HINT: Record<string, string> = {
  performance: '성과보수: 예상 절감액에 정해진 비율을 적용해 수수료를 계산합니다',
  usage_fee: '파렛트 이용료: 해당 품목의 파렛트 수에 따라 이용료를 계산합니다',
  mixed: '품목별 성과보수와 파렛트 이용료를 합산해 계산합니다',
};

const BASELINE_HINT = '단독 운송 비교 기준의 예상 비용';
const SHARED_HINT = '운송·집하·보관과 품질 위험을 반영한 공동적재 예상 비용';
const SAVINGS_HINT = '비교 기준 예상 비용 − 공동적재 예상 비용';
const FEE_HINT = '검수 환급 계산액을 반영한 예상 수수료';
const REFUND_HINT = '검수 입력으로 계산한 수수료 환급액';
const GAIN_HINT = '예상 절감액 − 예상 수수료';

const PILOT_HINT = '무료 시범 항차: 계획 수수료는 면제하며 면제 전 예상 수수료도 함께 표시합니다';

const COLUMNS: { key: string; title: string; hint: string; right?: boolean }[] = [
  { key: 'vessel', title: '선박 · 출항', hint: '내 화물이 배정된 선박과 출항 예정 시각' },
  { key: 'rule', title: '근거 · 과금', hint: '비용 계산 근거와 수수료 방식' },
  { key: 'pallets', title: '해상 / 항공 파렛트', hint: '이 계획의 내 파렛트', right: true },
  { key: 'baseline', title: '비교 기준 예상비용', hint: BASELINE_HINT, right: true },
  { key: 'shared', title: '공동적재 예상비용', hint: SHARED_HINT, right: true },
  { key: 'savings', title: '예상 절감액', hint: SAVINGS_HINT, right: true },
  { key: 'fee', title: '예상 수수료', hint: FEE_HINT, right: true },
  { key: 'refund', title: '품질 환급 계산액', hint: REFUND_HINT, right: true },
  { key: 'gain', title: '수수료 차감 후 예상 절감액', hint: GAIN_HINT, right: true },
];

const SAVINGS_BASELINE_LABEL = '단독 항공 대비';
const AWAITING_SHIPPER = 'pending_shipper_confirmation';
const AWAITING_TITLE = '화주 확인 대기 (합의 전 제안값)';
const AWAITING_CHIP = '확인 대기';
const AWAITING_HINT = '내가 아직 확인하지 않은 계획이라 금액은 합의 전 제안값입니다';
const MANWON = 10_000;

const planCostPath = (planId: string) => {
  const [pathname, search = ''] = SHIPPER_PATHS.PLAN(planId).split('?');
  const params = new URLSearchParams(search);
  params.set('tab', 'cost');

  return `${pathname}?${params.toString()}`;
};

const noVesselOf = (row: ShipperSettlementT) =>
  row.air_pallets > 0 && row.sea_pallets === 0 ? AIR_PLACEHOLDER : UNASSIGNED_PLACEHOLDER;

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

const baselineLabelOf = (row: ShipperSettlementT) =>
  textOf(row, 'savings_baseline_label') ?? SAVINGS_BASELINE_LABEL;

const feeBasisLabelOf = (row: ShipperSettlementT) => {
  const label = textOf(row, 'baseline_label');

  return label && label !== baselineLabelOf(row) ? label : null;
};

const ruleHintOf = (row: ShipperSettlementT) => {
  const hint = RULE_HINT[billingRuleOf(row)] ?? '';
  const feeBasis = feeBasisLabelOf(row);

  return feeBasis ? `${hint} (이용료 기준 ${feeBasis})` : hint;
};

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

const originalFeeOf = (row: ShipperSettlementT) =>
  (numberOf(row, 'performance_fee') ?? 0) + (numberOf(row, 'usage_fee') ?? 0);

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

function MobileLine({
  label,
  hint,
  tone,
  children,
}: {
  label: string;
  hint: string;
  tone?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <span>
        {label}
        <small className="block text-[11px]">{hint}</small>
      </span>
      <b className={tone}>{children}</b>
    </div>
  );
}

function SettlementRow({ row, awaiting }: { row: ShipperSettlementT; awaiting: boolean }) {
  const pilot = isPilot(row);
  const baselineLabel = baselineLabelOf(row);
  const savingsTone = awaiting ? '' : 'font-semibold text-m2-ok-ink';

  return (
    <tr className={awaiting ? 'is-dis' : ''}>
      <td className={CARD_MAIN}>
        <div className={cn('m2-who', awaiting && 'font-medium')}>
          {row.vessel ?? noVesselOf(row)}
          <small className="m2-num">
            {row.departure ? `출항 ${fmtMonthDayTime(row.departure)}` : noVesselOf(row)} · v
            {row.version}
          </small>
        </div>
      </td>
      <td className={CARD_MAIN}>
        <div className="flex flex-wrap gap-1.5">
          {awaiting && (
            <span className="m2-chip m2-chip-warn" title={AWAITING_HINT}>
              {AWAITING_CHIP}
            </span>
          )}
          <span className="m2-chip" title={BASIS_HINT[row.basis]}>
            {BASIS_LABEL[row.basis] ?? row.basis}
          </span>
          <span className="m2-chip m2-chip-brand" title={ruleHintOf(row)}>
            {billingLabelOf(row)}
          </span>
          {pilot && (
            <span className="m2-chip m2-chip-ok" title={PILOT_HINT}>
              무료 시범
            </span>
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
      <td className={cn('r m2-num', savingsTone, CARD_HIDE)}>{fmtWon(row.savings)}</td>
      <td className={cn('r m2-num', CARD_HIDE)}>
        <div className="m2-who font-normal">
          {fmtWon(row.fee)}
          {pilot && <small>면제 전 예상 {fmtWon(originalFeeOf(row))}</small>}
        </div>
      </td>
      <td className={cn('r m2-num', CARD_HIDE)}>
        <div className="m2-who font-normal">
          {fmtWon(row.quality_refund)}
          {row.quality_refund > 0 ? <small>검수 반영 계산</small> : null}
        </div>
      </td>
      <td className={cn('r m2-num', !awaiting && 'font-semibold', CARD_HIDE)}>
        {fmtWon(row.shipper_gain)}
      </td>
      <td className={cn(MOBILE_BLOCK, CARD_MAIN)}>
        <div
          className={cn(
            'm2-lines m2-num mt-0',
            awaiting && '[&_b]:font-medium [&_b]:text-m2-muted'
          )}
        >
          <MobileLine label={baselineLabel} hint={BASELINE_HINT}>
            {fmtWon(row.baseline_cost)}
          </MobileLine>
          <MobileLine label="공동적재 예상비용" hint={SHARED_HINT}>
            {fmtWon(row.shared_cost)}
          </MobileLine>
          <MobileLine
            label="예상 절감액"
            hint={SAVINGS_HINT}
            tone={awaiting ? '' : 'text-m2-ok-ink'}
          >
            {fmtWon(row.savings)}
          </MobileLine>
          <MobileLine label="예상 수수료" hint={FEE_HINT}>
            {fmtWon(row.fee)}
          </MobileLine>
          {pilot && (
            <MobileLine label="무료 시범 · 면제 전 예상 수수료" hint={PILOT_HINT}>
              {fmtWon(originalFeeOf(row))}
            </MobileLine>
          )}
          <MobileLine label="품질 환급 계산액" hint={REFUND_HINT}>
            {fmtWon(row.quality_refund)}
            {row.quality_refund > 0 ? (
              <span className="mt-1 block text-[11px] font-normal text-m2-muted">
                검수 반영 계산
              </span>
            ) : null}
          </MobileLine>
          <MobileLine label="수수료 차감 후 예상 절감액" hint={GAIN_HINT}>
            {fmtWon(row.shipper_gain)}
          </MobileLine>
        </div>
      </td>
      <td className={cn('r', CARD_PUSH)}>
        <Link
          href={planCostPath(row.plan_id)}
          className="m2-btn m2-btn-sec m2-btn-sm"
          aria-label={`${row.vessel ?? noVesselOf(row)} 비용·정산 보기`}
        >
          비용·정산
          <ArrowRightIcon size={14} />
        </Link>
      </td>
    </tr>
  );
}

function SettlementTable({
  rows,
  awaiting,
  labelledBy,
}: {
  rows: ShipperSettlementT[];
  awaiting: boolean;
  labelledBy?: string;
}) {
  return (
    <div className="relative overflow-x-auto">
      <table className={cn('m2-table', CARD_TABLE)} aria-labelledby={labelledBy}>
        <thead>
          <tr>
            {COLUMNS.map(column => (
              <th key={column.key} scope="col" className={column.right ? 'r' : ''}>
                {column.title}
                {!awaiting && (
                  <span className="block text-[11px] font-normal whitespace-normal text-m2-muted normal-case">
                    {column.hint}
                  </span>
                )}
              </th>
            ))}
            <th scope="col">
              <span className="sr-only">계획 보기</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <SettlementRow key={`${row.plan_id}:${row.shipper_id}`} row={row} awaiting={awaiting} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AwaitingGroup({ rows, planCount }: { rows: ShipperSettlementT[]; planCount: number }) {
  const headingId = useId();

  return (
    <section
      aria-labelledby={headingId}
      className="mt-4 rounded-[12px] border border-dashed border-m2-line-2 px-3 pt-3 pb-1"
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h3 id={headingId} className="m2-h3">
          {AWAITING_TITLE}
        </h3>
        <span className="m2-chip m2-chip-warn m2-num">{fmtCount(planCount)}건</span>
      </div>
      <p className="m2-sub mt-0 mb-3 text-[12px]">
        {AWAITING_HINT}. 위 합계와 요약 금액에는 넣지 않았습니다.
      </p>
      <SettlementTable rows={rows} awaiting labelledBy={headingId} />
    </section>
  );
}

export function SettlementsView() {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <TransportSettlements />
      <QuantityStatementSection />
    </div>
  );
}

function TransportSettlements() {
  const settlements = useShipperSettlements();
  const plans = useShipperPlans();

  if (settlements.isError || plans.isError) {
    return (
      <QueryError
        message="예상 정산 내역을 불러오지 못했습니다."
        onRetry={() => {
          void settlements.refetch();
          void plans.refetch();
        }}
        isRetrying={settlements.isFetching || plans.isFetching}
      />
    );
  }
  if (settlements.isPending || plans.isPending) return <CardSkeleton height={360} />;

  const allRows = settlements.data;

  if (allRows.length === 0) {
    return (
      <div className="m2-card">
        <EmptyState
          title="예상 정산을 조회할 계획이 없습니다"
          description="참여한 공동적재 계획의 예상 비용·절감액·수수료를 확인할 수 있습니다."
          action={{ href: SHIPPER_PATHS.PLANS, label: '계획 확인' }}
        />
      </div>
    );
  }

  const awaitingPlanIds = new Set(
    plans.data.filter(({ status }) => status === AWAITING_SHIPPER).map(({ plan_id }) => plan_id)
  );
  const rows = allRows.filter(({ plan_id }) => !awaitingPlanIds.has(plan_id));
  const awaitingRows = allRows.filter(({ plan_id }) => awaitingPlanIds.has(plan_id));
  const awaitingPlanCount = new Set(awaitingRows.map(({ plan_id }) => plan_id)).size;

  const totalSavings = sumOf(rows, ({ savings }) => savings);
  const totalFee = sumOf(rows, ({ fee }) => fee);
  const totalGain = sumOf(rows, ({ shipper_gain }) => shipper_gain);
  const totalRefund = sumOf(rows, ({ quality_refund }) => quality_refund);
  const baselineLabels = [...new Set(rows.map(baselineLabelOf))];
  const pilotRows = rows.filter(isPilot);
  const pilotWaivedFee = sumOf(pilotRows, originalFeeOf);
  const feeNote = () => {
    if (pilotRows.length === 0) return FEE_HINT;
    if (pilotRows.length === rows.length)
      return `무료 시범 · 면제 전 예상 ${fmtWon(pilotWaivedFee)}`;

    return `무료 시범 ${pilotRows.length}건 ${fmtWon(pilotWaivedFee)} 면제 후 예상 금액`;
  };
  const savingsNote = () => {
    const base =
      baselineLabels.length > 1
        ? '계획마다 기준이 다릅니다'
        : (baselineLabels[0] ?? SAVINGS_BASELINE_LABEL);

    return awaitingPlanCount > 0
      ? `${base} · 확인 대기 ${fmtCount(awaitingPlanCount)}건 제외`
      : base;
  };
  const rules = [...new Set(allRows.map(billingRuleOf))];
  const bases = [...new Set(allRows.map(({ basis }) => basis))];

  return (
    <div className="flex flex-col gap-4">
      <div className="m2-grid grid-cols-4 max-[1180px]:grid-cols-2 max-[479.98px]:grid-cols-1">
        <Stat
          label="예상 절감 합계"
          value={totalSavings}
          tone="var(--m2-ok-ink)"
          note={savingsNote()}
        />
        <Stat label="예상 수수료" value={totalFee} note={feeNote()} />
        <Stat label="수수료 차감 후 예상 절감액" value={totalGain} tone="var(--m2-navy)" />
        <Stat label="품질 환급 계산액" value={totalRefund} note="검수 입력이 있는 경우 반영" />
      </div>

      <section className="m2-card" aria-label="계획별 예상 정산">
        <div className="m2-card-h">
          <h2 className="m2-h2">계획별 예상 정산</h2>
          <span className="m2-sub mt-0">원</span>
        </div>
        {rows.length > 0 ? (
          <SettlementTable rows={rows} awaiting={false} />
        ) : (
          <p className="m2-sub mt-0 text-[13px]">
            확인한 계획이 없습니다. 계획 확인 후 예상 정산 내역을 조회할 수 있습니다.
          </p>
        )}
        {awaitingRows.length > 0 && (
          <AwaitingGroup rows={awaitingRows} planCount={awaitingPlanCount} />
        )}
        <ul className="m2-sub mt-3 flex flex-col gap-1 text-[12px]" aria-label="적용 규칙 설명">
          {bases.map(basis => (
            <li key={basis}>
              <b className="text-m2-ink-2">{BASIS_LABEL[basis] ?? basis}</b> · {BASIS_HINT[basis]}
            </li>
          ))}
          {rules.map(rule => (
            <li key={rule}>{RULE_HINT[rule] ?? rule}</li>
          ))}
          {allRows.some(isPilot) && <li>{PILOT_HINT}</li>}
          {awaitingRows.length > 0 && (
            <li>
              <b className="text-m2-ink-2">{AWAITING_CHIP}</b> · {AWAITING_HINT}
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
