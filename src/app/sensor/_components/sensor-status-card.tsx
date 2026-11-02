import { cn } from 'cn';
import type { ReactNode } from 'react';

import { TemperatureChart } from '@/app/sensor/_components/temperature-chart';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TwinStateT } from '@/types/api';
import { formatPercent } from '@/utils/format';

const STATUS_BADGE: Record<TwinStateT['status'], { label: string; className: string }> = {
  no_data: { label: '측정값 없음', className: 'bg-slate' },
  normal: { label: '정상', className: 'bg-ok' },
  warning: { label: '경고', className: 'bg-air' },
  critical: { label: '위험', className: 'bg-berry' },
};

type SensorStatusCardPropsT = {
  containerId: string;
  twin: TwinStateT | null;
};

/** 지금 품온·전원과 누적 단전, 측정 타임라인 */
export function SensorStatusCard({ containerId, twin }: SensorStatusCardPropsT) {
  const current = twin?.current;
  const status = STATUS_BADGE[twin?.status ?? 'no_data'];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {containerId} 품온 · 전원
          <Badge className={status.className}>{status.label}</Badge>
          {current && (
            <Badge className={current.power_on ? 'bg-ok' : 'bg-berry'}>
              {current.power_on ? '전원 켜짐' : '전원 꺼짐'}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {twin && current ? (
          <>
            <div className="grid grid-cols-4 gap-4">
              <Stat
                label="지금 품온"
                value={`${current.temp_c}℃`}
                isAlert={current.excursion_c > 0}
                note={`적정 ${twin.excursion.band_min_c}~${twin.excursion.band_max_c}℃`}
              />
              <Stat
                label="누적 단전"
                value={`${twin.outage.cumulative_minutes}분`}
                isAlert={twin.outage.cumulative_minutes > 0}
                note={`실증 노선 ${twin.outage.reference_minutes}분 · 보험 ${twin.outage.insurance_threshold_minutes}분`}
              />
              <Stat
                label="최고 품온"
                value={`${twin.excursion.max_temp_c}℃`}
                isAlert={twin.excursion.minutes_above_band > 0}
                note={`적정 초과 ${twin.excursion.minutes_above_band}분`}
              />
              <Stat
                label="센서 기준 손실률"
                value={formatPercent(twin.loss.sensor_loss_rate)}
                isAlert={twin.loss.sensor_loss_rate > twin.loss.no_outage_loss_rate}
                note={`단전 없을 때 ${formatPercent(twin.loss.no_outage_loss_rate)}`}
              />
            </div>
            <TemperatureChart
              timeline={twin.timeline}
              bandMin={twin.excursion.band_min_c}
              bandMax={twin.excursion.band_max_c}
            />
          </>
        ) : (
          <p className="text-muted-foreground">
            시뮬레이션을 시작하면 품온·전원·손실이 1초마다 갱신됩니다.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

type StatPropsT = {
  label: string;
  value: ReactNode;
  note: string;
  isAlert: boolean;
};

function Stat({ label, value, note, isAlert }: StatPropsT) {
  return (
    <div className="rounded-2xl bg-panel px-5 py-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className={cn('text-3xl font-bold num', isAlert ? 'text-berry' : 'text-navy')}>{value}</p>
      <p className="mt-1 text-xs num text-muted-foreground">{note}</p>
    </div>
  );
}
