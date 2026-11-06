import type { PlanT } from '@/types/api';
import { formatManwon } from '@/utils/format';

type PlanSummaryPropsT = { plan: PlanT };

/** 발표 자료 하단 배너처럼 절감 합계 → 수수료 · 화주 몫을 한 줄로 보여준다 */
export function PlanSummary({ plan }: PlanSummaryPropsT) {
  const containers = plan.container_settlements ?? [];

  return (
    <div className="flex items-center gap-6 rounded-3xl bg-navy px-10 py-7 text-white">
      <p className="text-3xl font-bold">
        절감 합계 <span className="num text-cyan">{formatManwon(plan.total_savings)}만 원</span>
        <span className="mx-4">→</span>
        수수료 <span className="num">{formatManwon(plan.total_fee)}만 원</span>
        <span className="mx-4">·</span>
        화주 몫{' '}
        <span className="num">{formatManwon(plan.total_savings - plan.total_fee)}만 원</span>
      </p>
      <p className="ml-auto text-right text-sm leading-relaxed text-white/70">
        {containers.map(({ container_id, pallets, total_savings }) => (
          <span key={container_id} className="block">
            {container_id} {pallets}파렛트 ·{' '}
            <span className="num">{formatManwon(total_savings)}만 원</span>
          </span>
        ))}
      </p>
    </div>
  );
}
