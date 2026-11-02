import { Card, CardContent } from '@/components/ui/card';
import type { SchemaT } from '@/types/api';
import { formatManwon } from '@/utils/format';

type PlanSummaryPropsT = { plan: SchemaT<'Plan'> };

export function PlanSummary({ plan }: PlanSummaryPropsT) {
  const metrics = [
    { label: '화주별 단독 운송 총비용', value: plan.total_baseline_cost, tone: 'text-foreground' },
    { label: '공동적재 총비용', value: plan.total_shared_cost, tone: 'text-sea' },
    { label: '아낀 돈', value: plan.total_savings, tone: 'text-ok' },
    { label: '성과보수 (25%)', value: plan.total_fee, tone: 'text-air' },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {metrics.map(({ label, value, tone }) => (
        <Card key={label}>
          <CardContent>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={`mt-1 text-3xl font-semibold num ${tone}`}>
              {formatManwon(value)}
              <span className="ml-1 text-base text-muted-foreground">만 원</span>
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
