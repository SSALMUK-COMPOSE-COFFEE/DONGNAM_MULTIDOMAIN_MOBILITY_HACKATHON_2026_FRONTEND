'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { coldchainContainerQueryOptions } from '@/apis/getColdchainContainer';
import { postColdchainBinding, postColdchainSimulation } from '@/apis/postColdchainSimulation';
import { ActionList } from '@/app/(demo)/sensor/_components/action-list';
import { AlertFeed } from '@/app/(demo)/sensor/_components/alert-feed';
import { HandoverSteps } from '@/app/(demo)/sensor/_components/handover-steps';
import { LossLotTable } from '@/app/(demo)/sensor/_components/loss-lot-table';
import { SensorStatusCard } from '@/app/(demo)/sensor/_components/sensor-status-card';
import { SensorSummary } from '@/app/(demo)/sensor/_components/sensor-summary';
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

const LIVE_POLLING_MS = 1_000;
const IDLE_POLLING_MS = 10_000;
const LIVE_GRACE_MS = 15_000;
const SIMULATION_START_GRACE_MS = 60_000;
const CLOCK_SKEW_MS = 2_000;
const nowWithSkew = () => new Date(Date.now() - CLOCK_SKEW_MS).toISOString();

function SensorDashboard({ session }: { session: PlanSessionT }) {
  const { plan_id: planId, scenario } = session;

  const [since, setSince] = useState(nowWithSkew);
  const isRecent = (alert: AlertT) => !!alert.created_at && alert.created_at >= since;

  const liveUntilRef = useRef(0);
  const lastReadingCountRef = useRef<number | null>(null);
  const twinQuery = useQuery({
    ...coldchainContainerQueryOptions(DEMO_CONTAINER_ID, planId),
    refetchInterval: query => {
      const readingCount = query.state.data?.reading_count ?? null;
      if (readingCount !== lastReadingCountRef.current) {
        lastReadingCountRef.current = readingCount;
        liveUntilRef.current = Date.now() + LIVE_GRACE_MS;
      }
      return Date.now() < liveUntilRef.current ? LIVE_POLLING_MS : IDLE_POLLING_MS;
    },
  });
  const twin = twinQuery.data ?? null;
  const alerts = useAlertStream(DEMO_CONTAINER_ID, planId, alert => {
    if (!isRecent(alert)) return;
    const notify = alert.level === 'critical' ? toast.error : toast.warning;
    notify(alert.title, { description: alert.message });
  }).filter(isRecent);

  const { mutate: startSimulation, isPending } = useMutation({
    onMutate: () => {
      setSince(nowWithSkew());
      liveUntilRef.current = Date.now() + SIMULATION_START_GRACE_MS;
    },
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
    onSuccess: () => twinQuery.refetch(),
    onError: () => toast.error('시뮬레이션을 시작하지 못했습니다.'),
  });

  return (
    <div className="flex flex-col gap-5">
      <SensorSummary twin={twin} onStart={() => startSimulation()} isStarting={isPending} />

      {twinQuery.isError && !twin && (
        <PlanLoadError
          message="센서 측정값을 불러오지 못했습니다. 서버 연결을 확인하세요."
          onRetry={() => twinQuery.refetch()}
          isRetrying={twinQuery.isFetching}
        />
      )}

      {twin?.handover && <HandoverSteps handover={twin.handover} />}

      <div className="grid grid-cols-12 items-stretch gap-5">
        <div className="col-span-7 flex flex-col">
          <SensorStatusCard containerId={DEMO_CONTAINER_ID} twin={twin} />
        </div>

        <div className="col-span-5 grid grid-rows-[auto_1fr] gap-5">
          <ActionList actions={twin?.actions ?? []} />
          <AlertFeed alerts={alerts} />
        </div>
      </div>

      {!!twin?.loss.lots?.length && <LossLotTable lots={twin.loss.lots} scenario={scenario} />}
    </div>
  );
}
