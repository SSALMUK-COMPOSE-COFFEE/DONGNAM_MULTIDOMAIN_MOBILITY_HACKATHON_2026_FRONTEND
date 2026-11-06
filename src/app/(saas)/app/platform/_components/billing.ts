import { percentLabel, won } from '@/app/(saas)/app/platform/_components/m2-format';

export type BillingRuleT = 'performance' | 'usage_fee' | 'mixed';

export type BillingFieldsT = {
  billingRule: BillingRuleT | null;
  performanceFee: number | null;
  usageFee: number | null;
  baselineLabel: string | null;
  pilot: boolean;
};

const BILLING_RULES: readonly string[] = ['performance', 'usage_fee', 'mixed'];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isBillingRule = (value: unknown): value is BillingRuleT =>
  typeof value === 'string' && BILLING_RULES.includes(value);

const numberOf = (value: unknown) =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const firstNumber = (record: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = numberOf(record[key]);
    if (value !== null) return value;
  }
  return null;
};

export const billingFieldsOf = (row: unknown): BillingFieldsT => {
  if (!isRecord(row)) {
    return {
      billingRule: null,
      performanceFee: null,
      usageFee: null,
      baselineLabel: null,
      pilot: false,
    };
  }
  const label = row.baseline_label;

  return {
    billingRule: isBillingRule(row.billing_rule) ? row.billing_rule : null,
    performanceFee: firstNumber(row, ['performance_fee', 'performance_fee_krw']),
    usageFee: firstNumber(row, ['usage_fee', 'usage_fee_krw']),
    baselineLabel: typeof label === 'string' && label.trim() ? label : null,
    pilot: row.pilot === true,
  };
};

export const usageFeePerPalletOf = (scenario: unknown) => {
  if (!isRecord(scenario) || !isRecord(scenario.cost_params)) return null;
  const billing = scenario.cost_params.billing;
  if (!isRecord(billing) || !isRecord(billing.usage_fee_per_pallet_krw)) return null;

  return numberOf(billing.usage_fee_per_pallet_krw.value);
};

const MANWON = 10_000;

const feeAmountLabel = (krw: number) =>
  krw % MANWON === 0 ? `${(krw / MANWON).toLocaleString('ko-KR')}만 원` : won(krw);

export const billingRuleLabel = (
  rule: BillingRuleT | null,
  feeRate: number | null,
  usagePerPallet: number | null
) => {
  if (rule === 'performance') return ['성과보수', percentLabel(feeRate)].filter(Boolean).join(' ');
  if (rule === 'usage_fee') {
    return usagePerPallet === null
      ? '파렛트 이용료'
      : `이용료 ${feeAmountLabel(usagePerPallet)}·파렛트`;
  }
  if (rule === 'mixed') return '성과보수 + 이용료';
  return null;
};

export const billingChipClass = (rule: BillingRuleT | null) => {
  if (rule === 'usage_fee') return 'm2-chip-grape';
  if (rule === 'mixed') return 'm2-chip-warn';
  return 'm2-chip-brand';
};

export const distinctRules = (rows: readonly unknown[]) => [
  ...new Set(rows.flatMap(row => billingFieldsOf(row).billingRule ?? [])),
];
