'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts';

import type { SchemaT } from '@/types/api';

type TimelinePointT = SchemaT<'TimelinePoint'>;

type TemperatureChartPropsT = {
  timeline: TimelinePointT[];
  bandMin: number;
  bandMax: number;
};

/** '2026-11-17T10:00:00+09:00' → '10:00' (백엔드는 한국 시각 오프셋으로 보낸다) */
const formatTime = (ts: string) => ts.slice(11, 16);

/** 전원이 꺼져 있던 구간 목록. 끝은 다음 측정(복구) 시각까지로 잡는다 */
const getOutageRanges = (timeline: TimelinePointT[]) => {
  const ranges: { start: string; end: string }[] = [];
  timeline.forEach(({ ts, power_on }, index) => {
    if (power_on) return;
    const end = timeline[index + 1]?.ts ?? ts;
    const last = ranges.at(-1);
    if (last && timeline[index - 1]?.power_on === false) last.end = end;
    else ranges.push({ start: ts, end });
  });

  return ranges;
};

/** 품온 타임라인. 파란 띠는 적정 온도, 빨간 구간은 단전 */
export function TemperatureChart({ timeline, bandMin, bandMax }: TemperatureChartPropsT) {
  return (
    <div className="flex flex-col gap-2">
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={timeline}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
            {getOutageRanges(timeline).map(({ start, end }) => (
              <ReferenceArea
                key={start}
                x1={start}
                x2={end}
                fill="var(--berry-soft)"
                fillOpacity={0.9}
              />
            ))}
            <ReferenceArea y1={bandMin} y2={bandMax} fill="var(--brand-soft)" fillOpacity={0.9} />
            <XAxis dataKey="ts" tickFormatter={formatTime} minTickGap={40} />
            <YAxis domain={[-1, 12]} unit="℃" width={48} />
            <Line
              type="monotone"
              dataKey="temp_c"
              stroke="var(--navy)"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="flex gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-navy" />
          품온
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-[2px] bg-brand-soft" />
          적정 온도
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-3 rounded-[2px] bg-berry-soft" />
          단전
        </span>
      </div>
    </div>
  );
}
