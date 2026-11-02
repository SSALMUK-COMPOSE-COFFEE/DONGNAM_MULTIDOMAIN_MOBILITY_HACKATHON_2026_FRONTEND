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

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { IS_API_MOCKING } from '@/consts/api';
import { useSensorSocket } from '@/hooks/useSensorSocket';

const CONTAINER_ID = 'CA-01';
/** 딸기 CA 목표 온도 */
const TARGET_TEMP = { min: 2, max: 4 };

const STATUS_LABEL = { connecting: '연결 중', open: '수신 중', closed: '끊김 · 재연결 대기' };

export function SensorView() {
  const { readings, latest, status, send } = useSensorSocket(CONTAINER_ID);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          손실 관제 · {CONTAINER_ID}
          <Badge variant={status === 'open' ? 'secondary' : 'outline'}>
            {STATUS_LABEL[status]}
          </Badge>
        </CardTitle>
        <CardDescription className="num">
          {latest
            ? `내부 ${latest.tempC}℃ · 전원 ${latest.power === 'on' ? '정상' : '차단'} · 예상 손실률 ${(latest.lossRate * 100).toFixed(1)}%`
            : '첫 측정값을 기다리는 중'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={readings}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--grid)" />
              <ReferenceArea
                y1={TARGET_TEMP.min}
                y2={TARGET_TEMP.max}
                fill="var(--sea-soft)"
                fillOpacity={0.6}
              />
              <XAxis dataKey="ts" hide />
              <YAxis domain={[0, 8]} unit="℃" width={48} />
              <Line
                type="monotone"
                dataKey="tempC"
                stroke="var(--sea)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 목업에서만 쓰는 버튼. 실제 시연에서는 아두이노 전원을 직접 뽑는다 */}
        {IS_API_MOCKING && (
          <div className="flex gap-2">
            <Button variant="destructive" onClick={() => send({ type: 'power', power: 'off' })}>
              전원 차단 (목업)
            </Button>
            <Button variant="outline" onClick={() => send({ type: 'power', power: 'on' })}>
              전원 복구 (목업)
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
