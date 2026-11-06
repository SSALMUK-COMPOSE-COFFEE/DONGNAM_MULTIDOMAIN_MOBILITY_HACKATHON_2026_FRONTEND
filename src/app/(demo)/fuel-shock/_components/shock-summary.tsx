import type { FuelShockCaseT } from '@/types/api';
import { formatManwon, formatSignedManwon } from '@/utils/format';

type ShockSummaryPropsT = { shockCase: FuelShockCaseT };

/** 고른 할증료에서의 절감 합계 → 수수료 · 화주 몫, 오른쪽에 기준(인상 전) 할증료 대비 변화 */
export function ShockSummary({ shockCase }: ShockSummaryPropsT) {
  const { surcharge_per_kg, total_savings, total_fee, savings_delta, plan_changed, is_baseline } =
    shockCase;

  return (
    <div className="flex items-center gap-6 rounded-3xl bg-navy px-10 py-7 text-white">
      <p className="text-3xl font-bold">
        절감 합계 <span className="num text-cyan">{formatManwon(total_savings)}만 원</span>
        <span className="mx-4">→</span>
        수수료 <span className="num">{formatManwon(total_fee)}만 원</span>
        <span className="mx-4">·</span>
        화주 몫 <span className="num">{formatManwon(total_savings - total_fee)}만 원</span>
      </p>
      <p className="ml-auto text-right">
        <span className="block text-sm text-white/70">
          {is_baseline ? '기준 할증료' : '기준 대비 절감'}
        </span>
        <span className="text-2xl font-bold num text-cyan">
          {is_baseline && `${surcharge_per_kg.toLocaleString()}원/kg`}
          {!is_baseline && plan_changed && `${formatSignedManwon(savings_delta)}만 원`}
          {!is_baseline && !plan_changed && '배정 변화 없음'}
        </span>
      </p>
    </div>
  );
}
