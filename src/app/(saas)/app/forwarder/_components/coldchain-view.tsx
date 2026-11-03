'use client';

import { cn } from 'cn';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  useForwarderAlertStream,
  useForwarderContainer,
  useForwarderContainers,
  useForwarderPlan,
  useForwarderPlans,
} from '@/apis/saas/forwarder';
import { FORWARDER_PATHS } from '@/app/(saas)/app/forwarder/_components/forwarder-paths';
import { EmptyState, QueryError } from '@/app/(saas)/app/forwarder/_components/query-state';
import { AlertFeed } from '@/components/alert-feed';
import { SectionErrorBoundary } from '@/components/section-error-boundary';
import { SensorStatusCard } from '@/components/sensor-status-card';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { ForwarderStreamStateT, ForwarderTwinSummaryT } from '@/types/saas-forwarder';
import { formatPercent } from '@/utils/format';
import { formatKstMonthDayTime } from '@/utils/kst';
import { NO_VESSEL_LABEL } from '@/utils/plan-label';

const TWIN_STATUS: Record<ForwarderTwinSummaryT['status'], { label: string; className: string }> = {
  no_data: { label: '측정값 없음', className: 'bg-slate' },
  normal: { label: '정상', className: 'bg-ok' },
  warning: { label: '경고', className: 'bg-air' },
  critical: { label: '위험', className: 'bg-berry' },
};

const STREAM_LABEL: Record<ForwarderStreamStateT, { label: string; className: string }> = {
  connecting: { label: '연결 중', className: 'bg-slate' },
  open: { label: '실시간 수신 중', className: 'bg-ok' },
  retrying: { label: '다시 연결 중', className: 'bg-air' },
};

export function ColdchainView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plans = useForwarderPlans();

  if (plans.isPending) {
    return (
      <div aria-busy className="flex flex-col gap-6">
        <Skeleton className="h-16 w-96" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (plans.isError) {
    return (
      <QueryError
        message="배정된 항차를 불러오지 못했습니다. 서버 연결을 확인하세요."
        onRetry={() => plans.refetch()}
        isRetrying={plans.isFetching}
      />
    );
  }

  if (plans.data.length === 0) {
    return (
      <EmptyState
        title="콜드체인을 볼 항차가 없습니다"
        description="플랫폼이 항차를 배정하면 컨테이너 품온과 알림을 여기서 봅니다."
      />
    );
  }

  const requested = searchParams.get('plan_id');
  const planId = plans.data.some(({ plan_id }) => plan_id === requested)
    ? (requested as string)
    : plans.data[0].plan_id;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4">
        <span className="font-bold text-muted-foreground">항차</span>
        <Select
          value={planId}
          onValueChange={next => router.replace(FORWARDER_PATHS.COLDCHAIN(next))}
        >
          <SelectTrigger className="w-96">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {plans.data.map(({ plan_id, vessel, departure }) => (
              <SelectItem key={plan_id} value={plan_id}>
                {vessel ?? NO_VESSEL_LABEL} · 출항 {formatKstMonthDayTime(departure)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <PlanColdchain
        key={planId}
        planId={planId}
        containerParam={searchParams.get('container_id')}
      />
    </div>
  );
}

type PlanColdchainPropsT = {
  planId: string;
  containerParam: string | null;
};

function PlanColdchain({ planId, containerParam }: PlanColdchainPropsT) {
  const plan = useForwarderPlan(planId);
  const containers = useForwarderContainers(planId);
  const stream = useForwarderAlertStream(planId);

  const summaries = containers.data ?? [];
  const planContainerIds = (plan.data?.plan.containers ?? [])
    .filter(({ used }) => used)
    .map(({ container_id }) => container_id);
  const containerIds = [
    ...new Set([...planContainerIds, ...summaries.map(({ container_id }) => container_id)]),
  ];
  const containerId =
    containerParam && containerIds.includes(containerParam) ? containerParam : containerIds[0];
  const isLoading = plan.isPending || containers.isPending;
  const streamState = STREAM_LABEL[stream.state];

  return (
    <div className="flex flex-col gap-6">
      {containers.isError && (
        <QueryError
          message="컨테이너 상태를 불러오지 못했습니다."
          onRetry={() => containers.refetch()}
          isRetrying={containers.isFetching}
        />
      )}

      <ContainerTiles
        planId={planId}
        containerIds={containerIds}
        summaries={summaries}
        activeId={containerId}
        isLoading={isLoading}
      />

      <div className="grid grid-cols-[1fr_420px] gap-6">
        <ContainerPanel planId={planId} containerId={containerId} isLoading={isLoading} />
        <div className="flex flex-col gap-3">
          <Badge className={cn('self-end', streamState.className)}>{streamState.label}</Badge>
          <AlertFeed alerts={stream.alerts.filter(alert => alert.container_id === containerId)} />
        </div>
      </div>
    </div>
  );
}

type ContainerPanelPropsT = {
  planId: string;
  containerId: string | undefined;
  isLoading: boolean;
};

function ContainerPanel({ planId, containerId, isLoading }: ContainerPanelPropsT) {
  if (containerId) {
    return (
      <SectionErrorBoundary message="품온 정보를 그리지 못했습니다." className="h-96">
        <ContainerTwin planId={planId} containerId={containerId} />
      </SectionErrorBoundary>
    );
  }

  if (isLoading) return <Skeleton className="h-96" />;

  return (
    <Card>
      <CardContent className="py-10 text-center text-muted-foreground">
        품온을 볼 컨테이너가 없습니다.
      </CardContent>
    </Card>
  );
}

type ContainerTilesPropsT = {
  planId: string;
  containerIds: string[];
  summaries: ForwarderTwinSummaryT[];
  activeId: string | undefined;
  isLoading: boolean;
};

function ContainerTiles({
  planId,
  containerIds,
  summaries,
  activeId,
  isLoading,
}: ContainerTilesPropsT) {
  if (isLoading) return <Skeleton className="h-28" />;

  if (containerIds.length === 0) {
    return (
      <EmptyState
        title="이 항차에는 컨테이너가 없습니다"
        description="계획에 컨테이너가 배정되면 품온 측정이 시작됩니다."
      />
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
      {containerIds.map(id => (
        <ContainerTile
          key={id}
          planId={planId}
          containerId={id}
          summary={summaries.find(({ container_id }) => container_id === id)}
          isActive={id === activeId}
        />
      ))}
    </div>
  );
}

type ContainerTilePropsT = {
  planId: string;
  containerId: string;
  summary: ForwarderTwinSummaryT | undefined;
  isActive: boolean;
};

function ContainerTile({ planId, containerId, summary, isActive }: ContainerTilePropsT) {
  const status = TWIN_STATUS[summary?.status ?? 'no_data'];

  return (
    <Link
      href={FORWARDER_PATHS.COLDCHAIN(planId, containerId)}
      replace
      aria-current={isActive}
      className={cn(
        'flex flex-col gap-2 rounded-2xl border bg-card p-4 hover:bg-panel',
        isActive && 'border-brand ring-2 ring-brand/30'
      )}
    >
      <div className="flex items-center gap-2">
        <span className="font-bold text-navy">{containerId}</span>
        <Badge className={cn('ml-auto', status.className)}>{status.label}</Badge>
      </div>
      {summary && summary.reading_count > 0 ? (
        <p className="text-sm num text-muted-foreground">
          {summary.temp_c ?? '–'}℃ · 단전 {summary.cumulative_outage_minutes}분 · 손실{' '}
          {formatPercent(summary.sensor_loss_rate)}
          {summary.open_actions > 0 && (
            <span className="ml-1 font-bold text-berry">· 조치 {summary.open_actions}건</span>
          )}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">아직 측정값이 없습니다.</p>
      )}
    </Link>
  );
}

function ContainerTwin({ planId, containerId }: { planId: string; containerId: string }) {
  const twin = useForwarderContainer(planId, containerId);

  if (twin.isPending) return <Skeleton className="h-96" />;

  if (twin.isError) {
    return (
      <QueryError
        message={`${containerId} 품온 정보를 불러오지 못했습니다.`}
        onRetry={() => twin.refetch()}
        isRetrying={twin.isFetching}
      />
    );
  }

  if (!twin.data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{containerId} 품온 · 전원</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            센서 측정값이 아직 없습니다. 기기가 이 컨테이너에 연결되면 품온과 전원이 표시됩니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <SensorStatusCard
      containerId={containerId}
      twin={twin.data}
      emptyText="기기를 연결하면 측정값이 들어옵니다."
    />
  );
}
