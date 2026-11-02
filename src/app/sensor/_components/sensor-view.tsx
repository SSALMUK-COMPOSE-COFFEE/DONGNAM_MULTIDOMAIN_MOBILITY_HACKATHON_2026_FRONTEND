'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

import { coldchainContainerQueryOptions } from '@/apis/getColdchainContainer';
import { postColdchainBinding, postColdchainSimulation } from '@/apis/postColdchainSimulation';
import { AlertFeed } from '@/app/sensor/_components/alert-feed';
import { TemperatureChart } from '@/app/sensor/_components/temperature-chart';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DEMO_CONTAINER_ID,
  DEMO_DEVICE_ID,
  SIMULATION_INTERVAL_SECONDS,
  SIMULATION_PRESET,
} from '@/consts/demo';
import { ROUTES } from '@/consts/route';
import { useAlertStream } from '@/hooks/useAlertStream';
import { usePlanStore } from '@/stores/usePlanStore';
import type { AlertT, TwinStateT } from '@/types/api';
import { formatManwon, formatPercent } from '@/utils/format';

export function SensorView() {
  const planId = usePlanStore(state => state.planId);

  if (!planId) {
    return (
      <p className="text-muted-foreground">
        먼저{' '}
        <Link href={ROUTES.PLAN} className="font-bold text-sea underline">
          운송계획
        </Link>
        을 생성하세요. 센서를 계획의 컨테이너에 연결해야 손실액을 계산할 수 있습니다.
      </p>
    );
  }

  return <SensorDashboard planId={planId} />;
}

/** 서버와 브라우저 시계가 조금 어긋나도 새 알림을 놓치지 않도록 둔 여유 */
const CLOCK_SKEW_MS = 2_000;
const nowWithSkew = () => new Date(Date.now() - CLOCK_SKEW_MS).toISOString();

function SensorDashboard({ planId }: { planId: string }) {
  /**
   * SSE 는 연결할 때 서버의 지난 알림을 모두 다시 보낸다.
   * 이전 시연의 알림이 섞이지 않도록 이 시각 이후에 생긴 알림만 보여준다.
   * 화면을 연 시각에서 시작하고, 시뮬레이션을 시작할 때마다 갱신한다.
   */
  const [since, setSince] = useState(nowWithSkew);
  const isRecent = (alert: AlertT) => !!alert.created_at && alert.created_at >= since;

  const { data: twin } = useQuery(coldchainContainerQueryOptions(DEMO_CONTAINER_ID));
  const current = twin?.current;
  const alerts = useAlertStream(DEMO_CONTAINER_ID, alert => {
    if (!isRecent(alert)) return;
    const notify = alert.level === 'critical' ? toast.error : toast.warning;
    notify(alert.title, { description: alert.message });
  }).filter(isRecent);

  const { mutate: startSimulation, isPending } = useMutation({
    onMutate: () => setSince(nowWithSkew()),
    mutationFn: async () => {
      await postColdchainBinding({
        device_id: DEMO_DEVICE_ID,
        container_id: DEMO_CONTAINER_ID,
        plan_id: planId,
        stage: 'terminal',
      });
      return postColdchainSimulation({
        preset: SIMULATION_PRESET,
        container_id: DEMO_CONTAINER_ID,
        plan_id: planId,
        device_id: DEMO_DEVICE_ID,
        stage: 'terminal',
        interval_seconds: SIMULATION_INTERVAL_SECONDS,
        reset: true,
      });
    },
    onError: () => toast.error('시뮬레이션을 시작하지 못했습니다.'),
  });

  return (
    <div className="grid grid-cols-[1fr_380px] gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            손실 관제 · {DEMO_CONTAINER_ID}
            {current && (
              <Badge variant={current.power_on ? 'secondary' : 'destructive'}>
                {current.power_on ? '전원 정상' : '전원 차단'}
              </Badge>
            )}
          </CardTitle>
          <CardDescription className="num">
            {twin && current
              ? `품온 ${current.temp_c}℃ (적정 ${twin.excursion.band_min_c}~${twin.excursion.band_max_c}℃) · 누적 단전 ${twin.outage.cumulative_minutes}분`
              : '측정값이 없습니다. 아두이노를 연결하거나 시뮬레이션을 시작하세요'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {twin && (
            <>
              <LossSummary loss={twin.loss} />
              <TemperatureChart
                timeline={twin.timeline}
                bandMin={twin.excursion.band_min_c}
                bandMax={twin.excursion.band_max_c}
              />
            </>
          )}
          <div>
            <Button onClick={() => startSimulation()} disabled={isPending}>
              단전 시뮬레이션 시작 (4시간 단전 → 복구)
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-6">
        {twin && twin.actions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>자동 조치</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {twin.actions.map(({ key, title }) => (
                <p key={key} className="text-sm">
                  {title}
                </p>
              ))}
            </CardContent>
          </Card>
        )}
        <AlertFeed alerts={alerts} />
      </div>
    </div>
  );
}

function LossSummary({ loss }: { loss: TwinStateT['loss'] }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <div>
        <p className="text-sm text-muted-foreground">단전 없을 때 손실률</p>
        <p className="num text-2xl font-semibold">{formatPercent(loss.no_outage_loss_rate)}</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">센서 기준 예상 손실률</p>
        <p className="num text-2xl font-semibold text-berry">
          {formatPercent(loss.predicted_loss_rate)}
        </p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">계획 대비 추가 손실액</p>
        <p className="num text-2xl font-semibold text-berry">
          +{formatManwon(loss.delta_krw)}
          <span className="ml-1 text-base text-muted-foreground">만 원</span>
        </p>
      </div>
    </div>
  );
}
