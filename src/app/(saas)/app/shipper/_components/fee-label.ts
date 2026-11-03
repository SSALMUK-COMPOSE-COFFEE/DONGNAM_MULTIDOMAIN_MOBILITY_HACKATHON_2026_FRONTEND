import {
  billingRuleLabel,
  distinctRules,
  usageFeePerPalletOf,
} from '@/app/(saas)/app/platform/_components/billing';
import { feeRateOf, percentLabel } from '@/app/(saas)/app/platform/_components/m2-format';
import type { PlanSessionT } from '@/types/api';

export const settlementFeeLabel = ({ plan, scenario }: PlanSessionT) => {
  const feeRate = feeRateOf(scenario);
  const rows = (plan.container_settlements ?? []).flatMap(({ shippers }) => shippers);
  const rules = distinctRules([...rows, ...plan.settlements]);
  const fallback = ['수수료', percentLabel(feeRate)].filter(Boolean).join(' ');
  if (rules.length !== 1) return rules.length > 1 ? '수수료 (성과보수·이용료)' : fallback;

  return billingRuleLabel(rules[0], feeRate, usageFeePerPalletOf(scenario)) ?? fallback;
};
