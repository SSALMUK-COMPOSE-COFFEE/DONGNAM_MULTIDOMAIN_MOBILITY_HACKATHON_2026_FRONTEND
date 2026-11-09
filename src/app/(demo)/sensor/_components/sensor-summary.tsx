import { PlayIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { TwinStateT } from '@/types/api';
import { formatManwon, formatPercent } from '@/utils/format';

type SensorSummaryPropsT = {
  twin: TwinStateT | null;
  onStart: () => void;
  isStarting: boolean;
};

export function SensorSummary({ twin, onStart, isStarting }: SensorSummaryPropsT) {
  const allowanceMinutes = twin?.handover?.allowance.value ?? 30;
  const excessMinutes = twin?.handover?.excess_minutes ?? 0;
  const cumulativeMinutes = twin?.outage.cumulative_minutes ?? 0;
  const normalOutageMinutes = Math.max(0, cumulativeMinutes - excessMinutes);

  return (
    <div className="flex items-center justify-between gap-6 rounded-3xl bg-navy px-8 py-5 text-white">
      {twin ? (
        <div className="flex flex-1 items-center gap-6">
          <div className="flex flex-col gap-1.5 border-r border-white/15 pr-4">
            <div className="flex items-center gap-2">
              <Badge className="bg-brand text-white">단전 손실 산정 원칙</Badge>
              <span className="text-sm num text-brand-soft">
                하역 계획 단전 허용 {allowanceMinutes}분(가정) 무손실 · 초과분만 손실 반영
              </span>
            </div>
            <p className="text-2xl font-bold tracking-tight">
              총 단전 <span className="num">{cumulativeMinutes}분</span> 중 허용{' '}
              <span className="num text-ok-soft">{allowanceMinutes}분</span>(가정)은 정상, 초과{' '}
              <span className="num text-cyan">{excessMinutes}분</span>만 손실에 반영
            </p>
          </div>

          <div className="grid flex-1 grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white/10 px-4 py-2.5">
              <p className="text-xs text-brand-soft">1. 계획 단전 (손실 미반영)</p>
              <p className="mt-0.5 text-2xl font-bold num text-white">
                {normalOutageMinutes}분
                <span className="ml-2 text-sm font-medium num text-brand-soft">
                  / 허용 {allowanceMinutes}분(가정)
                </span>
              </p>
            </div>

            <div className="rounded-2xl bg-berry/25 px-4 py-2.5 ring-1 ring-berry/60">
              <p className="text-xs text-berry-soft">2. 이상 초과 단전 (손실 반영)</p>
              <p className="mt-0.5 text-2xl font-bold num text-cyan">
                +{excessMinutes}분
                <span className="ml-2 text-sm font-medium num text-white">
                  ({formatPercent(twin.loss.planned_loss_rate)} →{' '}
                  {formatPercent(twin.loss.predicted_loss_rate)})
                </span>
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 px-4 py-2.5">
              <p className="text-xs text-brand-soft">3. 초과분 화주 추가 손실</p>
              <p className="mt-0.5 text-2xl font-bold num text-cyan">
                +{formatManwon(twin.loss.delta_krw)}만 원
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Badge className="bg-brand text-white">해상→육상 전환 단전 관제</Badge>
            <span className="text-sm text-brand-soft">
              하역 시 계획 단전 허용 시간(가정) 내 무손실 · 초과 단전만 손실 산정
            </span>
          </div>
          <p className="text-2xl font-bold">
            아직 측정값이 없습니다. 아두이노를 연결하거나 시뮬레이션을 시작하세요.
          </p>
        </div>
      )}

      <Button
        size="lg"
        variant="secondary"
        className="shrink-0"
        onClick={onStart}
        disabled={isStarting}
      >
        <PlayIcon />
        해상→육상 전환 시뮬레이션
      </Button>
    </div>
  );
}
