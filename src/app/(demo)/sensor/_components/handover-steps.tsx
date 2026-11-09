import { cn } from 'cn';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TwinStateT } from '@/types/api';

type HandoverT = NonNullable<TwinStateT['handover']>;
type OutageKindT = HandoverT['outage_kind'];

const OUTAGE_META: Record<
  OutageKindT,
  {
    label: string;
    desc: string;
    badgeClass: string;
    bannerClass: string;
    activeStepClass: string;
  }
> = {
  none: {
    label: '전원 정상',
    desc: '냉동기 전원 연결 상태 · 정상 가동 중',
    badgeClass: 'bg-ok text-white',
    bannerClass: 'border-ok/30 bg-ok-soft text-navy',
    activeStepClass: 'border-navy bg-navy text-white ring-4 ring-navy/15',
  },
  planned: {
    label: '계획 단전 (정상)',
    desc: '하역 전환 중 계획된 단전 · 손실 미반영 구간',
    badgeClass: 'bg-air text-white',
    bannerClass: 'border-air/40 bg-air-soft text-navy',
    activeStepClass: 'border-air bg-air-soft text-navy ring-4 ring-air/20',
  },
  planned_warning: {
    label: '계획 단전 주의',
    desc: '주의 기준 도달 · 허용 시간 초과 전 전원 연결 필요',
    badgeClass: 'bg-air text-white',
    bannerClass: 'border-air bg-air-soft text-navy ring-2 ring-air',
    activeStepClass: 'border-air bg-air-soft text-navy ring-4 ring-air/35',
  },
  abnormal: {
    label: '이상 단전 (손실 발생)',
    desc: '허용 시간 초과 · 초과 단전 시간만큼 손실률 반영',
    badgeClass: 'bg-berry text-white',
    bannerClass: 'border-berry bg-berry-soft text-berry ring-2 ring-berry/40',
    activeStepClass: 'border-berry bg-berry text-white ring-4 ring-berry/25',
  },
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

  const meta = OUTAGE_META[outageKind];
  const activeStepObj = steps.find(item => item.step === currentStep) ?? steps[0];
  const maxScale = Math.max(allowance.value + 20, cumulative, continuous, 50);
  const warningPct = Math.min(100, (warning.value / maxScale) * 100);
  const allowancePct = Math.min(100, (allowance.value / maxScale) * 100);
  const displayMinutes = Math.max(continuous, cumulative);
  const safeFillPct = Math.min(
    allowancePct,
    (Math.min(displayMinutes, allowance.value) / maxScale) * 100
  );
  const excessFillPct =
    displayMinutes > allowance.value
      ? Math.min(100 - allowancePct, ((displayMinutes - allowance.value) / maxScale) * 100)
      : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-3">
            <span>해상→육상 전환 진행</span>
            <Badge className={cn('px-3.5 py-1 text-sm', meta.badgeClass)}>{meta.label}</Badge>
            <span className="text-base font-medium text-muted-foreground">{meta.desc}</span>
          </CardTitle>

          {activeStepObj && (
            <div
              className={cn(
                'flex items-center gap-3 rounded-2xl border px-4 py-2',
                meta.bannerClass
              )}
            >
              <span className="text-sm font-bold num">현재 {activeStepObj.step}단계</span>
              <span className="text-lg font-bold">{activeStepObj.title}</span>
              <Badge variant="outline" className="border-line bg-white/90 num text-navy">
                전원 {activeStepObj.power}
              </Badge>
              <span className="text-sm font-medium">{activeStepObj.system}</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-5">
        <div className="grid grid-cols-[1fr_420px] items-center gap-6 rounded-2xl border border-line bg-panel p-4">
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-navy">
                단전 허용 시간 대비 진행{' '}
                <span className="font-normal text-muted-foreground">
                  (주의 <span className="num">{warning.value}분</span> · 허용{' '}
                  <span className="num">{allowance.value}분</span> 가정)
                </span>
              </span>
              <span className="text-xs text-muted-foreground">{rule}</span>
            </div>

            <div className="relative h-7 w-full overflow-hidden rounded-full bg-white ring-1 ring-line">
              <div
                className="absolute inset-y-0 left-0 bg-brand-soft/70"
                style={{ width: `${allowancePct}%` }}
              />
              <div
                className="absolute inset-y-0 bg-ok transition-all duration-300"
                style={{ left: '0%', width: `${safeFillPct}%` }}
              />
              {excessFillPct > 0 && (
                <div
                  className="absolute inset-y-0 bg-berry transition-all duration-300"
                  style={{ left: `${allowancePct}%`, width: `${excessFillPct}%` }}
                />
              )}
              <div
                className="absolute inset-y-0 z-10 border-l-2 border-dashed border-air"
                style={{ left: `${warningPct}%` }}
              />
              <div
                className="absolute inset-y-0 z-10 border-l-2 border-navy"
                style={{ left: `${allowancePct}%` }}
              />
            </div>

            <div className="relative h-5 text-xs font-bold num">
              <span className="absolute left-0 text-muted-foreground">0분 (단전 시작)</span>
              <span
                className="absolute -translate-x-1/2 text-air"
                style={{ left: `${warningPct}%` }}
              >
                주의 {warning.value}분(가정)
              </span>
              <span
                className="absolute -translate-x-1/2 text-navy"
                style={{ left: `${allowancePct}%` }}
              >
                허용 {allowance.value}분(가정) · 무손실 한계
              </span>
              <span className="absolute right-0 text-berry">초과 구간 (+{excess}분 손실 반영)</span>
            </div>
          </div>

          <dl className="grid grid-cols-4 gap-2 border-l border-line pl-6">
            <Metric
              label="연속 단전"
              value={`${continuous}분`}
              sub="현재 구간"
              tone={continuous > allowance.value ? 'berry' : 'navy'}
            />
            <Metric label="누적 단전" value={`${cumulative}분`} sub="전환 전체" tone="navy" />
            <Metric
              label="허용 · 주의 (가정)"
              value={`${allowance.value}·${warning.value}분`}
              sub="계획 단전 기준"
              tone="ok"
            />
            <Metric
              label="초과 단전"
              value={`+${excess}분`}
              sub="손실 반영"
              tone={excess > 0 ? 'berry' : 'navy'}
            />
          </dl>
        </div>

        <ol className="grid grid-cols-7 gap-2.5">
          {steps.map(({ step, title, power, system }) => {
            const isActive = step === currentStep;
            const isPast = step < currentStep;
            const isOffPower = power.includes('OFF');

            return (
              <li
                key={step}
                aria-current={isActive ? 'step' : false}
                className={cn(
                  'flex flex-col justify-between gap-2 rounded-2xl border p-3.5 transition-all',
                  isActive && meta.activeStepClass,
                  !isActive && isPast && 'border-line bg-panel/70 opacity-65',
                  !isActive && !isPast && 'border-line bg-card'
                )}
              >
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className={cn(
                        'text-xs font-bold num',
                        isActive ? 'opacity-90' : 'text-muted-foreground'
                      )}
                    >
                      {step}단계
                    </span>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-bold num',
                        isActive && 'bg-white/20 text-current',
                        !isActive && isOffPower && 'bg-berry-soft text-berry',
                        !isActive && !isOffPower && 'bg-ok-soft text-ok'
                      )}
                    >
                      전원 {power}
                    </span>
                  </div>
                  <p className="text-base leading-snug font-bold">{title}</p>
                </div>

                <p
                  className={cn(
                    'text-xs leading-relaxed',
                    isActive ? 'font-medium opacity-95' : 'text-muted-foreground'
                  )}
                >
                  {system}
                </p>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}

type MetricPropsT = {
  label: string;
  value: string;
  sub: string;
  tone: 'navy' | 'ok' | 'berry';
};

function Metric({ label, value, sub, tone }: MetricPropsT) {
  const toneClass = { berry: 'text-berry', ok: 'text-ok', navy: 'text-navy' }[tone];

  return (
    <div className="flex flex-col">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className={cn('mt-0.5 text-2xl font-black num tracking-tight', toneClass)}>{value}</dd>
      <dd className="text-xs text-muted-foreground">{sub}</dd>
    </div>
  );
}
