'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import { coldchainContainerQueryOptions } from '@/apis/getColdchainContainer';
import { postColdchainBinding, postColdchainSimulation } from '@/apis/postColdchainSimulation';
import { ActionList } from '@/app/sensor/_components/action-list';
import { AlertFeed } from '@/app/sensor/_components/alert-feed';
import { LossLotTable } from '@/app/sensor/_components/loss-lot-table';
import { SensorStatusCard } from '@/app/sensor/_components/sensor-status-card';
import { SensorSummary } from '@/app/sensor/_components/sensor-summary';
import { CurrentPlanGate } from '@/components/current-plan-gate';
import { PlanLoadError } from '@/components/plan-load-error';
import {
  DEMO_CONTAINER_ID,
  DEMO_DEVICE_ID,
  SIMULATION_INTERVAL_SECONDS,
  SIMULATION_PRESET,
} from '@/consts/demo';
import { useAlertStream } from '@/hooks/useAlertStream';
import type { AlertT, PlanSessionT } from '@/types/api';

export function SensorView() {
  return (
    <CurrentPlanGate reason="센서를 계획의 컨테이너에 연결해야 손실액을 계산할 수 있습니다.">
      {session => <SensorDashboard session={session} />}
    </CurrentPlanGate>
  );
}

/** 서버와 브라우저 시계가 조금 어긋나도 새 알림을 놓치지 않도록 둔 여유 */
const CLOCK_SKEW_MS = 2_000;
const nowWithSkew = () => new Date(Date.now() - CLOCK_SKEW_MS).toISOString();

function SensorDashboard({ session }: { session: PlanSessionT }) {
  const { plan_id: planId, scenario } = session;

  /**
   * SSE 는 연결할 때 서버의 지난 알림을 모두 다시 보낸다.
   * 이전 시연의 알림이 섞이지 않도록 이 시각 이후에 생긴 알림만 보여준다.
   * 화면을 연 시각에서 시작하고, 시뮬레이션을 시작할 때마다 갱신한다.
   */
  const [since, setSince] = useState(nowWithSkew);
  const isRecent = (alert: AlertT) => !!alert.created_at && alert.created_at >= since;

  const twinQuery = useQuery(coldchainContainerQueryOptions(DEMO_CONTAINER_ID));
  const twin = twinQuery.data ?? null;
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
    <div className="flex flex-col gap-6">
      <SensorSummary twin={twin} onStart={() => startSimulation()} isStarting={isPending} />

      {/* 1초 폴링이라 한 번 실패해도 다음 폴링에서 회복될 수 있다. 계속 실패할 때만 알린다 */}
      {twinQuery.isError && !twin && (
        <PlanLoadError
          message="센서 측정값을 불러오지 못했습니다. 서버 연결을 확인하세요."
          onRetry={() => twinQuery.refetch()}
          isRetrying={twinQuery.isFetching}
        />
      )}

      <div className="grid grid-cols-[1fr_440px] gap-6">
        <div className="flex flex-col gap-6">
          <SensorStatusCard containerId={DEMO_CONTAINER_ID} twin={twin} />
          {!!twin?.loss.lots?.length && <LossLotTable lots={twin.loss.lots} scenario={scenario} />}
        </div>

        <div className="flex flex-col gap-6">
          <ActionList actions={twin?.actions ?? []} />
          <AlertFeed alerts={alerts} />
        </div>
      </div>
    </div>
  );
}
