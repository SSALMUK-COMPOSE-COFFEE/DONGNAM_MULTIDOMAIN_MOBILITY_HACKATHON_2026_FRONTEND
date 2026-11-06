import { PlayIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import type { TwinStateT } from '@/types/api';
import { formatManwon, formatPercent } from '@/utils/format';

type SensorSummaryPropsT = {
  twin: TwinStateT | null;
  onStart: () => void;
  isStarting: boolean;
};

/** 결론 배너: 누적 단전 → 계획 손실률 대비 예상 손실률 · 추가 손실액, 오른쪽에 시뮬레이션 시작 */
export function SensorSummary({ twin, onStart, isStarting }: SensorSummaryPropsT) {
  return (
    <div className="flex items-center gap-6 rounded-3xl bg-navy px-10 py-7 text-white">
      {twin ? (
        <p className="text-3xl font-bold">
          누적 단전 <span className="num">{twin.outage.cumulative_minutes}분</span>
          <span className="mx-4">→</span>
          예상 손실률 <span className="num">{formatPercent(twin.loss.planned_loss_rate)}</span>
          <span className="mx-2">→</span>
          <span className="num text-cyan">{formatPercent(twin.loss.predicted_loss_rate)}</span>
          <span className="mx-4">·</span>
          추가 손실 <span className="num text-cyan">+{formatManwon(twin.loss.delta_krw)}만 원</span>
        </p>
      ) : (
        <p className="text-2xl font-bold">
          아직 측정값이 없습니다. 아두이노를 연결하거나 시뮬레이션을 시작하세요.
        </p>
      )}
      <Button
        size="lg"
        variant="secondary"
        className="ml-auto shrink-0"
        onClick={onStart}
        disabled={isStarting}
      >
        <PlayIcon />
        4시간 단전 시뮬레이션
      </Button>
    </div>
  );
}
