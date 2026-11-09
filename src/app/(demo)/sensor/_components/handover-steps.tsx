import { cn } from 'cn';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TwinStateT } from '@/types/api';

type HandoverT = NonNullable<TwinStateT['handover']>;
type OutageKindT = HandoverT['outage_kind'];

const OUTAGE_BADGE: Record<OutageKindT, { label: string; className: string }> = {
  none: { label: '전원 정상', className: 'bg-ok' },
  planned: { label: '계획 단전', className: 'bg-air' },
  planned_warning: { label: '계획 단전 주의', className: 'bg-air' },
  abnormal: { label: '이상 단전', className: 'bg-berry' },
};

const ACTIVE_STEP: Record<OutageKindT, string> = {
  none: 'border-navy bg-navy text-white',
  planned: 'border-air bg-air-soft text-navy',
  planned_warning: 'border-air bg-air-soft text-navy ring-2 ring-air',
  abnormal: 'border-berry bg-berry-soft text-berry',
};

export function HandoverSteps({ handover }: { handover: HandoverT }) {
  const {
    current_step: currentStep,
    outage_kind: outageKind,
    continuous_off_minutes: continuous,
    cumulative_off_minutes: cumulative,
    excess_minutes: excess,
    warning,
    allowance,
    steps,
    rule,
  } = handover;
  const badge = OUTAGE_BADGE[outageKind];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          해상→육상 전환 진행
          <Badge className={badge.className}>{badge.label}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <ol className="grid grid-cols-7 gap-3">
          {steps.map(({ step, title, power, system }) => {
            const isActive = step === currentStep;
            const isPast = step < currentStep;

            return (
              <li
                key={step}
                aria-current={isActive ? 'step' : false}
                className={cn(
                  'flex flex-col gap-1 rounded-2xl border p-3',
                  isActive ? ACTIVE_STEP[outageKind] : 'border-line bg-card',
                  isPast && 'opacity-60'
                )}
              >
                <span className="text-sm font-bold num">{step}단계</span>
                <span className="font-bold">{title}</span>
                <span className="text-sm font-bold">전원 {power}</span>
                <span className={cn('text-xs', !isActive && 'text-muted-foreground')}>
                  {system}
                </span>
              </li>
            );
          })}
        </ol>

        <dl className="grid grid-cols-4 gap-4 border-t border-line pt-4">
          <Metric label="연속 단전" value={`${continuous}분`} />
          <Metric label="누적 단전" value={`${cumulative}분`} />
          <Metric label="허용 · 주의 (가정)" value={`${allowance.value}분 · ${warning.value}분`} />
          <Metric label="초과 단전" value={`${excess}분`} isAlert={excess > 0} />
        </dl>
        <p className="text-sm text-muted-foreground">{rule}</p>
      </CardContent>
    </Card>
  );
}

type MetricPropsT = {
  label: string;
  value: string;
  isAlert?: boolean;
};

function Metric({ label, value, isAlert = false }: MetricPropsT) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className={cn('text-2xl font-bold num', isAlert ? 'text-berry' : 'text-navy')}>
        {value}
      </dd>
    </div>
  );
}
