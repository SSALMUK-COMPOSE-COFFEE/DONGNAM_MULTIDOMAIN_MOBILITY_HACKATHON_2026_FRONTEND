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

type TemperatureChartPropsT = {
  timeline: SchemaT<'TimelinePoint'>[];
  bandMin: number;
  bandMax: number;
};

const formatTime = (ts: string) =>
  new Date(ts).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });

export function TemperatureChart({ timeline, bandMin, bandMax }: TemperatureChartPropsT) {
  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={timeline}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
          {/* 적정 온도 범위 */}
          <ReferenceArea y1={bandMin} y2={bandMax} fill="var(--sea-soft)" fillOpacity={0.7} />
          <XAxis dataKey="ts" tickFormatter={formatTime} minTickGap={40} />
          <YAxis domain={[-1, 12]} unit="℃" width={48} />
          <Line
            type="monotone"
            dataKey="temp_c"
            stroke="var(--sea)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
