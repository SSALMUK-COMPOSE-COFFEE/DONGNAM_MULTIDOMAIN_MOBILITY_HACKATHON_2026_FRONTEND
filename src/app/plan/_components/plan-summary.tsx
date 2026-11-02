import type { SchemaT } from '@/types/api';
import { formatManwon } from '@/utils/format';

type PlanSummaryPropsT = { plan: SchemaT<'Plan'> };

/** 발표 자료 하단 배너처럼 절감 합계 → 수수료 · 화주 몫을 한 줄로 보여준다 */
export function PlanSummary({ plan }: PlanSummaryPropsT) {
  const shipperGain = plan.total_savings - plan.total_fee;

  return (
    <div className="flex items-center gap-6 rounded-3xl bg-navy px-10 py-7 text-white">
      <p className="text-3xl font-bold">
        절감 합계 <span className="num text-cyan">{formatManwon(plan.total_savings)}만 원</span>
        <span className="mx-4">→</span>
        수수료 <span className="num">{formatManwon(plan.total_fee)}만 원</span>
        <span className="mx-4">·</span>
        화주 몫 <span className="num">{formatManwon(shipperGain)}만 원</span>
      </p>
      <p className="ml-auto text-right text-sm text-white/70">
        단독 운송 <span className="num">{formatManwon(plan.total_baseline_cost)}만 원</span>
        <br />
        공동적재 <span className="num">{formatManwon(plan.total_shared_cost)}만 원</span>
      </p>
    </div>
  );
}
